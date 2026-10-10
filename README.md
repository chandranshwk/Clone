# MentorMatch

A trial-class booking system built for the Codeyoung Full-Stack Engineer assignment.

Parents browse mentors, view availability in their own timezone, book a one-to-one trial, and receive a confirmation email with a live-class link. Mentors receive the same booking with the parent's name and contact. Both parties see times in both timezones.

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express 5
- **Database:** MongoDB (Atlas or any replica set — transactions required)
- **Email:** Nodemailer over SMTP (Gmail, Resend, or any SMTP provider)

---

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas cluster, or any MongoDB deployment with a replica set (transactions require it)
- An SMTP account for email. Optional — the app runs without it and logs sends instead.

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd <repo-name>

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure MongoDB Atlas

1. Create an Atlas cluster and a database user with read/write access.
2. Add your machine's public IP under **Network Access**.
3. From **Connect → Drivers**, copy the Node.js connection string.

### 3. Configure the backend environment

```bash
cd backend
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Generate a JWT secret:

```bash
node -p "require('node:crypto').randomBytes(48).toString('base64url')"
```

Fill in `backend/.env`:

```dotenv
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<host>/<database>
JWT_SECRET=<generated-value>
DEMO_MENTOR_PASSWORD=<your-choice>
DEMO_PARENT_PASSWORD=<your-choice>

# Optional — email. Leave SMTP_HOST empty to skip sending (logged instead).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=<app-password>
MAIL_FROM="MentorMatch <you@example.com>"
```

**`.env` is gitignored. Never commit it. Never expose it to the frontend.**

### 4. Seed demo data

```bash
cd backend
npm run seed
```

Creates **10 mentors** across Asia/Kolkata, Europe/London, and America/New_York, plus **2 parents**. Idempotent — safe to re-run.

### 5. Run

Backend:

```bash
cd backend
npm run dev
```

Frontend (second terminal):

```bash
cd frontend
npm run dev
```

Open the URL Vite prints. API requests are proxied to `http://localhost:5000`.

### Demo credentials

All demo mentors share `DEMO_MENTOR_PASSWORD`. All demo parents share `DEMO_PARENT_PASSWORD`. Emails follow:

- Mentors: `firstname.lastname@demo.mentormatch.test`
- Parents: `taylor.morgan@demo.mentormatch.test`, `jordan.lee@demo.mentormatch.test`

For email testing, replace those `.test` addresses in MongoDB Compass with real addresses you control — `.test` is a reserved TLD and will bounce.

---

## Architecture

```
backend/
  src/
    server.js              # Boot: env validation, DB connect, listen
    app.js                 # Express app, routes, error handler
    routes/                # auth, mentors, bookings
    services/
      bookingService.js    # The only writer of DailyCapacity.
                           # Atomic capacity guard + transaction live here.
    middleware/auth.js     # JWT verify, role guard
    models/                # Mentor, Parent, Booking, DailyCapacity
    utils/time.js          # Temporal-based timezone + slot arithmetic
    emails/                # HTML + text templates
    lib/mailer.js          # Nodemailer transport (cached)

frontend/
  src/
    App.jsx                # Session restore, top-level orchestration
    components/            # BookingModal, MentorDirectory, BookingList, etc.
    lib/
      api.js               # Fetch wrapper
      formatters.js        # Timezone-aware date/time formatting
```

**Why this shape:** the backend separates HTTP concerns (routes) from domain logic (services). `bookingService.js` owns the booking invariant and is the only place that touches `DailyCapacity` — any other writer would break the concurrency guarantee. Timezone arithmetic lives entirely in `utils/time.js` so all consumers share one implementation.

---

## Key design decisions

### Timezones and DST

Times are stored as UTC instants (`startsAt`, `endsAt`), and each booking also stores the mentor's IANA timezone name (e.g. `America/New_York`) — never a fixed offset.

- **Server:** conversions use `Temporal.ZonedDateTime` from `@js-temporal/polyfill`, which carries the IANA database and applies the correct UTC offset for the specific instant. January renders as `-05:00` (EST), July as `-04:00` (EDT) — same code, no special cases.
- **Client:** `Intl.DateTimeFormat({ timeZone })` for the same reason.
- **Spring-forward:** a slot time that doesn't exist on a DST transition day is rejected by the round-trip check in `buildAvailableSlots`.
- **Fall-back:** a duplicated hour is disambiguated deterministically, and `seenInstants` prevents a slot appearing twice.
- **Supported zones** come from `Intl.supportedValuesOf("timeZone")`, so the runtime's own IANA list is authoritative. This also avoids a real bug where Node canonicalises `Asia/Kolkata` to `Asia/Calcutta` inconsistently.

### Capacity guard (max 2 trials per mentor per day)

Enforced with a `DailyCapacity` document per mentor per mentor-local date. The reservation is a single atomic operation:

```js
DailyCapacity.findOneAndUpdate(
  { mentorId, localDate, activeCount: { $lt: ACTIVE_BOOKING_LIMIT } },
  { $inc: { activeCount: 1 } },
  { new: true, session },
);
```

