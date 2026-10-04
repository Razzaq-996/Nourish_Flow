import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("Database connection failed");
    throw error;
  }
};

export default connectDB;