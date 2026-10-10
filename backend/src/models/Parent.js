import mongoose from "mongoose";
import { SUPPORTED_TIME_ZONES } from "../constants.js";

const parentSchema = new mongoose.Schema(
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
    timezone: {
      type: String,
      required: true,
      enum: SUPPORTED_TIME_ZONES,
      default: "UTC",
    },
  },
  { timestamps: true },
);

const Parent = mongoose.model("Parent", parentSchema, "parents");

export default Parent;
