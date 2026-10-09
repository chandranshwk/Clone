import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import DailyCapacity from "../models/DailyCapacity.js";
import Mentor from "../models/Mentor.js";
import Parent from "../models/Parent.js";

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error("MONGODB_URI is required before connecting to MongoDB");
  }

  await mongoose.connect(uri);
  await Promise.all(
    [Mentor, Parent, Booking, DailyCapacity].map((model) => model.init()),
  );
  return mongoose.connection;
}
