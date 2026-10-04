import mongoose from "mongoose";
import Assignment from "../models/assignment.js";
import Donation from "../models/donation.js";
import FoodRequest from "../models/foodrequest.js";
import User from "../models/user.js";
import {
	ASSIGNMENT_STATUSES,
	STATE_TRANSITIONS,
	USER_ROLES,
	USER_STATUSES,
	VOLUNTEER_AVAILABILITY_STATUSES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { emitAssignmentEvent } from "./realtimeService.js";

const activeAssignmentStatuses = [
	ASSIGNMENT_STATUSES.PENDING,
	ASSIGNMENT_STATUSES.ACCEPTED,
	ASSIGNMENT_STATUSES.PICKUP_STARTED,
	ASSIGNMENT_STATUSES.PICKED_UP,
	ASSIGNMENT_STATUSES.DELIVERY_STARTED,
	ASSIGNMENT_STATUSES.DELIVERED
];

const safeAssignmentFields = [
	"_id",
	"donationId",
	"requestId",
	"volunteerUserId",
	"quantity",
	"unit",
	"status",
	"createdByUserId",
	"assignedAt",
	"acceptedAt",
	"rejectedAt",
	"cancelledAt",
	"pickupStartedAt",
	"pickedUpAt",
	"deliveryStartedAt",
	"deliveredAt",
	"completedAt",
	"failedAt",
	"failureReason",
	"statusHistory",
	"createdAt",
	"updatedAt"
];

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

const toSafeAssignment = (assignment) => {
	const source = typeof assignment.toObject === "function" ? assignment.toObject() : assignment;
	return safeAssignmentFields.reduce((safeRecord, field) => {
		if (source[field] !== undefined) {
			safeRecord[field] = source[field];
		}
		return safeRecord;
	}, {});
};

const validateObjectId = (value, field) => {
	if (!mongoose.isObjectIdOrHexString(value)) {
		throw createAppError(`${field} must be a valid ObjectId`, 400, "VALIDATION_ERROR");
	}
};

const validateQuantity = (quantity) => {
	if (quantity === undefined) {
		return;
	}

	if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
		throw createAppError("quantity must be positive", 400, "VALIDATION_ERROR");
	}
};

const transitionAssignment = (assignment, nextStatus, changedBy) => {
	const allowed = STATE_TRANSITIONS.ASSIGNMENT[assignment.status] || [];
	if (!allowed.includes(nextStatus)) {
		throw createAppError(
			`Assignment cannot transition from ${assignment.status} to ${nextStatus}`,
			422,
			"INVALID_STATE_TRANSITION"
		);
	}

	assignment.status = nextStatus;
	assignment.statusHistory.push({
		status: nextStatus,
		at: new Date(),
		changedBy
	});
};

const ensureVolunteerEligible = (volunteer) => {
	if (volunteer.role !== USER_ROLES.VOLUNTEER) {
		throw createAppError("Assigned user must be a volunteer", 400, "VALIDATION_ERROR");
	}

	if (volunteer.status !== USER_STATUSES.ACTIVE
		|| volunteer.availabilityStatus !== VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE) {
		throw createAppError("Volunteer must be active and available", 409, "CONFLICT");
	}
};

const ensureOrganizationAccess = (user, request) => {
	if (user.role === USER_ROLES.ADMIN) {
		return;
	}

	if (user.role === USER_ROLES.ORG_ADMIN
		&& user.organizationId
		&& request.organizationId.toString() === user.organizationId.toString()) {
		return;
	}

	throw createAppError("You are not authorized to manage this assignment", 403, "UNAUTHORIZED");
};

const ensureAssignmentVisibility = (user, assignment, donation, request) => {
	if (user.role === USER_ROLES.ADMIN) {
		return;
	}

	if (user.role === USER_ROLES.VOLUNTEER
		&& assignment.volunteerUserId.toString() === user._id.toString()) {
		return;
	}

	if (user.role === USER_ROLES.ORG_ADMIN
		&& user.organizationId
		&& request.organizationId.toString() === user.organizationId.toString()) {
		return;
	}

	if (user.role === USER_ROLES.DONOR
		&& donation.createdByUserId.toString() === user._id.toString()) {
		return;
	}

	throw createAppError("You are not authorized to view this assignment", 403, "UNAUTHORIZED");
};

