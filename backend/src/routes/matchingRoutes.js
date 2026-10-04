import { Router } from "express";
import { allocate } from "../controllers/matchingController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateAllowedFields,
  validateObjectId,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const matchingRoles = [USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN];

router.post(
  "/allocations",
  authenticate,
  authorizeRoles(...matchingRoles),
  validateAllowedFields(["donationId", "requestId", "quantity"]),
  validateRequiredFields(["donationId"]),
  validateObjectId("donationId", "body"),
  allocate
);

export default router;
