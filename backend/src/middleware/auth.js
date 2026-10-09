import jwt from "jsonwebtoken";
import ApiError from "../errors/ApiError.js";

const roles = new Set(["parent", "mentor"]);

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