const loadAssignmentContext = async (assignmentId) => {
	const assignment = await Assignment.findById(assignmentId);
	if (!assignment) {
		throw createAppError("Assignment not found", 404, "NOT_FOUND");
	}

	const [donation, request] = await Promise.all([
		Donation.findById(assignment.donationId),
		FoodRequest.findById(assignment.requestId)
	]);

	if (!donation || !request) {
		throw createAppError("Assignment allocation resources were not found", 404, "NOT_FOUND");
	}

	return { assignment, donation, request };
};

const getScopedIds = async (user) => {
	if (user.role === USER_ROLES.ORG_ADMIN) {
		const requests = await FoodRequest.find({ organizationId: user.organizationId }).select("_id");
		return { requestIds: requests.map((request) => request._id) };
	}

	if (user.role === USER_ROLES.DONOR) {
		const donations = await Donation.find({ createdByUserId: user._id }).select("_id");
		return { donationIds: donations.map((donation) => donation._id) };
	}

	return {};
};

const createAssignmentWithoutTransaction = async (user, input) => {
	const [donation, request, volunteer] = await Promise.all([
		Donation.findById(input.donationId),
		FoodRequest.findById(input.requestId),
		User.findById(input.volunteerUserId)
	]);

	if (!donation || !request) {
		throw createAppError("Donation or food request not found", 404, "NOT_FOUND");
	}
	if (!volunteer) {
		throw createAppError("Volunteer not found", 404, "NOT_FOUND");
	}

	ensureOrganizationAccess(user, request);
	ensureVolunteerEligible(volunteer);

	if (donation.expiresAt <= new Date() || request.neededBy <= new Date()) {
		throw createAppError("Donation or food request has expired", 422, "INVALID_STATE_TRANSITION");
	}

	const allocation = donation.allocations.find(
		(entry) => entry.requestId.toString() === request._id.toString()
	);
	if (!allocation) {
		throw createAppError("Donation allocation for this food request was not found", 409, "CONFLICT");
	}

	if (input.quantity !== undefined && Math.abs(input.quantity - allocation.quantity) > 0.000001) {
		throw createAppError("Assignment quantity must equal the existing allocation", 409, "CONFLICT");
	}

	const activeAssignment = await Assignment.findOne({
		donationId: donation._id,
		requestId: request._id,
		status: { $in: activeAssignmentStatuses }
	});
	if (activeAssignment) {
		throw createAppError("An active assignment already exists for this allocation", 409, "CONFLICT");
	}

	const assignment = new Assignment({
		donationId: donation._id,
		requestId: request._id,
		volunteerUserId: volunteer._id,
		quantity: allocation.quantity,
		unit: donation.unit,
		status: ASSIGNMENT_STATUSES.PENDING,
		createdByUserId: user._id,
		assignedAt: new Date(),
		statusHistory: [{
			status: ASSIGNMENT_STATUSES.PENDING,
			at: new Date(),
			changedBy: user._id
		}]
	});

	try {
		await assignment.save();
	} catch (error) {
		if (error.code === 11000) {
			throw createAppError("An active assignment already exists for this allocation", 409, "CONFLICT");
		}
		throw error;
	}

	return toSafeAssignment(assignment);
};

