import mongoose from "mongoose";
import Donation from "../models/donation.js";
import Organization from "../models/organization.js";
import FoodRequest from "../models/foodrequest.js";
import {
  DONATION_STATUSES,
  FOOD_CATEGORIES,
  STATE_TRANSITIONS,
  UNITS,
  USER_ROLES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import {
  assertDonationNotExpired,
  markExpiredIfNeeded
} from "./freshnessService.js";
import { emitDonationEvent } from "./realtimeService.js";

const editableFields = [
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "pickupLocation",
  "availableFrom",
  "availableUntil",
  "preparedAt",
  "expiresAt"
];

const safeDonationFields = [
  "_id",
  "createdByUserId",
  "donorOrganizationId",
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "allocatedQuantity",
  "remainingQuantity",
  "allocations",
  "pickupLocation",
  "availableFrom",
  "availableUntil",
  "preparedAt",
  "expiresAt",
  "status",
  "publishedAt",
  "withdrawnAt",
  "statusHistory",
  "createdAt",
  "updatedAt"
];

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

const toSafeDonation = (donation) => {
  const source = typeof donation.toObject === "function" ? donation.toObject() : donation;
  return safeDonationFields.reduce((safeRecord, field) => {
    if (source[field] !== undefined) {
      safeRecord[field] = source[field];
    }
    return safeRecord;
  }, {});
};

const validatePoint = (point) => (
  point
  && point.type === "Point"
  && Array.isArray(point.coordinates)
  && point.coordinates.length === 2
  && point.coordinates.every((coordinate) => Number.isFinite(coordinate))
  && point.coordinates[0] >= -180
  && point.coordinates[0] <= 180
  && point.coordinates[1] >= -90
  && point.coordinates[1] <= 90
);

const parseDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createAppError(`${field} must be a valid date`, 400, "VALIDATION_ERROR");
  }
  return date;
};

const validateDonationFields = (input, requireAll = true) => {
  const requiredFields = [
    "foodCategory",
    "totalQuantity",
    "unit",
    "pickupLocation",
    "availableFrom",
    "availableUntil",
    "expiresAt"
  ];

  if (requireAll) {
    const missing = requiredFields.filter((field) => input[field] === undefined || input[field] === null);
    if (missing.length > 0) {
      throw createAppError(`Missing required fields: ${missing.join(", ")}`, 400, "VALIDATION_ERROR");
    }
  }

  if (input.foodCategory !== undefined && !Object.values(FOOD_CATEGORIES).includes(input.foodCategory)) {
    throw createAppError("foodCategory is invalid", 400, "VALIDATION_ERROR");
  }

  if (input.unit !== undefined && !Object.values(UNITS).includes(input.unit)) {
    throw createAppError("unit is invalid", 400, "VALIDATION_ERROR");
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw createAppError("description must be a string", 400, "VALIDATION_ERROR");
  }

  if (input.totalQuantity !== undefined
    && (typeof input.totalQuantity !== "number" || !Number.isFinite(input.totalQuantity) || input.totalQuantity <= 0)) {
    throw createAppError("totalQuantity must be positive", 400, "VALIDATION_ERROR");
  }

  if (input.pickupLocation !== undefined && !validatePoint(input.pickupLocation)) {
    throw createAppError("pickupLocation must be a valid GeoJSON Point", 400, "VALIDATION_ERROR");
  }

  const dates = {};
  for (const field of ["availableFrom", "availableUntil", "preparedAt", "expiresAt"]) {
    if (input[field] !== undefined && input[field] !== null) {
      dates[field] = parseDate(input[field], field);
    }
  }

  const availableFrom = dates.availableFrom;
  const availableUntil = dates.availableUntil;
  const expiresAt = dates.expiresAt;

  if (availableFrom && availableUntil && availableFrom >= availableUntil) {
    throw createAppError("availableFrom must be before availableUntil", 400, "VALIDATION_ERROR");
  }

  if (dates.preparedAt && expiresAt && expiresAt <= dates.preparedAt) {
    throw createAppError("expiresAt must be after preparedAt", 400, "VALIDATION_ERROR");
  }

  if (availableFrom && expiresAt && expiresAt <= availableFrom) {
    throw createAppError("expiresAt must be after availableFrom", 400, "VALIDATION_ERROR");
  }

  return dates;
};

const ensureRoleCanManage = (user) => {
  if (![USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN].includes(user.role)) {
    throw createAppError("You are not authorized to manage donations", 403, "UNAUTHORIZED");
  }
};

const ensureDonationOwnership = (user, donation) => {
  if (user.role === USER_ROLES.ADMIN) {
    return;
  }
  if (user.role === USER_ROLES.DONOR && donation.createdByUserId.toString() === user._id.toString()) {
    return;
  }
  if (user.role === USER_ROLES.ORG_ADMIN && user.organizationId && donation.donorOrganizationId?.toString() === user.organizationId.toString()) {
    return;
  }
  throw createAppError("You are not authorized to modify this donation", 403, "UNAUTHORIZED");
};

