import jwt from "jsonwebtoken";
import ApiError from "../errors/ApiError.js";

// A Set gives O(1) membership checks and keeps the valid roles in one
// place. Adding a role here is the only change needed to allow it
// through the auth layer.
const roles = new Set(["parent", "mentor"]);

/**
 * Verifies the bearer token on incoming requests and attaches the
 * decoded identity to `request.auth`. Any failure — missing token,
 * bad signature, expired, malformed payload — returns the same generic
 * 401. That's deliberate: distinguishing "expired" from "invalid
 * signature" from "wrong role" would let an attacker probe token
 * validity, and the client doesn't need the distinction either.
 */
export function requireAuth(request, _response, next) {
  const authorization = request.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token)
    return next(
      new ApiError(401, "Authentication is required", "UNAUTHENTICATED"),
    );

  try {
    // jwt.verify throws on any signature, expiry, or format problem.
    // We also validate the payload shape here rather than trusting it:
    // a token signed with the correct secret could still be missing
    // the claims this middleware depends on (sub, role), and blindly
    // passing it through would propagate `undefined` into request.auth.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.sub || !roles.has(payload.role)) {
      throw new ApiError(401, "Invalid authentication token", "INVALID_TOKEN");
    }
    request.auth = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(
      new ApiError(
        401,
        "Invalid or expired authentication token",
        "INVALID_TOKEN",
      ),
    );
  }
}

/**
 * Route-level authorisation guard. Returns middleware rather than being
 * middleware itself so it can be parameterised per route, e.g.
 * requireRole("parent") or requireRole("parent", "mentor").
 *
 * 403 (not 401) is returned when the user is authenticated but their
 * role isn't permitted — 401 means "we don't know who you are", 403
 * means "we know, and you can't do this".
 */
export function requireRole(...allowedRoles) {
  return (request, _response, next) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(
        new ApiError(
          403,
          "Your account cannot perform this action",
          "FORBIDDEN",
        ),
      );
    }
    return next();
  };
}
