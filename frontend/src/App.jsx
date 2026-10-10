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
  const [bookingsRevision, setBookingsRevision] = useState(0);
  const [bookingFlow, setBookingFlow] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setRestoring(false);
      return;
    }

    const payload = decodeJwtPayload(token);
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
        timezone: payload.timezone ?? "UTC",
      },
    });
    setRestoring(false);
  }, []);

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
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setSession(null);
    setAuthView(null);
    setMentors([]);
    setBookings([]);
    setBookingFlow(null);
    setNotice("");
  }

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
