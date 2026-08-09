import nodemailer from "nodemailer";
import path from "path";
import { env } from "../config/env";

// Copied into the backend at build time (see package.json "build" script) so
// email templates don't depend on the Frontend project's file layout —
// backend and frontend can be deployed as separate services.
const LOGO_PATH = path.join(__dirname, "../assets/email/strx-logo.png");

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error(
      "Email is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in the backend .env to enable sending."
    );
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
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
  const t = getTransporter();
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
