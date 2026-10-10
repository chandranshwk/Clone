export const SUPPORTED_TIME_ZONES = [
  "UTC",
  "Asia/Kolkata",
  ...Intl.supportedValuesOf("timeZone"),
];

export const ACTIVE_BOOKING_LIMIT = 2;
export const CLASS_DURATION_MINUTES = 60;
export const BOOKING_STATUSES = ["active", "cancelled"];
