import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import { todayInTimezone } from "../lib/calendarDate.js";
import { formatInstant, formatSlotWithDay } from "../lib/formatters.js";
import { Modal } from "./Modal.jsx";
import { BookingDatePicker } from "./BookingDatePicker.jsx";
import { Loading } from "./Loading.jsx";
import { InlineError } from "./InlineError.jsx";

/**
 * The booking modal covers two states driven by `bookingFlow`:
 *   - pre-booking: date picker + slot grid + selected-slot summary
 *   - post-booking: confirmation view (bookingFlow.booking is set)
 *
 * Timezone model (important):
 *   - The date picker walks the *mentor's* local calendar, because
 *     availability is defined in the mentor's working hours.
 *   - Slot times are rendered in the *viewer's* timezone, because
 *     that's what the parent actually cares about.
 *   - Because the two can be up to ~13 hours apart, a slot the parent
 *     sees as "Fri 6:30 PM" may correspond to the mentor's Saturday.
 *     That's why each slot carries its own weekday prefix.
 */
export function BookingModal({
  bookingFlow,
  viewerTimezone,
  onClose,
  onDateChange,
  onSlotSelect,
  onConfirm,
}) {
  const mentor = bookingFlow.mentor;
  // Format the date-at-noon in UTC so the displayed weekday/month/day
  // is stable regardless of the browser's timezone. Parsing a bare
  // "YYYY-MM-DD" would be interpreted as local midnight and could roll
  // to the previous day in negative-offset zones.
  const bookingDay = bookingFlow.availability?.date
    ? new Date(`${bookingFlow.availability.date}T12:00:00Z`).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" },
      )
    : "";

  const title = bookingFlow.booking
    ? "Your trial is confirmed"
    : `Book a trial with ${mentor.name}`;

  return (
    <Modal title={title} onClose={onClose} wide={Boolean(!bookingFlow.booking)}>
      {bookingFlow.booking ? (
        <div className="confirmation-content">
          <span className="confirmation-icon">
            <Check size={25} />
          </span>
          <p className="eyebrow">You’re booked</p>
          <h3>{mentor.name}</h3>
          {/* Confirmation shows the viewer's local time as primary.
              The mentor's time is a muted secondary line so the parent
              can reconcile if they ever compare notes with the mentor. */}
          <p className="confirmation-time">
            {formatInstant(bookingFlow.booking.startsAt, viewerTimezone)}
          </p>
          <p className="confirmation-zone">
            Your time ({viewerTimezone}) · 60-minute trial class
          </p>
          <p className="confirmation-zone-muted">
            {formatInstant(bookingFlow.booking.startsAt, mentor.timezone)} in{" "}
            {mentor.timezone}
          </p>
          <div className="booking-id-box">
            <span>CONFIRMATION ID</span>
            <code>{bookingFlow.booking.bookingId}</code>
          </div>
          <button
            className="button button-primary button-full"
            onClick={onClose}
          >
            Done <Check size={17} />
          </button>
        </div>
      ) : (
        <div className="booking-dialog-content">
          <div className="booking-mentor-summary">
            <div className="avatar avatar-mentor">
              {mentor.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <strong>{mentor.name}</strong>
              {/* Mentor's home timezone shown here once, as reference.
                  Slot times below are in the *viewer's* timezone. */}
              <span>{mentor.timezone}</span>
            </div>
            <span className="duration-label">
              <Clock3 size={15} /> 60 min
            </span>
          </div>
          {/* Date picker uses the mentor's timezone: their availability
              is defined on their own calendar, so picking a day "in
              their week" is the only way to reach valid slots. */}
          <BookingDatePicker
            value={bookingFlow.date}
            min={todayInTimezone(mentor.timezone)}
            timezone={mentor.timezone}
            onChange={onDateChange}
          />
          {bookingFlow.loading ? (
            <Loading label="Checking available times" />
          ) : null}
          <InlineError>{bookingFlow.error}</InlineError>
          {!bookingFlow.loading && bookingFlow.availability ? (
            <>
              <div className="slot-heading">
                <div>
                  <h3>{bookingDay}</h3>
                  <p>
                    Times shown in your timezone (
                    {viewerTimezone.replace(/_/g, " ")})
                  </p>
                </div>
                {bookingFlow.availability.availableSlots.length > 0 ? (
                  <span>
                    {bookingFlow.availability.remainingDailyBookings}{" "}
                    {bookingFlow.availability.remainingDailyBookings === 1
                      ? "slot"
                      : "slots"}{" "}
                    left for this day
                  </span>
                ) : null}
              </div>
              {!bookingFlow.availability.availableSlots.length ? (
                <div className="slot-empty">
                  <CalendarDays size={19} />
                  <div>
                    <strong>No available times on this date</strong>
                    <p>
                      Try another day — most mentors have openings within a
                      week.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="slot-grid">
                  {bookingFlow.availability.availableSlots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      className={`slot-button ${
                        bookingFlow.selectedSlot?.startsAt === slot.startsAt
                          ? "slot-selected"
                          : ""
                      }`}
                      onClick={() => onSlotSelect(slot)}
                    >
                      {/* Each slot shows its own weekday prefix. Since
                          the parent's calendar can differ from the
                          mentor's, "Fri 6:30 PM" is unambiguous even
                          when the picker above says "Saturday". */}
                      <span className="slot-time-primary">
                        {formatSlotWithDay(slot.startsAt, viewerTimezone)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : null}
          {bookingFlow.selectedSlot ? (
            <div className="selected-summary">
              <div>
                <span>Selected time (your local time)</span>
                <strong>
                  {formatInstant(
                    bookingFlow.selectedSlot.startsAt,
                    viewerTimezone,
                  )}
                </strong>
                {/* Secondary line repeats the time in the mentor's
                    zone so the parent has both frames of reference
                    before confirming. */}
                <span className="selected-summary-secondary">
                  Mentor's time:{" "}
                  {formatInstant(
                    bookingFlow.selectedSlot.startsAt,
                    mentor.timezone,
                  )}
                </span>
              </div>
              <button
                className="button button-primary"
                onClick={onConfirm}
                disabled={bookingFlow.busy}
              >
                {bookingFlow.busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : null}
                Confirm trial <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
