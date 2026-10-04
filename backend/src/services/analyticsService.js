import mongoose from "mongoose";
import User from "../models/user.js";
import Organization from "../models/organization.js";
import Donation from "../models/donation.js";
import FoodRequest from "../models/foodrequest.js";
import Assignment from "../models/assignment.js";
import {
  USER_ROLES,
  USER_STATUSES,
  ORGANIZATION_VERIFICATION_STATUSES,
  DONATION_STATUSES,
  FOOD_REQUEST_STATUSES,
  ASSIGNMENT_STATUSES,
  FOOD_CATEGORIES,
  UNITS
} from "../utils/constants.js";
import { createAppError } from "../middleware/errorMiddleware.js";

const DELIVERED_STATUSES = [
  ASSIGNMENT_STATUSES.DELIVERED,
  ASSIGNMENT_STATUSES.COMPLETED
];

/**
 * Helper to ensure an object has all keys of an enum initialized to 0
 */
const initEnumCounts = (enumValues) =>
  Object.values(enumValues).reduce((acc, val) => {
    acc[val] = 0;
    return acc;
  }, {});

/**
 * Convert an array of [{ _id: unit, total: n }] into a keyed object { MEALS: n, KILOGRAMS: n, ... }
 */
const mapUnitsToRecord = (groupedArray) => {
  const record = Object.values(UNITS).reduce((acc, u) => {
    acc[u] = 0;
    return acc;
  }, {});
  (groupedArray || []).forEach((item) => {
    if (item._id && record[item._id] !== undefined) {
      record[item._id] = Math.round(item.total * 100) / 100;
    }
  });
  return record;
};

// ─── A. Platform Analytics (ADMIN) ──────────────────────────────────────────

export const getPlatformAnalytics = async () => {
  const [
    userTotals,
    usersByRoleRaw,
    usersByStatusRaw,
    orgTotals,
    orgsByStatusRaw,
    donationTotals,
    donationsByStatusRaw,
    donationsByCategoryRaw,
    allocatedQuantityRaw,
    requestTotals,
    requestsByStatusRaw,
    requestedQuantityRaw,
    assignmentTotals,
    assignmentsByStatusRaw,
    deliveredQuantityRaw
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Organization.countDocuments(),
    Organization.aggregate([{ $group: { _id: "$verificationStatus", count: { $sum: 1 } } }]),
    Donation.countDocuments(),
    Donation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Donation.aggregate([{ $group: { _id: "$foodCategory", count: { $sum: 1 } } }]),
    Donation.aggregate([{ $group: { _id: "$unit", total: { $sum: "$allocatedQuantity" } } }]),
    FoodRequest.countDocuments(),
    FoodRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    FoodRequest.aggregate([{ $group: { _id: "$unit", total: { $sum: "$totalQuantity" } } }]),
    Assignment.countDocuments(),
    Assignment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Assignment.aggregate([
      { $match: { status: { $in: DELIVERED_STATUSES } } },
      { $group: { _id: "$unit", total: { $sum: "$quantity" } } }
    ])
  ]);

  // Map users by role
  const usersByRole = initEnumCounts(USER_ROLES);
  usersByRoleRaw.forEach((entry) => {
    if (entry._id && usersByRole[entry._id] !== undefined) {
      usersByRole[entry._id] = entry.count;
    }
  });

  // Map users by status
  const usersByStatus = initEnumCounts(USER_STATUSES);
  usersByStatusRaw.forEach((entry) => {
    if (entry._id && usersByStatus[entry._id] !== undefined) {
      usersByStatus[entry._id] = entry.count;
    }
  });

  // Map organizations by status
  const organizationsByStatus = initEnumCounts(ORGANIZATION_VERIFICATION_STATUSES);
  orgsByStatusRaw.forEach((entry) => {
    if (entry._id && organizationsByStatus[entry._id] !== undefined) {
      organizationsByStatus[entry._id] = entry.count;
    }
  });

  // Map donations by status
  const donationsByStatus = initEnumCounts(DONATION_STATUSES);
  donationsByStatusRaw.forEach((entry) => {
    if (entry._id && donationsByStatus[entry._id] !== undefined) {
      donationsByStatus[entry._id] = entry.count;
    }
  });

  // Map donations by category
  const donationsByCategory = initEnumCounts(FOOD_CATEGORIES);
  donationsByCategoryRaw.forEach((entry) => {
    if (entry._id && donationsByCategory[entry._id] !== undefined) {
      donationsByCategory[entry._id] = entry.count;
    }
  });

  // Map food requests by status
  const foodRequestsByStatus = initEnumCounts(FOOD_REQUEST_STATUSES);
  requestsByStatusRaw.forEach((entry) => {
    if (entry._id && foodRequestsByStatus[entry._id] !== undefined) {
      foodRequestsByStatus[entry._id] = entry.count;
    }
  });

  // Map assignments by status
  const assignmentsByStatus = initEnumCounts(ASSIGNMENT_STATUSES);
  assignmentsByStatusRaw.forEach((entry) => {
    if (entry._id && assignmentsByStatus[entry._id] !== undefined) {
      assignmentsByStatus[entry._id] = entry.count;
    }
  });

  const allocatedQuantityByUnit = mapUnitsToRecord(allocatedQuantityRaw);
  const requestedQuantityByUnit = mapUnitsToRecord(requestedQuantityRaw);
  const deliveredQuantityByUnit = mapUnitsToRecord(deliveredQuantityRaw);

  return {
    users: {
      total: userTotals,
      byRole: usersByRole,
      byStatus: usersByStatus
    },
    organizations: {
      total: orgTotals,
      byStatus: organizationsByStatus
    },
    donations: {
      total: donationTotals,
      byStatus: donationsByStatus,
      byCategory: donationsByCategory,
      allocatedQuantityByUnit
    },
    foodRequests: {
      total: requestTotals,
      byStatus: foodRequestsByStatus,
      requestedQuantityByUnit
    },
    assignments: {
      total: assignmentTotals,
      byStatus: assignmentsByStatus,
      pendingCount: assignmentsByStatus[ASSIGNMENT_STATUSES.PENDING] || 0,
      completedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.COMPLETED] || 0,
      failedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.FAILED] || 0,
      deliveredQuantityByUnit
    },
    quantities: {
      allocatedByUnit: allocatedQuantityByUnit,
      requestedByUnit: requestedQuantityByUnit,
      deliveredByUnit: deliveredQuantityByUnit
    }
  };
};

