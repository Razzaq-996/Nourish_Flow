export const createAppError = (message, statusCode = 500, code = "INTERNAL_SERVER_ERROR") => {
	const error = new Error(message);
	error.statusCode = statusCode;
	error.code = code;
	return error;
};

export const errorHandler = (error, req, res, next) => {
	let statusCode = error.statusCode || 500;
	let code = error.code || "INTERNAL_SERVER_ERROR";
	let message = error.message || "An unexpected server error occurred";

	if (error.name === "ValidationError") {
		statusCode = 400;
		code = "VALIDATION_ERROR";
		message = "Request validation failed";
	} else if (error.code === 11000) {
		statusCode = 409;
		code = "CONFLICT";
		message = "A record with the provided unique value already exists";
	} else if (error.name === "CastError") {
		statusCode = 400;
		code = "VALIDATION_ERROR";
		message = "One or more request values are invalid";
	}

	const response = {
		error: {
			code,
			message
		}
	};

	if (process.env.NODE_ENV !== "production" && error.name === "ValidationError") {
		response.error.details = Object.values(error.errors).map((validationError) => ({
			field: validationError.path,
			message: validationError.message
		}));
	}

	if (process.env.NODE_ENV !== "production" && statusCode >= 500) {
		response.error.details = error.message;
	}

	return res.status(statusCode).json(response);
};
