import { Router } from "express";
import { updateMe } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  validateAllowedFields,
  validateEnumField
} from "../middleware/validationMiddleware.js";
import { VOLUNTEER_AVAILABILITY_STATUSES } from "../utils/constants.js";

const router = Router();

router.patch(
  "/me",
  authenticate,
  validateAllowedFields([
    "name",
    "phone",
    "availabilityStatus",
    "currentLocation",
    "maxTravelDistanceKm"
  ]),
  validateEnumField(
    "availabilityStatus",
    Object.values(VOLUNTEER_AVAILABILITY_STATUSES)
  ),
  updateMe
);

export default router;
