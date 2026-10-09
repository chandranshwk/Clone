import mongoose from "mongoose";
import { BOOKING_STATUSES } from "../constants.js";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
      index: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
      index: true,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    timezone: { type: String, required: true },
    localDate: { type: String, required: true },
    localStartTime: { type: String, required: true },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "active",
      required: true,
    },
    cancelledAt: { type: Date, default: null },
    cancelledByRole: {
      type: String,
      enum: ["parent", "mentor", null],
      default: null,
    },
  },
  { timestamps: true },
);

bookingSchema.index({ mentorId: 1, localDate: 1, status: 1 });
bookingSchema.index(
  { mentorId: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

const Booking = mongoose.model("Booking", bookingSchema, "bookings");

export default Booking;
