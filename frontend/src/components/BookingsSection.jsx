import { Users } from "lucide-react";
import { BookingList } from "./BookingList.jsx";

export function BookingsSection({
  isParent,
  bookings,
  activeBookings,
  loading,
  error,
  onCancel,
}) {
  if (isParent) {
    return (
      <section
        className="bookings-section"
        id="bookings"
        aria-labelledby="bookings-heading"
      >
        <div className="section-heading section-heading-bookings">
          <div>
            <p className="eyebrow">Your schedule</p>
            <h2 id="bookings-heading">Booking history</h2>
          </div>
          <span className="result-count">{bookings.length} total</span>
        </div>
        <BookingList
          bookings={bookings}
          loading={loading}
          error={error}
          role="parent"
          onCancel={onCancel}
        />
      </section>
    );
  }

  return (
    <section
      className="bookings-section mentor-sessions"
      id="bookings"
      aria-labelledby="bookings-heading"
    >
      <div className="section-heading section-heading-bookings">
        <div>
          <p className="eyebrow">Your schedule</p>
          <h2 id="bookings-heading">Trial sessions</h2>
        </div>
        <span className="result-count">
          <Users size={16} /> {activeBookings.length} active
        </span>
      </div>
      <p className="section-support">
        Confirmed bookings from parents appear here with their class time and
        contact name.
      </p>
      <BookingList
        bookings={bookings}
        loading={loading}
        error={error}
        role="mentor"
        onCancel={onCancel}
      />
    </section>
  );
}
