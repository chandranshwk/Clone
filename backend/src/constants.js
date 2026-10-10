/**
 * Valid timezones accepted from clients (browser-detected via
 * Intl.DateTimeFormat().resolvedOptions().timeZone).
 *
 * Backed by the runtime's own IANA list rather than a hardcoded array
 * so it can never go stale and can never disagree with what
 * Intl.DateTimeFormat can actually format. This also avoids a real bug
 * we hit during development: Node's Intl canonicalises some zones
 * (e.g. Asia/Kolkata is sometimes reported as Asia/Calcutta) and a
 * hand-maintained list can easily miss the alias the browser sends.
 *
 * "UTC" is prepended because it's the fallback used when a client
 * doesn't supply a timezone or supplies one the runtime doesn't know.
 */
export const SUPPORTED_TIME_ZONES = [
  "UTC",
  "Asia/Kolkata",
  ...Intl.supportedValuesOf("timeZone"),
];

// Maximum number of trial classes a single mentor can deliver on a
// single mentor-local-date. Enforced atomically by DailyCapacity in
// bookingService.createBooking.
export const ACTIVE_BOOKING_LIMIT = 2;

// Trial class length. Used to compute endsAt from startsAt and to
// derive the per-slot boundaries in the availability endpoint.
export const CLASS_DURATION_MINUTES = 60;

// The only valid values for Booking.status. Anything else is a bug.
export const BOOKING_STATUSES = ["active", "cancelled"];
