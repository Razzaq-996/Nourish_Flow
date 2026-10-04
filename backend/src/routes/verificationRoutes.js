import { Router } from "express";
import {
  getPending,
  updateOrganization,
  updateUser
} from "../controllers/verificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateAllowedFields,
  validateEnumField,
  validateObjectId,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import {
  ORGANIZATION_VERIFICATION_STATUSES,
  USER_ROLES,
  USER_STATUSES
} from "../utils/constants.js";

const router = Router();
const adminOnly = [authenticate, authorizeRoles(USER_ROLES.ADMIN)];

router.get("/verifications", ...adminOnly, getPending);

router.patch(
  "/users/:userId/verification",
  ...adminOnly,
  validateObjectId("userId"),
  validateAllowedFields(["status"]),
  validateRequiredFields(["status"]),
  validateEnumField("status", [USER_STATUSES.ACTIVE, USER_STATUSES.REJECTED]),
  updateUser
);

router.patch(
  "/organizations/:organizationId/verification",
  ...adminOnly,
  validateObjectId("organizationId"),
  validateAllowedFields(["status"]),
  validateRequiredFields(["status"]),
  validateEnumField("status", [
    ORGANIZATION_VERIFICATION_STATUSES.VERIFIED,
    ORGANIZATION_VERIFICATION_STATUSES.REJECTED
  ]),
  updateOrganization
);

export default router;
