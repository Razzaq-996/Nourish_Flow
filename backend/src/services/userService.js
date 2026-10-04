import {
  USER_ROLES,
  VOLUNTEER_AVAILABILITY_STATUSES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";

const safeUserFields = [
  "_id",
  "name",
  "email",
  "role",
  "status",
  "organizationId",
  "phone",
  "availabilityStatus",
  "currentLocation",
  "maxTravelDistanceKm",
  "verifiedAt",
  "verifiedBy",
  "createdAt",
  "updatedAt"
];

export const toSafeUser = (user) => {
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return safeUserFields.reduce((safeUser, field) => {
    if (source[field] !== undefined) {
      safeUser[field] = source[field];
    }
    return safeUser;
  }, {});
};

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

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

export const getCurrentUser = (user) => toSafeUser(user);

export const updateCurrentUser = async (user, updates) => {
  const allowedFields = ["name", "phone"];
  const volunteerFields = ["availabilityStatus", "currentLocation", "maxTravelDistanceKm"];
  const permittedFields = user.role === USER_ROLES.VOLUNTEER
    ? [...allowedFields, ...volunteerFields]
    : allowedFields;
  const invalidFields = Object.keys(updates).filter((field) => !permittedFields.includes(field));

  if (invalidFields.length > 0) {
    throw createAppError(`Fields cannot be updated: ${invalidFields.join(", ")}`, 400, "VALIDATION_ERROR");
  }

  if (hasOwn(updates, "name")) {
    if (typeof updates.name !== "string" || updates.name.trim() === "") {
      throw createAppError("name must be a non-empty string", 400, "VALIDATION_ERROR");
    }
    user.name = updates.name.trim();
  }

  if (hasOwn(updates, "phone")) {
    if (updates.phone !== null && typeof updates.phone !== "string") {
      throw createAppError("phone must be a string or null", 400, "VALIDATION_ERROR");
    }
    user.phone = updates.phone?.trim() || null;
  }

  if (user.role === USER_ROLES.VOLUNTEER) {
    if (hasOwn(updates, "availabilityStatus")) {
      if (!Object.values(VOLUNTEER_AVAILABILITY_STATUSES).includes(updates.availabilityStatus)) {
        throw createAppError("availabilityStatus is invalid", 400, "VALIDATION_ERROR");
      }
      user.availabilityStatus = updates.availabilityStatus;
    }

    if (hasOwn(updates, "currentLocation")) {
      if (updates.currentLocation !== null && !validatePoint(updates.currentLocation)) {
        throw createAppError("currentLocation must be a valid GeoJSON Point", 400, "VALIDATION_ERROR");
      }
      user.currentLocation = updates.currentLocation;
    }

    if (hasOwn(updates, "maxTravelDistanceKm")) {
      if (updates.maxTravelDistanceKm !== null
        && (typeof updates.maxTravelDistanceKm !== "number" || updates.maxTravelDistanceKm <= 0)) {
        throw createAppError("maxTravelDistanceKm must be positive", 400, "VALIDATION_ERROR");
      }
      user.maxTravelDistanceKm = updates.maxTravelDistanceKm;
    }
  }

  const savedUser = await user.save();
  return toSafeUser(savedUser);
};
