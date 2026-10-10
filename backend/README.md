# MentorMatch — Backend

Express 5 + Mongoose API for the MentorMatch trial-class booking system. Handles authentication, mentor directory, slot generation, booking creation with capacity enforcement, and transactional email to both parent and mentor.

- **Runtime:** Node.js 20.19+ / 22.12+
- **Framework:** Express 5
- **Database:** MongoDB (replica set required — transactions)
- **Auth:** JWT (HS256), bcryptjs password hashing
- **Email:** Nodemailer over SMTP
- **Time:** `@js-temporal/polyfill` (IANA tz database)

---

## Quick start

```bash
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `.env` (see [Environment](#environment) below), then:

```bash
npm run seed               # optional — creates 10 mentors + 2 parents
npm run dev                # http://localhost:5000
```

The server validates its environment, connects to MongoDB, awaits index initialization, then begins listening. It will not report "MongoDB connected" until the connection succeeds and indexes are built.

---

## Environment

All variables are read from `backend/.env`, which is gitignored. Two are required at boot; the rest are optional.

| Variable               | Required | Purpose                                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------ |
| `PORT`                 | No       | HTTP port. Defaults to `5000`.                                                       |
| `MONGODB_URI`          | **Yes**  | Must start with `mongodb://` or `mongodb+srv://`.                                    |
| `JWT_SECRET`           | **Yes**  | Signing key. Must be at least 32 characters.                                         |
| `DEMO_MENTOR_PASSWORD` | For seed | Shared password for all seeded mentor accounts. 8–72 bytes.                          |
| `DEMO_PARENT_PASSWORD` | For seed | Shared password for all seeded parent accounts. 8–72 bytes.                          |
| `SMTP_HOST`            | No       | SMTP relay host. If unset, emails are logged but not sent.                           |
| `SMTP_PORT`            | No       | Defaults to `587`. Port `465` enables implicit TLS.                                  |
| `SMTP_USER`            | No       | SMTP username. Required by most providers.                                           |
| `SMTP_PASS`            | No       | SMTP password or API key.                                                            |
| `MAIL_FROM`            | No       | `From:` header. Defaults to a `.local` placeholder.                                  |
| `APP_URL`              | No       | Base URL used in email links. Defaults to `http://localhost:5173`.                   |
| `CLASS_BASE_URL`       | No       | Base URL for the dummy class link. Defaults to `https://meet.mentormatch.com/class`. |
| `SUPPORT_EMAIL`        | No       | Shown in email footers. Defaults to `support@mentormatch.com`.                       |

`validateEnvironment()` runs at boot and fails fast if `MONGODB_URI` or `JWT_SECRET` is missing, malformed, or too short.

---

## Folder structure

```
backend/
  src/
    server.js                 # Boot: env → DB → listen, graceful shutdown
    app.js                    # Express app, route mounting, error handler
    config/
      environment.js          # Env validation
      database.js             # Connect + await index init
    constants.js              # Timezone list, booking limits, durations
    routes/
      auth.js                 # /register, /login, /me
      mentors.js              # /, /:id, /:id/availability
      bookings.js             # /, create, cancel
    middleware/
      auth.js                 # requireAuth, requireRole
    services/
      bookingService.js       # Domain logic — booking + capacity
    models/
      Mentor.js
      Parent.js
      Booking.js
      DailyCapacity.js
    utils/
      time.js                 # Temporal slot arithmetic, DST handling
      passwords.js            # bcryptjs hash + compare
    lib/
      mailer.js               # Nodemailer transport (cached)
    emails/
      bookingConfirmation.js  # HTML + plain-text templates
    scripts/
      seed.js                 # Idempotent demo data
    tests/
      api.test.js             # Integration test suite (HTTP + MongoDB)
      time.test.js            # Unit tests for timezone/slot arithmetic
```

**Layering rule:** routes handle HTTP (validation, status codes, response shapes). Services handle domain logic (invariants, transactions, side effects). Models define persistence. Routes do not touch `DailyCapacity` directly — only `bookingService.js` writes to it, and that is the only place the concurrency guarantee is enforced.

