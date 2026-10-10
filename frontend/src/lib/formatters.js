/**
 * Timezone-aware formatting helpers.
 *
 * Both functions take an IANA timezone name (e.g. "America/New_York")
 * rather than a UTC offset. That's what makes them DST-correct: the
 * same input time will render as -05:00 in January and -04:00 in July
 * for the same zone, because Intl resolves the offset per-instant using
 * the IANA database. Passing a fixed offset string (like "-05:00")
 * would silently break across the DST boundary.
 */

/**
 * Long-form date + time, e.g. "Mon, Oct 15, 2026, 6:30 PM".
 * Used in the modal confirmation view and the bookings list, where we
 * want the full date visible.
 *
 * `options` is spread last so callers can override individual fields
 * (e.g. { dateStyle: "long" }) without losing the timezone handling.
 */
export function formatInstant(value, timezone, options = {}) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}

/**
 * Short slot label with an explicit weekday, e.g. "Fri 6:30 PM".
 *
 * The weekday prefix is deliberate: the parent picks a date from the
 * *mentor's* calendar, but slot times render in the *viewer's* zone.
 * For a parent in India booking a New York mentor, the mentor's
 * Saturday morning slots land on the parent's Friday evening. Without
 * the day prefix a parent would see "Saturday" in the date picker and
 * "6:30 PM" in the slot list with no way to reconcile the two.
 */
export function formatSlotWithDay(value, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}
