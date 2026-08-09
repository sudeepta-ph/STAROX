/**
 * Slack OAuth — lets a PMX user connect their Slack workspace so STAROX can
 * read the channels/messages the installed app is granted access to. Same
 * shape as github.ts / google.ts / notion.ts:
 *
 * Flow:
 *  1. Frontend (authenticated) calls GET /pmx/slack/auth for a Slack
 *     authorize link carrying a short-lived, server-issued `state`.
 *  2. Frontend opens that link in a popup. Slack redirects the popup to
 *     GET /pmx/slack/callback (a plain browser navigation — no bearer
 *     token available), which exchanges the code for tokens, verifies the
 *     bot token with a live `auth.test` call, encrypts and stores the
 *     tokens against the Clerk userId encoded in `state`, then closes
 *     itself via postMessage back to the opener.
 *  3. Frontend re-checks /pmx/slack/status.
 *
 * Token rotation: Slack apps can optionally enable "token rotation," in
 * which case oauth.v2.access also returns a refresh_token + expires_in and
 * bot tokens expire like Google's. getValidAccessToken() refreshes
 * silently before use when that applies; apps without rotation enabled get
 * a token that never expires, same as classic Slack bot tokens.
 *
 * Tokens are encrypted at rest (lib/tokenCrypto.ts) and never sent to the
 * frontend — /status only ever returns workspace metadata.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../../../config/env";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { PmxSlackConnectionModel, IPmxSlackConnection } from "../../../models/Pmx";
import { encryptToken, decryptToken } from "../../../lib/tokenCrypto";

export const slackRouter = Router();

// Least-privilege bot scopes covering everything PMX needs to read:
// workspace info, public channels (+ the ability to join them), private
// channels the bot has been invited to, messages/threads, and users.
const BOT_SCOPES = "channels:read,channels:history,channels:join,groups:read,groups:history,users:read,team:read";

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
  <p>${payload.success ? "Slack connected. You can close this window." : `Connection failed: ${payload.error || "Unknown error"}`}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ source: "starox-slack-oauth", ...payload })}, "*");
    }
    window.close();
  </script>
</body></html>`;
}

// Returns a valid (non-expired), decrypted access token, refreshing it
// first if the app has token rotation enabled and it's near expiry.
// Returns null if the connection is unusable and should be treated as
// disconnected (expired/revoked with no way to recover).
async function getValidAccessToken(connection: IPmxSlackConnection): Promise<string | null> {
  const hasRotation = !!connection.refreshToken && !!connection.tokenExpiresAt;

  if (!hasRotation) {
    return decryptToken(connection.accessToken);
  }

  if (connection.tokenExpiresAt!.getTime() > Date.now() + 60_000) {
    return decryptToken(connection.accessToken);
  }

  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) return null;

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: decryptToken(connection.refreshToken!),
    }),
  });
  const data = await res.json() as {
    ok: boolean; access_token?: string; refresh_token?: string; expires_in?: number; error?: string;
  };
  if (!data.ok || !data.access_token) return null;

  connection.accessToken = encryptToken(data.access_token);
  if (data.refresh_token) connection.refreshToken = encryptToken(data.refresh_token);
  if (data.expires_in) connection.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  await connection.save();
  return data.access_token;
}

// ── GET /pmx/slack/callback — public, hit by Slack's redirect ──────────────────
slackRouter.get("/pmx/slack/callback", async (req, res) => {
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
    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET || !env.SLACK_REDIRECT_URI) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "Slack OAuth is not configured" }));
    }

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json() as {
      ok: boolean;
      app_id?: string;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      bot_user_id?: string;
      authed_user?: { id?: string };
      team?: { id?: string; name?: string };
      error?: string;
    };

    if (!tokenData.ok || !tokenData.access_token) {
      return res.status(200).send(popupResponseHtml({ success: false, error: tokenData.error || "Token exchange failed" }));
    }
    if (!tokenData.team?.id || !tokenData.bot_user_id || !tokenData.app_id) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "Slack response was missing required workspace data" }));
    }

    // Verify with a real, live API call before marking anything connected —
    // never trust the token exchange response alone.
    const verifyRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const verifyData = await verifyRes.json() as { ok: boolean; team?: string; error?: string };
    if (!verifyData.ok) {
      return res.status(200).send(popupResponseHtml({ success: false, error: verifyData.error || "Slack rejected the issued token" }));
    }

    // team.icon isn't in oauth.v2.access — pull it from team.info (best-effort).
    let teamIcon: string | undefined;
    try {
      const teamRes = await fetch(`https://slack.com/api/team.info?team=${tokenData.team.id}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const teamData = await teamRes.json() as { ok: boolean; team?: { icon?: { image_88?: string } } };
      teamIcon = teamData.ok ? teamData.team?.icon?.image_88 : undefined;
    } catch {
      // best-effort only
    }

    await PmxSlackConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name || "Slack workspace",
        teamIcon,
        botUserId: tokenData.bot_user_id,
        appId: tokenData.app_id,
        scope: tokenData.scope,
        authedUserId: tokenData.authed_user?.id,
        connectedAt: new Date(),
      },
      { upsert: true }
    );

    res.status(200).send(popupResponseHtml({ success: true }));
  } catch (err) {
    console.error("[Slack OAuth] Callback failed:", err);
    res.status(200).send(popupResponseHtml({ success: false, error: "Unexpected server error" }));
  }
});

// Everything below requires an authenticated PMX session.
slackRouter.use("/pmx/slack", authMiddleware);

// ── GET /pmx/slack/auth ──────────────────────────────────────────────────────
slackRouter.get("/pmx/slack/auth", (req: AuthenticatedRequest, res) => {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_REDIRECT_URI) {
    return res.status(400).json({ success: false, error: "Slack OAuth is not configured on the server" });
  }

  cleanupExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId: req.userId!, expires: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    redirect_uri: env.SLACK_REDIRECT_URI,
    scope: BOT_SCOPES,
    state,
  });

  res.json({ success: true, url: `https://slack.com/oauth/v2/authorize?${params.toString()}` });
});

// ── GET /pmx/slack/status ────────────────────────────────────────────────────
slackRouter.get("/pmx/slack/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxSlackConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.json({ success: true, connected: false });

    // Confirm the stored token still actually works before reporting
    // "connected" — catches externally revoked/expired tokens rather than
    // trusting whatever is in the database.
    const token = await getValidAccessToken(connection);
    if (!token) {
      await PmxSlackConnectionModel.deleteOne({ userId: req.userId });
      return res.json({ success: true, connected: false });
    }

    const verifyRes = await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
    const verifyData = await verifyRes.json() as { ok: boolean };
    if (!verifyData.ok) {
      await PmxSlackConnectionModel.deleteOne({ userId: req.userId });
      return res.json({ success: true, connected: false });
    }

    res.json({
      success: true,
      connected: true,
      teamId: connection.teamId,
      teamName: connection.teamName,
      teamIcon: connection.teamIcon,
      botUserId: connection.botUserId,
      scope: connection.scope,
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /pmx/slack/disconnect ───────────────────────────────────────────────
slackRouter.post("/pmx/slack/disconnect", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxSlackConnectionModel.findOne({ userId: req.userId });
    if (connection) {
      try {
        const token = decryptToken(connection.accessToken);
        await fetch("https://slack.com/api/auth.revoke", { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        // Revocation is best-effort — always proceed to delete our own
        // record even if Slack's revoke call fails (e.g. already revoked).
        console.error("[Slack OAuth] auth.revoke failed:", err);
      }
    }
    await PmxSlackConnectionModel.deleteOne({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
