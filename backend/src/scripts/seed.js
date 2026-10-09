import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import Mentor from "../models/Mentor.js";
import Parent from "../models/Parent.js";
import { hashPassword } from "../utils/passwords.js";

const mentors = [
  [
    "Aisha Khan",
    "aisha.khan@demo.mentormatch.test",
    "Mathematics and physics",
    ["Mathematics", "Physics"],
    "Asia/Kolkata",
  ],
  [
    "Rohan Mehta",
    "rohan.mehta@demo.mentormatch.test",
    "Patient help with algebra and mechanics",
    ["Mathematics", "Physics"],
    "Asia/Kolkata",
  ],
  [
    "Priya Nair",
    "priya.nair@demo.mentormatch.test",
    "Chemistry made practical and clear",
    ["Chemistry", "Biology"],
    "Asia/Kolkata",
  ],
  [
    "Kabir Shah",
    "kabir.shah@demo.mentormatch.test",
    "Computer science and problem solving",
    ["Computer Science", "Mathematics"],
    "Asia/Kolkata",
  ],
  [
    "Olivia Brooks",
    "olivia.brooks@demo.mentormatch.test",
    "English literature and academic writing",
    ["English", "Writing"],
    "Europe/London",
  ],
  [
    "Oliver James",
    "oliver.james@demo.mentormatch.test",
    "Physics, coding, and practical projects",
    ["Physics", "Computer Science"],
    "Europe/London",
  ],
  [
    "Amara Okafor",
    "amara.okafor@demo.mentormatch.test",
    "Biology and chemistry for curious learners",
    ["Biology", "Chemistry"],
    "Europe/London",
  ],
  [
    "Ethan Chen",
    "ethan.chen@demo.mentormatch.test",
    "Statistics and data science foundations",
    ["Mathematics", "Statistics"],
    "America/New_York",
  ],
  [
    "Sofia Rivera",
    "sofia.rivera@demo.mentormatch.test",
    "Spanish language and conversation",
    ["Spanish", "Languages"],
    "America/New_York",
  ],
  [
    "Noah Williams",
    "noah.williams@demo.mentormatch.test",
    "Study skills and essay coaching",
    ["English", "Writing"],
    "America/New_York",
  ],
].map(([name, email, bio, subjects, timezone]) => ({
  name,
  email,
  bio,
  subjects,
  timezone,
  availability: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
  })),
  active: true,
}));

const parents = [
  { name: "Taylor Morgan", email: "taylor.morgan@demo.mentormatch.test" },
  { name: "Jordan Lee", email: "jordan.lee@demo.mentormatch.test" },
];

function requireSeedPassword(name) {
  const password = process.env[name];
  if (!password) throw new Error(`${name} is required to seed demo accounts`);
  return password;
}

async function seed() {
  const mentorPasswordHash = await hashPassword(
    requireSeedPassword("DEMO_MENTOR_PASSWORD"),
  );
  const parentPasswordHash = await hashPassword(
    requireSeedPassword("DEMO_PARENT_PASSWORD"),
  );
  await connectDatabase();

  for (const mentor of mentors) {
    await Mentor.findOneAndUpdate(
      { email: mentor.email },
      { $set: { ...mentor, passwordHash: mentorPasswordHash } },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  for (const parent of parents) {
    await Parent.findOneAndUpdate(
      { email: parent.email },
      { $set: { ...parent, passwordHash: parentPasswordHash } },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  console.log(
    `Seeded ${mentors.length} mentors and ${parents.length} parent accounts.`,
  );
}

seed()
  .catch((error) => {
    console.error(`MentorMatch seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
