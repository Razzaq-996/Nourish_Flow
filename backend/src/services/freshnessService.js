import {
  DONATION_STATUSES,
  STATE_TRANSITIONS
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";
import { emitDonationEvent } from "./realtimeService.js";

const expirableStatuses = [
  DONATION_STATUSES.AVAILABLE,
  DONATION_STATUSES.PARTIALLY_ALLOCATED,
  DONATION_STATUSES.FULLY_ALLOCATED
];

export const isDonationExpired = (donation, now = new Date()) => (
  donation.expiresAt <= now
);

export const assertDonationNotExpired = (donation, message = "Donation has expired") => {
  if (isDonationExpired(donation)) {
    throw createAppError(message, 422, "INVALID_STATE_TRANSITION");
  }
};

export const markExpiredIfNeeded = async (donation, changedBy = null) => {
  if (!isDonationExpired(donation) || !expirableStatuses.includes(donation.status)) {
    return false;
  }

  if (!STATE_TRANSITIONS.DONATION[donation.status].includes(DONATION_STATUSES.EXPIRED)) {
    return false;
  }

  const previousStatus = donation.status;
  donation.status = DONATION_STATUSES.EXPIRED;
  donation.statusHistory.push({
    status: DONATION_STATUSES.EXPIRED,
    at: new Date(),
    changedBy
  });
  await donation.save();
  emitDonationEvent("donation:expired", donation);

  return previousStatus !== donation.status;
};