const ensureDonationAccess = async (user, donation) => {
  if (user.role === USER_ROLES.ADMIN) {
    return;
  }

  if (user.role === USER_ROLES.DONOR
    && donation.createdByUserId.toString() === user._id.toString()) {
    return;
  }

  if (user.role === USER_ROLES.ORG_ADMIN && user.organizationId) {
    if (donation.donorOrganizationId && donation.donorOrganizationId.toString() === user.organizationId.toString()) {
      return;
    }
    if ([DONATION_STATUSES.AVAILABLE, DONATION_STATUSES.PARTIALLY_ALLOCATED].includes(donation.status)) {
      return;
    }
    const orgRequests = await FoodRequest.find({ organizationId: user.organizationId }).select("_id");
    const orgReqIds = new Set(orgRequests.map((r) => r._id.toString()));
    if (donation.allocations?.some((alloc) => orgReqIds.has(alloc.requestId?.toString()))) {
      return;
    }
  }

  throw createAppError("You are not authorized to access this donation", 403, "UNAUTHORIZED");
};

const transitionDonation = (donation, nextStatus, changedBy) => {
  const allowedTransitions = STATE_TRANSITIONS.DONATION[donation.status] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    throw createAppError(
      `Donation cannot transition from ${donation.status} to ${nextStatus}`,
      422,
      "INVALID_STATE_TRANSITION"
    );
  }

  donation.status = nextStatus;
  donation.statusHistory.push({
    status: nextStatus,
    at: new Date(),
    changedBy
  });
};

const refreshExpiry = async (donation, userId) => {
  await markExpiredIfNeeded(donation, userId);
  return donation;
};

export const createDonation = async (user, input) => {
  ensureRoleCanManage(user);
  validateDonationFields(input);

  let donorOrganizationId = input.donorOrganizationId || null;
  if (donorOrganizationId && !mongoose.isObjectIdOrHexString(donorOrganizationId)) {
    throw createAppError("donorOrganizationId must be a valid ObjectId", 400, "VALIDATION_ERROR");
  }

  if (user.role === USER_ROLES.ORG_ADMIN) {
    if (!user.organizationId) {
      throw createAppError("ORG_ADMIN must belong to an organization", 403, "UNAUTHORIZED");
    }
    if (donorOrganizationId && donorOrganizationId.toString() !== user.organizationId.toString()) {
      throw createAppError("Donation organization does not match your organization", 403, "UNAUTHORIZED");
    }
    donorOrganizationId = user.organizationId;
  }

  if (user.role === USER_ROLES.DONOR && donorOrganizationId) {
    if (!user.organizationId || donorOrganizationId.toString() !== user.organizationId.toString()) {
      throw createAppError("Donation organization does not match your organization", 403, "UNAUTHORIZED");
    }
  }

  if (donorOrganizationId) {
    const organizationExists = await Organization.exists({ _id: donorOrganizationId });
    if (!organizationExists) {
      throw createAppError("Donor organization not found", 404, "NOT_FOUND");
    }
  }

  const donation = new Donation({
    createdByUserId: user._id,
    donorOrganizationId,
    foodCategory: input.foodCategory,
    description: input.description?.trim() || null,
    totalQuantity: input.totalQuantity,
    unit: input.unit,
    allocatedQuantity: 0,
    remainingQuantity: input.totalQuantity,
    pickupLocation: input.pickupLocation,
    availableFrom: parseDate(input.availableFrom, "availableFrom"),
    availableUntil: parseDate(input.availableUntil, "availableUntil"),
    preparedAt: input.preparedAt ? parseDate(input.preparedAt, "preparedAt") : null,
    expiresAt: parseDate(input.expiresAt, "expiresAt"),
    status: DONATION_STATUSES.DRAFT,
    statusHistory: [{
      status: DONATION_STATUSES.DRAFT,
      at: new Date(),
      changedBy: user._id
    }]
  });

  await donation.save();
  return toSafeDonation(donation);
};

