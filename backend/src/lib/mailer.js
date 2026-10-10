import nodemailer from "nodemailer";

let transporter = null;
let warned = false;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;

  const port = Number(SMTP_PORT ?? 587);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
}

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

  const from =
    process.env.MAIL_FROM ?? "MentorMatch <no-reply@mentormatch.local>";

  const info = await tx.sendMail({ from, to, subject, text, html });
  return { skipped: false, messageId: info.messageId };
}
