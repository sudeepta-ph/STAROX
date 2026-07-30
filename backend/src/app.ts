import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { healthRouter } from "./api/routes/health";
import { cdxRouter } from "./workspaces/pmx/routes/cdx";
import { proxyRouter } from "./workspaces/pmx/routes/proxy";
import { screenshotRouter } from "./workspaces/pmx/routes/screenshot";
import { integrationsRouter } from "./workspaces/pmx/routes/integrations";
import { githubRouter } from "./workspaces/pmx/routes/github";
import { googleRouter } from "./workspaces/pmx/routes/google";
import { notionRouter } from "./workspaces/pmx/routes/notion";
import { slackRouter } from "./workspaces/pmx/routes/slack";
import { connectorsRouter } from "./workspaces/pmx/routes/connectors";
import { blogRouter } from "./api/routes/blogRoutes.js";
import { pmxRouter } from "./workspaces/pmx/routes/pmx";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();
app.set("trust proxy", true);

const allowedOrigins = [
  env.FRONTEND_ORIGIN,
  "https://starox.space",
  "https://www.starox.space",
  // Vite falls back to the next free port (5174, 5175, ...) whenever 5173
  // is already taken by another dev server — allow the common range so
  // that doesn't silently break every API call with a CORS error.
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

app.use(helmet({ frameguard: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("tiny"));

app.use("/health", healthRouter);
app.use("/api", cdxRouter);
app.use("/api", integrationsRouter);
app.use("/api", githubRouter);
app.use("/api", googleRouter);
app.use("/api", notionRouter);
app.use("/api", slackRouter);
app.use("/api", connectorsRouter);
app.use("/api", blogRouter);
app.use("/api/pmx", pmxRouter);
app.use("/", proxyRouter);

app.use(errorHandler);

