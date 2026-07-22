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
import { blogRouter } from "./api/routes/blogRoutes.js";
import { pmxRouter } from "./workspaces/pmx/routes/pmx";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();
app.set("trust proxy", true);

const allowedOrigins = [
  env.FRONTEND_ORIGIN,
  "https://starox.space",
  "https://www.starox.space",
  "http://localhost:5173",
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
app.use("/api", blogRouter);
app.use("/api/pmx", pmxRouter);
app.use("/", proxyRouter);

app.use(errorHandler);

