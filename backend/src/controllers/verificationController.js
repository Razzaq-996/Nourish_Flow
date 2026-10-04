import {
  getPendingVerification,
  updateOrganizationVerification,
  updateUserVerification
} from "../services/verificationService.js";

export const getPending = async (req, res, next) => {
  try {
    const verification = await getPendingVerification();
    return res.status(200).json({ data: verification });
  } catch (error) {
    return next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await updateUserVerification(
      req.params.userId,
      req.body.status,
      req.user
    );
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const organization = await updateOrganizationVerification(
      req.params.organizationId,
      req.body.status,
      req.user
    );
    return res.status(200).json({ data: { organization } });
  } catch (error) {
    return next(error);
  }
};
