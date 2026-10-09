import mongoose from "mongoose";
import { SUPPORTED_TIME_ZONES } from "../constants.js";

const availabilityWindowSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
  },
  { _id: false },
);

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    bio: { type: String, required: true, trim: true, maxlength: 1000 },
    subjects: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      validate: [
        (subjects) => subjects.length > 0,
        "At least one subject is required",
      ],
    },
    timezone: { type: String, required: true, enum: SUPPORTED_TIME_ZONES },
    availability: { type: [availabilityWindowSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

mentorSchema.index({ active: 1, name: 1 });

const Mentor = mongoose.model("Mentor", mentorSchema, "mentors");

export default Mentor;
