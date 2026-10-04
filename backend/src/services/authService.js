import bcrypt from "bcryptjs";
import User from "../models/user.js";
import {
  USER_ROLES,
  USER_STATUSES
} from "../utils/constants.js";
import { generateToken } from "../utils/generationToken.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { toSafeUser } from "./userService.js";

const publicRegistrationRoles = [
  USER_ROLES.DONOR,
  USER_ROLES.ORG_ADMIN,
  USER_ROLES.VOLUNTEER
];

const normalizeEmail = (email) => email.trim().toLowerCase();

const validateRegistrationInput = ({ name, email, password, role, phone }) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw createAppError("name is required", 400, "VALIDATION_ERROR");
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw createAppError("email must be valid", 400, "VALIDATION_ERROR");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw createAppError("password must be at least 8 characters", 400, "VALIDATION_ERROR");
  }

  if (!publicRegistrationRoles.includes(role)) {
    throw createAppError("Public registration is not available for this role", 400, "VALIDATION_ERROR");
  }

  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    throw createAppError("phone must be a string", 400, "VALIDATION_ERROR");
  }
};

export const registerUser = async ({ name, email, password, role, phone }) => {
  validateRegistrationInput({ name, email, password, role, phone });

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

  if (existingUser) {
    throw createAppError("A user with this email already exists", 409, "CONFLICT");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // DONOR and VOLUNTEER are trusted roles that can start immediately.
  // ORG_ADMIN must be verified by an admin before they can log in,
  // because their organisation will handle real food pickups and deliveries.
  const autoActivatedRoles = [USER_ROLES.DONOR, USER_ROLES.VOLUNTEER];
  const initialStatus = autoActivatedRoles.includes(role)
    ? USER_STATUSES.ACTIVE
    : USER_STATUSES.PENDING_VERIFICATION;

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    phone: phone?.trim() || null,
    status: initialStatus,
    verifiedAt: initialStatus === USER_STATUSES.ACTIVE ? new Date() : null,
  });

  return toSafeUser(user);
};


export const loginUser = async ({ email, password }) => {
  if (typeof email !== "string" || typeof password !== "string" || email.trim() === "" || password === "") {
    throw createAppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !validPassword) {
    throw createAppError("Invalid email or password", 401, "UNAUTHENTICATED");
  }

  if (user.status !== USER_STATUSES.ACTIVE) {
    throw createAppError("User account is not active", 403, "UNAUTHORIZED");
  }

  return {
    token: generateToken(user._id),
    user: toSafeUser(user)
  };
};