---

## API reference

All request and response bodies are JSON. Authenticated routes require `Authorization: Bearer <token>`.

### `GET /api/health`

Public. Returns `200` when the app can accept requests and MongoDB is connected; `503` otherwise.

```json
{ "status": "ok", "service": "mentormatch-api", "database": "connected" }
```

---

### `POST /api/auth/register`

Create a parent account.

**Body**

```json
{
  "name": "Taylor Morgan",
  "email": "taylor@example.com",
  "password": "at-least-8-bytes",
  "timezone": "America/New_York"
}
```

- `timezone` is optional. Must be in `SUPPORTED_TIME_ZONES`; falls back to `"UTC"`.
- Returns `201` with `{ token, user }`. `user` contains `id, name, email, role, timezone`.
- `409 EMAIL_IN_USE` if the email exists on either `Parent` or `Mentor`.

---

### `POST /api/auth/login`

Parent or mentor login. Body: `{ email, password }`. Returns `200` with `{ token, user }`.

The login searches both collections by email — the JWT payload includes `role` so subsequent requests don't need to re-check.

---

### `GET /api/auth/me`

Authenticated. Returns the current account as `{ user }`. Useful for clients that want to re-fetch after a role or profile change; the client-side restore path in this project decodes the JWT instead and skips this call.

---

### `GET /api/mentors`

Public. Search and filter active mentors.

**Query params**

- `search` — max 80 chars. Case-insensitive regex on `name`, `bio`, `subjects`.
- `subject` — max 60 chars. Case-insensitive exact match on `subjects`.
- `page` — default `1`.
- `limit` — default `20`, max `50`.

**Response** — paginated list. Only `name bio subjects timezone availability active` are returned. `email` and `passwordHash` are never exposed.

```json
{
  "mentors": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 10, "pages": 1 }
}
```

---

### `GET /api/mentors/:mentorId/availability?date=YYYY-MM-DD`

Public. Returns generated slots for one mentor-local date.

`date` must be `YYYY-MM-DD` and is interpreted in the **mentor's** timezone.

**Response**

```json
{
  "mentorId": "...",
  "date": "2030-01-07",
  "timezone": "Asia/Kolkata",
  "windows": [{ "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" }],
  "bookedSlots": [
    { "startsAt": "...", "endsAt": "...", "localStartTime": "10:00" }
  ],
  "availableSlots": [
    {
      "startsAt": "2030-01-07T03:30:00Z",
      "endsAt": "2030-01-07T04:30:00Z",
      "localStartTime": "09:00",
      "offset": "+05:30"
    }
  ],
  "activeBookingCount": 1,
  "remainingDailyBookings": 1
}
```

`availableSlots` is empty when `remainingDailyBookings` is `0` — even if the calendar has free windows. The daily cap takes precedence.

---

### `POST /api/bookings`

Parent only. Creates a trial booking.

**Body**

```json
{ "mentorId": "...", "startAt": "2030-01-07T09:00:00+05:30" }
```

- `startAt` must be ISO 8601 with `Z` or an explicit offset. Offset-less strings are rejected.
- Returns `201` with `{ booking }`.

**Errors**

- `400 INVALID_MENTOR_ID` — bad ObjectId
- `404 MENTOR_NOT_FOUND`
- `400 PAST_BOOKING` — start time is not in the future
- `400 UNAVAILABLE_TIME` — outside the mentor's weekly availability
- `409 DAILY_LIMIT_REACHED` — mentor already has 2 active bookings that day
- `409 TIME_SLOT_TAKEN` — overlaps an existing active booking

---

### `GET /api/bookings`

Authenticated. Parents see their own bookings; mentors see bookings assigned to them.

**Query params**

- `status` — optional, `active` or `cancelled`.
- `page` — default `1`.
- `limit` — default `20`, max `50`.

Sorted by `startsAt` descending. `mentorId` is populated with `name subjects timezone`; `parentId` with `name email`.

---

### `DELETE /api/bookings/:bookingId`

Cancels an active booking. Authorized for the parent who made it or the mentor it's with.

