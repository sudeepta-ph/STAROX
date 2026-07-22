/**
 * Integration proxy routes — Starox 1 only.
 *
 * USER BEHAVIOR:  PostHog · Mixpanel · Google Analytics 4
 * USER VOICE:     Slack · Discord
 *
 * Token resolution: client-supplied token wins over server env fallback.
 */
import { Router } from "express";
import { env } from "../../../config/env";

export const integrationsRouter = Router();

function resolveToken(...candidates: (string | undefined | null)[]): string | null {
  return candidates.find((c) => c && c.trim().length > 0) ?? null;
}

// ── PostHog ───────────────────────────────────────────────────────────────────
integrationsRouter.post("/integrations/posthog", async (req, res, next) => {
  try {
    const body = req.body as { token?: string; host?: string; projectId?: string };
    const apiKey = resolveToken(body.token, env.POSTHOG_API_KEY);
    if (!apiKey) return res.status(400).json({ error: "PostHog API key required" });

    const host    = (body.host || env.POSTHOG_HOST).replace(/\/$/, "");
    const headers = { Authorization: `Bearer ${apiKey}` };

    const projectPath = body.projectId ? `/api/projects/${body.projectId}` : "/api/projects/@current";
    const projectRes  = await fetch(`${host}${projectPath}`, { headers });
    if (!projectRes.ok) return res.status(502).json({ error: "PostHog API error" });

    const project = await projectRes.json() as { id: number; name: string };

    // Top events
    let top_events: string[] = [];
    const eventsRes = await fetch(`${host}/api/projects/${project.id}/events/?limit=6`, { headers });
    if (eventsRes.ok) {
      const evData = await eventsRes.json() as { results: Array<{ event: string }> };
      top_events = [...new Set(evData.results.map((e) => e.event))].slice(0, 6);
    }

    // Funnel drop-offs (best-effort)
    let funnel_drop_offs: Array<{ step: string; drop: number }> = [];
    const insightsRes = await fetch(
      `${host}/api/projects/${project.id}/insights/?insight=FUNNELS&limit=3`,
      { headers }
    );
    if (insightsRes.ok) {
      const insData = await insightsRes.json() as {
        results: Array<{ result?: Array<{ action_id: string; dropout_count: number }> }>;
      };
      funnel_drop_offs = (insData.results ?? [])
        .flatMap((r) => (r.result ?? []).map((s) => ({ step: s.action_id, drop: s.dropout_count })))
        .slice(0, 5);
    }

    res.json({ dau: null, wau: null, retention_rate: null, top_events, funnel_drop_offs });
  } catch (error) {
    next(error);
  }
});

// ── Mixpanel ──────────────────────────────────────────────────────────────────
integrationsRouter.post("/integrations/mixpanel", async (req, res, next) => {
  try {
    const body        = req.body as { token?: string; secret?: string; projectId?: string };
    const projectToken = resolveToken(body.token, env.MIXPANEL_PROJECT_TOKEN);
    const apiSecret    = resolveToken(body.secret, env.MIXPANEL_API_SECRET);
    if (!projectToken || !apiSecret) {
      return res.status(400).json({ error: "Mixpanel token and secret required" });
    }

    const auth = Buffer.from(`${projectToken}:${apiSecret}`).toString("base64");
    const to   = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    // Top events via JQL
    const jqlBody = JSON.stringify({
      script: `function main() { return Events({from_date: "${from}", to_date: "${to}"}).groupBy(["name"], mixpanel.reducer.count()).limit(6); }`,
    });
    const eventsRes = await fetch("https://mixpanel.com/api/2.0/jql", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
      body: jqlBody,
    });

    let top_events: string[] = [];
    if (eventsRes.ok) {
      const evData = await eventsRes.json() as Array<{ key: string[]; value: number }>;
      top_events = evData.map((e) => e.key[0]).filter(Boolean).slice(0, 6);
    }

    res.json({ active_users: null, top_events, retention: null, funnel_conversion: null });
  } catch (error) {
    next(error);
  }
});