// ─── B. Organization Analytics (ORG_ADMIN) ──────────────────────────────────

export const getOrganizationAnalytics = async (organizationId) => {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);

  const organization = await Organization.findById(orgObjectId);
  if (!organization) {
    throw createAppError("Organization not found", 404, "NOT_FOUND");
  }

  // 1. Food Requests of this organization
  const [
    requestTotals,
    requestsByStatusRaw,
    requestedQuantityRaw,
    fulfilledQuantityRaw,
    orgRequests
  ] = await Promise.all([
    FoodRequest.countDocuments({ organizationId: orgObjectId }),
    FoodRequest.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    FoodRequest.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: "$unit", total: { $sum: "$totalQuantity" } } }
    ]),
    FoodRequest.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: "$unit", total: { $sum: "$fulfilledQuantity" } } }
    ]),
    FoodRequest.find({ organizationId: orgObjectId }).select("_id")
  ]);

  const requestIds = orgRequests.map((r) => r._id);

  // 2. Donations associated with this organization's requests (or donated by this org)
  const [donationsAssociatedCount, assignmentsByStatusRaw, deliveredQuantityRaw, recentAssignments] =
    await Promise.all([
      Donation.countDocuments({
        $or: [
          { "allocations.requestId": { $in: requestIds } },
          { donorOrganizationId: orgObjectId }
        ]
      }),
      Assignment.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Assignment.aggregate([
        { $match: { requestId: { $in: requestIds }, status: { $in: DELIVERED_STATUSES } } },
        { $group: { _id: "$unit", total: { $sum: "$quantity" } } }
      ]),
      Assignment.find({ requestId: { $in: requestIds } })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(6)
        .select("_id donationId requestId volunteerUserId quantity unit status assignedAt deliveredAt completedAt")
    ]);

  // Format statuses
  const requestsByStatus = initEnumCounts(FOOD_REQUEST_STATUSES);
  requestsByStatusRaw.forEach((entry) => {
    if (entry._id && requestsByStatus[entry._id] !== undefined) {
      requestsByStatus[entry._id] = entry.count;
    }
  });

  const assignmentsByStatus = initEnumCounts(ASSIGNMENT_STATUSES);
  let totalAssignments = 0;
  assignmentsByStatusRaw.forEach((entry) => {
    if (entry._id && assignmentsByStatus[entry._id] !== undefined) {
      assignmentsByStatus[entry._id] = entry.count;
      totalAssignments += entry.count;
    }
  });

  const requestedQuantityByUnit = mapUnitsToRecord(requestedQuantityRaw);
  const allocatedQuantityByUnit = mapUnitsToRecord(fulfilledQuantityRaw);
  const deliveredQuantityByUnit = mapUnitsToRecord(deliveredQuantityRaw);

  return {
    organization: {
      _id: organization._id,
      name: organization.name,
      verificationStatus: organization.verificationStatus
    },
    foodRequests: {
      total: requestTotals,
      byStatus: requestsByStatus,
      open: (requestsByStatus[FOOD_REQUEST_STATUSES.OPEN] || 0) + (requestsByStatus[FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED] || 0),
      fulfilled: requestsByStatus[FOOD_REQUEST_STATUSES.FULFILLED] || 0,
      expired: requestsByStatus[FOOD_REQUEST_STATUSES.EXPIRED] || 0,
      cancelled: requestsByStatus[FOOD_REQUEST_STATUSES.CANCELLED] || 0
    },
    quantities: {
      requestedByUnit: requestedQuantityByUnit,
      allocatedByUnit: allocatedQuantityByUnit,
      deliveredByUnit: deliveredQuantityByUnit
    },
    donationsAssociatedCount,
    assignments: {
      total: totalAssignments,
      byStatus: assignmentsByStatus,
      completedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.COMPLETED] || 0,
      failedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.FAILED] || 0,
      inTransitCount:
        (assignmentsByStatus[ASSIGNMENT_STATUSES.ACCEPTED] || 0) +
        (assignmentsByStatus[ASSIGNMENT_STATUSES.PICKUP_STARTED] || 0) +
        (assignmentsByStatus[ASSIGNMENT_STATUSES.PICKED_UP] || 0) +
        (assignmentsByStatus[ASSIGNMENT_STATUSES.DELIVERY_STARTED] || 0)
    },
    recentDeliveries: recentAssignments
  };
};

