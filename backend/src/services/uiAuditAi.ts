import { callDeepSeek, parseJsonResponse, withRecoveryRetry } from "./ai/deepseek";
import { AI_MODEL } from "./ai/models";
import crypto from "node:crypto";

const MAX_TOKENS_UI_AUDIT = 3000;

export interface UIIssue {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  screen: string; // human-readable label, e.g. "Checkout page" — kept as-is
  // 0-based index into the screenshots[] array actually sent for this call,
  // matching the "Screenshot N" order in the prompt context. null when the
  // model's value couldn't be trusted (missing/non-numeric/out of range with
  // 2+ screenshots) or when there was nothing to reference (0 screenshots) —
  // see resolveScreenshotIndex.
  screenshotIndex: number | null;
  category: string;
  problem: string;
  change: string;
  improvement: string;
}

export interface UIAuditResult {
  pageTitle: string;
  overallScore: number;
  summary: string;
  issues: UIIssue[];
  // Populated by the route (pmx.ts), not by runUIAudit itself — this stays
  // scoped to the AI call. For URL-mode, this is the single server-captured
  // full-page screenshot (see captureScreenshot in screenshot.ts); absent if
  // capture failed or wasn't attempted. Same { dataUrl, label } shape the
  // frontend already uses for its own uploaded screenshots.
  screenshots?: Array<{ dataUrl: string; label: string }>;
}

// ── System prompt — strict UI-only scope ──────────────────────────────────────

const SYSTEM = `You are a UI/UX Design Auditor. You identify visual, layout, and usability problems in interfaces.
Rules: No business strategy. No marketing. No backend. No code. No repositories. No new features unless they fix a direct usability problem.
Respond ONLY with valid JSON. No markdown, no text outside the JSON object.`;

// ── Initial audit prompt (URL only) ──────────────────────────────────────────

function buildInitialPrompt(context: string): string {
  return `You are a senior UI/UX auditor. Analyze the interface below.
Find only UI/UX problems. Be specific and concise. No business analysis, no marketing, no code.

Categories to check: Visual Hierarchy, Spacing & Alignment, Typography, Color & Contrast, CTA Placement, Navigation, Layout Balance, Component Consistency, Accessibility, Responsiveness, User Flow, Usability Friction.

Rules:
- Name the exact element or section for every issue.
- Each issue: what is wrong, what to change, what improves.
- Sort by severity: critical → high → medium → low.
- Return 6 to 10 issues. Be concise — short sentences only.

Context:
${context}

Return ONLY this JSON:
{
  "pageTitle": "string",
  "overallScore": number,
  "summary": "string (2 sentences max)",
  "issues": [
    {
      "title": "string",
      "severity": "critical|high|medium|low",
      "screen": "string",
      "screenshotIndex": "number (always 0 — there is exactly one screenshot for this audit, a full-page capture of the live URL)",
      "category": "string",
      "problem": "string (1-2 sentences)",
      "change": "string (1-2 sentences)",
      "improvement": "string (1 sentence)"
    }
  ]
}`;
}

// ── Enhancement prompt (URL + screenshots) ───────────────────────────────────

function buildEnhancePrompt(context: string): string {
  return `You are a senior UI/UX auditor performing a multi-screen UI review.
The user has provided a live website URL plus screenshots of additional pages/flows.

Primary source: uploaded screenshots (analyze each screen individually).
Supporting context: live website URL.
Also identify: visual inconsistencies across screens (mismatched buttons, typography, spacing, colors).

Rules:
- No business analysis, no marketing, no code.
- Name the exact screen and element for every issue.
- Each issue: what is wrong, what to change, what improves.
- Sort by severity: critical → high → medium → low.
- Return 8 to 14 issues. Be concise — short sentences only.
- Include a "Cross-Screen Inconsistencies" category when relevant.

Context:
${context}

Return ONLY this JSON:
{
  "pageTitle": "string",
  "overallScore": number,
  "summary": "string (2 sentences max, reflecting all screens)",
  "issues": [
    {
      "title": "string",
      "severity": "critical|high|medium|low",
      "screen": "string (name the specific screen/page this occurs on)",
      "screenshotIndex": "number (0-based index of the screenshot this issue was found on, matching the order screenshots were listed above — 0 for the first screenshot, 1 for the second, etc.)",
      "category": "string",
      "problem": "string (1-2 sentences)",
      "change": "string (1-2 sentences)",
      "improvement": "string (1 sentence)"
    }
  ]
}`;
}

// Validates the model's screenshotIndex against how many screenshots were
// actually sent for this call — never trusts it blindly. With 0 screenshots
// there's nothing to point to (null). With exactly 1, that screenshot is the
// only possible answer, so it's unambiguous even if the model omitted or
// botched the field. With 2+, an invalid/out-of-range value is genuinely
// ambiguous — null rather than guessing which screen it meant.
function resolveScreenshotIndex(raw: unknown, screenshotCount: number): number | null {
  if (screenshotCount === 0) return null;
  if (screenshotCount === 1) return 0;
  const isValid = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < screenshotCount;
  return isValid ? raw : null;
}

// ── Core runner ───────────────────────────────────────────────────────────────

export async function runUIAudit(
  context: string,
  mode: "initial" | "enhance" = "initial",
  screenshotCount: number = 0,
  userId?: string,
  projectId?: string
): Promise<UIAuditResult> {
  const prompt = mode === "enhance"
    ? buildEnhancePrompt(context)
    : buildInitialPrompt(context);

  try {
    const parsed = await withRecoveryRetry(`uiAudit:${mode}`, MAX_TOKENS_UI_AUDIT, async (reportCompletionTokens) => {
      const raw = await callDeepSeek(prompt, AI_MODEL, MAX_TOKENS_UI_AUDIT, undefined, SYSTEM, `uiAudit:${mode}`, (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
      return parseJsonResponse(raw, `uiAudit:${mode}`, "issues");
    });

    const issues: UIIssue[] = (parsed.issues || []).map((iss: any) => ({
      id:              crypto.randomUUID(),
      title:           iss.title       || "Untitled Issue",
      severity:        iss.severity    || "medium",
      screen:          iss.screen      || "Unknown",
      screenshotIndex: resolveScreenshotIndex(iss.screenshotIndex, screenshotCount),
      category:        iss.category    || "Usability Friction",
      problem:         iss.problem     || "",
      change:          iss.change      || "",
      improvement:     iss.improvement || "",
    }));

    return {
      pageTitle:    parsed.pageTitle    || "UI Audit",
      overallScore: Number(parsed.overallScore || 60),
      summary:      parsed.summary      || "",
      issues,
    };
  } catch (err) {
    console.error("[UI Audit AI] Error:", err);
    throw err;
  }
}
