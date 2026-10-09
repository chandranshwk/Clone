import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import ApiError from "./errors/ApiError.js";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import mentorRoutes from "./routes/mentors.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "not_ready",
    service: "mentormatch-api",
    database: connected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/bookings", bookingRoutes);

app.use((_request, _response, next) => {
  next(new ApiError(404, "API route not found", "NOT_FOUND"));
});

app.use((error, _request, response, _next) => {
  let status = error.status ?? 500;
  let code = error.code ?? "INTERNAL_ERROR";
  let message = error.message ?? "An unexpected error occurred";

  if (error.name === "ValidationError") {
    status = 400;
    code = "INVALID_DATA";
    message = "Request data failed validation";
  } else if (error.name === "CastError") {
    status = 400;
    code = "INVALID_ID";
    message = "A supplied id is invalid";
  } else if (error.code === 11000) {
    status = 409;
    code = "DUPLICATE_RECORD";
    message = "A record with those details already exists";
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body must contain valid JSON";
  } else if (error.type === "entity.too.large") {
    status = 413;
    code = "BODY_TOO_LARGE";
    message = "Request body exceeds the 1 MB limit";
  }

  if (status >= 500) console.error(error);
  response.status(status).json({ error: { code, message } });
});

export default app;
