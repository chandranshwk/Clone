import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  GraduationCap,
  LoaderCircle,
  LogOut,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api } from "./lib/api.js";
import {
  isCalendarDateDisabled,
  parseCalendarDate,
  todayInTimezone,
} from "./lib/calendarDate.js";
import ThemeToggle from "./ThemeToggle.jsx";

const HERO_HEADLINE_PREFIX = "Good teaching changes the way ";
const HERO_HEADLINE_SUFFIX = "you see it.";
const HERO_HEADLINE = `${HERO_HEADLINE_PREFIX}${HERO_HEADLINE_SUFFIX}`;
const MENTOR_PORTRAITS = {
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

function formatCalendarDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function BookingDatePicker({ value, min, timezone, onChange }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseCalendarDate(value || min);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
  const [popupPosition, setPopupPosition] = useState(null);
  const calendarRef = useRef(null);
  const triggerRef = useRef(null);
  const minimumDate = parseCalendarDate(min);
  const selectedDate = parseCalendarDate(value);
  const monthStart = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1),
  );
  const weekdayOffset = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      1 - weekdayOffset,
    ),
  );
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      Date.UTC(
        gridStart.getUTCFullYear(),
        gridStart.getUTCMonth(),
        gridStart.getUTCDate() + index,
      ),
    );
    return {
      date,
      value: date.toISOString().slice(0, 10),
      adjacent: date.getUTCMonth() !== monthStart.getUTCMonth(),
    };
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
  const minimumMonth = new Date(
    Date.UTC(minimumDate.getUTCFullYear(), minimumDate.getUTCMonth(), 1),
  );
  const previousMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1),
  );
  const previousDisabled = previousMonth < minimumMonth;

  function calculatePopupPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return null;

    const bounds = trigger.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 32);
    const left = Math.max(
      16,
      Math.min(bounds.left, window.innerWidth - width - 16),
    );
    const top = Math.max(
      12,
      Math.min(bounds.bottom + 9, window.innerHeight - 176),
    );

    return { top, left, width };
  }

  useEffect(() => {
    if (!open) return undefined;

    function repositionPopup() {
      const position = calculatePopupPosition();
      if (position) setPopupPosition(position);
    }

    function closeOnOutsidePointer(event) {
      if (
        !calendarRef.current?.contains(event.target) &&
        !event.target.closest(".theme-toggle")
      ) {
        setOpen(false);
        setPopupPosition(null);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setPopupPosition(null);
        triggerRef.current?.focus();
      }
    }

    repositionPopup();
    window.addEventListener("resize", repositionPopup);
    document.addEventListener("scroll", repositionPopup, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", repositionPopup);
      document.removeEventListener("scroll", repositionPopup, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function changeMonth(amount) {
    setVisibleMonth(
      new Date(
        Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + amount,
          1,
        ),
      ),
    );
  }

  function selectDate(dateValue) {
    onChange(dateValue);
    const date = parseCalendarDate(dateValue);
    setVisibleMonth(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    );
    setOpen(false);
    setPopupPosition(null);
    triggerRef.current?.focus();
  }

  return (
    <div className="field date-field">
      <span id="booking-date-label">Choose a date in {timezone}</span>
      <div className="booking-calendar" ref={calendarRef}>
        <button
          ref={triggerRef}
          type="button"
          className="calendar-trigger"
          aria-labelledby="booking-date-label"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "booking-calendar-panel" : undefined}
          onClick={() => {
            if (!open) {
              const date = parseCalendarDate(value || min);
              setVisibleMonth(
                new Date(
                  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
                ),
              );
              setPopupPosition(calculatePopupPosition());
            } else {
              setPopupPosition(null);
            }
            setOpen((wasOpen) => !wasOpen);
          }}
        >
          <span className="calendar-trigger-date">
            <CalendarDays size={17} aria-hidden="true" />
            {formatCalendarDate(selectedDate)}
          </span>
          <ChevronDown
            size={16}
            className={
              open
                ? "calendar-trigger-chevron is-open"
                : "calendar-trigger-chevron"
            }
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div
            className="calendar-popup"
            id="booking-calendar-panel"
            role="dialog"
            aria-label={`Choose a date, ${monthLabel}`}
            style={
              popupPosition
                ? {
                    top: `${popupPosition.top}px`,
                    left: `${popupPosition.left}px`,
                    width: `${popupPosition.width}px`,
                    "--calendar-top": `${popupPosition.top}px`,
                  }
                : undefined
            }
          >
            <div className="calendar-header">
              <div>
                <span className="calendar-header-kicker">SELECT A DAY</span>
                <h3 id="booking-calendar-month">{monthLabel}</h3>
              </div>
              <div className="calendar-navigation">
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Previous month"
                  disabled={previousDisabled}
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className="calendar-grid"
              role="grid"
              aria-labelledby="booking-calendar-month"
            >
              <div className="calendar-week calendar-weekdays" role="row">
                {["M", "T", "W", "T", "F", "S", "S"].map((weekday, index) => (
                  <span
                    className="calendar-weekday"
                    role="columnheader"
                    aria-label={
                      [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ][index]
                    }
                    key={`${weekday}-${index}`}
                  >
                    {weekday}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, weekIndex) => (
                <div className="calendar-week" role="row" key={weekIndex}>
                  {calendarDays
                    .slice(weekIndex * 7, weekIndex * 7 + 7)
                    .map(({ date, value: dateValue, adjacent }) => {
                      const isSelected = dateValue === value;
                      const isToday = dateValue === min;
                      const isDisabled = isCalendarDateDisabled(dateValue, min);
                      return (
                        <span
                          className="calendar-cell"
                          role="gridcell"
                          key={dateValue}
                        >
                          <button
                            type="button"
                            className={[
                              "calendar-day",
                              adjacent ? "is-adjacent" : "",
                              isToday ? "is-today" : "",
                              isSelected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-label={formatCalendarDate(date)}
                            aria-pressed={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            disabled={isDisabled}
                            onClick={() => selectDate(dateValue)}
                          >
                            {date.getUTCDate()}
                          </button>
                        </span>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypewriterHeadline() {
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

function availabilitySummary(mentor) {
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

function Loading({ label = "Loading" }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={18} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function InlineError({ children }) {
  if (!children) return null;
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <div className="modal-heading-actions">
            <ThemeToggle compact />
            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={19} />
            </button>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

function AuthScreen({ onAuthenticated, initialMode = "login", onBackToHome }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "register"
          ? await api.register({ name, email, password })
          : await api.login({ email, password });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <header className="topbar auth-topbar">
          <a
            className="brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onBackToHome();
            }}
          >
            <span className="brand-symbol">
              <GraduationCap size={20} />
            </span>
            <span>
              MentorMatch<span className="brand-period">.</span>
            </span>
          </a>
          <span className="topbar-note">
            Trial classes, thoughtfully matched
          </span>
          <ThemeToggle compact />
          <button className="auth-home-link" onClick={onBackToHome}>
            Back to home <ArrowRight size={15} />
          </button>
        </header>
        <section className="auth-layout">
          <div className="auth-intro">
            <p className="eyebrow">
              <Sparkles size={14} /> A better first lesson
            </p>
            <h1>The right mentor starts with a conversation.</h1>
            <p className="auth-copy">
              Meet experienced tutors, find a time that works, and try a class
              before you commit.
            </p>
            <div className="auth-proof">
              <span className="proof-mark">
                <Check size={16} />
              </span>
              <span>Small-group-free, one-to-one trial sessions</span>
            </div>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <div className="form-heading">
              <p className="eyebrow">
                {mode === "login" ? "Welcome back" : "Get started"}
              </p>
              <h2>
                {mode === "login" ? "Sign in" : "Create your parent account"}
              </h2>
              <p>
                {mode === "login"
                  ? "Use your parent or mentor account."
                  : "Create an account to book trial classes."}
              </p>
            </div>
            {mode === "register" && (
              <label className="field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="username"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <InlineError>{error}</InlineError>
            <button
              className="button button-primary button-full"
              type="submit"
              disabled={busy}
            >
              {busy ? <LoaderCircle size={17} className="spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
              {!busy ? <ArrowRight size={17} /> : null}
            </button>
            <p className="mode-switch">
              {mode === "login"
                ? "New to MentorMatch?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "Create a parent account" : "Sign in"}
              </button>
            </p>
          </form>
        </section>
        <footer className="page-footer">
          MentorMatch <span>·</span> Find your next great teacher
        </footer>
      </div>
    </main>
  );
}

function MentorCard({ mentor, onBook, publicPreview = false }) {
  const [portraitUnavailable, setPortraitUnavailable] = useState(false);
  const portrait = portraitUnavailable ? null : MENTOR_PORTRAITS[mentor.name];

  return (
    <article className="mentor-card">
      <div className="mentor-card-top">
        {portrait ? (
          <img
            className="avatar avatar-mentor mentor-portrait"
            src={portrait}
            alt={`Portrait of ${mentor.name}`}
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            onError={() => setPortraitUnavailable(true)}
          />
        ) : (
          <div className="avatar avatar-mentor" aria-hidden="true">
            {mentor.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <span className="mentor-active-label">
          <span className="availability-dot" /> Accepting trials
        </span>
      </div>
      <h3>{mentor.name}</h3>
      <p className="mentor-bio">{mentor.bio}</p>
      <div className="subject-list">
        {mentor.subjects.map((subject) => (
          <span className="subject-tag" key={subject}>
            {subject}
          </span>
        ))}
      </div>
      <div className="mentor-card-bottom">
        <span className="availability-hint" title={`${mentor.timezone} time`}>
          <Clock3 size={15} /> {availabilitySummary(mentor)}
        </span>
        <button
          className="button button-outline button-small"
          onClick={() => onBook(mentor)}
        >
          {publicPreview ? "Book a trial" : "View times"}{" "}
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function HomeScreen({ onSignIn, onJoin }) {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroPortraitUnavailable, setHeroPortraitUnavailable] = useState(false);

  useEffect(() => {
    let current = true;
    api
      .mentors()
      .then((result) => {
        if (current) setMentors(result.mentors);
      })
      .catch((requestError) => {
        if (current) setError(requestError.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const spotlight = mentors[0];
  const heroPortrait = heroPortraitUnavailable
    ? null
    : MENTOR_PORTRAITS[spotlight?.name];

  return (
    <main className="home-page">
      <div className="home-shell">
        <header className="topbar home-topbar">
          <a className="brand" href="#home" aria-label="MentorMatch home">
            <span className="brand-symbol">
              <GraduationCap size={20} />
            </span>
            <span>
              MentorMatch<span className="brand-period">.</span>
            </span>
          </a>
          <nav className="home-nav" aria-label="Main navigation">
            <a href="#mentors">Mentors</a>
            <ThemeToggle compact />
            <button className="home-nav-signin" onClick={onSignIn}>
              Sign in
            </button>
            <button
              className="button button-primary home-nav-join"
              onClick={() => onJoin("register")}
            >
              Join MentorMatch <ArrowRight size={15} />
            </button>
          </nav>
        </header>

        <section className="home-hero" id="home">
          <div className="home-hero-copy">
            <p className="eyebrow home-eyebrow">
              <span className="eyebrow-rule" />
              Trial learning, made personal
            </p>
            <TypewriterHeadline />
            <p className="home-lede">
              Find a mentor who makes room for questions, starts where you are,
              and helps the next idea fall into place.
            </p>
            <div className="home-actions">
              <button
                className="button button-primary home-primary-action"
                onClick={() => onJoin("register")}
              >
                Find your mentor <ArrowRight size={17} />
              </button>
              <a className="home-secondary-action" href="#mentors">
                Explore the directory{" "}
                <span>
                  <ArrowRight size={15} />
                </span>
              </a>
            </div>
            <div className="home-footnote">
              <span className="footnote-line" />
              <span>One-to-one trial classes across three time zones</span>
            </div>
          </div>

          <div className="home-hero-visual">
            <img
              className="home-hero-photo"
              src="/images/mentors/hero-mentoring.jpg"
              alt="Students and a mentor studying together at a sunlit desk"
              width="1600"
              height="900"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="home-hero-fade" aria-hidden="true" />
            {error ? (
              <div className="hero-overlay-status">
                <InlineError>{error}</InlineError>
              </div>
            ) : null}
            {loading ? (
              <div className="hero-mentor-overlay is-loading">
                <Loading label="Finding your mentor" />
              </div>
            ) : null}
            {!loading && !error && spotlight ? (
              <article
                className="hero-mentor-overlay"
                aria-label={`${spotlight.name}, ${spotlight.subjects.slice(0, 2).join(" and ")}`}
              >
                {heroPortrait ? (
                  <img
                    className="hero-overlay-avatar"
                    src={heroPortrait}
                    alt=""
                    width="84"
                    height="84"
                    loading="lazy"
                    decoding="async"
                    onError={() => setHeroPortraitUnavailable(true)}
                  />
                ) : (
                  <div className="hero-overlay-avatar hero-overlay-initials" aria-hidden="true">
                    {spotlight.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                )}
                <div className="hero-overlay-copy">
                  <h2>{spotlight.name}</h2>
                  <p className="hero-overlay-subjects">
                    {spotlight.subjects.slice(0, 2).join(" · ")}
                  </p>
                  <p className="hero-overlay-meta">
                    <Clock3 size={13} /> {availabilitySummary(spotlight)}
                  </p>
                  <a className="hero-overlay-link" href="#mentors">
                    View available times <ArrowRight size={14} />
                  </a>
                </div>
              </article>
            ) : null}
            {!loading && !error && !spotlight ? (
              <div className="hero-mentor-overlay is-empty">
                Mentor profiles will appear here when available.
              </div>
            ) : null}
          </div>
        </section>

        <section
          className="home-directory"
          id="mentors"
          aria-labelledby="home-directory-title"
        >
          <div className="home-directory-heading">
            <div>
              <p className="eyebrow">A good place to begin</p>
              <h2 id="home-directory-title">Meet the mentors</h2>
            </div>
            <span className="home-directory-count">
              {loading
                ? "Loading profiles"
                : `${mentors.length} mentor profiles`}
            </span>
          </div>
          {error ? <InlineError>{error}</InlineError> : null}
          {loading ? <Loading label="Loading mentor profiles" /> : null}
          {!loading && !error && mentors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Users size={21} />
              </span>
              <h3>No mentor profiles are available right now</h3>
              <p>Please check back soon.</p>
            </div>
          ) : null}
          {!loading && mentors.length > 0 ? (
            <div className="mentor-grid home-mentor-grid">
              {mentors.slice(0, 3).map((mentor) => (
                <MentorCard
                  key={mentor._id}
                  mentor={mentor}
                  publicPreview
                  onBook={() => onJoin("register")}
                />
              ))}
            </div>
          ) : null}
          {!loading && mentors.length > 3 ? (
            <button
              className="home-directory-link"
              onClick={() => onJoin("register")}
            >
              Sign in to explore all {mentors.length} mentors{" "}
              <ArrowRight size={16} />
            </button>
          ) : null}
        </section>

        <footer className="page-footer home-footer">
          <span>MentorMatch</span>
          <span>Find your next great teacher</span>
          <button onClick={onSignIn}>
            Mentor sign in <ArrowRight size={14} />
          </button>
        </footer>
      </div>
    </main>
  );
}

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

function BookingList({ bookings, loading, error, role, onCancel }) {
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

function SubjectDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const items = [
    { value: "", label: "All subjects" },
    ...options.map((option) => ({ value: option, label: option })),
  ];
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsidePointer(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function openMenu() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function chooseItem(index) {
    onChange(items[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) openMenu();
    }
  }

  function handleOptionKeyDown(event, index) {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % items.length;
    else if (event.key === "ArrowUp") {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseItem(index);
      return;
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="subject-dropdown" ref={dropdownRef}>
      <span className="sr-only" id="subject-filter-label">
        Filter by subject
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="subject-dropdown-trigger"
        aria-labelledby="subject-filter-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "subject-filter-options" : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{items[selectedIndex].label}</span>
        <span className="subject-dropdown-caret" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="subject-dropdown-menu"
          id="subject-filter-options"
          role="listbox"
          aria-labelledby="subject-filter-label"
        >
          {items.map((item, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              className="subject-dropdown-option"
              type="button"
              role="option"
              aria-selected={item.value === value}
              tabIndex={activeIndex === index ? 0 : -1}
              key={item.value || "all-subjects"}
              onClick={() => chooseItem(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
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
