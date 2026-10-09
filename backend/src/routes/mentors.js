import { Router } from "express";
import ApiError from "../errors/ApiError.js";
import Booking from "../models/Booking.js";
import Mentor from "../models/Mentor.js";
import { ACTIVE_BOOKING_LIMIT } from "../constants.js";
import { buildAvailableSlots, parseLocalDate } from "../utils/time.js";

const router = Router();
const publicMentorFields = "name bio subjects timezone availability active";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (request, response) => {
  const { search, subject } = request.query;
  if (
    search !== undefined &&
    (typeof search !== "string" || search.length > 80)
  ) {
    throw new ApiError(
      400,
      "search must be at most 80 characters",
      "INVALID_SEARCH",
    );
  }
  if (
    subject !== undefined &&
    (typeof subject !== "string" || subject.length > 60)
  ) {
    throw new ApiError(
      400,
      "subject must be at most 60 characters",
      "INVALID_SUBJECT",
    );
  }

  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new ApiError(
      400,
      "page and limit must be positive integers; limit cannot exceed 50",
      "INVALID_PAGINATION",
    );
  }

  const query = { active: true };
  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ name: pattern }, { bio: pattern }, { subjects: pattern }];
  }
  if (subject?.trim())
    query.subjects = new RegExp(`^${escapeRegex(subject.trim())}$`, "i");

  const [mentors, total] = await Promise.all([
    Mentor.find(query)
      .select(publicMentorFields)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Mentor.countDocuments(query),
  ]);

  response.json({
    mentors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/:mentorId/availability", async (request, response) => {
  const date = parseLocalDate(request.query.date);
  const mentor = await Mentor.findOne({
    _id: request.params.mentorId,
    active: true,
  }).select(publicMentorFields);
  if (!mentor) throw new ApiError(404, "Mentor not found", "MENTOR_NOT_FOUND");

  const dayOfWeek = date.dayOfWeek;
  const windows = mentor.availability.filter(
    (window) => window.dayOfWeek === dayOfWeek,
  );
  const bookings = await Booking.find({
    mentorId: mentor._id,
    localDate: date.toString(),
    status: "active",
  })
    .select("bookingId startsAt endsAt timezone localStartTime")
    .sort({ startsAt: 1 });
  const remainingDailyBookings = Math.max(
    0,
    ACTIVE_BOOKING_LIMIT - bookings.length,
  );
  const availableSlots = remainingDailyBookings
    ? buildAvailableSlots({
        date,
        timezone: mentor.timezone,
        windows,
        bookedSlots: bookings,
      }).map((slot) => ({
        startsAt: slot.startsAt.toString(),
        endsAt: slot.endsAt.toString(),
        localStartTime: slot.localStartTime,
        offset: slot.offset,
      }))
    : [];

  response.json({
    mentorId: mentor.id,
    date: date.toString(),
    timezone: mentor.timezone,
    windows,
    bookedSlots: bookings.map((booking) => ({
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      localStartTime: booking.localStartTime,
    })),
    availableSlots,
    activeBookingCount: bookings.length,
    remainingDailyBookings,
  });
});

router.get("/:mentorId", async (request, response) => {
  const mentor = await Mentor.findOne({
    _id: request.params.mentorId,
    active: true,
  }).select(publicMentorFields);
  if (!mentor) throw new ApiError(404, "Mentor not found", "MENTOR_NOT_FOUND");
  response.json({ mentor });
});

export default router;
