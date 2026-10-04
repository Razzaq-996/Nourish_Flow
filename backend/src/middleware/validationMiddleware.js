import mongoose from "mongoose";
import { createAppError } from "./errorMiddleware.js";

const getSource = (req, source) => req[source] || {};
const validationError = (message) => createAppError(message, 400, "VALIDATION_ERROR");

export const validateRequiredFields = (fields, source = "body") => (req, res, next) => {
  const values = getSource(req, source);
  const missingFields = fields.filter((field) => (
    values[field] === undefined || values[field] === null || values[field] === ""
  ));

  if (missingFields.length > 0) {
    return next(validationError(`Missing required fields: ${missingFields.join(", ")}`));
  }

  return next();
};

export const validateAllowedFields = (fields, source = "body") => (req, res, next) => {
  const values = getSource(req, source);
  const allowedFields = new Set(fields);
  const unexpectedFields = Object.keys(values).filter((field) => !allowedFields.has(field));

  if (unexpectedFields.length > 0) {
    return next(validationError(`Unexpected fields: ${unexpectedFields.join(", ")}`));
  }

  return next();
};

export const validateObjectId = (field, source = "params") => (req, res, next) => {
  const value = getSource(req, source)[field];

  if (!mongoose.isObjectIdOrHexString(value)) {
    return next(validationError(`${field} must be a valid ObjectId`));
  }

  return next();
};

export const validateEnumField = (field, allowedValues, source = "body") => (req, res, next) => {
  const value = getSource(req, source)[field];

  if (value !== undefined && !allowedValues.includes(value)) {
    return next(validationError(`${field} must be one of: ${allowedValues.join(", ")}`));
  }

  return next();
};

export const validateDateField = (field, source = "body", options = {}) => (req, res, next) => {
  const value = getSource(req, source)[field];

  if (value === undefined || value === null || value === "") {
    if (options.required) {
      return next(validationError(`${field} is required`));
    }

    return next();
  }

  if (Number.isNaN(Date.parse(value))) {
    return next(validationError(`${field} must be a valid date`));
  }

  return next();
};