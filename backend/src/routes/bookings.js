import { Router } from "express";
import ApiError from "../errors/ApiError.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import { cancelBooking, createBooking } from "../services/bookingService.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (request, response) => {
  const { status } = request.query;
  if (status !== undefined && !["active", "cancelled"].includes(status)) {
    throw new ApiError(
      400,
      "status must be active or cancelled",
      "INVALID_STATUS",
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

  const query =
    request.auth.role === "parent"
      ? { parentId: request.auth.id }
      : { mentorId: request.auth.id };
  if (status) query.status = status;

  const bookings = await Booking.find(query)
    .populate("mentorId", "name subjects timezone")
    .populate("parentId", "name email")
    .sort({ startsAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Booking.countDocuments(query);

  response.json({
    bookings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.post("/", requireRole("parent"), async (request, response) => {
  const { mentorId, startAt } = request.body ?? {};
  if (typeof mentorId !== "string" || typeof startAt !== "string") {
    throw new ApiError(
      400,
      "mentorId and startAt are required",
      "INVALID_BOOKING",
    );
  }

  const booking = await createBooking({
    parentId: request.auth.id,
    mentorId,
    startAt,
  });
  response.status(201).json({ booking });
});

router.delete("/:bookingId", async (request, response) => {
  const booking = await cancelBooking({
    bookingId: request.params.bookingId,
    actor: request.auth,
  });
  response.json({ booking });
});

export default router;
