import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  GraduationCap,
  LoaderCircle,
  LogOut,
  Search,
  Users,
} from "lucide-react";
import { api } from "./lib/api.js";
import { todayInTimezone } from "./lib/calendarDate.js";
import ThemeToggle from "./ThemeToggle.jsx";
import { BookingList } from "./components/BookingList.jsx";
import { Modal } from "./components/Modal.jsx";
import { BookingDatePicker } from "./components/BookingDatePicker.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { SubjectDropdown } from "./components/SubjectDropdown.jsx";
import { MentorCard } from "./components/MentorCard.jsx";

const HERO_HEADLINE_PREFIX = "Good teaching changes the way ";
const HERO_HEADLINE_SUFFIX = "you see it.";
const HERO_HEADLINE = `${HERO_HEADLINE_PREFIX}${HERO_HEADLINE_SUFFIX}`;

export const MENTOR_PORTRAITS = {
  "Aisha Khan": "/images/mentors/aisha-khan.jpg",
  "Rohan Mehta": "/images/mentors/rohan-mehta.jpg",
  "Priya Nair": "/images/mentors/priya-nair.jpg",
  "Kabir Shah": "/images/mentors/kabir-shah.jpg",
  "Olivia Brooks": "/images/mentors/olivia-brooks.jpg",
  "Oliver James": "/images/mentors/oliver-james.jpg",
  "Amara Okafor": "/images/mentors/amara-okafor.jpg",
  "Ethan Chen": "/images/mentors/ethan-chen.jpg",
  "Sofia Rivera": "/images/mentors/sofia-rivera.jpg",
  "Noah Williams": "/images/mentors/noah-williams.jpg",
};

function formatInstant(value, timezone, options = {}) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}

function formatSlot(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function TypewriterHeadline() {
  const reducedMotionInitially = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const [visibleCharacters, setVisibleCharacters] = useState(
    reducedMotionInitially ? HERO_HEADLINE.length : 0,
  );
  const [animationComplete, setAnimationComplete] = useState(
    reducedMotionInitially,
  );

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let timeoutId;
    let runId = 0;
    let animationStarted = false;

    function startAnimation() {
      if (animationStarted) return;
      animationStarted = true;
      window.clearTimeout(timeoutId);
      const activeRun = ++runId;

      if (motionPreference.matches) {
        setVisibleCharacters(HERO_HEADLINE.length);
        setAnimationComplete(true);
        return;
      }

      let position = 0;
      setVisibleCharacters(0);
      setAnimationComplete(false);

      function typeNextCharacter() {
        if (activeRun !== runId) return;
        position += 1;
        setVisibleCharacters(position);
        if (position === HERO_HEADLINE.length) {
          setAnimationComplete(true);
          return;
        }
        timeoutId = window.setTimeout(typeNextCharacter, 200);
      }

      timeoutId = window.setTimeout(typeNextCharacter, 350);
    }

    function completeForReducedMotion() {
      if (!motionPreference.matches) return;
      window.clearTimeout(timeoutId);
      runId += 1;
      animationStarted = true;
      setVisibleCharacters(HERO_HEADLINE.length);
      setAnimationComplete(true);
    }

    startAnimation();
    motionPreference.addEventListener("change", completeForReducedMotion);

    return () => {
      runId += 1;
      window.clearTimeout(timeoutId);
      motionPreference.removeEventListener("change", completeForReducedMotion);
    };
  }, []);

  const prefix = HERO_HEADLINE_PREFIX.slice(
    0,
    Math.min(visibleCharacters, HERO_HEADLINE_PREFIX.length),
  );
  const suffix = HERO_HEADLINE_SUFFIX.slice(
    0,
    Math.max(0, visibleCharacters - HERO_HEADLINE_PREFIX.length),
  );

  return (
    <h1 className="typewriter-heading" aria-label={HERO_HEADLINE}>
      <span className="typewriter-measure" aria-hidden="true">
        {HERO_HEADLINE_PREFIX}
        <em>{HERO_HEADLINE_SUFFIX}</em>
        <span className="typewriter-cursor" />
      </span>
      <span className="typewriter-rendered" aria-hidden="true">
        {prefix}
        <em>{suffix}</em>
        {!animationComplete ? <span className="typewriter-cursor" /> : null}
      </span>
    </h1>
  );
}

