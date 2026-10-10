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

/**
 * Idempotently ensure a DailyCapacity document exists for the given
 * mentor-local-date. The booking transaction relies on this document
 * existing so it can atomically reserve capacity with a single
 * findOneAndUpdate. The unique index on (mentorId, localDate) makes
 * concurrent upserts safe — a duplicate-key error simply means another
 * request already created it, which is fine.
 */
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

/**
 * Fire-and-forget email notifications. Uses allSettled rather than all
 * so a failure to reach one recipient doesn't cancel the send to the
 * other. Individual failures are logged, not thrown — the booking has
 * already succeeded and shouldn't be reported as failed because SMTP
 * was slow or a mail server bounced.
 */
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

/**
 * Create a booking for a parent against a mentor's slot.
 *
 * Concurrency: the daily cap (ACTIVE_BOOKING_LIMIT per mentor per
 * mentor-local-date) is enforced via an atomic check-and-increment on
 * the DailyCapacity document. The { activeCount: { $lt: LIMIT } } guard
 * is part of the query, not a separate read — this is what prevents two
 * simultaneous requests from both passing the check. The whole write is
 * wrapped in a transaction so a failure after the increment rolls the
 * count back.
 *
 * Emails are sent *after* the transaction commits, deliberately. Sending
 * inside the transaction would risk emailing a confirmation for a
 * booking that then rolled back.
 */
export async function createBooking({ parentId, mentorId, startAt }) {
  if (!mongoose.isValidObjectId(mentorId)) {
    throw new ApiError(400, "mentorId must be a valid id", "INVALID_MENTOR_ID");
  }

  const mentor = await Mentor.findOne({ _id: mentorId, active: true });
  if (!mentor) throw new ApiError(404, "Mentor not found", "MENTOR_NOT_FOUND");

  // parseStartAt converts the ISO instant into the mentor's local
  // wall-clock date and time using Temporal — this is what makes the
  // availability and daily-cap checks DST-correct.
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
      // Atomic check-and-increment. If two requests race, MongoDB
      // serialises the two updates; only one can observe activeCount
      // below the limit and successfully increment it.
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
      // Standard half-open interval overlap test: [a, b) and [c, d)
      // overlap iff a < d AND c < b. Using strict comparisons means
      // back-to-back bookings (e.g. 10:00–11:00 and 11:00–12:00) don't
      // collide.
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

  // Post-commit: send notifications in the background. Deliberately not
  // awaited so SMTP latency doesn't delay the HTTP response to the
  // parent who just booked.
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

/**
 * Cancel an active booking and release its slot back into the mentor's
 * daily capacity. Authorisation: only the parent who owns the booking
 * or the mentor it was booked with may cancel it.
 *
 * The findOneAndUpdate on DailyCapacity uses { activeCount: { $gt: 0 } }
 * as a guard so we can never drive the count negative. If either update
 * returns null the transaction aborts — that would mean the
 * booking/capacity invariant has already been violated, which should
 * not happen through the API.
 */
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

      // Release the reserved capacity for this mentor-local-date. The
      // $gt: 0 guard prevents the counter from ever going negative if a
      // double-cancel somehow slips through.
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
