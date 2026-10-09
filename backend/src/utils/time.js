import { Temporal } from "@js-temporal/polyfill";
import { CLASS_DURATION_MINUTES, SUPPORTED_TIME_ZONES } from "../constants.js";
import ApiError from "../errors/ApiError.js";

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
