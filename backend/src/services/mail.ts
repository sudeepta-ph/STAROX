import nodemailer from "nodemailer";
import dns from "dns";
import path from "path";
import { env } from "../config/env";

// Copied into the backend at build time (see package.json "build" script) so
// email templates don't depend on the Frontend project's file layout —
// backend and frontend can be deployed as separate services.
const LOGO_PATH = path.join(__dirname, "../assets/email/strx-logo.png");

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error(
      "Email is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in the backend .env to enable sending."
    );
  }

  // SMTP_HOST resolves to both an A and AAAA record (e.g. Hostinger's mail
  // is Cloudflare-proxied). Nodemailer's own DNS resolution (lib/shared's
  // resolveHostname) concatenates both address families and picks one at
  // random to dial — it doesn't go through Node's dns.lookup, so neither a
  // `family` option nor dns.setDefaultResultOrder affects it. That means
  // roughly half of all sends hit the IPv6 address, which Render can't
  // route to (ENETUNREACH). Resolve the IPv4 address ourselves and connect
  // to it directly; keep the real hostname as the TLS servername so
  // certificate validation still passes.
  const [ipv4] = await dns.promises.resolve4(env.SMTP_HOST);

  transporter = nodemailer.createTransport({
    host: ipv4,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true",
    tls: { servername: env.SMTP_HOST },
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    // Render's network adds several seconds of latency on outbound SMTP
    // ports specifically (~5s just for the raw TCP handshake, measured
    // directly) before the connection goes through — these need enough
    // headroom to survive that plus the TLS handshake and full SMTP
    // conversation, while still bounding a genuinely stuck connection well
    // under nodemailer's multi-minute defaults.
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

const FROM_ADDRESS = () => `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_EMAIL}>`;

export interface DemoRequestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  website?: string;
  problem?: string;
  /** e.g. "Edits & Content" / "Team Delivery" — which Teams page the form was opened from. */
  context?: string;
}

// Sends both halves of a demo request: the internal notification to the
// STAROX team, and a branded auto-reply to the person who submitted the
// form. Both are sent from the same call so a failure partway through
// surfaces as one clear error to the route handler rather than silently
// sending only one side.
export async function sendDemoRequestEmails(input: DemoRequestInput): Promise<void> {
  const t = await getTransporter();
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const subjectContext = input.context ? ` — ${input.context}` : "";

  const fieldRow = (label: string, value: string) => `
    <tr>
      <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #888888; white-space: nowrap; vertical-align: top;">${label}</td>
      <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${value}</td>
    </tr>`;

  await t.sendMail({
    from: FROM_ADDRESS(),
    to: env.CONTACT_TO_EMAIL,
    replyTo: input.email,
    subject: `New demo request${subjectContext}: ${fullName}`,
    // Sent as text + html (multipart/alternative) — a text-only message from
    // a same-domain sender was landing in spam; a proper HTML alternative
    // fixes that and is also just more legible than a bare text dump.
    text: [
      `Name: ${fullName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "—"}`,
      `Company website: ${input.website || "—"}`,
      input.context ? `Context: ${input.context}` : null,
      "",
      "What they're trying to solve:",
      input.problem || "—",
    ].filter((line): line is string => line !== null).join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; background: #ffffff;">
        <img src="cid:strx-logo" alt="STAROX" width="36" height="36" style="display: block; margin-bottom: 20px;" />
        <h1 style="font-size: 17px; font-weight: 700; margin: 0 0 16px;">New demo request${input.context ? ` — ${input.context}` : ""}</h1>
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${fieldRow("First name", input.firstName)}
          ${fieldRow("Last name", input.lastName)}
          ${fieldRow("Work email", `<a href="mailto:${input.email}" style="color: #1a1a1a;">${input.email}</a>`)}
          ${fieldRow("Phone number", input.phone || "—")}
          ${fieldRow("Company website", input.website || "—")}
        </table>
        <p style="font-size: 12px; color: #888888; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.04em;">What they're trying to solve</p>
        <p style="font-size: 14px; line-height: 1.6; color: #1a1a1a; margin: 0; white-space: pre-wrap;">${input.problem || "—"}</p>
      </div>
    `,
    attachments: [
      { filename: "strx-logo.png", path: LOGO_PATH, cid: "strx-logo" },
    ],
  });

  await t.sendMail({
    from: FROM_ADDRESS(),
    to: input.email,
    subject: "We've got your demo request — STAROX",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; background: #ffffff;">
        <img src="cid:strx-logo" alt="STAROX" width="40" height="40" style="display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">Thanks, ${input.firstName}!</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 16px;">
          We've received your demo request${input.context ? ` for <strong>${input.context}</strong>` : ""}. The Starox team will get back to you shortly.
        </p>
        <p style="font-size: 12px; color: #999999; margin-top: 28px; border-top: 1px solid #eeeeee; padding-top: 16px;">
          This is an automated message — please don't reply directly to this email.
        </p>
      </div>
    `,
    attachments: [
      { filename: "strx-logo.png", path: LOGO_PATH, cid: "strx-logo" },
    ],
  });
}

export interface BlogPublishedEmailInput {
  toEmail: string;
  title: string;
  excerpt: string;
  articleUrl: string;
  unsubscribeUrl: string;
}

// Single-recipient send — the caller (notifyBlogSubscribers in
// services/blogNotify.ts) loops this over every active subscriber. No bulk
// send exists in this codebase yet, so a loop (not a new provider feature)
// is the deliberate v1 approach here, same as every other email in this file.
export async function sendBlogPublishedEmail(input: BlogPublishedEmailInput): Promise<void> {
  const t = await getTransporter();
  const excerpt = input.excerpt?.trim() || "";

  await t.sendMail({
    from: FROM_ADDRESS(),
    to: input.toEmail,
    subject: `New on the STAROX Blog: ${input.title}`,
    text: [
      "STAROX Blog",
      "",
      input.title,
      excerpt,
      "",
      `Read the full article: ${input.articleUrl}`,
      "",
      "—",
      "You're receiving this because you subscribed to the STAROX Blog.",
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; background: #ffffff;">
        <img src="cid:strx-logo" alt="STAROX" width="32" height="32" style="display: block; margin-bottom: 20px;" />
        <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #0ea5e9; margin: 0 0 6px;">New from STAROX</p>
        <p style="font-size: 12px; color: #888888; margin: 0 0 18px;">STAROX Blog</p>
        <h1 style="font-size: 20px; font-weight: 700; line-height: 1.35; margin: 0 0 12px; color: #1a1a1a;">${input.title}</h1>
        ${excerpt ? `<p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 24px;">${excerpt}</p>` : ""}
        <a href="${input.articleUrl}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 22px; border-radius: 10px;">
          Read the full article
        </a>
        <div style="margin-top: 36px; padding-top: 18px; border-top: 1px solid #eeeeee;">
          <p style="font-size: 12px; color: #999999; margin: 0 0 8px;">
            You're receiving this because you subscribed to the STAROX Blog.
          </p>
          <p style="font-size: 12px; color: #999999; margin: 0;">
            <a href="${input.unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="${env.FRONTEND_ORIGIN}/privacy" style="color: #999999; text-decoration: underline;">Privacy</a>
            &nbsp;·&nbsp;
            <a href="${env.FRONTEND_ORIGIN}/terms" style="color: #999999; text-decoration: underline;">Terms</a>
          </p>
        </div>
      </div>
    `,
    attachments: [
      { filename: "strx-logo.png", path: LOGO_PATH, cid: "strx-logo" },
    ],
  });
}

export interface WorkspaceInviteEmailInput {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
}

// Invitation email for the by-email workspace invite flow (PmxWorkspaceEmailInviteModel).
// Callers treat a thrown error here as non-fatal — the invitation row is
// created regardless, and the UI falls back to "copy this link" messaging —
// so this function is intentionally a thin, throwing wrapper with no
// internal try/catch of its own.
export async function sendWorkspaceInviteEmail(input: WorkspaceInviteEmailInput): Promise<void> {
  const t = await getTransporter();
  await t.sendMail({
    from: FROM_ADDRESS(),
    to: input.toEmail,
    subject: `${input.inviterName} invited you to join "${input.workspaceName}" on STAROX PMX`,
    text: [
      `${input.inviterName} invited you to join "${input.workspaceName}" on STAROX PMX as ${input.roleLabel}.`,
      "",
      `Accept the invitation: ${input.acceptUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; background: #ffffff;">
        <img src="cid:strx-logo" alt="STAROX" width="40" height="40" style="display: block; margin-bottom: 24px;" />
        <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">You've been invited to a workspace</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 20px;">
          <strong>${input.inviterName}</strong> invited you to join <strong>${input.workspaceName}</strong> on STAROX PMX as <strong>${input.roleLabel}</strong>.
        </p>
        <a href="${input.acceptUrl}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 10px;">
          Accept invitation
        </a>
        <p style="font-size: 12px; color: #999999; margin-top: 28px; border-top: 1px solid #eeeeee; padding-top: 16px;">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    `,
    attachments: [
      { filename: "strx-logo.png", path: LOGO_PATH, cid: "strx-logo" },
    ],
  });
}
