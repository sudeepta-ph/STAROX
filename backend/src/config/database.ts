import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.connection.on("connecting", () => {
      console.log("[MongoDB] Connecting to Atlas cluster...");
    });
    mongoose.connection.on("connected", () => {
      console.log("[MongoDB] Connected successfully to Atlas.");
    });
    mongoose.connection.on("disconnecting", () => {
      console.log("[MongoDB] Disconnecting from Atlas...");
    });
    mongoose.connection.on("disconnected", () => {
      console.log("[MongoDB] Disconnected.");
    });
    mongoose.connection.on("reconnected", () => {
      console.log("[MongoDB] Reconnected successfully.");
    });
    mongoose.connection.on("error", (error) => {
      console.error("[MongoDB] Connection error:", error);
    });

    // Connect options: automatic reconnect is enabled by default in mongoose v6+
    await mongoose.connect(env.MONGODB_URI);
  } catch (error) {
    console.error("[MongoDB] Initial connection failed:", error);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("[MongoDB] Connection closed successfully.");
  } catch (error) {
    console.error("[MongoDB] Error closing connection:", error);
  }
};

// Handle process termination events for graceful shutdown
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});
