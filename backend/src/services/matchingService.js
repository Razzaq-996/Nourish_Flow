import mongoose from "mongoose";
import Donation from "../models/donation.js";
import FoodRequest from "../models/foodrequest.js";
import {
  DONATION_STATUSES,
  FOOD_REQUEST_STATUSES,
  STATE_TRANSITIONS,
  USER_ROLES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { isDonationExpired, markExpiredIfNeeded as markDonationExpired } from "./freshnessService.js";
import { emitAllocationEvents } from "./realtimeService.js";

const eligibleDonationStatuses = [
  DONATION_STATUSES.AVAILABLE,
  DONATION_STATUSES.PARTIALLY_ALLOCATED
];

const eligibleRequestStatuses = [
  FOOD_REQUEST_STATUSES.OPEN,
  FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED
];

const quantityTolerance = 0.000001;

const getRadiusMeters = () => {
  const configuredKilometers = Number(process.env.MATCHING_RADIUS_KM);
  const radiusKilometers = Number.isFinite(configuredKilometers) && configuredKilometers > 0
    ? configuredKilometers
    : 50;
  return radiusKilometers * 1000;
};

const ensureDonationAccess = (user, donation) => {
  if (user.role === USER_ROLES.ADMIN) {
    return;
  }

  if (user.role === USER_ROLES.DONOR
    && donation.createdByUserId.toString() === user._id.toString()) {
    return;
  }

  if (user.role === USER_ROLES.ORG_ADMIN && user.organizationId) {
    return;
  }

  throw createAppError("You are not authorized to allocate this donation", 403, "UNAUTHORIZED");
};

const ensureRequestAccess = (user, request) => {
  if (user.role === USER_ROLES.ADMIN) {
    return;
  }

  if (user.role === USER_ROLES.ORG_ADMIN
    && user.organizationId
    && request.organizationId.toString() === user.organizationId.toString()) {
    return;
  }

  if (user.role === USER_ROLES.DONOR) {
    return;
  }

  throw createAppError("You are not authorized to allocate to this request", 403, "UNAUTHORIZED");
};

const transition = (document, transitionMap, nextStatus, changedBy) => {
  if (document.status === nextStatus) {
    return;
  }

  const allowed = transitionMap[document.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw createAppError(
      `Cannot transition from ${document.status} to ${nextStatus}`,
      422,
      "INVALID_STATE_TRANSITION"
    );
  }

  document.status = nextStatus;
  document.statusHistory.push({
    status: nextStatus,
    at: new Date(),
    changedBy
  });
};

const markRequestExpiredIfNeeded = async (request, changedBy) => {
  if (request.neededBy > new Date()
    || ![FOOD_REQUEST_STATUSES.OPEN, FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED].includes(request.status)) {
    return false;
  }

  transition(
    request,
    STATE_TRANSITIONS.FOOD_REQUEST,
    FOOD_REQUEST_STATUSES.EXPIRED,
    changedBy
  );
  await request.save();
  return true;
};

const validateQuantity = (quantity) => {
  if (quantity === undefined) {
    return;
  }

  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    throw createAppError("quantity must be positive", 400, "VALIDATION_ERROR");
  }
};

const validateObjectId = (value, field) => {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw createAppError(`${field} must be a valid ObjectId`, 400, "VALIDATION_ERROR");
  }
};

const ensureEligibleDonation = async (donation, user) => {
  ensureDonationAccess(user, donation);

  if (isDonationExpired(donation)) {
    await markDonationExpired(donation, user._id);
    throw createAppError("Donation has expired", 422, "INVALID_STATE_TRANSITION");
  }

  if (!eligibleDonationStatuses.includes(donation.status)) {
    throw createAppError("Donation is not available for allocation", 422, "INVALID_STATE_TRANSITION");
  }

  if (donation.remainingQuantity <= quantityTolerance) {
    throw createAppError("Donation has no remaining quantity", 409, "CONFLICT");
  }
};

const ensureEligibleRequest = async (request, user) => {
  ensureRequestAccess(user, request);

  if (request.neededBy <= new Date()) {
    await markRequestExpiredIfNeeded(request, user._id);
    throw createAppError("Food request has expired", 422, "INVALID_STATE_TRANSITION");
  }

  if (!eligibleRequestStatuses.includes(request.status)) {
    throw createAppError("Food request is not available for allocation", 422, "INVALID_STATE_TRANSITION");
  }

  if (request.remainingQuantity <= quantityTolerance) {
    throw createAppError("Food request has no remaining quantity", 409, "CONFLICT");
  }
};

const getAllocatedRequestIds = (donation) => (
  donation.allocations.map((allocation) => allocation.requestId.toString())
);

const buildCandidatePipeline = (donation, user, requestId, requestedQuantity) => {
  const query = {
    status: { $in: eligibleRequestStatuses },
    foodCategory: donation.foodCategory,
    unit: donation.unit,
    neededBy: { $gt: new Date() },
    remainingQuantity: { $gt: quantityTolerance }
  };

  const allocatedRequestIds = getAllocatedRequestIds(donation);
  if (allocatedRequestIds.length > 0) {
    query._id = {
      $nin: allocatedRequestIds.map((allocatedRequestId) => new mongoose.Types.ObjectId(allocatedRequestId))
    };
  }

  if (requestId) {
    query._id = new mongoose.Types.ObjectId(requestId);
  }

  if (user.role === USER_ROLES.ORG_ADMIN) {
    query.organizationId = user.organizationId;
  }

  const allocationQuantity = requestedQuantity === undefined
    ? { $min: [donation.remainingQuantity, "$remainingQuantity"] }
    : { $min: [donation.remainingQuantity, "$remainingQuantity", requestedQuantity] };

  return [
    {
      $geoNear: {
        near: donation.pickupLocation,
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: getRadiusMeters(),
        query
      }
    },
    {
      $addFields: {
        allocationQuantity
      }
    },
    {
      $addFields: {
        quantityFit: {
          $abs: {
            $subtract: ["$remainingQuantity", "$allocationQuantity"]
          }
        }
      }
    },
    {
      $sort: {
        distanceMeters: 1,
        expiresAt: 1,
        neededBy: 1,
        quantityFit: 1,
        _id: 1
      }
    },
    { $limit: 1 }
  ];
};

