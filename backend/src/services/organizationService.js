import mongoose from "mongoose";
import Organization from "../models/organization.js";
import User from "../models/user.js";
import {
  ORGANIZATION_VERIFICATION_STATUSES,
  USER_ROLES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";

const organizationFields = [
  "_id",
  "name",
  "description",
  "contactEmail",
  "contactPhone",
  "addressText",
  "verificationStatus",
  "createdBy",
  "verifiedAt",
  "verifiedBy",
  "createdAt",
  "updatedAt"
];

const normalizeEmail = (email) => email.trim().toLowerCase();

const validateOrganizationInput = ({ name, contactEmail, addressText, contactPhone, description }) => {
  if (typeof name !== "string" || name.trim() === "") {
    throw createAppError("name is required", 400, "VALIDATION_ERROR");
  }

  if (typeof contactEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
    throw createAppError("contactEmail must be valid", 400, "VALIDATION_ERROR");
  }

  if (typeof addressText !== "string" || addressText.trim() === "") {
    throw createAppError("addressText is required", 400, "VALIDATION_ERROR");
  }

  for (const [field, value] of Object.entries({ description, contactPhone })) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      throw createAppError(`${field} must be a string`, 400, "VALIDATION_ERROR");
    }
  }
};

const toSafeOrganization = (organization) => {
  const source = typeof organization.toObject === "function"
    ? organization.toObject()
    : organization;

  return organizationFields.reduce((safeOrganization, field) => {
    if (source[field] !== undefined) {
      safeOrganization[field] = source[field];
    }
    return safeOrganization;
  }, {});
};

const ensureOrganizationAccess = (user, organization) => {
  if (user.role === USER_ROLES.ADMIN) {
    return;
  }

  if (user.role !== USER_ROLES.ORG_ADMIN
    || !user.organizationId
    || user.organizationId.toString() !== organization._id.toString()) {
    throw createAppError("You are not authorized to access this organization", 403, "UNAUTHORIZED");
  }
};

export const createOrganization = async (user, input) => {
  validateOrganizationInput(input);

  const session = await mongoose.startSession();

  try {
    let organization;

    await session.withTransaction(async () => {
      const currentUser = await User.findById(user._id).session(session);

      if (!currentUser) {
        throw createAppError("User account was not found", 401, "UNAUTHENTICATED");
      }

      if (currentUser.role === USER_ROLES.ORG_ADMIN && currentUser.organizationId) {
        throw createAppError("User already belongs to an organization", 409, "CONFLICT");
      }

      organization = new Organization({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        contactEmail: normalizeEmail(input.contactEmail),
        contactPhone: input.contactPhone?.trim() || null,
        addressText: input.addressText.trim(),
        verificationStatus: ORGANIZATION_VERIFICATION_STATUSES.PENDING,
        createdBy: currentUser._id
      });

      await organization.save({ session });

      if (currentUser.role === USER_ROLES.ORG_ADMIN) {
        currentUser.organizationId = organization._id;
        await currentUser.save({ session });
      }
    });

    return toSafeOrganization(organization);
  } finally {
    await session.endSession();
  }
};

export const getOrganization = async (user, organizationId) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw createAppError("Organization not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, organization);
  return toSafeOrganization(organization);
};

export const updateOrganization = async (user, organizationId, updates) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw createAppError("Organization not found", 404, "NOT_FOUND");
  }

  ensureOrganizationAccess(user, organization);
  validateOrganizationInput({
    name: updates.name ?? organization.name,
    contactEmail: updates.contactEmail ?? organization.contactEmail,
    addressText: updates.addressText ?? organization.addressText,
    contactPhone: updates.contactPhone,
    description: updates.description
  });

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    organization.name = updates.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(updates, "description")) {
    organization.description = updates.description?.trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "contactEmail")) {
    organization.contactEmail = normalizeEmail(updates.contactEmail);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "contactPhone")) {
    organization.contactPhone = updates.contactPhone?.trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "addressText")) {
    organization.addressText = updates.addressText.trim();
  }

  await organization.save();
  return toSafeOrganization(organization);
};

export { toSafeOrganization };
