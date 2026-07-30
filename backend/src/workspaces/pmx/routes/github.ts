/**
 * GitHub OAuth — lets a PMX user sign in with GitHub and import one of
 * their repositories as a source connector.
 *
 * Flow:
 *  1. Frontend (authenticated) calls GET /pmx/github/auth-url to get a
 *     GitHub authorize link carrying a short-lived, server-issued `state`.
 *  2. Frontend opens that link in a popup. GitHub redirects the popup to
 *     GET /pmx/github/callback (a plain browser navigation — no bearer
 *     token available), which exchanges the code for an access token,
 *     stores it against the Clerk userId encoded in `state`, then closes
 *     itself via postMessage back to the opener.
 *  3. Frontend re-checks /pmx/github/status and lists /pmx/github/repos.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../../../config/env";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import { PmxGithubConnectionModel } from "../../../models/Pmx";

export const githubRouter = Router();

// In-memory OAuth state store: state token -> { userId, expires }.
// Short-lived (10 min) and single-process, which matches the rest of
// this backend's deployment model — no external store needed.
const pendingStates = new Map<string, { userId: string; expires: number }>();

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expires < now) pendingStates.delete(state);
  }
}

function popupResponseHtml(payload: { success: boolean; error?: string }) {
  return `<!doctype html><html><body style="background:#0a0a0a;color:#e5e5e5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>${payload.success ? "GitHub connected. You can close this window." : `Connection failed: ${payload.error || "Unknown error"}`}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ source: "starox-github-oauth", ...payload })}, "*");
    }
    window.close();
  </script>
</body></html>`;
}

// ── GET /pmx/github/callback — public, hit by GitHub's redirect ────────────────
githubRouter.get("/pmx/github/callback", async (req, res) => {
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
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "GitHub OAuth is not configured" }));
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; scope?: string; error_description?: string };
    if (!tokenData.access_token) {
      return res.status(200).send(popupResponseHtml({ success: false, error: tokenData.error_description || "Token exchange failed" }));
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
    });
    if (!userRes.ok) {
      return res.status(200).send(popupResponseHtml({ success: false, error: "Failed to load GitHub profile" }));
    }
    const ghUser = await userRes.json() as { id: number; login: string; avatar_url: string };

    await PmxGithubConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: tokenData.access_token,
        githubId: ghUser.id,
        githubLogin: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        scope: tokenData.scope,
        connectedAt: new Date(),
      },
      { upsert: true }
    );

    res.status(200).send(popupResponseHtml({ success: true }));
  } catch (err) {
    console.error("[GitHub OAuth] Callback failed:", err);
    res.status(200).send(popupResponseHtml({ success: false, error: "Unexpected server error" }));
  }
});

// Everything below requires an authenticated PMX session.
githubRouter.use("/pmx/github", authMiddleware);

// ── GET /pmx/github/auth-url ────────────────────────────────────────────────────
githubRouter.get("/pmx/github/auth-url", (req: AuthenticatedRequest, res) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_REDIRECT_URI) {
    return res.status(400).json({ success: false, error: "GitHub OAuth is not configured on the server" });
  }

  cleanupExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId: req.userId!, expires: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: "repo read:user",
    state,
    allow_signup: "true",
  });

  res.json({ success: true, url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// ── GET /pmx/github/status ───────────────────────────────────────────────────────
githubRouter.get("/pmx/github/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxGithubConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.json({ success: true, connected: false });
    res.json({
      success: true,
      connected: true,
      login: connection.githubLogin,
      avatarUrl: connection.avatarUrl,
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /pmx/github/repos ────────────────────────────────────────────────────────
githubRouter.get("/pmx/github/repos", async (req: AuthenticatedRequest, res, next) => {
  try {
    const connection = await PmxGithubConnectionModel.findOne({ userId: req.userId });
    if (!connection) return res.status(400).json({ success: false, error: "GitHub not connected" });

    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const reposRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      { headers: { Authorization: `Bearer ${connection.accessToken}`, Accept: "application/vnd.github+json" } }
    );

    if (reposRes.status === 401) {
      await PmxGithubConnectionModel.deleteOne({ userId: req.userId });
      return res.status(401).json({ success: false, error: "GitHub session expired. Please reconnect." });
    }
    if (!reposRes.ok) return res.status(502).json({ success: false, error: "GitHub API error" });

    const repos = await reposRes.json() as Array<{
      id: number; full_name: string; name: string; html_url: string;
      description: string | null; private: boolean; language: string | null; updated_at: string;
    }>;

    const filtered = search
      ? repos.filter(r => r.full_name.toLowerCase().includes(search) || (r.description || "").toLowerCase().includes(search))
      : repos;

    res.json({
      success: true,
      data: filtered.map(r => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        url: r.html_url,
        description: r.description,
        private: r.private,
        language: r.language,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /pmx/github/disconnect ────────────────────────────────────────────────
githubRouter.delete("/pmx/github/disconnect", async (req: AuthenticatedRequest, res, next) => {
  try {
    await PmxGithubConnectionModel.deleteOne({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
