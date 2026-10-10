import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ACTIVE_BOOKING_LIMIT } from "../constants.js";
import ApiError from "../errors/ApiError.js";
import Booking from "../models/Booking.js";
import DailyCapacity from "../models/DailyCapacity.js";
import Mentor from "../models/Mentor.js";
import { assertWithinAvailability, parseStartAt } from "../utils/time.js";
import {
  mentorBookingEmail,
  parentBookingEmail,
} from "../emails/bookingConfirmation.js";
import Parent from "../models/Parent.js";
import { sendMail } from "../lib/mailer.js";

async function ensureDailyCapacity(mentorId, localDate) {
  try {
    await DailyCapacity.updateOne(
      { mentorId, localDate },
      { $setOnInsert: { mentorId, localDate, activeCount: 0 } },
      { upsert: true, runValidators: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

async function notifyBookingCreated({ booking, mentor, parent }) {
  const parentContent = parentBookingEmail({ parent, mentor, booking });
  const mentorContent = mentorBookingEmail({ parent, mentor, booking });

  const results = await Promise.allSettled([
    sendMail({ to: parent.email, ...parentContent }),
    sendMail({ to: mentor.email, ...mentorContent }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[booking] email send failed:", result.reason);
    }
  }
}

export async function createBooking({ parentId, mentorId, startAt }) {
  if (!mongoose.isValidObjectId(mentorId)) {
    throw new ApiError(400, "mentorId must be a valid id", "INVALID_MENTOR_ID");
  }

  const mentor = await Mentor.findOne({ _id: mentorId, active: true });
  if (!mentor) throw new ApiError(404, "Mentor not found", "MENTOR_NOT_FOUND");

  const localBooking = parseStartAt(startAt, mentor.timezone);
  assertWithinAvailability(mentor, localBooking);
  if (localBooking.instant.epochMilliseconds <= Date.now()) {
    throw new ApiError(400, "Bookings must be in the future", "PAST_BOOKING");
  }

  await ensureDailyCapacity(mentor._id, localBooking.date);

  const session = await mongoose.startSession();
  let createdBooking;

  try {
    await session.withTransaction(async () => {
      const reservation = await DailyCapacity.findOneAndUpdate(
        {
          mentorId: mentor._id,
          localDate: localBooking.date,
          activeCount: { $lt: ACTIVE_BOOKING_LIMIT },
        },
        { $inc: { activeCount: 1 } },
        { new: true, session, runValidators: true },
      );

      if (!reservation) {
        throw new ApiError(
          409,
          "This mentor has reached the daily booking limit",
          "DAILY_LIMIT_REACHED",
        );
      }

      const startsAt = new Date(Number(localBooking.instant.epochMilliseconds));
      const endsAt = new Date(Number(localBooking.endsAt.epochMilliseconds));
      const overlap = await Booking.exists({
        mentorId: mentor._id,
        localDate: localBooking.date,
        status: "active",
        startsAt: { $lt: endsAt },
        endsAt: { $gt: startsAt },
      }).session(session);

      if (overlap) {
        throw new ApiError(
          409,
          "The selected time overlaps another booking",
          "TIME_SLOT_TAKEN",
        );
      }

      [createdBooking] = await Booking.create(
        [
          {
            bookingId: randomUUID(),
            parentId,
            mentorId: mentor._id,
            startsAt,
            endsAt,
            timezone: mentor.timezone,
            localDate: localBooking.date,
            localStartTime: localBooking.startTime,
            status: "active",
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const parent = await Parent.findById(parentId).lean();

  if (parent) {
    notifyBookingCreated({ booking: createdBooking, mentor, parent }).catch(
      (error) => console.error("[booking] notify failed:", error),
    );
  } else {
    console.warn(`[booking] parent ${parentId} not found; skipping emails`);
  }

  return createdBooking;
}

export async function cancelBooking({ bookingId, actor }) {
  const session = await mongoose.startSession();
  let cancelledBooking;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ bookingId }).session(session);
      if (!booking)
        throw new ApiError(404, "Booking not found", "BOOKING_NOT_FOUND");

      const ownsBooking =
        (actor.role === "parent" && booking.parentId.toString() === actor.id) ||
        (actor.role === "mentor" && booking.mentorId.toString() === actor.id);
      if (!ownsBooking)
        throw new ApiError(403, "You cannot cancel this booking", "FORBIDDEN");
      if (booking.status !== "active") {
        throw new ApiError(
          409,
          "This booking is already cancelled",
          "BOOKING_ALREADY_CANCELLED",
        );
      }

      cancelledBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "active" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledByRole: actor.role,
          },
        },
        { new: true, session, runValidators: true },
      );

      const capacity = await DailyCapacity.findOneAndUpdate(
        {
          mentorId: booking.mentorId,
          localDate: booking.localDate,
          activeCount: { $gt: 0 },
        },
        { $inc: { activeCount: -1 } },
        { new: true, session, runValidators: true },
      );

      if (!cancelledBooking || !capacity) {
        throw new Error(
          "Booking capacity invariant failed during cancellation",
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return cancelledBooking;
}