export const createAssignment = async (user, input) => {
	if (![USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN].includes(user.role)) {
		throw createAppError("Only organization admins or admins can create assignments", 403, "UNAUTHORIZED");
	}

	validateObjectId(input.donationId, "donationId");
	validateObjectId(input.requestId, "requestId");
	validateObjectId(input.volunteerUserId, "volunteerUserId");
	validateQuantity(input.quantity);

	await Assignment.init();
	const session = await mongoose.startSession();
	try {
		let result;

		await session.withTransaction(async () => {
			const [donation, request, volunteer] = await Promise.all([
				Donation.findById(input.donationId).session(session),
				FoodRequest.findById(input.requestId).session(session),
				User.findById(input.volunteerUserId).session(session)
			]);

			if (!donation || !request) {
				throw createAppError("Donation or food request not found", 404, "NOT_FOUND");
			}
			if (!volunteer) {
				throw createAppError("Volunteer not found", 404, "NOT_FOUND");
			}

			ensureOrganizationAccess(user, request);
			ensureVolunteerEligible(volunteer);

			if (donation.expiresAt <= new Date() || request.neededBy <= new Date()) {
				throw createAppError("Donation or food request has expired", 422, "INVALID_STATE_TRANSITION");
			}

			const allocation = donation.allocations.find(
				(entry) => entry.requestId.toString() === request._id.toString()
			);
			if (!allocation) {
				throw createAppError("Donation allocation for this food request was not found", 409, "CONFLICT");
			}

			if (input.quantity !== undefined && Math.abs(input.quantity - allocation.quantity) > 0.000001) {
				throw createAppError("Assignment quantity must equal the existing allocation", 409, "CONFLICT");
			}

			const activeAssignment = await Assignment.findOne({
				donationId: donation._id,
				requestId: request._id,
				status: { $in: activeAssignmentStatuses }
			}).session(session);

			if (activeAssignment) {
				throw createAppError("An active assignment already exists for this allocation", 409, "CONFLICT");
			}

			const assignment = new Assignment({
				donationId: donation._id,
				requestId: request._id,
				volunteerUserId: volunteer._id,
				quantity: allocation.quantity,
				unit: donation.unit,
				status: ASSIGNMENT_STATUSES.PENDING,
				createdByUserId: user._id,
				assignedAt: new Date(),
				statusHistory: [{
					status: ASSIGNMENT_STATUSES.PENDING,
					at: new Date(),
					changedBy: user._id
				}]
			});

			await assignment.save({ session });
			result = toSafeAssignment(assignment);
		});

		await emitAssignmentEvent("assignment:created", result);
		return result;
	} catch (error) {
		if (error.code === 117) {
			await session.endSession();
			const assignment = await createAssignmentWithoutTransaction(user, input);
			await emitAssignmentEvent("assignment:created", assignment);
			return assignment;
		}
		if (error.code === 11000) {
			throw createAppError("An active assignment already exists for this allocation", 409, "CONFLICT");
		}
		throw error;
	} finally {
		await session.endSession();
	}
};

export const listAssignments = async (user, query = {}) => {
	if (![USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.VOLUNTEER, USER_ROLES.ADMIN].includes(user.role)) {
		throw createAppError("You are not authorized to view assignments", 403, "UNAUTHORIZED");
	}

	const filter = {};
	if (user.role === USER_ROLES.VOLUNTEER) {
		filter.volunteerUserId = user._id;
	} else if (user.role === USER_ROLES.ORG_ADMIN) {
		const scopedIds = await getScopedIds(user);
		filter.requestId = { $in: scopedIds.requestIds };
	} else if (user.role === USER_ROLES.DONOR) {
		const scopedIds = await getScopedIds(user);
		filter.donationId = { $in: scopedIds.donationIds };
	}

	if (query.status) {
		if (!Object.values(ASSIGNMENT_STATUSES).includes(query.status)) {
			throw createAppError("status is invalid", 400, "VALIDATION_ERROR");
		}
		filter.status = query.status;
	}

	const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
	const total = await Assignment.countDocuments(filter);
	const assignments = await Assignment.find(filter)
		.sort({ assignedAt: -1 })
		.skip((page - 1) * limit)
		.limit(limit);

	return {
		assignments: assignments.map(toSafeAssignment),
		pagination: { page, limit, total }
	};
};

export const getAssignment = async (user, assignmentId) => {
	validateObjectId(assignmentId, "assignmentId");
	const context = await loadAssignmentContext(assignmentId);
	ensureAssignmentVisibility(user, context.assignment, context.donation, context.request);
	return toSafeAssignment(context.assignment);
};

const ensureAssignedVolunteer = (user, assignment) => {
	if (user.role !== USER_ROLES.VOLUNTEER
		|| assignment.volunteerUserId.toString() !== user._id.toString()) {
		throw createAppError("Only the assigned volunteer can perform this action", 403, "UNAUTHORIZED");
	}
};

export const acceptAssignment = async (user, assignmentId) => {
	const context = await loadAssignmentContext(assignmentId);
	ensureAssignedVolunteer(user, context.assignment);
	ensureVolunteerEligible(user);
	transitionAssignment(context.assignment, ASSIGNMENT_STATUSES.ACCEPTED, user._id);
	context.assignment.acceptedAt = new Date();
	await context.assignment.save();
	const safeAssignment = toSafeAssignment(context.assignment);
	await emitAssignmentEvent("assignment:accepted", safeAssignment);
	return safeAssignment;
};

