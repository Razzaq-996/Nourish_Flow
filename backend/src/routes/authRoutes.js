import { Router } from "express";
import {
  login,
  me,
  register
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  validateAllowedFields,
  validateEnumField,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const publicRoles = [USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.VOLUNTEER];

router.post(
  "/register",
  validateAllowedFields(["name", "email", "password", "role", "phone"]),
  validateRequiredFields(["name", "email", "password", "role"]),
  validateEnumField("role", publicRoles),
  register
);

router.post(
  "/login",
  validateAllowedFields(["email", "password"]),
  validateRequiredFields(["email", "password"]),
  login
);

router.get("/me", authenticate, me);

export default router;
