import { createAppError } from "./errorMiddleware.js";

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
	if (!req.user) {
		return next(createAppError("Authentication required", 401, "UNAUTHENTICATED"));
	}

	if (!allowedRoles.includes(req.user.role)) {
		return next(createAppError("You are not authorized to perform this action", 403, "UNAUTHORIZED"));
	}

	return next();
};
