import {
  getPlatformAnalytics,
  getOrganizationAnalytics,
  getDonorAnalytics,
  getVolunteerAnalytics
} from "../services/analyticsService.js";
import { USER_ROLES } from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";

export const getPlatform = async (req, res, next) => {
  try {
    const analytics = await getPlatformAnalytics();
    return res.status(200).json({ data: analytics });
  } catch (error) {
    return next(error);
  }
};

export const getOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Authorization guard: Only ADMIN or the matching ORG_ADMIN
    if (req.user.role === USER_ROLES.ORG_ADMIN) {
      if (!req.user.organizationId || req.user.organizationId.toString() !== organizationId.toString()) {
        throw createAppError("You are not authorized to view analytics for this organization", 403, "UNAUTHORIZED");
      }
    } else if (req.user.role !== USER_ROLES.ADMIN) {
      throw createAppError("You are not authorized to view organization analytics", 403, "UNAUTHORIZED");
    }

    const analytics = await getOrganizationAnalytics(organizationId);
    return res.status(200).json({ data: analytics });
  } catch (error) {
    return next(error);
  }
};

export const getDonorMe = async (req, res, next) => {
  try {
    if (![USER_ROLES.DONOR, USER_ROLES.ADMIN].includes(req.user.role)) {
      throw createAppError("Only donors can access donor analytics", 403, "UNAUTHORIZED");
    }

    const analytics = await getDonorAnalytics(req.user);
    return res.status(200).json({ data: analytics });
  } catch (error) {
    return next(error);
  }
};

export const getVolunteerMe = async (req, res, next) => {
  try {
    if (req.user.role !== USER_ROLES.VOLUNTEER) {
      throw createAppError("Only volunteers can access volunteer analytics", 403, "UNAUTHORIZED");
    }

    const analytics = await getVolunteerAnalytics(req.user);
    return res.status(200).json({ data: analytics });
  } catch (error) {
    return next(error);
  }
};
