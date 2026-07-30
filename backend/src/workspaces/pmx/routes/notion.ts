/**
 * Notion OAuth — lets a PMX user connect their Notion workspace so STAROX
 * can read the pages/databases they grant access to. Same shape as
 * github.ts / google.ts:
 *
 * Flow:
 *  1. Frontend (authenticated) calls GET /pmx/notion/auth-url to get a
 *     Notion authorize link carrying a short-lived, server-issued `state`.
 *  2. Frontend opens that link in a popup. Notion redirects the popup to
 *     GET /pmx/notion/callback (a plain browser navigation — no bearer
 *     token available), which exchanges the code for an access token,
 *     stores it against the Clerk userId encoded in `state`, then closes
 *     itself via postMessage back to the opener.
 *  3. Frontend re-checks /pmx/notion/status.
 *
 * Notion access tokens don't expire, so unlike google.ts there's no
 * refresh-token dance.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../../../config/env";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { PmxNotionConnectionModel } from "../../../models/Pmx";

export const notionRouter = Router();

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
  <p>${payload.success ? "Notion connected. You can close this window." : `Connection failed: ${payload.error || "Unknown error"}`}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ source: "starox-notion-oauth", ...payload })}, "*");
    }
    window.close();
  </script>
</body></html>`;
}

// ── GET /pmx/notion/callback — public, hit by Notion's redirect ────────────────
notionRouter.get("/pmx/notion/callback", async (req, res) => {
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
    if (!env.NOTION_CLIENT_ID || !env.NOTION_CLIENT_SECRET || !env.NOTION_REDIRECT_URI) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "Notion OAuth is not configured" }));
    }

    const basicAuth = Buffer.from(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.NOTION_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json() as {
      access_token?: string;
      bot_id?: string;
      workspace_id?: string;
      workspace_name?: string;
      workspace_icon?: string;
      owner?: { type?: string; user?: { name?: string } };
      error?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(200).send(popupResponseHtml({ success: false, error: tokenData.error || "Token exchange failed" }));
    }

    await PmxNotionConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: tokenData.access_token,
        botId: tokenData.bot_id,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name,
        workspaceIcon: tokenData.workspace_icon,
        ownerName: tokenData.owner?.user?.name,
        connectedAt: new Date(),
      },
      { upsert: true }
    );

    res.status(200).send(popupResponseHtml({ success: true }));
  } catch (err) {
    console.error("[Notion OAuth] Callback failed:", err);
    res.status(200).send(popupResponseHtml({ success: false, error: "Unexpected server error" }));
  }
});

// Everything below requires an authenticated PMX session.
notionRouter.use("/pmx/notion", authMiddleware);

// ── GET /pmx/notion/auth-url ────────────────────────────────────────────────────
notionRouter.get("/pmx/notion/auth-url", (req: AuthenticatedRequest, res) => {
  if (!env.NOTION_CLIENT_ID || !env.NOTION_REDIRECT_URI) {
    return res.status(400).json({ success: false, error: "Notion OAuth is not configured on the server" });
  }

  cleanupExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId: req.userId!, expires: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: env.NOTION_CLIENT_ID,
    redirect_uri: env.NOTION_REDIRECT_URI,
    response_type: "code",
    owner: "user",
    state,
  });

  res.json({ success: true, url: `https://api.notion.com/v1/oauth/authorize?${params.toString()}` });
});

// ── GET /pmx/notion/status ───────────────────────────────────────────────────────
notionRouter.get("/pmx/notion/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxNotionConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.json({ success: true, connected: false });
    res.json({
      success: true,
      connected: true,
      workspaceName: connection.workspaceName,
      workspaceIcon: connection.workspaceIcon,
      ownerName: connection.ownerName,
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /pmx/notion/disconnect ────────────────────────────────────────────────
notionRouter.delete("/pmx/notion/disconnect", async (req: AuthenticatedRequest, res, next) => {
  try {
    await PmxNotionConnectionModel.deleteOne({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