Returns `200` with the cancelled booking. Releases the daily capacity slot.

---

## Data model

### `Booking`

| Field                             | Type              | Notes                                                      |
| --------------------------------- | ----------------- | ---------------------------------------------------------- |
| `bookingId`                       | String            | UUID, unique, indexed. Sent to clients and emails.         |
| `parentId`                        | ObjectId → Parent | Indexed.                                                   |
| `mentorId`                        | ObjectId → Mentor | Indexed.                                                   |
| `startsAt` / `endsAt`             | Date              | UTC instants.                                              |
| `timezone`                        | String            | Mentor's IANA timezone at creation time.                   |
| `localDate`                       | String            | Mentor-local `YYYY-MM-DD`. Denormalized for daily queries. |
| `localStartTime`                  | String            | Mentor-local `HH:MM`.                                      |
| `status`                          | String            | `active` or `cancelled`.                                   |
| `cancelledAt` / `cancelledByRole` | Date / String     | Populated on cancel.                                       |

**Indexes:**

- `{ mentorId, localDate, status }` — drives the daily capacity count and the bookings list.
- `{ mentorId, startsAt }` **unique, partial on `status: "active"`** — database-level guarantee that a mentor can never have two active bookings starting at the same instant. Defense-in-depth on top of the service-layer overlap check. Cancelled bookings are excluded, so re-booking a freed slot is allowed.

### `DailyCapacity`

| Field         | Type              | Notes                                  |
| ------------- | ----------------- | -------------------------------------- |
| `mentorId`    | ObjectId → Mentor |                                        |
| `localDate`   | String            | Mentor-local `YYYY-MM-DD`.             |
| `activeCount` | Number            | `min: 0`, `max: ACTIVE_BOOKING_LIMIT`. |

**Index:** `{ mentorId, localDate }` unique — one counter per mentor per day. This is what makes the atomic reservation in `bookingService.js` safe under concurrency.

### `Mentor` / `Parent`

Standard account shape. Both share `name`, `email`, `passwordHash` (`select: false`). `Mentor` adds `bio`, `subjects`, `timezone`, `availability` (array of `{ dayOfWeek, startTime, endTime }`), `active`. `Parent` adds `timezone`.

---

## Key design decisions

### Capacity guard

Maximum 2 active trial bookings per mentor per mentor-local date. Enforced with a single atomic MongoDB operation:

```js
DailyCapacity.findOneAndUpdate(
  { mentorId, localDate, activeCount: { $lt: ACTIVE_BOOKING_LIMIT } },
  { $inc: { activeCount: 1 } },
  { new: true, session },
);
```

If two requests race, MongoDB serializes the two updates; only one can observe `activeCount < 2` and successfully increment it. The loser gets `null` and the service throws `409 DAILY_LIMIT_REACHED`. This is check-and-increment in one operation — never a read-then-write.

The whole booking creation runs inside a `session.withTransaction()`, so a downstream failure (e.g. the unique index rejecting a duplicate start time) rolls the counter back.

**Verified:** `api.test.js` fires 4 parallel POST requests and asserts exactly 2 succeed and 2 return `409`.

### Overlap detection

Bookings use half-open intervals: `[startsAt, endsAt)`. Two bookings overlap iff `a.start < b.end && b.start < a.end`. Using strict `<` (not `<=`) means back-to-back bookings — 10:00–11:00 and 11:00–12:00 — do not collide.

The service checks overlap explicitly, and the partial unique index on `(mentorId, startsAt)` catches the exact-same-start-time case even if the service check is bypassed.

### Timezone handling

All instants are stored in UTC. All timezone math goes through `Temporal.ZonedDateTime` from `@js-temporal/polyfill`, which carries the IANA tz database and resolves the correct offset for each specific instant.

