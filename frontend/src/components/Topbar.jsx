import { GraduationCap, LogOut } from "lucide-react";
import ThemeToggle from "../ThemeToggle.jsx";

export function Topbar({ session, onSignOut }) {
  return (
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
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={17} />
        </button>
      </nav>
    </header>
  );
}
