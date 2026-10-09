import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../app.js";
import Booking from "../models/Booking.js";
import DailyCapacity from "../models/DailyCapacity.js";
import Mentor from "../models/Mentor.js";
import Parent from "../models/Parent.js";
import { hashPassword } from "../utils/passwords.js";

process.env.JWT_SECRET =
  "test-only-secret-that-is-at-least-thirty-two-characters";

let replicaSet;
let server;
let baseUrl;

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { response, data };
}

async function registerParent(email = "parent@example.test") {
  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test Parent", email, password: "test-parent-password" },
  });
  assert.equal(response.status, 201);
  return data;
}

async function createMentor(email = "mentor@example.test") {
  return Mentor.create({
    name: "Test Mentor",
    email,
    passwordHash: await hashPassword("test-mentor-password"),
    bio: "A test mentor for API coverage.",
    subjects: ["Mathematics"],
    timezone: "Asia/Kolkata",
    availability: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });
}

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  await Promise.all(
    [Mentor, Parent, Booking, DailyCapacity].map((model) => model.init()),
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await Promise.all(
    [Mentor, Parent, Booking, DailyCapacity].map((model) =>
      model.deleteMany({}),
    ),
  );
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
});

test("registers parents with a password hash and protects booking history", async () => {
  const account = await registerParent();
  const parent = await Parent.findOne({ email: "parent@example.test" }).select(
    "+passwordHash",
  );

  assert.equal(account.user.role, "parent");
  assert.notEqual(parent.passwordHash, "test-parent-password");
  assert.equal((await request("/api/bookings")).response.status, 401);
  assert.equal(
    (await request("/api/bookings", { token: account.token })).response.status,
    200,
  );
});

test("enforces two active bookings under concurrent requests and frees capacity on cancellation", async () => {
  const account = await registerParent();
  const mentor = await createMentor();
  const starts = [9, 10, 11, 12].map(
    (hour) => `2030-01-07T${String(hour).padStart(2, "0")}:00:00+05:30`,
  );
  const attempts = await Promise.all(
    starts.map((startAt) =>
      request("/api/bookings", {
        method: "POST",
        token: account.token,
        body: { mentorId: mentor.id, startAt },
      }),
    ),
  );
  const accepted = attempts.filter(({ response }) => response.status === 201);
  const rejected = attempts.filter(({ response }) => response.status === 409);

  assert.equal(accepted.length, 2);
  assert.equal(rejected.length, 2);
  assert.ok(accepted[0].data.booking.bookingId);
  assert.notEqual(
    accepted[0].data.booking.bookingId,
    accepted[1].data.booking.bookingId,
  );

  const cancelledId = accepted[0].data.booking.bookingId;
  const cancelled = await request(`/api/bookings/${cancelledId}`, {
    method: "DELETE",
    token: account.token,
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.data.booking.status, "cancelled");

  const replacement = await request("/api/bookings", {
    method: "POST",
    token: account.token,
    body: { mentorId: mentor.id, startAt: "2030-01-07T13:00:00+05:30" },
  });
  assert.equal(replacement.response.status, 201);
  assert.equal(
    await Booking.countDocuments({ mentorId: mentor.id, status: "active" }),
    2,
  );
});

test("blocks bookings from mentors and prevents cancelling another parent’s booking", async () => {
  const parent = await registerParent();
  const otherParent = await registerParent("other-parent@example.test");
  const mentor = await createMentor();
  const mentorLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: mentor.email, password: "test-mentor-password" },
  });

  const forbiddenCreation = await request("/api/bookings", {
    method: "POST",
    token: mentorLogin.data.token,
    body: { mentorId: mentor.id, startAt: "2030-01-07T09:00:00+05:30" },
  });
  assert.equal(forbiddenCreation.response.status, 403);

  const created = await request("/api/bookings", {
    method: "POST",
    token: parent.token,
    body: { mentorId: mentor.id, startAt: "2030-01-07T09:00:00+05:30" },
  });
  const forbiddenCancellation = await request(
    `/api/bookings/${created.data.booking.bookingId}`,
    {
      method: "DELETE",
      token: otherParent.token,
    },
  );
  assert.equal(forbiddenCancellation.response.status, 403);
});

test("lists public mentors without exposing account fields and filters by subject", async () => {
  const mentor = await createMentor();
  const result = await request("/api/mentors?subject=mathematics");

  assert.equal(result.response.status, 200);
  assert.equal(result.data.mentors.length, 1);
  assert.equal(result.data.mentors[0]._id, mentor.id);
  assert.equal(result.data.mentors[0].email, undefined);
  assert.equal(result.data.mentors[0].passwordHash, undefined);
});

test("returns concrete available slot instants for the selected mentor-local date", async () => {
  const mentor = await createMentor();
  const result = await request(
    `/api/mentors/${mentor.id}/availability?date=2030-01-07`,
  );

  assert.equal(result.response.status, 200);
  assert.equal(result.data.timezone, "Asia/Kolkata");
  assert.equal(result.data.availableSlots.length, 8);
  assert.equal(result.data.availableSlots[0].localStartTime, "09:00");
  assert.equal(result.data.availableSlots[0].offset, "+05:30");
});