export const rejectAssignment = async (user, assignmentId) => {
	const context = await loadAssignmentContext(assignmentId);
	ensureAssignedVolunteer(user, context.assignment);
	transitionAssignment(context.assignment, ASSIGNMENT_STATUSES.REJECTED, user._id);
	context.assignment.rejectedAt = new Date();
	await context.assignment.save();
	const safeAssignment = toSafeAssignment(context.assignment);
	await emitAssignmentEvent("assignment:rejected", safeAssignment);
	return safeAssignment;
};

export const cancelAssignment = async (user, assignmentId) => {
	const context = await loadAssignmentContext(assignmentId);
	const isAssignedVolunteer = user.role === USER_ROLES.VOLUNTEER
		&& context.assignment.volunteerUserId.toString() === user._id.toString();
	const isOrganizationAdmin = user.role === USER_ROLES.ORG_ADMIN
		&& user.organizationId
		&& context.request.organizationId.toString() === user.organizationId.toString();

	if (user.role !== USER_ROLES.ADMIN && !isAssignedVolunteer && !isOrganizationAdmin) {
		throw createAppError("You are not authorized to cancel this assignment", 403, "UNAUTHORIZED");
	}

	transitionAssignment(context.assignment, ASSIGNMENT_STATUSES.CANCELLED, user._id);
	context.assignment.cancelledAt = new Date();
	await context.assignment.save();
	const safeAssignment = toSafeAssignment(context.assignment);
	await emitAssignmentEvent("assignment:cancelled", safeAssignment);
	return safeAssignment;
};

const transitionDeliveryState = async (user, assignmentId, nextStatus, timestampField) => {
	const context = await loadAssignmentContext(assignmentId);
	ensureAssignedVolunteer(user, context.assignment);
	transitionAssignment(context.assignment, nextStatus, user._id);
	context.assignment[timestampField] = new Date();
	await context.assignment.save();
	const safeAssignment = toSafeAssignment(context.assignment);
	const eventByStatus = {
		[ASSIGNMENT_STATUSES.PICKUP_STARTED]: "delivery:pickup-started",
		[ASSIGNMENT_STATUSES.PICKED_UP]: "delivery:picked-up",
		[ASSIGNMENT_STATUSES.DELIVERY_STARTED]: "delivery:started",
		[ASSIGNMENT_STATUSES.DELIVERED]: "delivery:delivered"
	};
	await emitAssignmentEvent(eventByStatus[nextStatus], safeAssignment);
	return safeAssignment;
};

export const startPickup = (user, assignmentId) => transitionDeliveryState(
	user,
	assignmentId,
	ASSIGNMENT_STATUSES.PICKUP_STARTED,
	"pickupStartedAt"
);

export const confirmPickup = (user, assignmentId) => transitionDeliveryState(
	user,
	assignmentId,
	ASSIGNMENT_STATUSES.PICKED_UP,
	"pickedUpAt"
);

export const startDelivery = (user, assignmentId) => transitionDeliveryState(
	user,
	assignmentId,
	ASSIGNMENT_STATUSES.DELIVERY_STARTED,
	"deliveryStartedAt"
);

export const confirmDelivery = (user, assignmentId) => transitionDeliveryState(
	user,
	assignmentId,
	ASSIGNMENT_STATUSES.DELIVERED,
	"deliveredAt"
);

export const completeAssignment = async (user, assignmentId) => {
	const context = await loadAssignmentContext(assignmentId);

	if (user.role === USER_ROLES.ORG_ADMIN) {
		if (!user.organizationId
			|| context.request.organizationId.toString() !== user.organizationId.toString()) {
			throw createAppError("You are not authorized to complete this assignment", 403, "UNAUTHORIZED");
		}
	} else if (user.role !== USER_ROLES.ADMIN) {
		throw createAppError("Only the recipient organization or an admin can complete this assignment", 403, "UNAUTHORIZED");
	}

	transitionAssignment(context.assignment, ASSIGNMENT_STATUSES.COMPLETED, user._id);
	context.assignment.completedAt = new Date();
	await context.assignment.save();
	const safeAssignment = toSafeAssignment(context.assignment);
	await emitAssignmentEvent("assignment:completed", safeAssignment);
	return safeAssignment;
};

export const listAvailableVolunteers = async () => {
	const volunteers = await User.find({
		role: USER_ROLES.VOLUNTEER,
		status: USER_STATUSES.ACTIVE,
		availabilityStatus: VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE
	})
		.select("_id name email phone availabilityStatus currentLocation maxTravelDistanceKm")
		.sort({ name: 1 });

	return volunteers;
};

export { activeAssignmentStatuses, toSafeAssignment };