// ─── C. Donor Analytics (DONOR) ─────────────────────────────────────────────

export const getDonorAnalytics = async (user) => {
  const userObjectId = new mongoose.Types.ObjectId(user?._id || user);

  // Match condition for this donor's donations
  const matchFilter = { createdByUserId: userObjectId };

  const [
    totalDonations,
    donationsByStatusRaw,
    donationsByCategoryRaw,
    totalQuantityRaw,
    allocatedQuantityRaw,
    remainingQuantityRaw,
    donorDonations,
    recentDonations
  ] = await Promise.all([
    Donation.countDocuments(matchFilter),
    Donation.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Donation.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$foodCategory", count: { $sum: 1 } } }
    ]),
    Donation.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$unit", total: { $sum: "$totalQuantity" } } }
    ]),
    Donation.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$unit", total: { $sum: "$allocatedQuantity" } } }
    ]),
    Donation.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$unit", total: { $sum: "$remainingQuantity" } } }
    ]),
    Donation.find(matchFilter).select("_id"),
    Donation.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .select("_id foodCategory description totalQuantity allocatedQuantity remainingQuantity unit status expiresAt createdAt")
  ]);

  const donationIds = donorDonations.map((d) => d._id);

  // Derive delivered quantity strictly from Assignment records for this donor's donations
  const deliveredQuantityRaw = await Assignment.aggregate([
    { $match: { donationId: { $in: donationIds }, status: { $in: DELIVERED_STATUSES } } },
    { $group: { _id: "$unit", total: { $sum: "$quantity" } } }
  ]);

  const donationsByStatus = initEnumCounts(DONATION_STATUSES);
  donationsByStatusRaw.forEach((entry) => {
    if (entry._id && donationsByStatus[entry._id] !== undefined) {
      donationsByStatus[entry._id] = entry.count;
    }
  });

  const donationsByCategory = initEnumCounts(FOOD_CATEGORIES);
  donationsByCategoryRaw.forEach((entry) => {
    if (entry._id && donationsByCategory[entry._id] !== undefined) {
      donationsByCategory[entry._id] = entry.count;
    }
  });

  return {
    totalDonations,
    donationsByStatus,
    donationsByCategory,
    donations: {
      total: totalDonations,
      byStatus: donationsByStatus,
      byCategory: donationsByCategory
    },
    quantities: {
      donatedByUnit: mapUnitsToRecord(totalQuantityRaw),
      allocatedByUnit: mapUnitsToRecord(allocatedQuantityRaw),
      remainingByUnit: mapUnitsToRecord(remainingQuantityRaw),
      deliveredByUnit: mapUnitsToRecord(deliveredQuantityRaw)
    },
    recentDonations
  };
};

