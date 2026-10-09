import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWithinAvailability,
  buildAvailableSlots,
  parseLocalDate,
  parseStartAt,
} from "../utils/time.js";
import { Temporal } from "@js-temporal/polyfill";

test("uses mentor-local calendar dates through London daylight-saving transitions", () => {
  const beforeSpringForward = parseStartAt(
    "2026-03-29T00:30:00Z",
    "Europe/London",
  );
  const afterSpringForward = parseStartAt(
    "2026-03-29T01:30:00Z",
    "Europe/London",
  );

  assert.equal(beforeSpringForward.date, "2026-03-29");
  assert.equal(beforeSpringForward.startTime, "00:30");
  assert.equal(afterSpringForward.date, "2026-03-29");
  assert.equal(afterSpringForward.startTime, "02:30");
});

test("distinguishes both occurrences of New York fall-back local time", () => {
  const daylightOccurrence = parseStartAt(
    "2026-11-01T01:30:00-04:00",
    "America/New_York",
  );
  const standardOccurrence = parseStartAt(
    "2026-11-01T01:30:00-05:00",
    "America/New_York",
  );

  assert.equal(daylightOccurrence.date, "2026-11-01");
  assert.equal(standardOccurrence.date, "2026-11-01");
  assert.equal(daylightOccurrence.startTime, "01:30");
  assert.equal(standardOccurrence.startTime, "01:30");
  assert.notEqual(
    daylightOccurrence.instant.epochMilliseconds,
    standardOccurrence.instant.epochMilliseconds,
  );
});

test("generates both repeated fall-back slots and skips nonexistent spring-forward time", () => {
  const fallBackSlots = buildAvailableSlots({
    date: parseLocalDate("2026-11-01"),
    timezone: "America/New_York",
    windows: [{ dayOfWeek: 7, startTime: "01:00", endTime: "03:00" }],
    now: Temporal.Instant.from("2026-01-01T00:00:00Z"),
  });

  const springForwardSlots = buildAvailableSlots({
    date: parseLocalDate("2026-03-08"),
    timezone: "America/New_York",
    windows: [{ dayOfWeek: 7, startTime: "01:00", endTime: "04:00" }],
    now: Temporal.Instant.from("2026-01-01T00:00:00Z"),
  });

  assert.deepEqual(
    fallBackSlots.map((slot) => slot.localStartTime),
    ["01:00", "01:00", "02:00"],
  );
  assert.deepEqual(
    fallBackSlots.map((slot) => slot.offset),
    ["-04:00", "-05:00", "-05:00"],
  );
  assert.deepEqual(
    springForwardSlots.map((slot) => slot.localStartTime),
    ["01:00", "03:00"],
  );
});

test("handles India local time and validates the selected weekly window", () => {
  const booking = parseStartAt("2030-01-07T10:00:00+05:30", "Asia/Kolkata");
  const mentor = {
    availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
  };

  assert.equal(booking.date, "2030-01-07");
  assert.equal(booking.dayOfWeek, 1);
  assert.doesNotThrow(() => assertWithinAvailability(mentor, booking));
  assert.throws(
    () =>
      assertWithinAvailability(mentor, {
        ...booking,
        localMinute: 10 * 60 + 30,
      }),
    { code: "UNAVAILABLE_TIME" },
  );
});

test("requires an explicit offset and a real local date", () => {
  assert.throws(() => parseStartAt("2030-01-07T10:00:00", "Asia/Kolkata"), {
    code: "INVALID_START_TIME",
  });
  assert.throws(() => parseLocalDate("2030-02-30"), { code: "INVALID_DATE" });
});
