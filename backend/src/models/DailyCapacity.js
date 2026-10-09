import mongoose from "mongoose";
import { ACTIVE_BOOKING_LIMIT } from "../constants.js";

const dailyCapacitySchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    localDate: { type: String, required: true },
    activeCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: ACTIVE_BOOKING_LIMIT,
    },
  },
  { timestamps: true },
);

dailyCapacitySchema.index({ mentorId: 1, localDate: 1 }, { unique: true });

const DailyCapacity = mongoose.model(
  "DailyCapacity",
  dailyCapacitySchema,
  "dailyCapacities",
);

export default DailyCapacity;
