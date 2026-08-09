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
  // No model-override env var here on purpose — the model is pinned to
  // AI_MODEL in services/ai/models.ts so it can't drift per-environment.
  DEEPSEEK_API_KEY:            z.string().min(1),
  DEEPSEEK_BASE_URL:           z.string().optional(),

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

  // ── GitHub OAuth (PMX source import) ────────────────────────────────────────
  GITHUB_CLIENT_ID:     z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI:  z.string().optional(),

  // ── Google OAuth (GA4 connector) ────────────────────────────────────────────
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI:  z.string().optional(),

  // ── Notion OAuth ─────────────────────────────────────────────────────────────
  NOTION_CLIENT_ID:     z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),
  NOTION_REDIRECT_URI:  z.string().optional(),

  // ── Slack OAuth (PMX connector) ─────────────────────────────────────────────
  // Distinct from SLACK_BOT_TOKEN/SLACK_CHANNEL_ID above, which are the
  // server-side fallback for the /integrations/slack aggregate-analysis
  // route. These are the OAuth app credentials for the per-user PMX
  // connector (/connectors → Slack → Connect).
  SLACK_CLIENT_ID:     z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI:  z.string().optional(),

  // ── Token encryption (at-rest OAuth token storage) ──────────────────────────
  // 32-byte key, hex-encoded (64 hex chars) — generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // ── Clerk ───────────────────────────────────────────────────────────────────
  CLERK_PUBLISHABLE_KEY:             z.string().optional(),
  CLERK_SECRET_KEY:                  z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // ── Admin Promotion ─────────────────────────────────────────────────────────
  ADMIN_USERNAME:                    z.string().optional(),
  ADMIN_PASSWORD:                    z.string().optional(),

  // ── SMTP (contact / demo-request form) ──────────────────────────────────────
  // Optional so the app still boots without them — sendDemoRequestEmails
  // throws a clear error at send time if they're missing, instead of this
  // failing at startup.
  SMTP_HOST:       z.string().optional(),
  SMTP_PORT:       z.string().optional(),
  SMTP_SECURE:     z.string().optional(),
  SMTP_USER:       z.string().optional(),
  SMTP_PASSWORD:   z.string().optional(),
  SMTP_FROM_NAME:  z.string().default("Starox"),
  SMTP_FROM_EMAIL: z.string().default("noreply@starox.space"),
  CONTACT_TO_EMAIL: z.string().default("hello@starox.space"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
