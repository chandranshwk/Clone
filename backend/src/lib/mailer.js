import nodemailer from "nodemailer";

// Transporter and warning flag are module-level so they persist across
// calls. Nodemailer docs recommend reusing a single transporter: each
// createTransport() call allocates its own SMTP connection pool, so
// re-creating per send wastes sockets and slows delivery.
let transporter = null;
// Prevents the "SMTP not configured" warning from spamming the log on
// every send during development when SMTP is intentionally unset.
let warned = false;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  // SMTP_HOST is the canonical "is SMTP configured?" signal. If it's
  // absent we return null and sendMail short-circuits — this lets the
  // app run in development without any email setup.
  if (!SMTP_HOST) return null;

  const port = Number(SMTP_PORT ?? 587);

  // Port 465 uses implicit TLS; 587 uses STARTTLS (opportunistic). The
  // secure flag must match, otherwise the TLS handshake fails.
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
}

/**
 * Send a single transactional email. Returns { skipped: true } when
 * SMTP isn't configured rather than throwing, so a missing mail setup
 * in development doesn't break the booking flow. The log line is
 * enough to confirm the mail was attempted.
 *
 * In production, the caller (bookingService.notifyBookingCreated)
 * wraps this in Promise.allSettled and logs failures — a bounced email
 * should never fail the HTTP request that triggered it.
 */
export async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();

  if (!tx) {
    if (!warned) {
      console.warn(
        "[mailer] SMTP is not configured. Emails will be logged but not sent. " +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.",
      );
      warned = true;
    }
    console.info(`[mailer] (skipped) to=${to} subject="${subject}"`);
    return { skipped: true };
  }

  // MAIL_FROM defaults to a .local domain so nothing accidentally
  // sends from a real-looking address in development. Override via
  // env in production with a verified domain.
  const from =
    process.env.MAIL_FROM ?? "MentorMatch <no-reply@mentormatch.local>";

  const info = await tx.sendMail({ from, to, subject, text, html });
  return { skipped: false, messageId: info.messageId };
}
