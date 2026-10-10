import { Temporal } from "@js-temporal/polyfill";
import { CLASS_DURATION_MINUTES, SUPPORTED_TIME_ZONES } from "../constants.js";
import ApiError from "../errors/ApiError.js";

// Require an absolute offset or Z. This deliberately rejects
// offset-less strings like "2026-10-15T09:00" because those are
// ambiguous — the same wall clock reads differently in every zone, and
// accepting them would let clients send times that silently shift when
// the server interprets them in its own local zone.
const OFFSET_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function assertSupportedTimeZone(timezone) {
  if (!SUPPORTED_TIME_ZONES.includes(timezone)) {
    throw new ApiError(
      400,
      "Unsupported mentor time zone",
      "INVALID_TIME_ZONE",
    );
  }
}

/**
 * Convert a client-supplied ISO instant into the mentor's local
 * wall-clock date, time, and slot grid position.
 *
 * Uses Temporal.Instant -> ZonedDateTime rather than Date.getHours()
 * style arithmetic, because Temporal carries the IANA database and
 * applies the correct UTC offset for that specific instant. A mentor
 * in America/New_York booking in January gets -05:00, in July -04:00,
 * from the same input string and the same timezone name. That's what
 * makes DST work without a single special case.
 *
 * Returns:
 *   instant      — the absolute point in time
 *   date         — mentor-local date as "YYYY-MM-DD"
 *   dayOfWeek    — 1..7 (Mon..Sun), used to match availability windows
 *   startTime    — mentor-local "HH:MM"
 *   localMinute  — minutes since midnight, for slot-grid arithmetic
 *   endsAt       — instant + CLASS_DURATION_MINUTES
 */
export function parseStartAt(value, timezone) {
  assertSupportedTimeZone(timezone);
  if (typeof value !== "string" || !OFFSET_DATE_TIME.test(value)) {
    throw new ApiError(
      400,
      "startAt must be an ISO 8601 date-time with Z or an explicit UTC offset",
      "INVALID_START_TIME",
    );
  }

  let instant;
  try {
    instant = Temporal.Instant.from(value);
  } catch {
    throw new ApiError(
      400,
      "startAt is not a valid date-time",
      "INVALID_START_TIME",
    );
  }

  // Slot grid is aligned to whole minutes. Rejecting sub-minute
  // precision here keeps every downstream comparison (overlap checks,
  // availability arithmetic) integer, so no rounding drift creeps in.
  if (instant.epochMilliseconds % 60_000 !== 0) {
    throw new ApiError(
      400,
      "Bookings must start on a minute boundary",
      "INVALID_START_TIME",
    );
  }

  const localTime = instant.toZonedDateTimeISO(timezone);
  const startTime = localTime
    .toPlainTime()
    .toString({ smallestUnit: "minute" });
  const [hour, minute] = startTime.split(":").map(Number);
  const localMinute = hour * 60 + minute;

  return {
    instant,
    date: localTime.toPlainDate().toString(),
    dayOfWeek: localTime.dayOfWeek,
    startTime,
    localMinute,
    endsAt: instant.add({ minutes: CLASS_DURATION_MINUTES }),
  };
}

/**
 * Verify the requested local time falls inside one of the mentor's
 * declared availability windows for that weekday.
 *
 * The `offset % CLASS_DURATION_MINUTES === 0` check enforces that
 * bookings align to the same grid used to generate slots — otherwise a
 * client could book "09:17" and produce a slot that never appears in
 * the availability list. The `+ CLASS_DURATION_MINUTES <= windowEnd`
 * check ensures the whole class fits, not just its start.
 */
export function assertWithinAvailability(mentor, localBooking) {
  const fitsWindow = mentor.availability.some((window) => {
    if (window.dayOfWeek !== localBooking.dayOfWeek) return false;
    const [startHour, startMinute] = window.startTime.split(":").map(Number);
    const [endHour, endMinute] = window.endTime.split(":").map(Number);
    const windowStart = startHour * 60 + startMinute;
    const windowEnd = endHour * 60 + endMinute;
    const offset = localBooking.localMinute - windowStart;

    return (
      offset >= 0 &&
      offset % CLASS_DURATION_MINUTES === 0 &&
      localBooking.localMinute + CLASS_DURATION_MINUTES <= windowEnd
    );
  });

  if (!fitsWindow) {
    throw new ApiError(
      400,
      "The selected time is outside this mentor’s availability",
      "UNAVAILABLE_TIME",
    );
  }
}

