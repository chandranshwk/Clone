export function DashboardIntro({ session, isParent, activeBookingsCount }) {
  return (
    <section className="dashboard-intro" id="top">
      <div>
        <p className="eyebrow">
          {isParent ? "Your next great lesson" : "Mentor workspace"}
        </p>
        <h1>
          {isParent
            ? "Find a mentor who gets it."
            : `Good to see you, ${session.user.name.split(" ")[0]}.`}
        </h1>
        <p className="dashboard-subtitle">
          {isParent
            ? "Explore specialists, compare availability in their local time, and book a one-to-one trial."
            : "Your upcoming trial classes and parent requests, all in one place."}
        </p>
      </div>
      <div
        className="dashboard-count"
        aria-label={`${activeBookingsCount} active bookings`}
      >
        <span className="count-number">{activeBookingsCount}</span>
        <span className="count-label">
          {isParent ? "upcoming" : "active sessions"}
        </span>
      </div>
    </section>
  );
}