export function availabilitySummary(mentor) {
  const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = [
    ...new Set(mentor.availability.map((window) => window.dayOfWeek)),
  ]
    .sort((left, right) => left - right)
    .map((day) => dayNames[day]);
  const dayLabel =
    days.length === 5 && days.join(",") === "Mon,Tue,Wed,Thu,Fri"
      ? "Weekdays"
      : days.join(", ");
  const window = mentor.availability[0];

  return window
    ? `${dayLabel} · ${window.startTime}–${window.endTime} local`
    : "Check upcoming availability";
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={18} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function InlineError({ children }) {
  if (!children) return null;
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingsRevision, setBookingsRevision] = useState(0);
  const [bookingFlow, setBookingFlow] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!session) return undefined;
    let current = true;
    setBookingsLoading(true);
    setBookingsError("");
    api
      .bookings(session.token)
      .then((result) => {
        if (current) setBookings(result.bookings);
      })
      .catch((error) => {
        if (current) setBookingsError(error.message);
      })
      .finally(() => {
        if (current) setBookingsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [session, bookingsRevision]);

  useEffect(() => {
    if (!session || session.user.role !== "parent") return undefined;
    let current = true;
    setMentorLoading(true);
    setMentorError("");
    api
      .mentors({ search, subject })
      .then((result) => {
        if (current) setMentors(result.mentors);
      })
      .catch((error) => {
        if (current) setMentorError(error.message);
      })
      .finally(() => {
        if (current) setMentorLoading(false);
      });
    return () => {
      current = false;
    };
  }, [session, search, subject]);

  useEffect(() => {
    if (!bookingFlow || bookingFlow.booking) return undefined;
    let current = true;
    const { mentor, date } = bookingFlow;
    setBookingFlow((flow) =>
      flow ? { ...flow, loading: true, error: "", availability: null } : flow,
    );
    api
      .availability(mentor._id, date)
      .then((availability) => {
        if (current)
          setBookingFlow((flow) =>
            flow && flow.mentor._id === mentor._id && flow.date === date
              ? { ...flow, loading: false, availability }
              : flow,
          );
      })
      .catch((error) => {
        if (current)
          setBookingFlow((flow) =>
            flow && flow.mentor._id === mentor._id && flow.date === date
              ? { ...flow, loading: false, error: error.message }
              : flow,
          );
      });
    return () => {
      current = false;
    };
  }, [bookingFlow?.mentor?._id, bookingFlow?.date, bookingFlow?.booking]);

  async function confirmBooking() {
    if (!bookingFlow?.selectedSlot) return;
    setBookingFlow((flow) => ({ ...flow, busy: true, error: "" }));
    try {
      const result = await api.createBooking(session.token, {
        mentorId: bookingFlow.mentor._id,
        startAt: bookingFlow.selectedSlot.startsAt,
      });
      setBookingFlow((flow) => ({
        ...flow,
        busy: false,
        booking: result.booking,
      }));
      setBookingsRevision((revision) => revision + 1);
    } catch (error) {
      setBookingFlow((flow) => ({
        ...flow,
        busy: false,
        error: error.message,
      }));
    }
  }

  async function confirmCancellation() {
    setCancelBusy(true);
    try {
      await api.cancelBooking(session.token, cancelTarget.bookingId);
      setCancelTarget(null);
      setNotice("Booking cancelled. The daily slot is available again.");
      setBookingsRevision((revision) => revision + 1);
      window.setTimeout(() => setNotice(""), 5000);
    } catch (error) {
      setBookingsError(error.message);
      setCancelTarget(null);
    } finally {
      setCancelBusy(false);
    }
  }

  function openBooking(mentor) {
    setBookingFlow({
      mentor,
      date: todayInTimezone(mentor.timezone),
      selectedSlot: null,
      availability: null,
      loading: true,
      error: "",
    });
  }

  function signOut() {
    setSession(null);
    setAuthView(null);
    setMentors([]);
    setBookings([]);
    setBookingFlow(null);
    setNotice("");
  }

  if (!session) {
    return authView ? (
      <AuthScreen
        initialMode={authView}
        onAuthenticated={setSession}
        onBackToHome={() => setAuthView(null)}
      />
    ) : (
      <HomeScreen
        onSignIn={() => setAuthView("login")}
        onJoin={(mode = "register") => setAuthView(mode)}
      />
    );
  }

  const isParent = session.user.role === "parent";
  const activeBookings = bookings.filter(
    (booking) => booking.status === "active",
  );
  const subjects = [
    ...new Set(mentors.flatMap((mentor) => mentor.subjects)),
  ].sort();
  const subjectMentor = bookingFlow?.mentor;
  const bookingDay = bookingFlow?.availability?.date
    ? new Date(`${bookingFlow.availability.date}T12:00:00Z`).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" },
      )
    : "";

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
  }, []);

  return (
    <main className="app-page">
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="MentorMatch home">
            <span className="brand-symbol">
              <GraduationCap size={20} />
            </span>
            <span>
              MentorMatch<span className="brand-period">.</span>
            </span>
          </a>
          <nav className="user-nav" aria-label="Account navigation">
            <ThemeToggle compact />
            <span className="user-greeting">
              <span className="user-dot" />
              <span className="user-name">{session.user.name}</span>
              <span className="role-label">{session.user.role}</span>
            </span>
            <button
              className="icon-button signout-button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </nav>
        </header>

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
            aria-label={`${activeBookings.length} active bookings`}
          >
            <span className="count-number">{activeBookings.length}</span>
            <span className="count-label">
              {isParent ? "upcoming" : "active sessions"}
            </span>
          </div>
        </section>

        {notice ? (
          <div className="notice notice-success" role="status">
            <Check size={17} />
            {notice}
          </div>
        ) : null}

        {isParent ? (
          <>
            <section
              className="directory-section"
              aria-labelledby="directory-heading"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Browse the directory</p>
                  <h2 id="directory-heading">Meet your mentors</h2>
                </div>
                <span className="result-count">
                  <Users size={16} />{" "}
                  {mentorLoading ? "…" : `${mentors.length} mentors`}
                </span>
              </div>
              <div className="directory-tools">
                <label className="search-field">
                  <Search size={18} aria-hidden="true" />
                  <span className="sr-only">Search mentors and subjects</span>
                  <input
                    placeholder="Search mentors or subjects"
                    value={search}
                    style={{
                      outline: "none",
                    }}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <SubjectDropdown
                  value={subject}
                  options={subjects}
                  onChange={setSubject}
                />
              </div>
              <InlineError>{mentorError}</InlineError>
              {mentorLoading && mentors.length === 0 ? (
                <Loading label="Finding mentors" />
              ) : null}
              {!mentorLoading && !mentorError && mentors.length === 0 ? (
                <div className="empty-state directory-empty">
                  <span className="empty-icon">
                    <Search size={21} />
                  </span>
                  <h3>No mentors match that search</h3>
                  <p>Try another name or clear the subject filter.</p>
                </div>
              ) : null}
              {mentors.length > 0 ? (
                <div
                  className={`mentor-grid ${mentorLoading ? "grid-loading" : ""}`}
                >
                  {mentors.map((mentor) => (
                    <MentorCard
                      key={mentor._id}
                      mentor={mentor}
                      onBook={openBooking}
                    />
                  ))}
                </div>
              ) : null}
            </section>

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
                loading={bookingsLoading}
                error={bookingsError}
                role="parent"
                onCancel={setCancelTarget}
              />
            </section>
          </>
        ) : (
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
              Confirmed bookings from parents appear here with their class time
              and contact name.
            </p>
            <BookingList
              bookings={bookings}
              loading={bookingsLoading}
              error={bookingsError}
              role="mentor"
              onCancel={setCancelTarget}
            />
          </section>
        )}

        <footer className="page-footer app-footer">
          MentorMatch <span>·</span> Better learning begins with the right
          connection
        </footer>
      </div>

      {bookingFlow && subjectMentor ? (
        <Modal
          title={
            bookingFlow.booking
              ? "Your trial is confirmed"
              : `Book a trial with ${subjectMentor.name}`
          }
          onClose={() => setBookingFlow(null)}
          wide={Boolean(!bookingFlow.booking)}
        >
          {bookingFlow.booking ? (
            <div className="confirmation-content">
              <span className="confirmation-icon">
                <Check size={25} />
              </span>
              <p className="eyebrow">You’re booked</p>
              <h3>{subjectMentor.name}</h3>
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
                onClick={() => setBookingFlow(null)}
              >
                Done <Check size={17} />
              </button>
            </div>
          ) : (
            <div className="booking-dialog-content">
              <div className="booking-mentor-summary">
                <div className="avatar avatar-mentor">
                  {subjectMentor.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <strong>{subjectMentor.name}</strong>
                  <span>{subjectMentor.timezone}</span>
                </div>
                <span className="duration-label">
                  <Clock3 size={15} /> 60 min
                </span>
              </div>
              <BookingDatePicker
                value={bookingFlow.date}
                min={todayInTimezone(subjectMentor.timezone)}
                timezone={subjectMentor.timezone}
                onChange={(date) =>
                  setBookingFlow((flow) => ({
                    ...flow,
                    date,
                    selectedSlot: null,
                    availability: null,
                  }))
                }
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
                      <p>Times shown in {subjectMentor.timezone}</p>
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
                          className={`slot-button ${bookingFlow.selectedSlot?.startsAt === slot.startsAt ? "slot-selected" : ""}`}
                          onClick={() =>
                            setBookingFlow((flow) => ({
                              ...flow,
                              selectedSlot: slot,
                            }))
                          }
                        >
                          {formatSlot(slot.startsAt, subjectMentor.timezone)}
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
                        subjectMentor.timezone,
                      )}
                    </strong>
                  </div>
                  <button
                    className="button button-primary"
                    onClick={confirmBooking}
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
      ) : null}

      {cancelTarget ? (
        <Modal
          title="Cancel this trial?"
          onClose={() => (cancelBusy ? null : setCancelTarget(null))}
        >
          <div className="cancel-content">
            <p>
              This booking will be marked cancelled, and its place will be
              returned to the mentor’s daily availability.
            </p>
            <div className="cancel-booking-summary">
              <strong>{cancelTarget.bookingId}</strong>
              <span>
                {formatInstant(cancelTarget.startsAt, cancelTarget.timezone)}
              </span>
            </div>
            <div className="modal-actions">
              <button
                className="button button-muted"
                onClick={() => setCancelTarget(null)}
                disabled={cancelBusy}
              >
                Keep booking
              </button>
              <button
                className="button button-danger"
                onClick={confirmCancellation}
                disabled={cancelBusy}
              >
                {cancelBusy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : null}{" "}
                Cancel trial
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

export default App;