/**
 * Generate the bookable slots for a given mentor-local date, filtering
 * out past times and times already covered by an active booking.
 *
 * DST handling lives in the disambiguation loop below. On a
 * spring-forward day one local wall-clock time doesn't exist (clocks
 * jump 02:00 -> 03:00), and on a fall-back day one exists twice. We try
 * both Temporal disambiguations ("earlier" and "later") and keep a
 * candidate only if it round-trips back to the same wall-clock time.
 * That rejects the nonexistent hour on spring-forward and keeps just
 * one of the two instants on fall-back, so no slot is duplicated or
 * silently skipped.
 */
export function buildAvailableSlots({
  date,
  timezone,
  windows,
  bookedSlots = [],
  now = Temporal.Now.instant(),
}) {
  assertSupportedTimeZone(timezone);
  const slots = [];
  const seenInstants = new Set();

  for (const window of windows) {
    const [startHour, startMinute] = window.startTime.split(":").map(Number);
    const [endHour, endMinute] = window.endTime.split(":").map(Number);
    const windowStart = startHour * 60 + startMinute;
    const windowEnd = endHour * 60 + endMinute;

    // Walk the window in CLASS_DURATION_MINUTES increments so every
    // generated slot starts exactly on the grid enforced by
    // assertWithinAvailability.
    for (
      let minute = windowStart;
      minute + CLASS_DURATION_MINUTES <= windowEnd;
      minute += CLASS_DURATION_MINUTES
    ) {
      const localDateTime = date.toPlainDateTime({
        hour: Math.floor(minute / 60),
        minute: minute % 60,
      });

      for (const disambiguation of ["earlier", "later"]) {
        const zonedDateTime = localDateTime.toZonedDateTime(timezone, {
          disambiguation,
        });
        // The equality check is the DST guard: if the resolved instant
        // doesn't map back to the same wall clock, this time doesn't
        // exist on this date (spring-forward) and we skip it. On
        // fall-back both "earlier" and "later" round-trip, but
        // seenInstants dedupes the second one.
        if (!zonedDateTime.toPlainDateTime().equals(localDateTime)) continue;

        const startsAt = zonedDateTime.toInstant();
        const startMilliseconds = Number(startsAt.epochMilliseconds);
        if (
          seenInstants.has(startMilliseconds) ||
          Temporal.Instant.compare(startsAt, now) <= 0
        ) {
          continue;
        }

        const endsAt = startsAt.add({ minutes: CLASS_DURATION_MINUTES });
        const endMilliseconds = Number(endsAt.epochMilliseconds);
        // Half-open interval overlap: [start, end) vs [bookedStart,
        // bookedEnd). Touching endpoints don't collide.
        const overlapsBooking = bookedSlots.some((booking) => {
          const bookedStart = new Date(booking.startsAt).getTime();
          const bookedEnd = new Date(booking.endsAt).getTime();
          return startMilliseconds < bookedEnd && endMilliseconds > bookedStart;
        });
        if (overlapsBooking) continue;

        seenInstants.add(startMilliseconds);
        slots.push({
          startsAt,
          endsAt,
          localStartTime: localDateTime.toPlainTime().toString({
            smallestUnit: "minute",
          }),
          // Kept on the response so clients can confirm the resolved
          // UTC offset for the date — useful for debugging DST.
          offset: zonedDateTime.offset,
        });
      }
    }
  }

  return slots.sort((left, right) =>
    Temporal.Instant.compare(left.startsAt, right.startsAt),
  );
}

export function parseLocalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, "date must use YYYY-MM-DD format", "INVALID_DATE");
  }

  try {
    const date = Temporal.PlainDate.from(value);
    // Temporal normalises invalid input in some cases (e.g. "2026-13-01"
    // can round-trip to a different string). Comparing to the original
    // rejects those instead of silently accepting a shifted date.
    if (date.toString() !== value) throw new Error("Non-canonical date");
    return date;
  } catch {
    throw new ApiError(
      400,
      "date is not a valid calendar date",
      "INVALID_DATE",
    );
  }
}
