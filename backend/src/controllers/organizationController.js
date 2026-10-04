import {
  createOrganization,
  getOrganization,
  updateOrganization
} from "../services/organizationService.js";

export const create = async (req, res, next) => {
  try {
    const organization = await createOrganization(req.user, req.body);
    return res.status(201).json({ data: { organization } });
  } catch (error) {
    return next(error);
  }
};

export const get = async (req, res, next) => {
  try {
    const organization = await getOrganization(req.user, req.params.organizationId);
    return res.status(200).json({ data: { organization } });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const organization = await updateOrganization(
      req.user,
      req.params.organizationId,
      req.body
    );
    return res.status(200).json({ data: { organization } });
  } catch (error) {
    return next(error);
  }
};
