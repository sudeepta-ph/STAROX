import { callDeepSeek, parseJsonResponse } from "./ai/deepseek";
import crypto from "node:crypto";

export interface UIIssue {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  screen: string;
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
      "category": "string",
      "problem": "string (1-2 sentences)",
      "change": "string (1-2 sentences)",
      "improvement": "string (1 sentence)"
    }
  ]
}`;
}

// ── Core runner ───────────────────────────────────────────────────────────────

export async function runUIAudit(
  context: string,
  mode: "initial" | "enhance" = "initial"
): Promise<UIAuditResult> {
  const prompt = mode === "enhance"
    ? buildEnhancePrompt(context)
    : buildInitialPrompt(context);

  try {
    const raw    = await callDeepSeek(prompt, undefined, 3000, undefined, SYSTEM);
    const parsed = parseJsonResponse(raw);

    const issues: UIIssue[] = (parsed.issues || []).map((iss: any) => ({
      id:          crypto.randomUUID(),
      title:       iss.title       || "Untitled Issue",
      severity:    iss.severity    || "medium",
      screen:      iss.screen      || "Unknown",
      category:    iss.category    || "Usability Friction",
      problem:     iss.problem     || "",
      change:      iss.change      || "",
      improvement: iss.improvement || "",
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