If two requests race, MongoDB serialises the updates — only one can observe `activeCount < 2` and succeed. The whole operation runs in a transaction, so a downstream failure rolls the counter back.

Cancellation decrements the counter in the same transaction. The counter is guarded by `{ activeCount: { $gt: 0 } }` so it can never go negative.

**Verified:** a test fires four parallel booking requests and asserts exactly two succeed.

### Booking slot rules

- Slots are 60 minutes (`CLASS_DURATION_MINUTES`), aligned to whole-minute boundaries.
- Slots must fit entirely inside a mentor's declared availability window for that weekday.
- Overlap check uses strict comparisons (`$lt` / `$gt`), so back-to-back bookings (10:00–11:00 and 11:00–12:00) don't collide.
- Past slots are filtered out server-side.

### Email pipeline

Two emails per booking — parent and mentor — sent via Nodemailer over SMTP.

- **Fired after the transaction commits**, not inside it. A DB rollback should not produce a confirmation for a booking that doesn't exist.
- **Not awaited.** SMTP latency doesn't delay the HTTP response. Individual failures are logged but don't fail the request — the booking is the source of truth.
- **Both timezones** in each email: recipient's own as the primary line, the other party's as muted reference.
- **Dummy live-class link** included as a button and as a raw URL (for clients that strip buttons). The brief specifies the link is a placeholder — it does not need to resolve.
- **Graceful degradation:** if `SMTP_HOST` is unset, the mailer logs the would-be send and returns without throwing, so the app runs without email configuration in development.

### Session restore

The JWT is stored in `localStorage` and decoded client-side on page load to restore the session without a server round-trip. This is safe because:

- The client never trusts the token for authorization — the server re-verifies on every API call.
- The client-side expiry check is a UX nicety (avoid rendering a dashboard that will immediately 401); the server still enforces expiry.
- If the token is tampered with, the next API call fails and the user is signed out.

---

## API

All bodies are JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint                                              | Access                   | Purpose                                                 |
| ------ | ----------------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| GET    | `/api/health`                                         | Public                   | API and DB readiness                                    |
| POST   | `/api/auth/register`                                  | Public                   | Create parent (`name`, `email`, `password`, `timezone`) |
| POST   | `/api/auth/login`                                     | Public                   | Log in parent or mentor (`email`, `password`)           |
| GET    | `/api/auth/me`                                        | Authenticated            | Current account                                         |
| GET    | `/api/mentors?search=&subject=&page=&limit=`          | Public                   | Search and page active mentors                          |
| GET    | `/api/mentors/:mentorId/availability?date=YYYY-MM-DD` | Public                   | Slots + remaining daily capacity                        |
| POST   | `/api/bookings`                                       | Parent                   | Create trial (`mentorId`, `startAt`)                    |
| GET    | `/api/bookings?status=active&page=&limit=`            | Authenticated            | Own parent history, or mentor's bookings                |
| DELETE | `/api/bookings/:bookingId`                            | Owner or assigned mentor | Cancel active booking                                   |

`startAt` must be ISO 8601 with `Z` or an explicit offset — e.g. `2030-01-07T09:00:00+05:30`. Offset-less strings are rejected to avoid ambiguity.

Errors return `{ "error": { "code": "...", "message": "..." } }`.

### Example

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Test Parent","email":"test@example.com","password":"password123","timezone":"America/New_York"}'

# Book
curl -X POST http://localhost:5000/api/bookings \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mentorId":"...","startAt":"2030-01-07T09:00:00+05:30"}'
```

---

## Tests

```bash
cd backend
npm test
```

Uses Node's built-in test runner against a temporary in-memory MongoDB replica set (transactions require a replica set). First run may download the MongoDB test binary. Does not touch your Atlas cluster.

Coverage includes:

- Registration hashing and protected-route auth
- Concurrent booking under the daily cap (4 parallel requests, exactly 2 succeed)
- Cancellation frees capacity
- Cross-user authorization (mentor can't book; other parent can't cancel)
- Public mentor listing does not leak `email` / `passwordHash`
- Slot availability returns the correct offsets

---

## Scope

**Built:** email/password auth, mentor directory with search and subject filter, timezone-aware booking modal, per-mentor-per-day capacity guard, cancellation with capacity release, transactional email to both parties with dual timezones and a dummy class link, DST handling.

**Deliberately not built:** OAuth/social login, password reset, email verification, real-time video (dummy link per the brief), payments, ratings, admin panel, chat, calendar sync. None were requested and each would have diluted the core flow.

---

## AI session transcript

Per the assignment brief, the full AI-assisted session transcript is included as `TRANSCRIPT.md` at the repository root.

---

## Notes

- **Demo emails:** the seed uses `.test` domains, which don't resolve. Replace them in MongoDB Compass with real addresses for email testing.
- **Email in development:** Gmail SMTP has a low daily limit and often classifies transactional mail as spam. For production, verify a domain and use a transactional provider (Resend, Postmark, SES). The mailer is provider-agnostic — only `.env` changes.
- **Atlas transactions:** a standalone MongoDB (installed locally without a replica set) will reject the booking transaction. Use Atlas or configure a single-node replica set.
