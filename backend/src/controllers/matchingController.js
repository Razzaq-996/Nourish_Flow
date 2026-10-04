import { allocateDonation } from "../services/matchingService.js";

export const allocate = async (req, res, next) => {
  try {
    const allocation = await allocateDonation(req.user, req.body);
    return res.status(201).json({ data: { allocation } });
  } catch (error) {
    return next(error);
  }
};
