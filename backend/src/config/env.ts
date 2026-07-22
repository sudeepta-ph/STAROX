import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT:            z.string().default("8080"),
  NODE_ENV:        z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),

  // ── MongoDB ──────────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(1),

  // ── Cloudinary ───────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY:    z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // ── DeepSeek (AI) ───────────────────────────────────────────────────────────
  DEEPSEEK_API_KEY:            z.string().min(1),
  DEEPSEEK_BASE_URL:           z.string().optional(),
  DEEPSEEK_MODEL:              z.string().optional(),

  // ── USER BEHAVIOR: server-side fallback keys ────────────────────────────────
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST:    z.string().default("https://app.posthog.com"),

  MIXPANEL_PROJECT_TOKEN: z.string().optional(),
  MIXPANEL_API_SECRET:    z.string().optional(),

  GA4_PROPERTY_ID: z.string().optional(),

  // ── USER VOICE: server-side fallback keys ───────────────────────────────────
  SLACK_BOT_TOKEN:  z.string().optional(),
  SLACK_CHANNEL_ID: z.string().optional(),

  DISCORD_BOT_TOKEN:  z.string().optional(),
  DISCORD_CHANNEL_ID: z.string().optional(),

  // ── Clerk ───────────────────────────────────────────────────────────────────
  CLERK_PUBLISHABLE_KEY:             z.string().optional(),
  CLERK_SECRET_KEY:                  z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // ── Admin Promotion ─────────────────────────────────────────────────────────
  ADMIN_USERNAME:                    z.string().optional(),
  ADMIN_PASSWORD:                    z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
