import { useState } from "react";
import {
  ArrowRight,
  Check,
  GraduationCap,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "../ThemeToggle.jsx";
import { InlineError } from "./InlineError.jsx";
import { api } from "../lib/api.js";

export function AuthScreen({
  onAuthenticated,
  initialMode = "login",
  onBackToHome,
}) {
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
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
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