const getCandidateRequest = async (session, donation, user, requestId, requestedQuantity) => {
  const candidates = await FoodRequest.aggregate(buildCandidatePipeline(
    donation,
    user,
    requestId,
    requestedQuantity
  )).session(session);

  if (candidates.length === 0) {
    throw createAppError(
      "No eligible compatible food request was found within the matching radius",
      409,
      "CONFLICT"
    );
  }

  return FoodRequest.findById(candidates[0]._id).session(session);
};

const buildResponse = (donation, request, quantity) => ({
  donationId: donation._id,
  requestId: request._id,
  quantity,
  unit: donation.unit,
  donation: {
    remainingQuantity: donation.remainingQuantity,
    status: donation.status
  },
  foodRequest: {
    remainingQuantity: request.remainingQuantity,
    status: request.status
  }
});

export const allocateDonation = async (user, { donationId, requestId, quantity }) => {
  validateObjectId(donationId, "donationId");
  if (requestId !== undefined && requestId !== null) {
    validateObjectId(requestId, "requestId");
  }
  validateQuantity(quantity);

  const initialDonation = await Donation.findById(donationId);
  if (!initialDonation) {
    throw createAppError("Donation not found", 404, "NOT_FOUND");
  }
  await ensureEligibleDonation(initialDonation, user);

  if (requestId) {
    if (initialDonation.allocations.some((allocation) => allocation.requestId.toString() === requestId.toString())) {
      throw createAppError("Donation is already allocated to this food request", 409, "CONFLICT");
    }

    const initialRequest = await FoodRequest.findById(requestId);
    if (!initialRequest) {
      throw createAppError("Food request not found", 404, "NOT_FOUND");
    }
    await ensureEligibleRequest(initialRequest, user);

  }

  const session = await mongoose.startSession();
  try {
    let result;
    let eventContext;

    await session.withTransaction(async () => {
      const donation = await Donation.findById(donationId).session(session);
      if (!donation) {
        throw createAppError("Donation not found", 404, "NOT_FOUND");
      }

      if (isDonationExpired(donation)) {
        throw createAppError("Donation has expired", 422, "INVALID_STATE_TRANSITION");
      }
      if (!eligibleDonationStatuses.includes(donation.status) || donation.remainingQuantity <= quantityTolerance) {
        throw createAppError("Donation is not available for allocation", 422, "INVALID_STATE_TRANSITION");
      }
      ensureDonationAccess(user, donation);

      if (requestId && donation.allocations.some((allocation) => allocation.requestId.toString() === requestId.toString())) {
        throw createAppError("Donation is already allocated to this food request", 409, "CONFLICT");
      }

      const request = await getCandidateRequest(session, donation, user, requestId, quantity);
      if (!request) {
        throw createAppError("Food request not found", 404, "NOT_FOUND");
      }

      if (request.neededBy <= new Date()) {
        throw createAppError("Food request has expired", 422, "INVALID_STATE_TRANSITION");
      }
      if (!eligibleRequestStatuses.includes(request.status)
        || request.remainingQuantity <= quantityTolerance
        || request.foodCategory !== donation.foodCategory
        || request.unit !== donation.unit) {
        throw createAppError("Food request is not compatible or available", 409, "CONFLICT");
      }
      ensureRequestAccess(user, request);

      if (donation.allocations.some((allocation) => allocation.requestId.toString() === request._id.toString())) {
        throw createAppError("Donation is already allocated to this food request", 409, "CONFLICT");
      }

      const allocationQuantity = Math.min(
        donation.remainingQuantity,
        request.remainingQuantity,
        quantity === undefined ? Number.POSITIVE_INFINITY : quantity
      );

      if (allocationQuantity <= quantityTolerance) {
        throw createAppError("Allocation quantity must be positive", 409, "CONFLICT");
      }

      donation.allocations.push({
        requestId: request._id,
        quantity: allocationQuantity,
        createdBy: user._id,
        createdAt: new Date()
      });
      donation.allocatedQuantity += allocationQuantity;
      donation.remainingQuantity -= allocationQuantity;

      const donationNextStatus = donation.remainingQuantity <= quantityTolerance
        ? DONATION_STATUSES.FULLY_ALLOCATED
        : DONATION_STATUSES.PARTIALLY_ALLOCATED;
      transition(donation, STATE_TRANSITIONS.DONATION, donationNextStatus, user._id);

      request.fulfilledQuantity += allocationQuantity;
      request.remainingQuantity -= allocationQuantity;

      const requestNextStatus = request.remainingQuantity <= quantityTolerance
        ? FOOD_REQUEST_STATUSES.FULFILLED
        : FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED;
      transition(request, STATE_TRANSITIONS.FOOD_REQUEST, requestNextStatus, user._id);
      if (requestNextStatus === FOOD_REQUEST_STATUSES.FULFILLED) {
        request.fulfilledAt = new Date();
      }

      await donation.save({ session });
      await request.save({ session });
      result = buildResponse(donation, request, allocationQuantity);
      eventContext = { donation, request };
    });

    emitAllocationEvents(result, eventContext.donation, eventContext.request);
    return result;
  } finally {
    await session.endSession();
  }
};
