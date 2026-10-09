import bcrypt from "bcryptjs";
import ApiError from "../errors/ApiError.js";

export function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password) > 72
  ) {
    throw new ApiError(
      400,
      "Password must be 8 to 72 bytes long",
      "INVALID_PASSWORD",
    );
  }
}

export function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, 12);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
