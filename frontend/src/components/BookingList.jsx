import { CalendarDays } from "lucide-react";
import { InlineError, Loading } from "../App";

function BookingRow({ booking, role, onCancel }) {
  const mentor = typeof booking.mentorId === "object" ? booking.mentorId : null;
  const parent = typeof booking.parentId === "object" ? booking.parentId : null;
  const person = role === "parent" ? mentor?.name : parent?.name;
  const subjects = mentor?.subjects?.join(" · ");

  return (
    <article className="booking-row">
      <div className="booking-date-mark">
        <CalendarDays size={18} />
        <span>{booking.localStartTime}</span>
      </div>
      <div className="booking-row-details">
        <div className="booking-title-line">
          <h3>{person || "MentorMatch session"}</h3>
          <span className={`status-tag status-${booking.status}`}>
            {booking.status === "active" ? "Confirmed" : "Cancelled"}
          </span>
        </div>
        <p>
          {formatInstant(booking.startsAt, booking.timezone)} <span>·</span>{" "}
          {booking.timezone}
        </p>
        {subjects ? <p className="booking-subjects">{subjects}</p> : null}
        <p className="booking-reference">
          Booking ID <code>{booking.bookingId}</code>
        </p>
      </div>
      {booking.status === "active" && (
        <button
          className="text-button text-button-danger"
          onClick={() => onCancel(booking)}
        >
          Cancel booking
        </button>
      )}
    </article>
  );
}

export function BookingList({ bookings, loading, error, role, onCancel }) {
  if (loading) return <Loading label="Loading your bookings" />;
  if (error) return <InlineError>{error}</InlineError>;
  if (!bookings.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <CalendarDays size={21} />
        </span>
        <h3>No bookings yet</h3>
        <p>
          {role === "parent"
            ? "Your confirmed trial classes will appear here."
            : "Parent trial requests will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <BookingRow
          key={booking.bookingId}
          booking={booking}
          role={role}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
