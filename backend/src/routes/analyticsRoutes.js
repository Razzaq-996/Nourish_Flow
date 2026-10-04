import { Router } from "express";
import {
  getPlatform,
  getOrganization,
  getDonorMe,
  getVolunteerMe
} from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { validateObjectId } from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();

// 1. Platform Analytics — ADMIN only
router.get(
  "/platform",
  authenticate,
  authorizeRoles(USER_ROLES.ADMIN),
  getPlatform
);

// 2. Organization Analytics — ORG_ADMIN (for their own org) & ADMIN
router.get(
  "/organizations/:organizationId",
  authenticate,
  authorizeRoles(USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN),
  validateObjectId("organizationId"),
  getOrganization
);

// 3. Donor Analytics — DONOR only
router.get(
  "/donors/me",
  authenticate,
  authorizeRoles(USER_ROLES.DONOR, USER_ROLES.ADMIN),
  getDonorMe
);

// 4. Volunteer Analytics — VOLUNTEER only
router.get(
  "/volunteers/me",
  authenticate,
  authorizeRoles(USER_ROLES.VOLUNTEER),
  getVolunteerMe
);

export default router;
