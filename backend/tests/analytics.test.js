import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import mongoose from "mongoose";
import app from "../../app.js";
import User from "../src/models/user.js";
import Organization from "../src/models/organization.js";
import Donation from "../src/models/donation.js";
import FoodRequest from "../src/models/foodrequest.js";
import Assignment from "../src/models/assignment.js";
import { generateToken } from "../src/utils/generationToken.js";
import {
  getPlatformAnalytics,
  getOrganizationAnalytics,
  getDonorAnalytics,
  getVolunteerAnalytics
} from "../src/services/analyticsService.js";
import {
  USER_ROLES,
  USER_STATUSES,
  ORGANIZATION_VERIFICATION_STATUSES,
  FOOD_CATEGORIES,
  UNITS,
  DONATION_STATUSES,
  FOOD_REQUEST_STATUSES,
  ASSIGNMENT_STATUSES
} from "../src/utils/constants.js";

let server;
let baseUrl;

let adminUser;
let adminToken;
let donorUser;
let donorToken;
let orgAdminUser;
let orgAdminToken;
let volunteerUser;
let volunteerToken;
let testOrg;
let otherOrg;

before(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // Find or create test entities
  adminUser = await User.findOne({ email: "admin@frp.dev" });
  if (!adminUser) {
    adminUser = await User.create({
      name: "Admin Tester",
      email: "admin-analytics-test@frp.dev",
      passwordHash: "hashed",
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE
    });
  }
  adminToken = generateToken(adminUser._id);

  donorUser = await User.findOne({ email: "donor@frp.dev" });
  if (!donorUser) {
    donorUser = await User.create({
      name: "Donor Tester",
      email: "donor-analytics-test@frp.dev",
      passwordHash: "hashed",
      role: USER_ROLES.DONOR,
      status: USER_STATUSES.ACTIVE
    });
  }
  donorToken = generateToken(donorUser._id);

  testOrg = await Organization.findOne({ name: "Analytics Test Organization" });
  if (!testOrg) {
    testOrg = await Organization.create({
      name: "Analytics Test Organization",
      contactEmail: "testorg-analytics@frp.dev",
      contactPhone: "+1234567890",
      addressText: "123 Test St, Testville, TS 12345",
      verificationStatus: ORGANIZATION_VERIFICATION_STATUSES.VERIFIED,
      createdBy: adminUser._id
    });
  }

  otherOrg = await Organization.findOne({ name: "Other Test Organization" });
  if (!otherOrg) {
    otherOrg = await Organization.create({
      name: "Other Test Organization",
      contactEmail: "otherorg-analytics@frp.dev",
      contactPhone: "+1234567899",
      addressText: "456 Other St, Otherville, TS 12346",
      verificationStatus: ORGANIZATION_VERIFICATION_STATUSES.VERIFIED,
      createdBy: adminUser._id
    });
  }

  orgAdminUser = await User.findOne({ email: "org@frp.dev" });
  if (!orgAdminUser) {
    orgAdminUser = await User.create({
      name: "OrgAdmin Tester",
      email: "orgadmin-analytics-test@frp.dev",
      passwordHash: "hashed",
      role: USER_ROLES.ORG_ADMIN,
      status: USER_STATUSES.ACTIVE,
      organizationId: testOrg._id
    });
  } else if (!orgAdminUser.organizationId) {
    orgAdminUser.organizationId = testOrg._id;
    await orgAdminUser.save();
  }
  orgAdminToken = generateToken(orgAdminUser._id);

  volunteerUser = await User.findOne({ email: "volunteer@frp.dev" });
  if (!volunteerUser) {
    volunteerUser = await User.create({
      name: "Volunteer Tester",
      email: "volunteer-analytics-test@frp.dev",
      passwordHash: "hashed",
      role: USER_ROLES.VOLUNTEER,
      status: USER_STATUSES.ACTIVE
    });
  }
  volunteerToken = generateToken(volunteerUser._id);

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe("Analytics Module Verification", () => {
  test("1. ADMIN can access platform analytics", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/platform`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data);
    assert.ok("users" in body.data);
    assert.ok("organizations" in body.data);
    assert.ok("donations" in body.data);
    assert.ok("foodRequests" in body.data);
    assert.ok("assignments" in body.data);
    assert.ok("quantities" in body.data);
    assert.ok(typeof body.data.users.total === "number");
  });

  test("2. Non-admin users cannot access platform analytics", async () => {
    const donorRes = await fetch(`${baseUrl}/api/analytics/platform`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    assert.equal(donorRes.status, 403);

    const volunteerRes = await fetch(`${baseUrl}/api/analytics/platform`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    assert.equal(volunteerRes.status, 403);
  });

  test("3. ORG_ADMIN can access their own organization's analytics", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/organizations/${orgAdminUser.organizationId}`, {
      headers: { Authorization: `Bearer ${orgAdminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data);
    assert.ok("foodRequests" in body.data);
    assert.ok("quantities" in body.data);
    assert.ok("assignments" in body.data);
  });

  test("4. ORG_ADMIN cannot access another organization's analytics", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/organizations/${otherOrg._id}`, {
      headers: { Authorization: `Bearer ${orgAdminToken}` }
    });
    assert.equal(res.status, 403);
  });

  test("5. ADMIN can access any organization's analytics", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/organizations/${testOrg._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
  });

  test("6. DONOR can access own analytics via /api/analytics/donors/me", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/donors/me`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data);
    assert.ok("donations" in body.data);
    assert.ok("quantities" in body.data);
  });

  test("7. VOLUNTEER can access own analytics via /api/analytics/volunteers/me", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/volunteers/me`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data);
    assert.ok("assignments" in body.data);
    assert.ok("quantities" in body.data);
  });

  test("8. Empty collections/empty queries return safe zero-valued metrics", async () => {
    const nonExistentUserId = new mongoose.Types.ObjectId();
    const metrics = await getDonorAnalytics(nonExistentUserId);
    assert.equal(metrics.donations.total, 0);
    assert.equal(metrics.donations.byStatus.AVAILABLE, 0);
    assert.equal(metrics.quantities.donatedByUnit.MEALS, 0);
    assert.equal(metrics.quantities.allocatedByUnit.KILOGRAMS, 0);
    assert.equal(metrics.quantities.remainingByUnit.LITERS, 0);
    assert.equal(metrics.quantities.deliveredByUnit.BOXES, 0);
    assert.deepEqual(metrics.recentDonations, []);
  });

  test("9. Allocated quantities are NOT incorrectly counted as delivered", async () => {
    // Create an isolated test donor
    const sampleDonor = await User.create({
      name: "Quantity Test Donor",
      email: `qty-donor-${Date.now()}@frp.dev`,
      passwordHash: "dummy",
      role: USER_ROLES.DONOR,
      status: USER_STATUSES.ACTIVE
    });

    const now = new Date();
    const dummyAllocRequestId = new mongoose.Types.ObjectId();
    const sampleDonation = await Donation.create({
      createdByUserId: sampleDonor._id,
      foodCategory: FOOD_CATEGORIES.PRODUCE,
      totalQuantity: 100,
      allocatedQuantity: 50,
      remainingQuantity: 50,
      allocations: [
        {
          requestId: dummyAllocRequestId,
          quantity: 50,
          createdBy: sampleDonor._id
        }
      ],
      unit: UNITS.KILOGRAMS,
      status: DONATION_STATUSES.PARTIALLY_ALLOCATED,
      pickupLocation: {
        type: "Point",
        coordinates: [0, 0]
      },
      availableFrom: now,
      availableUntil: new Date(now.getTime() + 86400000),
      expiresAt: new Date(now.getTime() + 86400000 * 2)
    });

    const donorMetrics = await getDonorAnalytics(sampleDonor._id);

    // Allocated should be 50, but Delivered should be 0 (no completed assignment exists)
    assert.equal(donorMetrics.quantities.allocatedByUnit.KILOGRAMS, 50);
    assert.equal(donorMetrics.quantities.deliveredByUnit.KILOGRAMS, 0);

    // Cleanup
    await Donation.findByIdAndDelete(sampleDonation._id);
    await User.findByIdAndDelete(sampleDonor._id);
  });

  test("10. Delivered quantities use the actual assignment lifecycle data", async () => {
    const sampleVolunteer = await User.create({
      name: "Delivery Test Volunteer",
      email: `del-vol-${Date.now()}@frp.dev`,
      passwordHash: "dummy",
      role: USER_ROLES.VOLUNTEER,
      status: USER_STATUSES.ACTIVE
    });

    const dummyDonationId = new mongoose.Types.ObjectId();
    const dummyRequestId1 = new mongoose.Types.ObjectId();
    const dummyRequestId2 = new mongoose.Types.ObjectId();
    const dummyCreatorId = new mongoose.Types.ObjectId();

    // Assignment 1: In progress (ACCEPTED) with 25 MEALS -> should NOT be counted as delivered
    const activeAssignment = await Assignment.create({
      donationId: dummyDonationId,
      requestId: dummyRequestId1,
      volunteerUserId: sampleVolunteer._id,
      createdByUserId: dummyCreatorId,
      status: ASSIGNMENT_STATUSES.ACCEPTED,
      quantity: 25,
      unit: UNITS.MEALS
    });

    // Assignment 2: Delivered (DELIVERED) with 75 MEALS -> SHOULD be counted as delivered
    const deliveredAssignment = await Assignment.create({
      donationId: dummyDonationId,
      requestId: dummyRequestId2,
      volunteerUserId: sampleVolunteer._id,
      createdByUserId: dummyCreatorId,
      status: ASSIGNMENT_STATUSES.DELIVERED,
      quantity: 75,
      unit: UNITS.MEALS
    });

    const volunteerMetrics = await getVolunteerAnalytics(sampleVolunteer._id);

    assert.equal(volunteerMetrics.assignments.total, 2);
    assert.equal(volunteerMetrics.assignments.accepted, 1);
    assert.equal(volunteerMetrics.assignments.completed, 1);
    assert.equal(volunteerMetrics.quantities.deliveredByUnit.MEALS, 75);

    // Cleanup
    await Assignment.deleteMany({ _id: { $in: [activeAssignment._id, deliveredAssignment._id] } });
    await User.findByIdAndDelete(sampleVolunteer._id);
  });

  test("11. Different physical units are not combined into misleading totals", async () => {
    const platform = await getPlatformAnalytics();
    // Quantities must be an object with unit keys, not a single scalar number
    assert.ok(typeof platform.quantities.allocatedByUnit === "object");
    assert.ok(typeof platform.quantities.deliveredByUnit === "object");

    for (const unit of Object.values(UNITS)) {
      assert.ok(unit in platform.quantities.allocatedByUnit);
      assert.ok(unit in platform.quantities.deliveredByUnit);
      assert.equal(typeof platform.quantities.allocatedByUnit[unit], "number");
      assert.equal(typeof platform.quantities.deliveredByUnit[unit], "number");
    }
  });

  test("12. Existing application routes and authentication remain fully functional", async () => {
    // Check GET /auth/me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(meRes.status, 200);

    // Check GET /donations with limit
    const donationsRes = await fetch(`${baseUrl}/donations?limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(donationsRes.status, 200);
  });
});
