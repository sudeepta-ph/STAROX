/**
 * Generic API-key / personal-access-token connectors for the global
 * /connectors page. Each entry in REGISTRY defines the credential fields
 * it needs and a verify() function that makes a real, minimal call to the
 * provider to confirm the credentials actually work before anything is
 * persisted. Nothing is marked "connected" on a request that didn't
 * genuinely succeed against the provider's API.
 *
 * OAuth-based connectors (GitHub, Google/GA4, Notion, Slack) live in their
 * own routers — see github.ts, google.ts, notion.ts, and slack.ts.
 *
 * This registry intentionally covers only the 11 officially supported PMX
 * connectors (GitHub, GA4, Notion, and Slack are OAuth, plus these 7
 * API-key based ones): Mixpanel, Amplitude, Microsoft Clarity, Intercom,
 * Stripe, HubSpot, Canny.
 */
import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { PmxConnectorCredentialModel, PmxGithubConnectionModel, PmxGoogleConnectionModel } from "../../../models/Pmx";

export const connectorsRouter = Router();
connectorsRouter.use("/connectors", authMiddleware);

type Creds = Record<string, string>;
type VerifyResult = { ok: boolean; label?: string; error?: string };

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  secret?: boolean;
}

interface ConnectorDef {
  fields: FieldDef[];
  verify: (c: Creds) => Promise<VerifyResult>;
}

async function verifyMixpanel(c: Creds): Promise<VerifyResult> {
  if (!c.token || !c.secret) return { ok: false, error: "Project token and API secret are required" };
  const auth = Buffer.from(`${c.token}:${c.secret}`).toString("base64");
  const res = await fetch("https://mixpanel.com/api/2.0/jql", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ script: "function main(){return 1;}" }),
  });
  if (!res.ok) return { ok: false, error: "Mixpanel rejected these credentials" };
  return { ok: true, label: "Mixpanel project" };
}

async function verifyAmplitude(c: Creds): Promise<VerifyResult> {
  if (!c.apiKey || !c.secretKey) return { ok: false, error: "API key and secret key are required" };
  const auth = Buffer.from(`${c.apiKey}:${c.secretKey}`).toString("base64");
  const res = await fetch("https://amplitude.com/api/2/annotations", { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) return { ok: false, error: "Amplitude rejected these credentials" };
  return { ok: true, label: "Amplitude project" };
}

async function verifyClarity(c: Creds): Promise<VerifyResult> {
  if (!c.token) return { ok: false, error: "API token is required" };
  const res = await fetch("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", {
    headers: { Authorization: `Bearer ${c.token}` },
  });
  if (!res.ok) return { ok: false, error: "Clarity rejected this token" };
  return { ok: true, label: "Clarity project" };
}

async function verifyIntercom(c: Creds): Promise<VerifyResult> {
  if (!c.accessToken) return { ok: false, error: "Access token is required" };
  const res = await fetch("https://api.intercom.io/me", { headers: { Authorization: `Bearer ${c.accessToken}`, Accept: "application/json" } });
  if (!res.ok) return { ok: false, error: "Intercom rejected this token" };
  const data = (await res.json()) as { name?: string; email?: string };
  return { ok: true, label: data.name || data.email || "Intercom workspace" };
}

async function verifyCanny(c: Creds): Promise<VerifyResult> {
  if (!c.apiKey) return { ok: false, error: "API key is required" };
  const res = await fetch("https://canny.io/api/v1/boards/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: c.apiKey }),
  });
  if (!res.ok) return { ok: false, error: "Canny rejected this API key" };
  return { ok: true, label: "Canny boards" };
}

async function verifyStripe(c: Creds): Promise<VerifyResult> {
  if (!c.secretKey) return { ok: false, error: "Secret key is required" };
  const res = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${c.secretKey}` } });
  if (!res.ok) return { ok: false, error: "Stripe rejected this key" };
  return { ok: true, label: "Stripe account" };
}

async function verifyHubSpot(c: Creds): Promise<VerifyResult> {
  if (!c.accessToken) return { ok: false, error: "Private app access token is required" };
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", { headers: { Authorization: `Bearer ${c.accessToken}` } });
  if (!res.ok) return { ok: false, error: "HubSpot rejected this token" };
  return { ok: true, label: "HubSpot account" };
}

const REGISTRY: Record<string, ConnectorDef> = {
  mixpanel: {
    fields: [
      { key: "token", label: "Project Token", placeholder: "", required: true },
      { key: "secret", label: "API Secret", placeholder: "", required: true, secret: true },
    ],
    verify: verifyMixpanel,
  },
  amplitude: {
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "", required: true },
      { key: "secretKey", label: "Secret Key", placeholder: "", required: true, secret: true },
    ],
    verify: verifyAmplitude,
  },
  clarity: {
    fields: [{ key: "token", label: "API Token", placeholder: "", required: true, secret: true }],
    verify: verifyClarity,
  },
  intercom: {
    fields: [{ key: "accessToken", label: "Access Token", placeholder: "", required: true, secret: true }],
    verify: verifyIntercom,
  },
  canny: {
    fields: [{ key: "apiKey", label: "API Key", placeholder: "", required: true, secret: true }],
    verify: verifyCanny,
  },
  stripe: {
    fields: [{ key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", required: true, secret: true }],
    verify: verifyStripe,
  },
  hubspot: {
    fields: [{ key: "accessToken", label: "Private App Access Token", placeholder: "", required: true, secret: true }],
    verify: verifyHubSpot,
  },
};

// ── GET /connectors/status ──────────────────────────────────────────────────
connectorsRouter.get("/connectors/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const docs = await PmxConnectorCredentialModel.find({ userId: req.userId });
    const status: Record<string, { connected: boolean; label?: string }> = {};
    for (const id of Object.keys(REGISTRY)) status[id] = { connected: false };
    for (const d of docs) status[d.connectorId] = { connected: true, label: d.label };

    const gh = await PmxGithubConnectionModel.findOne({ userId: req.userId });
    status.github = gh ? { connected: true, label: gh.githubLogin } : { connected: false };

    const ga = await PmxGoogleConnectionModel.findOne({ userId: req.userId });
    status.ga4 = ga?.propertyId ? { connected: true, label: ga.propertyName || ga.propertyId } : { connected: false };

    const fields: Record<string, FieldDef[]> = {};
    for (const [id, def] of Object.entries(REGISTRY)) fields[id] = def.fields;

    res.json({ success: true, data: status, fields });
  } catch (err) {
    next(err);
  }
});

// ── POST /connectors/:id/connect ────────────────────────────────────────────
connectorsRouter.post("/connectors/:id/connect", async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const entry = REGISTRY[id];
    if (!entry) return res.status(404).json({ success: false, error: "Unknown or unsupported connector" });

    const result = await entry.verify((req.body || {}) as Creds);
    if (!result.ok) return res.status(400).json({ success: false, error: result.error || "Connection failed" });

    await PmxConnectorCredentialModel.findOneAndUpdate(
      { userId: req.userId, connectorId: id },
      { userId: req.userId, connectorId: id, credentials: req.body, label: result.label, connectedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true, label: result.label });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /connectors/:id ───────────────────────────────────────────────────
connectorsRouter.delete("/connectors/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    await PmxConnectorCredentialModel.deleteOne({ userId: req.userId, connectorId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