// ─── D. Volunteer Analytics (VOLUNTEER) ──────────────────────────────────────

export const getVolunteerAnalytics = async (user) => {
  const volunteerObjectId = new mongoose.Types.ObjectId(user?._id || user);
  const matchFilter = { volunteerUserId: volunteerObjectId };

  const [totalAssignments, assignmentsByStatusRaw, deliveredQuantityRaw, recentAssignments] =
    await Promise.all([
      Assignment.countDocuments(matchFilter),
      Assignment.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Assignment.aggregate([
        { $match: { ...matchFilter, status: { $in: DELIVERED_STATUSES } } },
        { $group: { _id: "$unit", total: { $sum: "$quantity" } } }
      ]),
      Assignment.find(matchFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(6)
        .select("_id donationId requestId quantity unit status assignedAt acceptedAt deliveredAt completedAt")
    ]);

  const assignmentsByStatus = initEnumCounts(ASSIGNMENT_STATUSES);
  assignmentsByStatusRaw.forEach((entry) => {
    if (entry._id && assignmentsByStatus[entry._id] !== undefined) {
      assignmentsByStatus[entry._id] = entry.count;
    }
  });

  return {
    totalAssignments,
    assignmentsByStatus,
    assignments: {
      total: totalAssignments,
      byStatus: assignmentsByStatus,
      pending: assignmentsByStatus[ASSIGNMENT_STATUSES.PENDING] || 0,
      accepted: assignmentsByStatus[ASSIGNMENT_STATUSES.ACCEPTED] || 0,
      completed:
        (assignmentsByStatus[ASSIGNMENT_STATUSES.COMPLETED] || 0) +
        (assignmentsByStatus[ASSIGNMENT_STATUSES.DELIVERED] || 0),
      failed: assignmentsByStatus[ASSIGNMENT_STATUSES.FAILED] || 0,
      rejectedOrCancelled:
        (assignmentsByStatus[ASSIGNMENT_STATUSES.REJECTED] || 0) +
        (assignmentsByStatus[ASSIGNMENT_STATUSES.CANCELLED] || 0)
    },
    pendingCount: assignmentsByStatus[ASSIGNMENT_STATUSES.PENDING] || 0,
    acceptedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.ACCEPTED] || 0,
    inTransitCount:
      (assignmentsByStatus[ASSIGNMENT_STATUSES.PICKUP_STARTED] || 0) +
      (assignmentsByStatus[ASSIGNMENT_STATUSES.PICKED_UP] || 0) +
      (assignmentsByStatus[ASSIGNMENT_STATUSES.DELIVERY_STARTED] || 0),
    deliveredCount: assignmentsByStatus[ASSIGNMENT_STATUSES.DELIVERED] || 0,
    completedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.COMPLETED] || 0,
    failedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.FAILED] || 0,
    rejectedCount: assignmentsByStatus[ASSIGNMENT_STATUSES.REJECTED] || 0,
    cancelledCount: assignmentsByStatus[ASSIGNMENT_STATUSES.CANCELLED] || 0,
    quantities: {
      deliveredByUnit: mapUnitsToRecord(deliveredQuantityRaw)
    },
    recentAssignments
  };
};
