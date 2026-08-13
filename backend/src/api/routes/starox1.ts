import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { AI_CONFIG } from "../../services/ai/models";

export const starox1Router = Router();

// Scoped to this one route — 20 requests per IP per 15 minutes. Generous
// enough for real usage (each analysis run is one request) while bounding
// abuse now that this is a public, unauthenticated endpoint. app.ts already
// sets "trust proxy" so req.ip reflects the real client behind any reverse
// proxy.
const starox1Limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { error: "Too many requests, please try again later." },
});

// Backend-side proxy for the public STAROX-1 landing-page analysis tool
// (Frontend/src/lib/deepseek.ts, called from lib/store.ts). Previously this
// called DeepSeek directly from the browser with a VITE_-prefixed API key —
// any VITE_ var ships in the public JS bundle, so that key was readable by
// every visitor via devtools/the built bundle, with no rate limiting or
// spend control. Routing through here keeps the real DEEPSEEK_API_KEY
// server-side only.
starox1Router.post("/starox1/analyze", starox1Limiter, async (req, res) => {
  const { system, user } = req.body;
  if (typeof system !== "string" || typeof user !== "string" || !system.trim() || !user.trim()) {
    return res.status(400).json({ error: "\"system\" and \"user\" are required." });
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("[Starox1 AI] DEEPSEEK_API_KEY is not configured.");
    return res.status(503).json({ error: "AI analysis is not configured." });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);

  try {
    const response = await fetch(`${AI_CONFIG.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: AI_CONFIG.DEFAULT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: AI_CONFIG.TEMPERATURE,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Starox1 AI] DeepSeek returned ${response.status}: ${errText}`);
      return res.status(502).json({ error: "AI analysis failed. Please try again." });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return res.status(502).json({ error: "AI analysis returned an empty response." });
    }
    return res.json({ content });
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("[Starox1 AI] DeepSeek request timed out.");
      return res.status(504).json({ error: "AI analysis timed out. Please try again." });
    }
    console.error("[Starox1 AI] Unexpected error:", err);
    return res.status(500).json({ error: "AI analysis failed. Please try again." });
  } finally {
    clearTimeout(timeoutId);
  }
});
