import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import { todayInTimezone } from "../lib/calendarDate.js";
import { formatInstant, formatSlot } from "../lib/formatters.js";
import { Modal } from "./Modal.jsx";
import { BookingDatePicker } from "./BookingDatePicker.jsx";
import { Loading } from "./Loading.jsx";
import { InlineError } from "./InlineError.jsx";

export function BookingModal({
  bookingFlow,
  onClose,
  onDateChange,
  onSlotSelect,
  onConfirm,
}) {
  const mentor = bookingFlow.mentor;
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
          <p className="confirmation-time">
            {formatInstant(
              bookingFlow.booking.startsAt,
              bookingFlow.booking.timezone,
            )}
          </p>
          <p className="confirmation-zone">
            {bookingFlow.booking.timezone} · 60-minute trial class
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
              <span>{mentor.timezone}</span>
            </div>
            <span className="duration-label">
              <Clock3 size={15} /> 60 min
            </span>
          </div>
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
                  <p>Times shown in {mentor.timezone}</p>
                </div>
                <span>
                  {bookingFlow.availability.remainingDailyBookings} daily{" "}
                  {bookingFlow.availability.remainingDailyBookings === 1
                    ? "place"
                    : "places"}{" "}
                  left
                </span>
              </div>
              {!bookingFlow.availability.availableSlots.length ? (
                <div className="slot-empty">
                  <CalendarDays size={19} />
                  <span>
                    No available times on this date. Choose another day.
                  </span>
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
                      {formatSlot(slot.startsAt, mentor.timezone)}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : null}
          {bookingFlow.selectedSlot ? (
            <div className="selected-summary">
              <div>
                <span>Selected time</span>
                <strong>
                  {formatInstant(
                    bookingFlow.selectedSlot.startsAt,
                    mentor.timezone,
                  )}
                </strong>
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
