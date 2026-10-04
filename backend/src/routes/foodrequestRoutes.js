import { Router } from "express";
import {
  cancel,
  create,
  get,
  list,
  open,
  update
} from "../controllers/foodrequestController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateAllowedFields,
  validateObjectId,
  validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const requestRoles = [USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN];
const editableFields = [
  "foodCategory",
  "description",
  "totalQuantity",
  "unit",
  "deliveryLocation",
  "neededBy"
];

router.post(
  "/",
  authenticate,
  authorizeRoles(...requestRoles),
  validateAllowedFields(editableFields),
  validateRequiredFields([
    "foodCategory",
    "totalQuantity",
    "unit",
    "deliveryLocation",
    "neededBy"
  ]),
  create
);

router.get(
  "/",
  authenticate,
  authorizeRoles(...requestRoles),
  list
);

router.get(
  "/:requestId",
  authenticate,
  authorizeRoles(...requestRoles),
  validateObjectId("requestId"),
  get
);

router.patch(
  "/:requestId",
  authenticate,
  authorizeRoles(...requestRoles),
  validateObjectId("requestId"),
  validateAllowedFields(editableFields),
  update
);

router.post(
  "/:requestId/open",
  authenticate,
  authorizeRoles(...requestRoles),
  validateObjectId("requestId"),
  open
);

router.post(
  "/:requestId/cancel",
  authenticate,
  authorizeRoles(...requestRoles),
  validateObjectId("requestId"),
  cancel
);

export default router;
