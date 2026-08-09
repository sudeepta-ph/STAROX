/**
 * Google OAuth — powers the GA4 connector. Same shape as github.ts:
 *
 * Flow:
 *  1. Frontend (authenticated) calls GET /pmx/google/auth-url for a Google
 *     consent link carrying a short-lived, server-issued `state`.
 *  2. Frontend opens that link in a popup. Google redirects the popup to
 *     GET /pmx/google/callback (plain browser navigation, no bearer token),
 *     which exchanges the code for access+refresh tokens, stores them
 *     against the Clerk userId encoded in `state`, then closes itself via
 *     postMessage back to the opener.
 *  3. Frontend calls GET /pmx/google/properties to list GA4 properties the
 *     user can pick from, then POST /pmx/google/select-property to finish.
 *
 * Access tokens expire in ~1hr; getValidAccessToken() refreshes silently
 * using the stored refresh token before every API call that needs one.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../../../config/env";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { PmxGoogleConnectionModel, IPmxGoogleConnection } from "../../../models/Pmx";

export const googleRouter = Router();

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly openid email";

// In-memory OAuth state store, same short-lived/single-process pattern as github.ts.
const pendingStates = new Map<string, { userId: string; expires: number }>();

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expires < now) pendingStates.delete(state);
  }
}

function popupResponseHtml(payload: { success: boolean; error?: string }) {
  return `<!doctype html><html><body style="background:#0a0a0a;color:#e5e5e5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>${payload.success ? "Google connected. You can close this window." : `Connection failed: ${payload.error || "Unknown error"}`}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ source: "starox-google-oauth", ...payload })}, "*");
    }
    window.close();
  </script>
</body></html>`;
}

// Returns a valid (non-expired) access token, refreshing it first if needed.
async function getValidAccessToken(connection: IPmxGoogleConnection): Promise<string | null> {
  if (connection.expiresAt.getTime() > Date.now() + 60_000) return connection.accessToken;
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  connection.accessToken = data.access_token;
  connection.expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await connection.save();
  return connection.accessToken;
}

// ── GET /pmx/google/callback — public, hit by Google's redirect ────────────────
googleRouter.get("/pmx/google/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query as { code?: string; state?: string; error?: string };

  cleanupExpiredStates();

  if (oauthError) {
    return res.status(200).send(popupResponseHtml({ success: false, error: oauthError }));
  }
  if (!code || !state || !pendingStates.has(state)) {
    return res.status(200).send(popupResponseHtml({ success: false, error: "Invalid or expired request" }));
  }

  const { userId } = pendingStates.get(state)!;
  pendingStates.delete(state);

  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "Google OAuth is not configured" }));
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as {
      access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string;
    };
    if (!tokenData.access_token) {
      return res.status(200).send(popupResponseHtml({ success: false, error: tokenData.error_description || "Token exchange failed" }));
    }
    if (!tokenData.refresh_token) {
      // Happens when the user has already granted this app access before —
      // Google only issues a refresh token on the first consent unless we
      // force it. We always send prompt=consent in auth-url specifically
      // to avoid this, but guard anyway.
      return res.status(200).send(popupResponseHtml({ success: false, error: "Google didn't grant offline access — try disconnecting from your Google Account permissions page and reconnecting." }));
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = userRes.ok ? (await userRes.json() as { email?: string }) : {};

    await PmxGoogleConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
        email: googleUser.email,
        scope: tokenData.scope,
        connectedAt: new Date(),
        // Clear any previously selected property — start fresh per connect.
        propertyId: undefined,
        propertyName: undefined,
      },
      { upsert: true }
    );

    res.status(200).send(popupResponseHtml({ success: true }));
  } catch (err) {
    console.error("[Google OAuth] Callback failed:", err);
    res.status(200).send(popupResponseHtml({ success: false, error: "Unexpected server error" }));
  }
});

// Everything below requires an authenticated PMX session.
googleRouter.use("/pmx/google", authMiddleware);

// ── GET /pmx/google/auth-url ────────────────────────────────────────────────────
googleRouter.get("/pmx/google/auth-url", (req: AuthenticatedRequest, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return res.status(400).json({ success: false, error: "Google OAuth is not configured on the server" });
  }

  cleanupExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId: req.userId!, expires: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  res.json({ success: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// ── GET /pmx/google/status ───────────────────────────────────────────────────────
googleRouter.get("/pmx/google/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxGoogleConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.json({ success: true, connected: false });
    res.json({
      success: true,
      connected: !!connection.propertyId,
      email: connection.email,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /pmx/google/properties — GA4 properties available to this account ────────
googleRouter.get("/pmx/google/properties", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxGoogleConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.status(400).json({ success: false, error: "Google not connected" });

    const token = await getValidAccessToken(connection);
    if (!token) return res.status(401).json({ success: false, error: "Google session expired. Please reconnect." });

    const propsRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!propsRes.ok) return res.status(502).json({ success: false, error: "Google Analytics Admin API error" });

    const data = await propsRes.json() as {
      accountSummaries?: Array<{
        displayName: string;
        propertySummaries?: Array<{ property: string; displayName: string }>;
      }>;
    };

    const properties = (data.accountSummaries ?? []).flatMap(acc =>
      (acc.propertySummaries ?? []).map(p => ({
        propertyId: p.property, // "properties/123456789"
        propertyName: p.displayName,
        accountName: acc.displayName,
      }))
    );

    res.json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
});

// ── POST /pmx/google/select-property — finalize the GA4 connector ────────────────
googleRouter.post("/pmx/google/select-property", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, propertyName } = req.body as { propertyId?: string; propertyName?: string };
    if (!propertyId) return res.status(400).json({ success: false, error: "propertyId is required" });

    const connection = await PmxGoogleConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.status(400).json({ success: false, error: "Google not connected" });

    connection.propertyId = propertyId;
    connection.propertyName = propertyName;
    await connection.save();

    res.json({ success: true, propertyId, propertyName });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /pmx/google/disconnect ────────────────────────────────────────────────
googleRouter.delete("/pmx/google/disconnect", async (req: AuthenticatedRequest, res, next) => {
  try {
    await PmxGoogleConnectionModel.deleteOne({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
