import { Router } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../errors/ApiError.js";
import Mentor from "../models/Mentor.js";
import Parent from "../models/Parent.js";
import { requireAuth } from "../middleware/auth.js";
import { comparePassword, hashPassword } from "../utils/passwords.js";
import { SUPPORTED_TIME_ZONES } from "../constants.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function accountResponse(account, role) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role,
    ...(account.timezone ? { timezone: account.timezone } : {}),
  };
}

function createToken(account, role) {
  return jwt.sign(
    { role, name: account.name, timezone: account.timezone },
    process.env.JWT_SECRET,
    {
      subject: account.id,
      issuer: "mentormatch",
      expiresIn: "12h",
    },
  );
}

router.post("/register", async (request, response) => {
  const { name, email, password, timezone } = request.body ?? {};
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    throw new ApiError(
      400,
      "name is required and must be at most 100 characters",
      "INVALID_NAME",
    );
  }
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new ApiError(
      400,
      "A valid email address is required",
      "INVALID_EMAIL",
    );
  }

  const resolvedTimezone =
    typeof timezone === "string" && SUPPORTED_TIME_ZONES.includes(timezone)
      ? timezone
      : "UTC";

  if (
    (await Parent.exists({ email: normalizedEmail })) ||
    (await Mentor.exists({ email: normalizedEmail }))
  ) {
    throw new ApiError(
      409,
      "An account with that email already exists",
      "EMAIL_IN_USE",
    );
  }

  const parent = await Parent.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    timezone: resolvedTimezone,
  });
  const role = "parent";

  response.status(201).json({
    token: createToken(parent, role),
    user: accountResponse(parent, role),
  });
});

router.post("/login", async (request, response) => {
  const { email, password } = request.body ?? {};
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailPattern.test(normalizedEmail) || typeof password !== "string") {
    throw new ApiError(
      400,
      "A valid email and password are required",
      "INVALID_CREDENTIALS",
    );
  }

  const [parent, mentor] = await Promise.all([
    Parent.findOne({ email: normalizedEmail }).select("+passwordHash"),
    Mentor.findOne({ email: normalizedEmail }).select("+passwordHash"),
  ]);
  const account = parent ?? mentor;
  const role = parent ? "parent" : mentor ? "mentor" : null;
  if (
    !account ||
    !role ||
    !(await comparePassword(password, account.passwordHash))
  ) {
    throw new ApiError(
      401,
      "Email or password is incorrect",
      "INVALID_CREDENTIALS",
    );
  }

  response.json({
    token: createToken(account, role),
    user: accountResponse(account, role),
  });
});

router.get("/me", requireAuth, async (request, response) => {
  const Model = request.auth.role === "parent" ? Parent : Mentor;
  const account = await Model.findById(request.auth.id);
  if (!account)
    throw new ApiError(401, "Account no longer exists", "INVALID_TOKEN");
  response.json({ user: accountResponse(account, request.auth.role) });
});

export default router;
