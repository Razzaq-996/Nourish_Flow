import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { USER_STATUSES } from "../utils/constants.js";
import { createAppError } from "./errorMiddleware.js";

export const authenticate = async (req, res, next) => {
	try {
		const authorization = req.get("authorization");
		const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);

		if (!tokenMatch) {
			return next(createAppError("Authentication required", 401, "UNAUTHENTICATED"));
		}

		if (!process.env.JWT_SECRET) {
			return next(createAppError("JWT authentication is not configured", 500, "INTERNAL_SERVER_ERROR"));
		}

		const payload = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
		const userId = payload.sub;

		if (!userId) {
			return next(createAppError("Invalid authentication token", 401, "UNAUTHENTICATED"));
		}

		const user = await User.findById(userId);

		if (!user) {
			return next(createAppError("User account was not found", 401, "UNAUTHENTICATED"));
		}

		if (user.status !== USER_STATUSES.ACTIVE) {
			return next(createAppError("User account is not active", 403, "UNAUTHORIZED"));
		}

		req.user = user;
		return next();
	} catch (error) {
		if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
			return next(createAppError("Invalid or expired authentication token", 401, "UNAUTHENTICATED"));
		}

		return next(error);
	}
};
