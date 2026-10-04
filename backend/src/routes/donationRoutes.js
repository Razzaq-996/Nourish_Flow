import { Router } from "express";
import {
  create,
  get,
  list,
  publish,
  update,
  withdraw
} from "../controllers/donationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateAllowedFields,
  validateObjectId,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const donationRoles = [USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN];
const creationFields = [
  "donorOrganizationId",
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "pickupLocation",
  "availableFrom",
  "availableUntil",
  "preparedAt",
  "expiresAt"
];
const updateFields = [
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "pickupLocation",
  "availableFrom",
  "availableUntil",
  "preparedAt",
  "expiresAt"
];

router.post(
  "/",
  authenticate,
  authorizeRoles(...donationRoles),
  validateAllowedFields(creationFields),
  validateRequiredFields([
    "foodCategory",
    "totalQuantity",
    "unit",
    "pickupLocation",
    "availableFrom",
    "availableUntil",
    "expiresAt"
  ]),
  create
);

router.get(
  "/",
  authenticate,
  authorizeRoles(...donationRoles),
  list
);

router.get(
  "/:donationId",
  authenticate,
  authorizeRoles(...donationRoles),
  validateObjectId("donationId"),
  get
);

router.patch(
  "/:donationId",
  authenticate,
  authorizeRoles(...donationRoles),
  validateObjectId("donationId"),
  validateAllowedFields(updateFields),
  update
);

router.post(
  "/:donationId/publish",
  authenticate,
  authorizeRoles(...donationRoles),
  validateObjectId("donationId"),
  publish
);

router.post(
  "/:donationId/withdraw",
  authenticate,
  authorizeRoles(...donationRoles),
  validateObjectId("donationId"),
  withdraw
);

export default router;
