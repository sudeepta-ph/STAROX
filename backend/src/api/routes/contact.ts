import { Router } from "express";
import rateLimit from "express-rate-limit";
import { sendDemoRequestEmails } from "../../services/mail";

export const contactRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Scoped to this one route (passed as route-specific middleware below, not
// contactRouter.use) — 5 requests per IP per 15 minutes. app.ts already sets
// "trust proxy" so req.ip reflects the real client behind any reverse proxy.
const demoRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: "Too many requests, please try again later." },
});

// Public marketing form (Frontend/src/components/ContactModal.tsx) — no auth,
// anyone can request a demo. Spam protection: rate limiting above, plus a
// honeypot field (companyFax) below — never rendered in the real form, so a
// non-empty value means a bot filled every field. Still no visible CAPTCHA;
// this is enough for launch without hurting conversion on the real form.
contactRouter.post("/contact/demo-request", demoRequestLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, website, problem, context, companyFax } = req.body;

    // Honeypot tripped — pretend success, send no email, don't tip off the
    // bot that anything was detected.
    if (typeof companyFax === "string" && companyFax.trim() !== "") {
      return res.json({ success: true });
    }

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        error: "First name, last name, and email are required.",
      });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, error: "Enter a valid email address." });
    }

    // Respond as soon as the request is validated — a slow/misconfigured
    // SMTP provider must not hang the visitor's form submission. Any send
    // failure is logged server-side rather than surfaced to the client.
    res.json({ success: true });

    sendDemoRequestEmails({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      website: website?.trim() || undefined,
      problem: problem?.trim() || undefined,
      context: typeof context === "string" ? context : undefined,
    }).catch((err: any) => {
      console.error("[Contact] Failed to send demo request emails:", err.message);
    });
  } catch (err: any) {
    console.error("[Contact] Failed to process demo request:", err.message);
    res.status(500).json({
      success: false,
      error: "Couldn't send your request right now. Please try again or email hello@starox.space directly.",
    });
  }
});
