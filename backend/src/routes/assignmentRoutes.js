import { Router } from "express";
import {
	accept,
	cancel,
	complete,
	create,
	delivered,
	deliveryStart,
	get,
	list,
	pickedUp,
	pickupStart,
	reject,
	getAvailableVolunteers
} from "../controllers/assignmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
	validateAllowedFields,
	validateObjectId,
	validateRequiredFields
} from "../middleware/validationMiddleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();
const managementRoles = [USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN];
const viewRoles = [USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.VOLUNTEER, USER_ROLES.ADMIN];

router.post(
	"/",
	authenticate,
	authorizeRoles(...managementRoles),
	validateAllowedFields(["donationId", "requestId", "volunteerUserId", "quantity"]),
	validateRequiredFields(["donationId", "requestId", "volunteerUserId"]),
	validateObjectId("donationId", "body"),
	validateObjectId("requestId", "body"),
	validateObjectId("volunteerUserId", "body"),
	create
);

router.get(
	"/",
	authenticate,
	authorizeRoles(...viewRoles),
	list
);

router.get(
	"/volunteers/available",
	authenticate,
	authorizeRoles(...managementRoles),
	getAvailableVolunteers
);

router.get(
	"/:assignmentId",
	authenticate,
	authorizeRoles(...viewRoles),
	validateObjectId("assignmentId"),
	get
);

router.post(
	"/:assignmentId/accept",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	accept
);

router.post(
	"/:assignmentId/reject",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	reject
);

router.post(
	"/:assignmentId/cancel",
	authenticate,
	authorizeRoles(...viewRoles),
	validateObjectId("assignmentId"),
	cancel
);

router.post(
	"/:assignmentId/pickup-start",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	pickupStart
);

router.post(
	"/:assignmentId/picked-up",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	pickedUp
);

router.post(
	"/:assignmentId/delivery-start",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	deliveryStart
);

router.post(
	"/:assignmentId/delivered",
	authenticate,
	authorizeRoles(USER_ROLES.VOLUNTEER),
	validateObjectId("assignmentId"),
	delivered
);

router.post(
	"/:assignmentId/complete",
	authenticate,
	authorizeRoles(USER_ROLES.ORG_ADMIN, USER_ROLES.ADMIN),
	validateObjectId("assignmentId"),
	complete
);

export default router;