// ── Google Analytics 4 ────────────────────────────────────────────────────────
integrationsRouter.post("/integrations/google-analytics", async (req, res, next) => {
  try {
    const body       = req.body as { token?: string; propertyId?: string };
    const gaToken    = resolveToken(body.token);
    const propertyId = body.propertyId || env.GA4_PROPERTY_ID;

    if (!gaToken)    return res.status(400).json({ error: "Google OAuth token required" });
    if (!propertyId) return res.json({ error: "GA4 propertyId required" });

    const reportBody = {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
        { name: "conversions" },
      ],
      dimensions: [{ name: "pagePath" }],
      limit: 5,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    };

    const gaRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${gaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(reportBody),
      }
    );
    if (!gaRes.ok) return res.status(502).json({ error: "GA4 API error" });

    const data = await gaRes.json() as {
      rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
      totals?: Array<{ metricValues: Array<{ value: string }> }>;
    };

    const totals = data.totals?.[0]?.metricValues ?? [];
    res.json({
      sessions:             parseInt(totals[0]?.value ?? "0"),
      bounce_rate:          parseFloat(totals[1]?.value ?? "0") * 100,
      avg_session_duration: parseFloat(totals[2]?.value ?? "0"),
      conversions:          parseInt(totals[3]?.value ?? "0"),
      top_pages:            data.rows?.map((r) => r.dimensionValues[0]?.value) ?? [],
    });
  } catch (error) {
    next(error);
  }
});

// ── Slack ─────────────────────────────────────────────────────────────────────
integrationsRouter.post("/integrations/slack", async (req, res, next) => {
  try {
    const body     = req.body as { token?: string; channel?: string };
    const botToken = resolveToken(body.token, env.SLACK_BOT_TOKEN);
    if (!botToken) return res.status(400).json({ error: "Slack bot token required" });

    const headers   = { Authorization: `Bearer ${botToken}` };
    let channelId   = body.channel || env.SLACK_CHANNEL_ID;

    // Resolve channel name → ID
    if (channelId?.startsWith("#")) {
      const listRes = await fetch("https://slack.com/api/conversations.list?limit=200", { headers });
      if (listRes.ok) {
        const listData = await listRes.json() as { channels: Array<{ id: string; name: string }> };
        const found = listData.channels.find((c) => c.name === channelId!.slice(1));
        if (found) channelId = found.id;
      }
    }

    if (!channelId) return res.json({ message_count: 0, recent_messages: [], top_topics: [] });

    const histRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&limit=30`,
      { headers }
    );
    if (!histRes.ok) return res.status(502).json({ error: "Slack API error" });

    const histData = await histRes.json() as { messages: Array<{ text: string; subtype?: string }> };
    const messages = (histData.messages ?? [])
      .filter((m) => !m.subtype && m.text?.length > 10)
      .map((m) => m.text.replace(/<[^>]+>/g, "").trim().slice(0, 120));

    res.json({ message_count: messages.length, recent_messages: messages.slice(0, 8), top_topics: [] });
  } catch (error) {
    next(error);
  }
});

// ── Discord ───────────────────────────────────────────────────────────────────
integrationsRouter.post("/integrations/discord", async (req, res, next) => {
  try {
    const body     = req.body as { token?: string; channel?: string };
    const botToken = resolveToken(body.token, env.DISCORD_BOT_TOKEN);
    if (!botToken) return res.status(400).json({ error: "Discord bot token required" });

    const channelId = body.channel || env.DISCORD_CHANNEL_ID;
    if (!channelId) return res.json({ message_count: 0, recent_messages: [], sentiment: "unknown" });

    const resp = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=30`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!resp.ok) return res.status(502).json({ error: "Discord API error" });

    const msgs = await resp.json() as Array<{ content: string; author: { bot?: boolean } }>;
    const messages = msgs
      .filter((m) => !m.author.bot && m.content?.length > 5)
      .map((m) => m.content.slice(0, 120));

    res.json({ message_count: messages.length, recent_messages: messages.slice(0, 6), sentiment: "neutral" });
  } catch (error) {
    next(error);
  }
});
