import {
  createDonation,
  getDonation,
  listDonations,
  publishDonation,
  updateDonation,
  withdrawDonation
} from "../services/donationService.js";

export const create = async (req, res, next) => {
  try {
    const donation = await createDonation(req.user, req.body);
    return res.status(201).json({ data: { donation } });
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listDonations(req.user, req.query);
    return res.status(200).json({ data: result.donations, pagination: result.pagination });
  } catch (error) {
    return next(error);
  }
};

export const get = async (req, res, next) => {
  try {
    const donation = await getDonation(req.user, req.params.donationId);
    return res.status(200).json({ data: { donation } });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const donation = await updateDonation(req.user, req.params.donationId, req.body);
    return res.status(200).json({ data: { donation } });
  } catch (error) {
    return next(error);
  }
};

export const publish = async (req, res, next) => {
  try {
    const donation = await publishDonation(req.user, req.params.donationId);
    return res.status(200).json({ data: { donation } });
  } catch (error) {
    return next(error);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    const donation = await withdrawDonation(req.user, req.params.donationId);
    return res.status(200).json({ data: { donation } });
  } catch (error) {
    return next(error);
  }
};
