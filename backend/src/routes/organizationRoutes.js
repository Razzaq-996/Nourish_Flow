import { Router } from "express";
import {
  create,
  get,
  update
} from "../controllers/organizationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateAllowedFields,
  validateObjectId,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const organizationRoles = [USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN];
const profileFields = ["name", "description", "contactEmail", "contactPhone", "addressText"];

router.post(
  "/",
  authenticate,
  authorizeRoles(...organizationRoles),
  validateAllowedFields(profileFields),
  validateRequiredFields(["name", "contactEmail", "addressText"]),
  create
);

router.get(
  "/:organizationId",
  authenticate,
  authorizeRoles(...organizationRoles),
  validateObjectId("organizationId"),
  get
);

router.patch(
  "/:organizationId",
  authenticate,
  authorizeRoles(...organizationRoles),
  validateObjectId("organizationId"),
  validateAllowedFields(profileFields),
  update
);

export default router;
