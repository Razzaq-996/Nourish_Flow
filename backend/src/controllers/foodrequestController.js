import {
  cancelFoodRequest,
  createFoodRequest,
  getFoodRequest,
  listFoodRequests,
  openFoodRequest,
  updateFoodRequest
} from "../services/foodRequestService.js";

export const create = async (req, res, next) => {
  try {
    const request = await createFoodRequest(req.user, req.body);
    return res.status(201).json({ data: { request } });
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listFoodRequests(req.user, req.query);
    return res.status(200).json({ data: result.requests, pagination: result.pagination });
  } catch (error) {
    return next(error);
  }
};

export const get = async (req, res, next) => {
  try {
    const request = await getFoodRequest(req.user, req.params.requestId);
    return res.status(200).json({ data: { request } });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const request = await updateFoodRequest(req.user, req.params.requestId, req.body);
    return res.status(200).json({ data: { request } });
  } catch (error) {
    return next(error);
  }
};

export const open = async (req, res, next) => {
  try {
    const request = await openFoodRequest(req.user, req.params.requestId);
    return res.status(200).json({ data: { request } });
  } catch (error) {
    return next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const request = await cancelFoodRequest(req.user, req.params.requestId);
    return res.status(200).json({ data: { request } });
  } catch (error) {
    return next(error);
  }
};
