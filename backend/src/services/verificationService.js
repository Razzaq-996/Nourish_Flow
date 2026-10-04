import User from "../models/user.js";
import Organization from "../models/organization.js";
import {
  ORGANIZATION_VERIFICATION_STATUSES,
  USER_STATUSES
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { toSafeUser } from "./userService.js";
import { toSafeOrganization } from "./organizationService.js";

const userVerificationStatuses = [
  USER_STATUSES.ACTIVE,
  USER_STATUSES.REJECTED
];

const organizationVerificationStatuses = [
  ORGANIZATION_VERIFICATION_STATUSES.VERIFIED,
  ORGANIZATION_VERIFICATION_STATUSES.REJECTED
];

const ensurePending = (status, resourceName) => {
  if (status !== "PENDING" && status !== USER_STATUSES.PENDING_VERIFICATION) {
    throw createAppError(`${resourceName} is not pending verification`, 409, "CONFLICT");
  }
};

export const getPendingVerification = async () => {
  const [users, organizations] = await Promise.all([
    User.find({ status: USER_STATUSES.PENDING_VERIFICATION }).sort({ createdAt: 1 }),
    Organization.find({ verificationStatus: ORGANIZATION_VERIFICATION_STATUSES.PENDING }).sort({ createdAt: 1 })
  ]);

  return {
    users: users.map(toSafeUser),
    organizations: organizations.map(toSafeOrganization)
  };
};

export const updateUserVerification = async (userId, status, adminUser) => {
  if (!userVerificationStatuses.includes(status)) {
    throw createAppError("User verification status must be ACTIVE or REJECTED", 400, "VALIDATION_ERROR");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw createAppError("User not found", 404, "NOT_FOUND");
  }

  ensurePending(user.status, "User");
  user.status = status;
  user.verifiedAt = new Date();
  user.verifiedBy = adminUser._id;
  await user.save();

  return toSafeUser(user);
};

export const updateOrganizationVerification = async (organizationId, status, adminUser) => {
  if (!organizationVerificationStatuses.includes(status)) {
    throw createAppError("Organization verification status must be VERIFIED or REJECTED", 400, "VALIDATION_ERROR");
  }

  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw createAppError("Organization not found", 404, "NOT_FOUND");
  }

  ensurePending(organization.verificationStatus, "Organization");
  organization.verificationStatus = status;
  organization.verifiedAt = new Date();
  organization.verifiedBy = adminUser._id;
  await organization.save();

  return toSafeOrganization(organization);
};
