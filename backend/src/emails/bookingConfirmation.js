const BRAND_COLOR = "#145c46";
const BRAND_DARK = "#0f4534";
const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#6b7280";
const BORDER_COLOR = "#e5e7eb";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@mentormatch.com";
const CLASS_BASE_URL =
  process.env.CLASS_BASE_URL ?? "https://meet.mentormatch.com/class";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInstant(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date instanceof Date ? date : new Date(date));
}

function formatZoneLabel(timezone) {
  return timezone.replace(/_/g, " ");
}

function classUrl(booking) {
  return `${CLASS_BASE_URL}/${booking.bookingId}`;
}

function renderRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:${MUTED_COLOR};width:120px;vertical-align:top;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 0;font-size:14px;color:${TEXT_COLOR};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;word-break:break-word;">
        ${value}
      </td>
    </tr>
  `;
}

function renderTimeRows({ primary, secondary }) {
  return [
    renderRow(
      primary.label,
      `<strong style="font-weight:600;color:${TEXT_COLOR};">${escapeHtml(primary.value)}</strong><br/>
       <span style="font-size:12px;color:${MUTED_COLOR};font-weight:400;">${escapeHtml(primary.zone)}</span>`,
    ),
    renderRow(
      secondary.label,
      `<span style="color:${MUTED_COLOR};font-weight:400;">${escapeHtml(secondary.value)}<br/>
       ${escapeHtml(secondary.zone)}</span>`,
    ),
  ].join("");
}

function renderLayout({
  preheader,
  heading,
  intro,
  rows,
  cta,
  secondaryLink,
  footerNote,
}) {
  const secondaryBlock = secondaryLink
    ? `
      <p style="margin:16px 0 0 0;text-align:center;font-size:13px;">
        <a href="${escapeHtml(secondaryLink.href)}" style="color:${BRAND_COLOR};text-decoration:underline;">
          ${escapeHtml(secondaryLink.label)}
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_COLOR};">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${BRAND_COLOR};padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">
                MentorMatch<span style="color:#7dd3a8;">.</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND_DARK};">
                ${escapeHtml(heading)}
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${TEXT_COLOR};">
                ${intro}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid ${BORDER_COLOR};border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${rows}
                    </table>
                  </td>
                </tr>
              </table>
              <div style="margin-top:28px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                  <tr>
                    <td style="background:${BRAND_COLOR};border-radius:8px;">
                      <a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        ${escapeHtml(cta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              <p style="margin:12px 0 0 0;text-align:center;font-size:12px;line-height:1.5;color:${MUTED_COLOR};word-break:break-all;">
                Or paste this link into your browser:<br/>
                <a href="${escapeHtml(cta.href)}" style="color:${BRAND_COLOR};text-decoration:underline;">${escapeHtml(cta.href)}</a>
              </p>
              ${secondaryBlock}
              <p style="margin:32px 0 0 0;font-size:13px;line-height:1.6;color:${MUTED_COLOR};border-top:1px solid ${BORDER_COLOR};padding-top:20px;">
                ${footerNote}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid ${BORDER_COLOR};">
              <p style="margin:0 0 4px 0;font-size:12px;color:${MUTED_COLOR};">
                MentorMatch · Better learning begins with the right connection
              </p>
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};">
                Questions? <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${BRAND_COLOR};text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function parentBookingEmail({ parent, mentor, booking }) {
  const parentZone = parent.timezone || "UTC";
  const mentorZone = booking.timezone;

  const whenParent = formatInstant(booking.startsAt, parentZone);
  const whenMentor = formatInstant(booking.startsAt, mentorZone);
  const subjects = mentor.subjects.join(", ");
  const joinLink = classUrl(booking);
  const subject = `Your trial with ${mentor.name} is confirmed`;

  const text = [
    `Hi ${parent.name},`,
    ``,
    `Your trial class with ${mentor.name} is confirmed.`,
    ``,
    `Your local time (${parentZone}):`,
    `  ${whenParent}`,
    ``,
    `Mentor's time (${mentorZone}):`,
    `  ${whenMentor}`,
    ``,
    `Subjects:   ${subjects}`,
    `Booking ID: ${booking.bookingId}`,
    ``,
    `Join the class here:`,
    `  ${joinLink}`,
    ``,
    `This is a demo link. It will connect you to the live session at the scheduled time.`,
    ``,
    `View or cancel your booking: ${APP_URL}`,
    ``,
    `— MentorMatch`,
  ].join("\n");

  const html = renderLayout({
    preheader: `Your trial with ${mentor.name} on ${whenParent} (${parentZone}) is confirmed.`,
    heading: "Your trial is confirmed",
    intro: `Hi ${escapeHtml(parent.name)}, your trial class with <strong>${escapeHtml(mentor.name)}</strong> is all set. Use the button below to join at the scheduled time.`,
    rows: [
      renderTimeRows({
        primary: {
          label: "Your local time",
          value: whenParent,
          zone: formatZoneLabel(parentZone),
        },
        secondary: {
          label: "Mentor's time",
          value: whenMentor,
          zone: formatZoneLabel(mentorZone),
        },
      }),
      renderRow("Subjects", escapeHtml(subjects)),
      renderRow(
        "Booking ID",
        `<span style="font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;color:${TEXT_COLOR};background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:4px;padding:3px 6px;">${escapeHtml(booking.bookingId)}</span>`,
      ),
    ].join(""),
    cta: { label: "Join class", href: joinLink },
    secondaryLink: { label: "View or cancel booking", href: APP_URL },
    footerNote: `You received this because you booked a trial class on MentorMatch. If you need to reschedule or cancel, visit your dashboard.`,
  });

  return { subject, text, html };
}

export function mentorBookingEmail({ parent, mentor, booking }) {
  const parentZone = parent.timezone || "UTC";
  const mentorZone = booking.timezone;

  const whenMentor = formatInstant(booking.startsAt, mentorZone);
  const whenParent = formatInstant(booking.startsAt, parentZone);
  const joinLink = classUrl(booking);
  const subject = `New trial booking from ${parent.name}`;

  const text = [
    `Hi ${mentor.name},`,
    ``,
    `${parent.name} has booked a trial class with you.`,
    ``,
    `Your local time (${mentorZone}):`,
    `  ${whenMentor}`,
    ``,
    `Parent's time (${parentZone}):`,
    `  ${whenParent}`,
    ``,
    `Student:    ${parent.name} (${parent.email})`,
    `Booking ID: ${booking.bookingId}`,
    ``,
    `Join the class here:`,
    `  ${joinLink}`,
    ``,
    `This is a demo link. It will connect you to the live session at the scheduled time.`,
    ``,
    `View your booking: ${APP_URL}`,
    ``,
    `— MentorMatch`,
  ].join("\n");

  const html = renderLayout({
    preheader: `New trial booking from ${parent.name} on ${whenMentor} (${mentorZone}).`,
    heading: "New trial booking",
    intro: `Hi ${escapeHtml(mentor.name)}, <strong>${escapeHtml(parent.name)}</strong> has booked a trial class with you. Use the button below to join at the scheduled time.`,
    rows: [
      renderTimeRows({
        primary: {
          label: "Your local time",
          value: whenMentor,
          zone: formatZoneLabel(mentorZone),
        },
        secondary: {
          label: "Parent's time",
          value: whenParent,
          zone: formatZoneLabel(parentZone),
        },
      }),
      renderRow(
        "Student",
        `${escapeHtml(parent.name)}<br/><a href="mailto:${escapeHtml(parent.email)}" style="color:${BRAND_COLOR};text-decoration:none;font-size:13px;">${escapeHtml(parent.email)}</a>`,
      ),
      renderRow(
        "Booking ID",
        `<span style="font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;color:${TEXT_COLOR};background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:4px;padding:3px 6px;">${escapeHtml(booking.bookingId)}</span>`,
      ),
    ].join(""),
    cta: { label: "Join class", href: joinLink },
    secondaryLink: { label: "View booking", href: APP_URL },
    footerNote: `You received this because a parent booked a trial class with you on MentorMatch. Reach out to the student directly if you need to reschedule.`,
  });

  return { subject, text, html };
}
