import assert from "node:assert/strict";
import test from "node:test";
import {
  isCalendarDateDisabled,
  parseCalendarDate,
  todayInTimezone,
} from "./calendarDate.js";

test("disables past local dates but allows today and future dates", () => {
  const minimumDate = "2026-10-10";

  assert.equal(isCalendarDateDisabled("2026-10-09", minimumDate), true);
  assert.equal(isCalendarDateDisabled("2026-10-10", minimumDate), false);
  assert.equal(isCalendarDateDisabled("2026-10-11", minimumDate), false);
  assert.equal(isCalendarDateDisabled("2027-01-01", minimumDate), false);
});

test("uses ISO calendar keys to compare dates across month and year boundaries", () => {
  assert.equal(isCalendarDateDisabled("2026-09-30", "2026-10-01"), true);
  assert.equal(isCalendarDateDisabled("2027-01-01", "2026-12-31"), false);
  assert.equal(
    parseCalendarDate("2026-10-10").toISOString(),
    "2026-10-10T00:00:00.000Z",
  );
});

test("calculates the day boundary in Asia/Kolkata rather than UTC", () => {
  assert.equal(
    todayInTimezone("Asia/Kolkata", new Date("2026-10-09T18:29:59.999Z")),
    "2026-10-09",
  );
  assert.equal(
    todayInTimezone("Asia/Kolkata", new Date("2026-10-09T18:30:00.000Z")),
    "2026-10-10",
  );
});

test("calculates the day boundary in America/New_York", () => {
  assert.equal(
    todayInTimezone("America/New_York", new Date("2026-10-10T03:59:59.999Z")),
    "2026-10-09",
  );
  assert.equal(
    todayInTimezone("America/New_York", new Date("2026-10-10T04:00:00.000Z")),
    "2026-10-10",
  );
});

test("keeps the local calendar date correct across London's daylight-saving fallback", () => {
  assert.equal(
    todayInTimezone("Europe/London", new Date("2026-10-24T22:59:59.999Z")),
    "2026-10-24",
  );
  assert.equal(
    todayInTimezone("Europe/London", new Date("2026-10-24T23:00:00.000Z")),
    "2026-10-25",
  );
  assert.equal(
    todayInTimezone("Europe/London", new Date("2026-10-25T01:30:00.000Z")),
    "2026-10-25",
  );
});
