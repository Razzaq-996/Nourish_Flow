import {
	acceptAssignment,
	cancelAssignment,
	completeAssignment,
	confirmDelivery,
	confirmPickup,
	createAssignment,
	getAssignment,
	listAssignments,
	rejectAssignment,
	startDelivery,
	startPickup,
	listAvailableVolunteers
} from "../services/assignmentService.js";

export const create = async (req, res, next) => {
	try {
		const assignment = await createAssignment(req.user, req.body);
		return res.status(201).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const list = async (req, res, next) => {
	try {
		const result = await listAssignments(req.user, req.query);
		return res.status(200).json({ data: result.assignments, pagination: result.pagination });
	} catch (error) {
		return next(error);
	}
};

export const get = async (req, res, next) => {
	try {
		const assignment = await getAssignment(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const accept = async (req, res, next) => {
	try {
		const assignment = await acceptAssignment(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const reject = async (req, res, next) => {
	try {
		const assignment = await rejectAssignment(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const cancel = async (req, res, next) => {
	try {
		const assignment = await cancelAssignment(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const pickupStart = async (req, res, next) => {
	try {
		const assignment = await startPickup(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const pickedUp = async (req, res, next) => {
	try {
		const assignment = await confirmPickup(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const deliveryStart = async (req, res, next) => {
	try {
		const assignment = await startDelivery(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const delivered = async (req, res, next) => {
	try {
		const assignment = await confirmDelivery(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const complete = async (req, res, next) => {
	try {
		const assignment = await completeAssignment(req.user, req.params.assignmentId);
		return res.status(200).json({ data: { assignment } });
	} catch (error) {
		return next(error);
	}
};

export const getAvailableVolunteers = async (req, res, next) => {
	try {
		const volunteers = await listAvailableVolunteers();
		return res.status(200).json({ data: { volunteers } });
	} catch (error) {
		return next(error);
	}
};
