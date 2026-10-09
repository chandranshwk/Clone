import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { validateEnvironment } from "./config/environment.js";

async function startServer() {
  validateEnvironment();
  await connectDatabase();

  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => {
    console.log(`MentorMatch API listening on port ${port}; MongoDB connected`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(async () => {
        const mongoose = await import("mongoose");
        await mongoose.default.disconnect();
        process.exit(0);
      });
    });
  }
}

startServer().catch((error) => {
  console.error(`MentorMatch API failed to start: ${error.message}`);
  process.exitCode = 1;
});
