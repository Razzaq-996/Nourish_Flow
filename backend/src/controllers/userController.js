import { updateCurrentUser } from "../services/userService.js";

export const updateMe = async (req, res, next) => {
  try {
    const user = await updateCurrentUser(req.user, req.body);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};
