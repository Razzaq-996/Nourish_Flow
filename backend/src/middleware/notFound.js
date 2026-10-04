import { createAppError } from "./errorMiddleware.js";

export const notFound = (req, res, next) => {
  next(createAppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
};