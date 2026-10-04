import mongoose from "mongoose";
import FoodRequest from "../models/foodrequest.js";
import Organization from "../models/organization.js";
import {
  FOOD_CATEGORIES,
  FOOD_REQUEST_STATUSES,
  ORGANIZATION_VERIFICATION_STATUSES,
  STATE_TRANSITIONS,
  UNITS,
  USER_ROLES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { emitRequestEvent } from "./realtimeService.js";

const editableFields = [
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "deliveryLocation",
  "neededBy"
];

const safeRequestFields = [
  "_id",
  "organizationId",
  "createdByUserId",
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "fulfilledQuantity",
  "remainingQuantity",
  "deliveryLocation",
  "neededBy",
  "status",
  "openedAt",
  "fulfilledAt",
  "cancelledAt",
  "statusHistory",
  "createdAt",
  "updatedAt"
];

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

const toSafeFoodRequest = (request) => {
  const source = typeof request.toObject === "function" ? request.toObject() : request;
  return safeRequestFields.reduce((safeRecord, field) => {
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

const validateRequestFields = (input, requireAll = true) => {
  const requiredFields = [
    "foodCategory",
    "totalQuantity",
    "unit",
    "deliveryLocation",
    "neededBy"
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

  if (input.deliveryLocation !== undefined && !validatePoint(input.deliveryLocation)) {
    throw createAppError("deliveryLocation must be a valid GeoJSON Point", 400, "VALIDATION_ERROR");
  }

  if (input.neededBy !== undefined && input.neededBy !== null) {
    return parseDate(input.neededBy, "neededBy");
  }

  return null;
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

  throw createAppError("You are not authorized to access this food request", 403, "UNAUTHORIZED");
};

const transitionRequest = (request, nextStatus, changedBy) => {
  const allowedTransitions = STATE_TRANSITIONS.FOOD_REQUEST[request.status] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    throw createAppError(
      `Food request cannot transition from ${request.status} to ${nextStatus}`,
      422,
      "INVALID_STATE_TRANSITION"
    );
  }

  request.status = nextStatus;
  request.statusHistory.push({
    status: nextStatus,
    at: new Date(),
    changedBy
  });
};

const markExpiredIfNeeded = async (request, changedBy) => {
  const expirableStatuses = [
    FOOD_REQUEST_STATUSES.OPEN,
    FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED
  ];

  if (request.neededBy > new Date() || !expirableStatuses.includes(request.status)) {
    return false;
  }

  transitionRequest(request, FOOD_REQUEST_STATUSES.EXPIRED, changedBy);
  await request.save();
  return true;
};

const ensurePendingOrCurrentState = (request) => {
  if ([
    FOOD_REQUEST_STATUSES.FULFILLED,
    FOOD_REQUEST_STATUSES.EXPIRED,
    FOOD_REQUEST_STATUSES.CANCELLED
  ].includes(request.status)) {
    throw createAppError("Terminal food requests cannot be modified", 422, "INVALID_STATE_TRANSITION");
  }
};

const ensureOrganizationIsVerified = async (organizationId) => {
  const organization = await Organization.findById(organizationId).select("verificationStatus");
  if (!organization) {
    throw createAppError("Organization not found", 404, "NOT_FOUND");
  }

  if (organization.verificationStatus !== ORGANIZATION_VERIFICATION_STATUSES.VERIFIED) {
    throw createAppError("Organization must be verified before opening a food request", 403, "UNAUTHORIZED");
  }
};

export const createFoodRequest = async (user, input) => {
  if (user.role !== USER_ROLES.ORG_ADMIN) {
    throw createAppError("Only organization admins can create food requests", 403, "UNAUTHORIZED");
  }

  if (!user.organizationId || !mongoose.isObjectIdOrHexString(user.organizationId)) {
    throw createAppError("ORG_ADMIN must belong to an organization", 403, "UNAUTHORIZED");
  }

  validateRequestFields(input);

  const request = new FoodRequest({
    organizationId: user.organizationId,
    createdByUserId: user._id,
    foodCategory: input.foodCategory,
    description: input.description?.trim() || null,
    totalQuantity: input.totalQuantity,
    unit: input.unit,
    fulfilledQuantity: 0,
    remainingQuantity: input.totalQuantity,
    deliveryLocation: input.deliveryLocation,
    neededBy: parseDate(input.neededBy, "neededBy"),
    status: FOOD_REQUEST_STATUSES.DRAFT,
    statusHistory: [{
      status: FOOD_REQUEST_STATUSES.DRAFT,
      at: new Date(),
      changedBy: user._id
    }]
  });

  await request.save();
  return toSafeFoodRequest(request);
};

export const listFoodRequests = async (user, query = {}) => {
  const filter = {};
  if (user.role === USER_ROLES.ORG_ADMIN) {
    if (!user.organizationId) {
      return { requests: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
    filter.organizationId = user.organizationId;
  } else if (user.role !== USER_ROLES.ADMIN) {
    throw createAppError("You are not authorized to view food requests", 403, "UNAUTHORIZED");
  }

  if (query.status) {
    if (!Object.values(FOOD_REQUEST_STATUSES).includes(query.status)) {
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
  const total = await FoodRequest.countDocuments(filter);
  const requests = await FoodRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  for (const request of requests) {
    await markExpiredIfNeeded(request, user._id);
  }

  return {
    requests: requests.map(toSafeFoodRequest),
    pagination: { page, limit, total }
  };
};

export const getFoodRequest = async (user, requestId) => {
  const request = await FoodRequest.findById(requestId);
  if (!request) {
    throw createAppError("Food request not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, request);
  await markExpiredIfNeeded(request, user._id);
  return toSafeFoodRequest(request);
};

export const updateFoodRequest = async (user, requestId, updates) => {
  const request = await FoodRequest.findById(requestId);
  if (!request) {
    throw createAppError("Food request not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, request);
  await markExpiredIfNeeded(request, user._id);
  ensurePendingOrCurrentState(request);

  if (![FOOD_REQUEST_STATUSES.DRAFT, FOOD_REQUEST_STATUSES.OPEN, FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED].includes(request.status)) {
    throw createAppError("Food request cannot be modified in its current state", 422, "INVALID_STATE_TRANSITION");
  }

  const updateFields = Object.keys(updates);
  const unexpectedFields = updateFields.filter((field) => !editableFields.includes(field));
  if (unexpectedFields.length > 0) {
    throw createAppError(`Fields cannot be updated: ${unexpectedFields.join(", ")}`, 400, "VALIDATION_ERROR");
  }

  if (request.fulfilledQuantity > 0) {
    const protectedFields = [
      "totalQuantity",
      "unit",
      "foodCategory",
      "deliveryLocation",
      "neededBy"
    ];
    const attemptedProtectedFields = updateFields.filter((field) => protectedFields.includes(field));
    if (attemptedProtectedFields.length > 0) {
      throw createAppError("Fulfilled request fields cannot be changed", 422, "INVALID_STATE_TRANSITION");
    }
  }

  const merged = { ...request.toObject(), ...updates };
  validateRequestFields(merged);

  for (const field of editableFields) {
    if (hasOwn(updates, field)) {
      request[field] = field === "neededBy"
        ? parseDate(updates[field], field)
        : updates[field];
    }
  }

  if (hasOwn(updates, "description")) {
    request.description = updates.description?.trim() || null;
  }

  if (hasOwn(updates, "totalQuantity")) {
    request.remainingQuantity = updates.totalQuantity - request.fulfilledQuantity;
  }

  await request.save();
  return toSafeFoodRequest(request);
};

export const openFoodRequest = async (user, requestId) => {
  const request = await FoodRequest.findById(requestId);
  if (!request) {
    throw createAppError("Food request not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, request);
  await ensureOrganizationIsVerified(request.organizationId);

  if (request.status !== FOOD_REQUEST_STATUSES.DRAFT) {
    throw createAppError("Only draft food requests can be opened", 422, "INVALID_STATE_TRANSITION");
  }

  const neededBy = parseDate(request.neededBy, "neededBy");
  if (neededBy <= new Date()) {
    throw createAppError("Expired food requests cannot be opened", 422, "INVALID_STATE_TRANSITION");
  }

  validateRequestFields(request.toObject());
  request.openedAt = new Date();
  transitionRequest(request, FOOD_REQUEST_STATUSES.OPEN, user._id);
  await request.save();

  const safeRequest = toSafeFoodRequest(request);
  emitRequestEvent("request:opened", safeRequest);
  return safeRequest;
};

export const cancelFoodRequest = async (user, requestId) => {
  const request = await FoodRequest.findById(requestId);
  if (!request) {
    throw createAppError("Food request not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, request);
  await markExpiredIfNeeded(request, user._id);

  if (![FOOD_REQUEST_STATUSES.DRAFT, FOOD_REQUEST_STATUSES.OPEN, FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED].includes(request.status)) {
    throw createAppError("This food request cannot be cancelled", 422, "INVALID_STATE_TRANSITION");
  }

  request.cancelledAt = new Date();
  transitionRequest(request, FOOD_REQUEST_STATUSES.CANCELLED, user._id);
  await request.save();

  const safeRequest = toSafeFoodRequest(request);
  emitRequestEvent("request:cancelled", safeRequest);
  return safeRequest;
};

export { toSafeFoodRequest };