export const listDonations = async (user, query = {}) => {
  const filter = {};
  if (user.role === USER_ROLES.DONOR) {
    filter.createdByUserId = user._id;
  } else if (user.role === USER_ROLES.ORG_ADMIN) {
    if (!user.organizationId) {
      return { donations: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
    const orgRequests = await FoodRequest.find({ organizationId: user.organizationId }).select("_id");
    const orgReqIds = orgRequests.map((r) => r._id);

    filter.$or = [
      { donorOrganizationId: user.organizationId },
      { "allocations.requestId": { $in: orgReqIds } },
      { status: { $in: [DONATION_STATUSES.AVAILABLE, DONATION_STATUSES.PARTIALLY_ALLOCATED] } }
    ];
  } else if (user.role !== USER_ROLES.ADMIN) {
    throw createAppError("You are not authorized to view donations", 403, "UNAUTHORIZED");
  }

  if (query.status) {
    if (!Object.values(DONATION_STATUSES).includes(query.status)) {
      throw createAppError("status is invalid", 400, "VALIDATION_ERROR");
    }
    filter.status = query.status;
  }
  if (query.foodCategory) {
    if (!Object.values(FOOD_CATEGORIES).includes(query.foodCategory)) {
      throw createAppError("foodCategory is invalid", 400, "VALIDATION_ERROR");
    }
    filter.foodCategory = query.foodCategory;
  }

  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const total = await Donation.countDocuments(filter);
  const donations = await Donation.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  for (const donation of donations) {
    await refreshExpiry(donation, user._id);
  }

  return {
    donations: donations.map(toSafeDonation),
    pagination: { page, limit, total }
  };
};

export const getDonation = async (user, donationId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw createAppError("Donation not found", 404, "NOT_FOUND");
  }

  await ensureDonationAccess(user, donation);
  await refreshExpiry(donation, user._id);
  return toSafeDonation(donation);
};

export const updateDonation = async (user, donationId, updates) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw createAppError("Donation not found", 404, "NOT_FOUND");
  }

  ensureDonationOwnership(user, donation);
  await refreshExpiry(donation, user._id);

  if ([DONATION_STATUSES.EXPIRED, DONATION_STATUSES.WITHDRAWN, DONATION_STATUSES.CANCELLED].includes(donation.status)) {
    throw createAppError("Terminal donations cannot be modified", 422, "INVALID_STATE_TRANSITION");
  }

  if (![DONATION_STATUSES.DRAFT, DONATION_STATUSES.AVAILABLE, DONATION_STATUSES.PARTIALLY_ALLOCATED, DONATION_STATUSES.FULLY_ALLOCATED].includes(donation.status)) {
    throw createAppError("Donation cannot be modified in its current state", 422, "INVALID_STATE_TRANSITION");
  }

  const updateFields = Object.keys(updates);
  const unexpectedFields = updateFields.filter((field) => !editableFields.includes(field));
  if (unexpectedFields.length > 0) {
    throw createAppError(`Fields cannot be updated: ${unexpectedFields.join(", ")}`, 400, "VALIDATION_ERROR");
  }

  if (donation.allocatedQuantity > 0) {
    const protectedFields = [
      "totalQuantity",
      "unit",
      "foodCategory",
      "pickupLocation",
      "expiresAt",
      "availableFrom",
      "availableUntil",
      "preparedAt"
    ];
    const attemptedProtectedFields = updateFields.filter((field) => protectedFields.includes(field));
    if (attemptedProtectedFields.length > 0) {
      throw createAppError("Allocated donation fields cannot be changed", 422, "INVALID_STATE_TRANSITION");
    }
  }

  const merged = { ...donation.toObject(), ...updates };
  validateDonationFields(merged, true);

  for (const field of editableFields) {
    if (hasOwn(updates, field)) {
      donation[field] = field.endsWith("At") || field === "availableFrom" || field === "availableUntil" || field === "expiresAt"
        ? (updates[field] === null ? null : parseDate(updates[field], field))
        : updates[field];
    }
  }

  if (hasOwn(updates, "description")) {
    donation.description = updates.description?.trim() || null;
  }

  if (hasOwn(updates, "totalQuantity")) {
    donation.remainingQuantity = updates.totalQuantity - donation.allocatedQuantity;
  }

  await donation.save();
  return toSafeDonation(donation);
};

export const publishDonation = async (user, donationId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw createAppError("Donation not found", 404, "NOT_FOUND");
  }

  ensureDonationAccess(user, donation);
  if (donation.status !== DONATION_STATUSES.DRAFT) {
    throw createAppError("Only draft donations can be published", 422, "INVALID_STATE_TRANSITION");
  }

  assertDonationNotExpired(donation, "Expired donations cannot be published");
  validateDonationFields(donation.toObject(), true);
  donation.publishedAt = new Date();
  transitionDonation(donation, DONATION_STATUSES.AVAILABLE, user._id);
  await donation.save();

  const safeDonation = toSafeDonation(donation);
  emitDonationEvent("donation:published", safeDonation);
  return safeDonation;
};

export const withdrawDonation = async (user, donationId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw createAppError("Donation not found", 404, "NOT_FOUND");
  }

  ensureDonationAccess(user, donation);
  await refreshExpiry(donation, user._id);

  if (![DONATION_STATUSES.DRAFT, DONATION_STATUSES.AVAILABLE].includes(donation.status)) {
    throw createAppError("Only draft or available donations can be withdrawn", 422, "INVALID_STATE_TRANSITION");
  }

  if (donation.allocatedQuantity > 0) {
    throw createAppError("Allocated donations cannot be withdrawn", 409, "CONFLICT");
  }

  donation.withdrawnAt = new Date();
  transitionDonation(donation, DONATION_STATUSES.WITHDRAWN, user._id);
  await donation.save();

  const safeDonation = toSafeDonation(donation);
  emitDonationEvent("donation:withdrawn", safeDonation);
  return safeDonation;
};

export { toSafeDonation };
