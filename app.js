import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { notFound } from "./backend/src/middleware/notFound.js";
import { errorHandler } from "./backend/src/middleware/errorMiddleware.js";
import authRoutes from "./backend/src/routes/authRoutes.js";
import userRoutes from "./backend/src/routes/userRoutes.js";
import organizationRoutes from "./backend/src/routes/organizationRoutes.js";
import verificationRoutes from "./backend/src/routes/verificationRoutes.js";
import donationRoutes from "./backend/src/routes/donationRoutes.js";
import foodRequestRoutes from "./backend/src/routes/foodrequestRoutes.js";
import matchingRoutes from "./backend/src/routes/matchingRoutes.js";
import assignmentRoutes from "./backend/src/routes/assignmentRoutes.js";
import analyticsRoutes from "./backend/src/routes/analyticsRoutes.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/organizations", organizationRoutes);
app.use("/admin", verificationRoutes);
app.use("/donations", donationRoutes);
app.use("/food-requests", foodRequestRoutes);
app.use("/matching", matchingRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Food Rescue API is running"
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;