import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "./lib/api.js";
import { todayInTimezone } from "./lib/calendarDate.js";
import { DashboardIntro } from "./components/DashboardIntro.jsx";
import { MentorDirectory } from "./components/MentorDirectory.jsx";
import { BookingsSection } from "./components/BookingsSection.jsx";
import { BookingModal } from "./components/BookingModal.jsx";
import { CancelBookingModal } from "./components/CancelBookingModal.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { Loading } from "./components/Loading.jsx";
import { Topbar } from "./components/TopBar.jsx";

/**
 * Decode a JWT payload on the client without verifying the signature.
 * This is safe here because the token is never trusted for authorization
 * — the server re-verifies it on every API call. We only use it to
 * restore the UI (name, role, timezone) without a round-trip to
 * /auth/me on every page load. If the token is tampered with, the next
 * API call fails and the user is signed out.
 */
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function App() {
  const [session, setSession] = useState(null);
  // `restoring` is a third state distinct from "logged out" and "logged
  // in": it gates the very first render while we check localStorage, so
  // the app never flashes the HomeScreen before the session resolves.
  const [restoring, setRestoring] = useState(true);
  const [authView, setAuthView] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  // Bumping this counter re-runs the bookings effect without needing to
  // refetch manually after every mutation (create / cancel).
  const [bookingsRevision, setBookingsRevision] = useState(0);
  const [bookingFlow, setBookingFlow] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // Session restore runs exactly once, on mount. The empty deps array
  // is intentional — this effect reads the token, validates it, and
  // populates session, after which the other effects react normally to
  // the session change. Adding `session` to the deps would loop.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setRestoring(false);
      return;
    }

    const payload = decodeJwtPayload(token);
    // Client-side expiry check is a UX nicety, not a security measure:
    // it lets us sign out cleanly instead of rendering a dashboard that
    // will 401 on the first API call. The server still enforces
    // expiry on every request.
    const expired = !payload?.exp || payload.exp * 1000 < Date.now();

    if (!payload || expired) {
      localStorage.removeItem("authToken");
      setRestoring(false);
      return;
    }

    setSession({
      token,
      user: {
        _id: payload.sub ?? payload.id ?? payload._id,
        name: payload.name,
        role: payload.role,
        // Fall back to UTC if the token predates the timezone claim.
        timezone: payload.timezone ?? "UTC",
      },
    });
    setRestoring(false);
  }, []);

  // The `current` flag pattern throughout these fetch effects guards
  // against React 18 StrictMode double-invocation and stale responses:
  // if the effect re-runs before the first fetch resolves, only the
  // latest run is allowed to commit state.
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
    // Only parents browse the mentor directory. Mentors see only their
    // own bookings, so fetching the mentor list for them would waste a
    // request and expose data they don't need.
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

  // Refetch availability whenever the parent picks a new mentor or a
  // new date. Skipped once a booking exists — the modal switches to the
  // confirmation view and no longer needs slot data.
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
      // Store the returned booking on the flow so the modal switches to
      // the confirmation view, then bump the revision to refresh the
      // bookings list behind it.
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
      // Default to today's date in the *mentor's* calendar, not the
      // parent's — the picker walks the mentor's working week.
      date: todayInTimezone(mentor.timezone),
      selectedSlot: null,
      availability: null,
      loading: true,
      error: "",
    });
  }

  function signOut() {
    // Clear the token from storage too — otherwise the restore effect
    // on the next page load would sign the user straight back in.
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setSession(null);
    setAuthView(null);
    setMentors([]);
    setBookings([]);
    setBookingFlow(null);
    setNotice("");
  }

  // Loading gate. Must come *before* the `if (!session)` check so the
  // app renders a neutral screen during restore rather than flashing
  // the home screen to a user who is about to be signed in.
  if (restoring) {
    return (
      <main className="app-page">
        <div className="app-shell">
          <Loading label="Restoring session" />
        </div>
      </main>
    );
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
  // Derive the subject filter options from the loaded mentors rather
  // than hardcoding them, so a new subject in the seed data appears
  // without a code change.
  const subjects = [
    ...new Set(mentors.flatMap((mentor) => mentor.subjects)),
  ].sort();

  return (
    <main className="app-page">
      <div className="app-shell">
        <Topbar session={session} onSignOut={signOut} />

        <DashboardIntro
          session={session}
          isParent={isParent}
          activeBookingsCount={activeBookings.length}
        />

        {notice ? (
          <div className="notice notice-success" role="status">
            <Check size={17} />
            {notice}
          </div>
        ) : null}

        {isParent ? (
          <>
            <MentorDirectory
              mentors={mentors}
              loading={mentorLoading}
              error={mentorError}
              search={search}
              subject={subject}
              subjects={subjects}
              onSearchChange={setSearch}
              onSubjectChange={setSubject}
              onBook={openBooking}
            />
            <BookingsSection
              isParent
              bookings={bookings}
              activeBookings={activeBookings}
              loading={bookingsLoading}
              error={bookingsError}
              onCancel={setCancelTarget}
            />
          </>
        ) : (
          <BookingsSection
            isParent={false}
            bookings={bookings}
            activeBookings={activeBookings}
            loading={bookingsLoading}
            error={bookingsError}
            onCancel={setCancelTarget}
          />
        )}

        <footer className="page-footer app-footer">
          MentorMatch <span>·</span> Better learning begins with the right
          connection
        </footer>
      </div>

      {bookingFlow?.mentor ? (
        <BookingModal
          viewerTimezone={session.user.timezone}
          bookingFlow={bookingFlow}
          onClose={() => setBookingFlow(null)}
          onDateChange={(date) =>
            setBookingFlow((flow) => ({
              ...flow,
              date,
              // Changing the date invalidates the previously selected
              // slot — clear it so the confirm button doesn't fire with
              // a stale startsAt.
              selectedSlot: null,
              availability: null,
            }))
          }
          onSlotSelect={(slot) =>
            setBookingFlow((flow) => ({ ...flow, selectedSlot: slot }))
          }
          onConfirm={confirmBooking}
        />
      ) : null}

      {cancelTarget ? (
        <CancelBookingModal
          cancelTarget={cancelTarget}
          busy={cancelBusy}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancellation}
        />
      ) : null}
    </main>
  );
}

export default App;
