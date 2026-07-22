import { env } from "./config/env.js";
import { app } from "./app.js";
import { connectDB } from "./config/database.js";

// Initialize Mongoose connection before starting the listening loop
connectDB().then(() => {
  app.listen(Number(env.PORT), () => {
    // eslint-disable-next-line no-console
    console.log(`STAROX backend listening on :${env.PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server due to connection error:", err);
  process.exit(1);
});
