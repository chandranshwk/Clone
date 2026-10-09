# MentorMatch

MentorMatch is a trial-class booking system with a responsive React/Vite frontend and an Express/Mongoose API. Parents can browse and filter mentors, view local-time availability, book and cancel trials, and review booking history. Mentors can sign in to view and cancel assigned sessions.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas (transactions require a replica set; Atlas provides one)

## Configure MongoDB Atlas

1. Create an Atlas cluster and a database user with read/write access to the MentorMatch database.
2. Add your development machine's public IP under **Network Access**. Avoid allowing access from every IP for production deployments.
3. In **Connect > Drivers**, copy the Node.js connection string. Replace its username, password, and database name as needed; URL-encode special characters in the username or password.
4. In `backend`, copy `.env.example` to `.env` and fill in the values below. Keep this file private; it is ignored by Git and must never be placed in the frontend.

PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
node -p "require('node:crypto').randomBytes(48).toString('base64url')"
```

Paste the generated value into `JWT_SECRET` in `backend/.env`, then set the Atlas URI and two demo passwords:

```dotenv
PORT=5000
MONGODB_URI=mongodb+srv://<database-user>:<password>@<cluster-host>/<database-name>
JWT_SECRET=<generated-random-value-at-least-32-characters>
DEMO_MENTOR_PASSWORD=<your-demo-mentor-password>
DEMO_PARENT_PASSWORD=<your-demo-parent-password>
```

Choose demo passwords 8 to 72 bytes long. All demo accounts of the same role use their corresponding environment password. No demo passwords or Atlas credentials are stored in source code.

## Install And Run

Start the API from the project root after configuring `backend/.env`:

```powershell
cd backend
npm install
npm run dev
```

The API validates its environment and waits for MongoDB and index initialization before listening. It does not report the database as connected unless the connection succeeds.

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. Its `/api` requests are proxied to `http://localhost:5000`.

In Git Bash or another Unix-like shell, use `cp .env.example .env` in place of PowerShell's `Copy-Item`.

## Seed Demo Accounts

With Atlas configured and the API stopped, run:

```powershell
cd backend
npm run seed
```

This idempotently creates ten mentors across Asia/Kolkata, Europe/London, and America/New_York, plus two parent accounts. Mentor emails follow `firstname.lastname@demo.mentormatch.test`; parent emails are `taylor.morgan@demo.mentormatch.test` and `jordan.lee@demo.mentormatch.test`. Use the `DEMO_MENTOR_PASSWORD` or `DEMO_PARENT_PASSWORD` from the private backend environment file to log in.

## API

All request and response bodies are JSON. Protected routes take `Authorization: Bearer <token>`. Login/register responses contain a JWT. The frontend keeps the token in React memory for the active page session; refreshing signs the user out. Never put credentials or tokens in source code.

| Method | Endpoint                                              | Access                           | Purpose                                                          |
| ------ | ----------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/health`                                         | Public                           | API and database readiness                                       |
| POST   | `/api/auth/register`                                  | Public                           | Create a parent account (`name`, `email`, `password`)            |
| POST   | `/api/auth/login`                                     | Public                           | Log in a parent or seeded mentor (`email`, `password`)           |
| GET    | `/api/auth/me`                                        | Authenticated                    | Current account and role                                         |
| GET    | `/api/mentors?search=&subject=&page=&limit=`          | Public                           | Search and page active mentors                                   |
| GET    | `/api/mentors/:mentorId/availability?date=YYYY-MM-DD` | Public                           | Mentor-local available/booked slots and remaining daily capacity |
| POST   | `/api/bookings`                                       | Parent                           | Create a trial booking (`mentorId`, `startAt`)                   |
| GET    | `/api/bookings?status=active&page=&limit=`            | Authenticated                    | Own parent history or the mentor's bookings                      |
| DELETE | `/api/bookings/:bookingId`                            | Booking owner or assigned mentor | Cancel an active booking                                         |

`startAt` must be ISO 8601 with `Z` or an explicit UTC offset, for example `2030-01-07T09:00:00+05:30`. The server derives the local date from the mentor's time zone, validates the weekly availability window, and stores UTC instants plus the local date/time. Supported zones are Asia/Kolkata, Europe/London, and America/New_York; IANA time-zone rules handle daylight-saving transitions.

Booking creation and cancellation run in MongoDB transactions. A unique per-mentor/local-date capacity record is atomically incremented, enforcing no more than two active bookings per mentor per local calendar day even under concurrent requests. Overlapping one-hour appointments are also rejected. Use Atlas or another MongoDB replica set; standalone MongoDB does not support these transactions.

Errors use `{ "error": { "code": "...", "message": "..." } }`. The API validates request shapes, dates, roles, and pagination and returns appropriate 4xx responses for invalid or unauthorized requests.

## Tests

```powershell
cd backend
npm test
```

The suite uses Node's test runner and a temporary MongoDB replica set to exercise concurrent transactions; the first run may download the MongoDB test binary. These tests do not use your Atlas database. `npm audit` checks backend dependencies.