- **DST is automatic:** `America/New_York` renders `-05:00` in January and `-04:00` in July. No special-casing.
- **Spring-forward:** `buildAvailableSlots` tries both `earlier` and `later` disambiguations and discards any candidate whose wall-clock time doesn't round-trip. This silently drops the nonexistent hour on the transition day.
- **Fall-back:** both disambiguations round-trip, but a `Set` of seen instants ensures the duplicated hour appears only once.
- **Supported zones** come from `Intl.supportedValuesOf("timeZone")` so the runtime's own list is authoritative — this avoids the `Asia/Kolkata` vs `Asia/Calcutta` alias mismatch that a hardcoded list would cause.

### Emails

Two emails are sent per booking — one to the parent, one to the mentor. Both are sent **after the transaction commits**, never inside it. If the DB write rolls back, no confirmation is sent. If the email fails, the booking still succeeds — the booking is the source of truth.

Individual sends are wrapped in `Promise.allSettled` so a failure to reach the parent doesn't cancel the send to the mentor.

If `SMTP_HOST` is unset, the mailer logs the would-be send and returns `{ skipped: true }` instead of throwing. This lets the app run in development without email configuration.

Both emails render the time in **both** timezones: the recipient's own as the primary line, the other party's as muted reference. The dummy class link is included as both a button and a raw URL.

### Auth

JWT with HS256, `expiresIn: "12h"`. Payload contains `sub` (account id), `role`, `name`, `timezone`. `requireAuth` verifies the signature and re-validates that `sub` and `role` are present — a signed token with missing claims is still rejected.

`requireRole(...roles)` is a factory: `requireRole("parent")` returns middleware that 403s if the authenticated account's role is not in the list.

Failure responses are deliberately generic (`401 INVALID_TOKEN`) — distinguishing "expired" from "bad signature" from "wrong role" would give an attacker an oracle.

---

## Testing

```bash
npm test
```

Runs both test files under Node's built-in test runner.

### `src/tests/api.test.js` — integration

Spins up `mongodb-memory-server` as a single-node replica set (required for transactions), connects the real Express app, and exercises the API over HTTP. Coverage:

- Registration creates a hashed password; protected routes reject missing tokens
- Concurrent booking under the daily cap — 4 parallel requests, exactly 2 succeed and 2 return `409`
- Cancellation releases capacity; a new booking on the same date succeeds
- Mentor cannot create a booking; another parent cannot cancel someone else's
- Public mentor listing does not leak `email` or `passwordHash`
- Availability returns slots with the correct resolved UTC offset

The first run downloads a MongoDB binary (~100 MB). It does not touch your Atlas cluster.

### `src/tests/time.test.js` — unit

Pure-function tests over `src/utils/time.js`:

- `parseStartAt` rejects offset-less strings and non-minute boundaries
- `parseStartAt` resolves the same wall-clock time to different instants across a DST transition
- `assertWithinAvailability` accepts slots aligned to the hourly grid and rejects misaligned ones
- `buildAvailableSlots` drops the nonexistent hour on spring-forward and does not duplicate the repeated hour on fall-back
- `parseLocalDate` rejects non-canonical date strings

These run without a database.

---

## Scripts

| Command        | Description                                         |
| -------------- | --------------------------------------------------- |
| `npm run dev`  | Start with `node --watch` (auto-restart on change). |
| `npm start`    | Start without watching.                             |
| `npm run seed` | Idempotently upsert demo mentors and parents.       |
| `npm test`     | Run the full test suite.                            |

---

## Deployment notes

- **MongoDB must be a replica set.** Standalone MongoDB rejects `session.withTransaction()`. Atlas provides a replica set by default; a local install needs `--replSet` configuration.
- **CORS is currently open (`cors()` with no options).** For production, restrict to the frontend origin.
- **`JWT_SECRET` must be at least 32 characters.** Generate with `node -p "require('node:crypto').randomBytes(48).toString('base64url')"`.
- **Email delivery.** Gmail SMTP works for development but is rate-limited and often classified as spam. Production should use a transactional provider (Resend, Postmark, SES) with a verified sending domain. The mailer is provider-agnostic — only `.env` changes.
- **`.env` is gitignored.** Never commit it, and never expose any of its values to the frontend.

---

## AI session transcript

Per the assignment brief, the full AI-assisted session transcript is included at the repository root as `TRANSCRIPT.md`.
