import { useEffect } from "react";
import ThemeToggle from "../ThemeToggle";
import { X } from "lucide-react";

export function Modal({ title, children, onClose, wide = false }) {
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
