// UNMOUNTED as of 2026-08-07 — this router is no longer app.use()'d in
// app.ts, so /cdx1/generate, /cdx2/generate, /cdx3/generate all 404.
//
// Why: a full-codebase trace found zero reachable frontend call sites for
// any of the three routes. `runStarox1`/`startStarox2Analysis`/
// `startStarox3Analysis` (Frontend/src/lib/api.ts, store.ts) either have no
// caller at all, or their one caller chain (Index.tsx's Starox2HeroInput)
// is imported but never rendered. The "STAROX-1/2/3" cards still visible on
// Agents.tsx route into /pmx instead, unrelated to this file. Meanwhile
// these routes had no authMiddleware — `userId` was a client-supplied,
// unauthenticated body field passed straight into the credits ledger
// (services/credits.ts), auto-creating a credited User record for any
// caller-declared id. Unmounted rather than deleted so the feature can be
// picked back up later — if you do, re-mount in app.ts AND add real auth
// before doing so.
import { Router } from "express";
import { z } from "zod";
import { ensureCredits, consumeCredits } from "../../../services/credits";
import { generateCdxOutput } from "../../../services/cdx";

const baseSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  model: z.string().default("openai/gpt-4o-mini"),
  planTier: z.enum(["free", "starter", "pro"]).default("free"),
});

const cdx1Schema = baseSchema.extend({
  // Accept any combination of inputs
  websiteUrl: z.string().url().optional(),
  productDescription: z.string().optional(),
  reviews: z.array(z.string()).optional(),
  analyticsContext: z.string().optional(),
  screenshotText: z.string().optional(),
});

const cdx2Schema = baseSchema.extend({
  prompt: z.string().optional(),
  mode: z.enum(["url", "github"]).default("url"),
  websiteUrl: z.string().url().optional(),
  runtimeUrl: z.string().url().optional(),
  reviews: z.array(z.string()).optional(),
  screenshotText: z.string().optional(),
  repo: z.object({
    url: z.string().url(),
    fullName: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    defaultBranch: z.string().optional(),
    visibility: z.enum(["public", "private"]).optional(),
    stars: z.number().optional(),
    forks: z.number().optional(),
    updatedAt: z.string().optional(),
  }).optional(),
});

const cdx3Schema = baseSchema.extend({
  repoUrl: z.string().url(),
  productDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  seoKeywords: z.string().optional(),
});

export const cdxRouter = Router();

// ── CDX-1: Product Intelligence ───────────────────────────────────────────────
cdxRouter.post("/cdx1/generate", async (req, res, next) => {
  try {
    const body = cdx1Schema.parse(req.body);

    // Build a rich prompt from all available inputs
    const parts: string[] = [];
    if (body.websiteUrl) parts.push(`Website URL: ${body.websiteUrl}`);
    if (body.productDescription) parts.push(`Product Description: ${body.productDescription}`);
    if (body.reviews?.length) {
      parts.push(`Customer Reviews (${body.reviews.length}):\n${body.reviews.slice(0, 20).join("\n")}`);
    }
    if (body.analyticsContext) parts.push(`Analytics Context: ${body.analyticsContext}`);
    if (body.screenshotText) parts.push(`Screenshot OCR Text: ${body.screenshotText}`);

    if (parts.length === 0) {
      return res.status(400).json({ error: "At least one input is required (websiteUrl, productDescription, reviews, etc.)" });
    }

    const prompt = parts.join("\n\n---\n\n");

    const cost = await ensureCredits(body.userId, body.planTier, "cdx1");
    const output = await generateCdxOutput("cdx1", body.model, prompt, body.userId, body.projectId);
    await consumeCredits(body.userId, cost);

    // Parse the JSON from sections[0]
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(output.sections[0]);
    } catch {
      parsed = { raw: output.sections[0] };
    }

    res.json({ type: "cdx1", data: parsed, model: output.model, provider: output.provider });
  } catch (error) {
    next(error);
  }
});

// ── CDX-2: UX & Improvement ───────────────────────────────────────────────────
cdxRouter.post("/cdx2/generate", async (req, res, next) => {
  try {
    const body = cdx2Schema.parse(req.body);
    if (!body.prompt && body.mode === "url" && !body.websiteUrl) {
      return res.status(400).json({ error: "websiteUrl is required for URL mode" });
    }
    if (!body.prompt && body.mode === "github" && !body.repo?.url) {
      return res.status(400).json({ error: "repo.url is required for GitHub mode" });
    }

    const cost = await ensureCredits(body.userId, body.planTier, "cdx2");
    const output = await generateCdxOutput("cdx2", body.model, JSON.stringify({
      prompt: body.prompt,
      mode: body.mode,
      websiteUrl: body.websiteUrl,
      runtimeUrl: body.runtimeUrl,
      reviews: body.reviews,
      screenshotText: body.screenshotText,
      repo: body.repo,
    }), body.userId, body.projectId);
    await consumeCredits(body.userId, cost);

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(output.sections[0]);
    } catch {
      parsed = { raw: output.sections[0] };
    }

    res.json({ type: "cdx2", data: parsed, model: output.model, provider: output.provider });
  } catch (error) {
    next(error);
  }
});

// ── CDX-3: Documentation Intelligence ────────────────────────────────────────
cdxRouter.post("/cdx3/generate", async (req, res, next) => {
  try {
    const body = cdx3Schema.parse(req.body);

    const cost = await ensureCredits(body.userId, body.planTier, "cdx3");
    const output = await generateCdxOutput("cdx3", body.model, JSON.stringify({
      repoUrl: body.repoUrl,
      productDescription: body.productDescription,
      targetAudience: body.targetAudience,
      seoKeywords: body.seoKeywords,
    }), body.userId, body.projectId);
    await consumeCredits(body.userId, cost);

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(output.sections[0]);
    } catch {
      parsed = { raw: output.sections[0] };
    }

    res.json({ type: "cdx3", data: parsed, model: output.model, provider: output.provider });
  } catch (error) {
    next(error);
  }
});
