/**
 * seed.js -- bootstrap the database with usable test accounts.
 *
 * Run:  node seed.js
 *
 * Creates (or skips if email already exists):
 *   admin@frp.dev        / Admin1234!   -- ADMIN  (ACTIVE)
 *   donor@frp.dev        / Donor1234!   -- DONOR  (ACTIVE)
 *   org@frp.dev          / OrgAd1234!   -- ORG_ADMIN (ACTIVE)
 *   volunteer@frp.dev    / Volun1234!   -- VOLUNTEER (ACTIVE)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./backend/src/models/user.js";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Check your .env file.");
  process.exit(1);
}

const seeds = [
  { name: "Platform Admin",  email: "admin@frp.dev",     password: "Admin1234!",  role: "ADMIN",     status: "ACTIVE" },
  { name: "Test Donor",      email: "donor@frp.dev",     password: "Donor1234!",  role: "DONOR",     status: "ACTIVE" },
  { name: "Test Org Admin",  email: "org@frp.dev",       password: "OrgAd1234!",  role: "ORG_ADMIN", status: "ACTIVE" },
  { name: "Test Volunteer",  email: "volunteer@frp.dev", password: "Volun1234!",  role: "VOLUNTEER", status: "ACTIVE" },
];

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");
  for (const seed of seeds) {
    const existing = await User.findOne({ email: seed.email });
    if (existing) {
      console.log("SKIP  " + seed.email + "  (already exists, status: " + existing.status + ")");
      continue;
    }
    const passwordHash = await bcrypt.hash(seed.password, 12);
    await User.create({ name: seed.name, email: seed.email, passwordHash, role: seed.role, status: seed.status, verifiedAt: new Date() });
    console.log("OK    " + seed.email + "  [" + seed.role + "]  password: " + seed.password);
  }
  console.log("\nDone. You can now log in with the credentials above.");
  await mongoose.disconnect();
}
run().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
