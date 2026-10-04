import {
  loginUser,
  registerUser
} from "../services/authService.js";
import { getCurrentUser } from "../services/userService.js";

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
};

export const me = (req, res) => res.status(200).json({
  data: { user: getCurrentUser(req.user) }
});
