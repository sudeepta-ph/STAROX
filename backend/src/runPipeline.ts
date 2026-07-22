import dotenv from "dotenv";
import mongoose from "mongoose";

// Load backend .env
dotenv.config();

import { runDownstreamPipeline } from "./workspaces/pmx/routes/pmx";
import { PmxInputModel } from "./models/Pmx";

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Missing MONGODB_URI in environment!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected successfully!");

  const userId = "user_3GdXQdsBsbZEjWRDsuwetukTgC5";
  const projectId = "default";

  // Check if inputs exist for this project
  const inputs = await PmxInputModel.find({ projectId, userId, isDeleted: false });
  console.log(`Found ${inputs.length} active input sources for user ${userId}:`);
  for (const inp of inputs) {
    console.log(`- ${inp.name} (${inp.type}): ${inp.url || "No URL"}`);
  }

  if (inputs.length === 0) {
    console.error("No input sources found to run the pipeline!");
    await mongoose.connection.close();
    process.exit(1);
  }

  // Create a mock request object for audit logging
  const mockReq = {
    ip: "127.0.0.1",
    headers: {
      "user-agent": "Antigravity Pipeline Runner CLI"
    },
    userId
  };

  try {
    console.log("Executing downstream PMX intelligence pipeline...");
    await runDownstreamPipeline(projectId, userId, undefined, mockReq);
    console.log("Pipeline executed successfully!");
  } catch (err: any) {
    console.error("Pipeline run failed!");
    console.error(err.stack || err);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

run();
