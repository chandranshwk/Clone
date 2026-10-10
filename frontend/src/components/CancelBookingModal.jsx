import { LoaderCircle } from "lucide-react";
import { formatInstant } from "../lib/formatters.js";
import { Modal } from "./Modal.jsx";

export function CancelBookingModal({ cancelTarget, busy, onClose, onConfirm }) {
  return (
    <Modal title="Cancel this trial?" onClose={busy ? null : onClose}>
      <div className="cancel-content">
        <p>
          This booking will be marked cancelled, and its place will be returned
          to the mentor’s daily availability.
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
            onClick={onClose}
            disabled={busy}
          >
            Keep booking
          </button>
          <button
            className="button button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <LoaderCircle size={16} className="spin" /> : null} Cancel
            trial
          </button>
        </div>
      </div>
    </Modal>
  );
}
