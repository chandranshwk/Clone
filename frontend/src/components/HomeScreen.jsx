import { useEffect, useState } from "react";
import {
  availabilitySummary,
  InlineError,
  Loading,
  MENTOR_PORTRAITS,
  TypewriterHeadline,
} from "../App";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { api } from "../lib/api";
import { MentorCard } from "./MentorCard";

export function HomeScreen({ onSignIn, onJoin }) {
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
                  <div
                    className="hero-overlay-avatar hero-overlay-initials"
                    aria-hidden="true"
                  >
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
