import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeContext.jsx";

function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}`}
      role="group"
      aria-label="Choose Day or Night theme"
    >
      <button
        type="button"
        className={
          theme === "light" ? "theme-option is-selected" : "theme-option"
        }
        aria-label="Switch to light theme"
        aria-pressed={theme === "light"}
        title="Day theme"
        onClick={() => setTheme("light")}
      >
        <Sun size={15} aria-hidden="true" />
        <span>Day</span>
      </button>
      <button
        type="button"
        className={
          theme === "dark" ? "theme-option is-selected" : "theme-option"
        }
        aria-label="Switch to dark theme"
        aria-pressed={theme === "dark"}
        title="Night theme"
        onClick={() => setTheme("dark")}
      >
        <Moon size={15} aria-hidden="true" />
        <span>Night</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
