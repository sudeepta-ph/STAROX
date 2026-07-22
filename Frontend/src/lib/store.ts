import { create } from "zustand";
import { callDeepSeek, parseJson } from "./deepseek";
import type { Starox1Output } from "./api";
import { checkAndConsume } from "./usageLimit";
import { useAuthStore } from "./authStore";
import { pullAllIntegrationSignals, formatSignalsForPrompt } from "./integrationDataPull";
import { subscribeIntegrations, type IntegrationId, type Integration } from "./integrations";

export type { Starox1Output, S1Feature, S1Decision, S1Task };

// ── STAROX-2 types ─────────────────────────────────────────────────────────────
export interface PageScreenshot {
  url: string;
  dataUrl: string;
  annotations: Array<{
    id: string;
    x: number;       // % from left
    y: number;       // % from top
    label: string;
    issue: string;
    recommendation: string;
    severity: string;
    color: string;
  }>;
}

// STAROX-1 page screenshot annotated with product intelligence findings
export interface S1PageScreenshot {
  url: string;
  dataUrl: string;
  annotations: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
    detail: string;
    type: "problem" | "feature" | "market" | "insight";
    color: string;
  }>;
}

export interface UxIssue {
  id: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  area: string;
  why: string;
  recommendation: string;
  estimated_impact: string;
  type: string;
  complexity: "low" | "medium" | "high";
  annotation?: { x: number; y: number; label: string; fix?: string; impact?: string; priority?: string };
}

// Per-page analysis as per spec
export interface PageAnalysis {
  url: string;
  pageType: "landing" | "onboarding" | "dashboard" | "feature" | "checkout" | "other";
  title: string;
  priorityScore: "high" | "medium" | "low";
  issues: UxIssue[];
  improvements: Array<{ improvement: string; impact: string }>;
  addOns: Array<{ feature: string; reason: string }>;
}

export type Starox2Mode = "url" | "github";

export interface Starox2Target {
  mode: Starox2Mode;
  url?: string;
  runtimeUrl?: string;
  repo?: {
    url: string;
    fullName?: string;
    description?: string;
    language?: string;
    defaultBranch?: string;
    visibility?: "public" | "private";
    stars?: number;
    forks?: number;
    updatedAt?: string;
  };
}

export interface Starox2RuntimeArtifact {
  label: string;
  status: "available" | "partial" | "missing";
  detail: string;
  type: "crawl" | "runtime" | "repo" | "screenshot" | "integration";
}

export interface Starox2CodePrompt {
  title: string;
  file: string;
  issue: string;
  fix: string;
  priority: "High" | "Medium" | "Low";
  validation: string;
}

export interface Starox2UiPrompt {
  title: string;
  prompt: string;
  priority: "High" | "Medium" | "Low";
  issueId: string | null;
}

export interface Starox2Output {
  analysisMode: Starox2Mode;
  analyzedEntity: {
    label: string;
    primaryUrl: string;
    runtimeUrl: string | null;
    repoUrl: string | null;
  };
  sourceContext: {
    modeSummary: string;
    signalsUsed: string[];
    confidence: "high" | "medium" | "low";
  };
  runtimeReadiness: {
    status: "live_runtime" | "repo_only" | "hybrid";
    summary: string;
    artifacts: Starox2RuntimeArtifact[];
  };
  uxSummary: string;
  pages: PageAnalysis[];
  uxIssues: UxIssue[];
  repoIntelligence: {
    summary: string;
    componentHierarchy: string[];
    routingState: string[];
    stateManagement: string[];
    uiArchitecture: string[];
    implementationGaps: Array<{
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
    }>;
  };
  featureEnhancements: Array<{
    feature: string; currentState: string; improvement: string; impact: "high" | "medium" | "low";
  }>;
  performanceOptimizations: Array<{
    area: string; issue: string; fix: string; effort: "low" | "medium" | "high";
  }>;
  userJourneyOptimizations: Array<{
    flow: string; problem: string; solution: string; expectedDropoffReduction: string;
  }>;
  engagementRetentionStrategy: Array<{
    strategy: string; description: string; expectedImpact: string;
  }>;
  ctaOptimizations: Array<{ current: string; suggested: string; reason: string }>;
  implementationPrompts: {
    ui: Starox2UiPrompt[];
    code: Starox2CodePrompt[];
    experiments: Array<{
      title: string;
      prompt: string;
      priority: "High" | "Medium" | "Low";
    }>;
  };
  feedbackLoop: {
    starox1Opportunities: string[];
    productSignalsToTrack: string[];
  };
  conversionPrediction: {
    conversionRateChange: number; bounceRateChange: number;
    sessionDurationChange: number; revenueImpact: number; userEngagementChange: number;
  };
}

// Legacy compat for AnalysisPanel
export interface Starox2Analysis {
  uxWeaknesses: UxIssue[];
  suggestions: Array<{
    id: string; suggestion: string; title: string; type: string; priority: number;
    estimated_impact: string; severity: "high" | "medium" | "low";
    complexity: "low" | "medium" | "high"; description: string; recommendation: string;
  }>;
  ctaImprovements: Array<{ improvement: string }>;
  structuralSuggestions: Array<{ suggestion: string }>;
  conversionPrediction?: Starox2Output["conversionPrediction"];
}

export interface Predictions {
  conversionRateChange: number; bounceRateChange: number;
  sessionDurationChange: number; revenueImpact: number; userEngagementChange: number;
}

// ── STAROX-3 types ─────────────────────────────────────────────────────────────
export interface RepoFile {
  path: string;
  type: "file" | "dir";
  size?: number;
}

export interface RepoMap {
  entryPoints: string[];
  modules: Array<{ name: string; path: string; purpose: string }>;
  apiRoutes: Array<{ method: string; path: string; description: string }>;
  services: Array<{ name: string; purpose: string }>;
  dependencies: string[];
  dataFlow: string;
  relationships: string;
}

export interface DocSection {
  title: string;
  content: string;
  examples?: string[];
}

export interface Starox3Output {
  repoSummary: string;
  repoMap: RepoMap;
  docs: {
    readme: DocSection;
    api: DocSection;
    architecture: DocSection;
    onboarding: DocSection;
  };
  seo: {
    blogPosts: Array<{ title: string; outline: string; keywords: string[] }>;
    featurePages: Array<{ title: string; headline: string; body: string }>;
    landingCopy: { headline: string; subheadline: string; cta: string; valueProps: string[] };
  };
  business: {
    productSummary: string;
    featureBreakdown: Array<{ feature: string; description: string; value: string }>;
    pitchExplanation: string;
    investorDescription: string;
  };
  qaExamples: Array<{ question: string; answer: string; fileReferences: string[] }>;
  architectureDiagram: string;
}

// ── Store interface ────────────────────────────────────────────────────────────
interface AnalysisState {
  isAnalyzing: boolean;
  isAnalyzingS2: boolean;
  analysisProgress: number;
  analysisStep: string;
  analysisError: string | null;
  starox2Error: string | null;

  currentUrl: string | null;
  websiteUrl: string | null;
  reviews: string[];
  starox1Inputs: {
    context: string;
    goal: string;
  };
  ocrText: string | null;
  screenshotDataUrl: string | null;
  uploadedFiles: Array<{ name: string; type: string; data: unknown; tags?: string }>;

  // Live integration signals pulled before each analysis run
  connectedIntegrations: Partial<Record<IntegrationId, Integration | null>>;
  liveSignalSummary: string | null; // formatted signals for display

  starox1: Starox1Output | null;
  starox1Analysis: Starox1Output | null;
  starox2: Starox2Output | null;
  starox2Analysis: Starox2Analysis | null;
  starox2Target: Starox2Target | null;
  starox3: Starox3Output | null;
  starox3Error: string | null;
  isAnalyzingS3: boolean;
  predictions: Predictions | null;
  pageScreenshots: PageScreenshot[];
  s1PageScreenshots: S1PageScreenshot[];

  setCurrentUrl: (url: string) => void;
  setWebsiteUrl: (url: string) => void;
  addReviews: (reviews: string[]) => void;
  setStarox1Inputs: (inputs: Partial<{ context: string; goal: string }>) => void;
  addUploadedFile: (file: { name: string; type: string; data: unknown; tags?: string }) => void;
  setOcrResult: (text: string, dataUrl: string) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalysisProgress: (v: number) => void;
  setAnalysisStep: (v: string) => void;
  setStarox1: (data: Starox1Output) => void;
  setStarox2Analysis: (data: Starox2Analysis) => void;
  setPredictions: (data: Predictions) => void;
  resetAnalysis: () => void;
  clearAnalysis: () => void;
  resetForNewUrl: () => void;  // resets analysis but preserves connectedIntegrations
  setError: (e: string | null) => void;
  setConnectedIntegrations: (integrations: Partial<Record<IntegrationId, Integration | null>>) => void;

  startWebsiteAnalysis: (url: string) => Promise<void>;
  startStarox2Analysis: (target: string | Starox2Target) => Promise<void>;
  startStarox3Analysis: (repoUrl: string, opts?: { productDescription?: string; targetAudience?: string; seoKeywords?: string }) => Promise<void>;
  capturePageScreenshots: (url: string) => Promise<void>;
  captureS1Screenshots: (url: string, analysis: Starox1Output) => Promise<void>;
  startFullAnalysis: (url: string, reviews?: string[], desc?: string) => Promise<void>;
  startReviewAnalysis: (reviews: string[], desc?: string) => Promise<void>;
}

// ── Prompts ────────────────────────────────────────────────────────────────────
const S1_SYSTEM = `You are STAROX-1 — Product Intelligence Agent.

Your role is to act as a real-time Product Decision Engine.

You do NOT generate dashboards, summaries, or vague insights.

You ONLY produce:
→ Clear product decisions
→ Backed by real evidence
→ Ready for execution by downstream agents

----------------------------------------
CORE OBJECTIVE
----------------------------------------

Continuously answer:

"What should we build next — and why?"

----------------------------------------
INPUT SIGNALS
----------------------------------------

You receive structured and unstructured data from:

1. USER BEHAVIOR (PostHog / Mixpanel / GA4)
- Drop-offs (funnels)
- Retention / churn patterns
- Feature usage
- Session anomalies

2. USER VOICE (Slack / Discord)
- Team-flagged complaints and patterns
- Community feedback and recurring friction

----------------------------------------
OPERATING MODES
----------------------------------------

1. PROACTIVE MODE — Live behavior or voice signals present → surface issues automatically
2. REACTIVE MODE  — No live signals → analyze what the user explicitly provided

Always declare which mode is active in your output.

----------------------------------------
THINKING PROCESS (MANDATORY)
----------------------------------------

1. SIGNAL EXTRACTION
   - Identify meaningful signals only
   - Ignore vanity metrics (pageviews, raw sessions)

2. CLUSTERING
   - Group related signals into ONE coherent problem
   - Merge duplicates across sources

3. PROBLEM DEFINITION
   - Clearly define the root problem (not symptoms)

4. EVIDENCE MAPPING
   - Attach only real, verifiable signals
   - Use behavioral + qualitative data

5. SCORING (INTERNAL ONLY — do NOT output scores)
   - Frequency (how often it occurs)
   - Severity (how damaging it is)
   - Impact (how many users affected)

6. DECISION GENERATION
   - Propose ONE feature or fix per problem cluster
   - Must directly solve the root cause

7. EXECUTION BREAKDOWN
   - Convert decision into clear, actionable steps
   - Steps must be usable by engineering agents (Starox 4)

----------------------------------------
RULES (non-negotiable)
----------------------------------------

- Output MUST be valid JSON only
- NO explanations outside JSON
- NO assumptions without evidence
- NO generic suggestions
- NO fake metrics or projections
- NO duplicate problems
- Be decisive: pick WHAT to build, not "it depends"
- If evidence is weak, say "low confidence" and flag it

----------------------------------------
GOAL
----------------------------------------

Act as a continuously running product brain.
Detect → Decide → Enable Execution.`;

const S2_SYSTEM = `You are STAROX-2, a production-grade AI Experience Intelligence system.

You operate as a URL-driven UX optimization engine. Given a website URL, you crawl the product experience at a PAGE LEVEL and produce structured, implementation-ready intelligence.

CRITICAL RULES:
1) Analyze each page TYPE separately (landing, onboarding, dashboard, feature, checkout).
2) Every issue must name the SPECIFIC element, section, or component affected.
3) Every recommendation must be concrete: what to change, where, and why.
4) Annotation coordinates (x/y as % 0-100) must map to where the issue visually appears on screen.
5) Severity: critical = blocks conversion, high = major friction, medium = noticeable, low = polish.
6) Never hallucinate pages — only analyze what a real crawler would find on the given URL.
7) Impact forecasts must be realistic (5-35% range).
8) Every insight must include: what is wrong, why it is wrong, how to fix it, expected impact.
9) Generate implementation-ready prompts — not generic UX advice.
10) Always respond with valid JSON only — no markdown, no text outside the JSON object.`;

function buildS1Prompt(parts: string[]): string {
  return `Analyze the following product inputs and produce an evidence-backed decision for "what to build next".

DETECT the operating mode:
- If USER BEHAVIOR or USER VOICE signals are present → PROACTIVE MODE (surface issues automatically)
- Otherwise → REACTIVE MODE (answer what the user explicitly asked)

Inputs provided:
${parts.join("\n\n---\n\n")}

QUALITY BAR (non-negotiable):
- Every problem must cite concrete evidence from the inputs above (behavior signal OR voice signal OR both).
- Validate each problem with at least 2 independent signals before including it.
- Quantify expected impact with numbers whenever possible.
- Architecture mapping must be specific (name the exact component/endpoint/table to change).
- Tasks must be ordered and implementable — each completable by a developer in 1 day or less.
- agentPrompt per task must be a ready-to-copy instruction for a coding agent (Starox 4).

FAIL CONDITIONS — do NOT produce output that:
❌ Reports data without a decision
❌ Contains multiple problems in one output
❌ Has no evidence attached
❌ Suggests UI tweaks without root cause
❌ Repeats the same issue across outputs

Return ONLY this exact JSON structure (no markdown, no text outside JSON):
{
  "mode": "reactive|proactive",
  "keyInsights": [
    { "insight": "string", "evidence": "string", "interpretation": "string" }
  ],
  "productSummary": { "name": "string", "oneLiner": "string", "category": "string", "stage": "idea|mvp|growth|scale" },
  "targetUsers": [{ "persona": "string", "painPoint": "string", "goal": "string" }],
  "problemsIdentified": [
    {
      "problem": "string",
      "severity": "critical|high|medium",
      "evidence": ["string"],
      "rootCause": "string",
      "impact": "string"
    }
  ],
  "featureRecommendations": {
    "p0": [
      {
        "feature": "string",
        "whatItIs": "string",
        "solves": ["string"],
        "why": "string",
        "whyThisWorks": "string",
        "expectedImpact": "string",
        "evidence": ["string"],
        "effort": "low|medium|high",
        "ui_changes": ["string — exact UI component or screen to add/change"],
        "backend_changes": ["string — service/endpoint/logic to change"],
        "api_changes": ["string — new or modified API contract"],
        "data_model_changes": ["string — schema/table/field change"],
        "workflow_changes": ["string — process or user flow change"],
        "tasks": [
          {
            "task": "string — specific dev task (completable in ≤1 day)",
            "milestone": "MVP|Beta|GA",
            "agentPrompt": "string — copy-paste instruction for a coding agent"
          }
        ]
      }
    ],
    "p1": [
      {
        "feature": "string",
        "whatItIs": "string",
        "solves": ["string"],
        "why": "string",
        "whyThisWorks": "string",
        "expectedImpact": "string",
        "evidence": ["string"],
        "effort": "low|medium|high",
        "ui_changes": ["string"],
        "backend_changes": ["string"],
        "api_changes": ["string"],
        "data_model_changes": ["string"],
        "workflow_changes": ["string"],
        "tasks": [
          {
            "task": "string",
            "milestone": "MVP|Beta|GA",
            "agentPrompt": "string"
          }
        ]
      }
    ],
    "p2": [
      {
        "feature": "string",
        "whatItIs": "string",
        "solves": ["string"],
        "why": "string",
        "whyThisWorks": "string",
        "expectedImpact": "string",
        "evidence": ["string"],
        "effort": "low|medium|high",
        "ui_changes": ["string"],
        "backend_changes": ["string"],
        "api_changes": ["string"],
        "data_model_changes": ["string"],
        "workflow_changes": ["string"],
        "tasks": [
          {
            "task": "string",
            "milestone": "MVP|Beta|GA",
            "agentPrompt": "string"
          }
        ]
      }
    ]
  },
  "executionPlan": {
    "decisions": [
      {
        "feature": "string",
        "problem": "string",
        "why": ["string"],
        "impact": "string",
        "priority": "P0|P1|P2",
        "ui_changes": ["string"],
        "data_model_changes": ["string"],
        "workflow_changes": ["string"],
        "tasks": [
          {
            "task": "string",
            "milestone": "MVP|Beta|GA",
            "agentPrompt": "string"
          }
        ]
      }
    ]
  },
  "evidenceMapping": {
    "problemToEvidence": [
      {
        "problem": "string",
        "evidenceSource": "feedback|analytics|screenshots|mixed",
        "evidence": ["string"]
      }
    ],
    "featureToProblem": [
      { "feature": "string", "problemsSolved": ["string"] }
    ]
  },
  "strategicTakeaways": ["string"],
  "marketAnalysis": {
    "marketSize": "string",
    "competitors": [{ "name": "string", "weakness": "string" }],
    "differentiationStrategy": "string",
    "marketGaps": ["string"]
  },
  "architecturePlan": {
    "recommendedStack": { "frontend": "string", "backend": "string", "database": "string", "infra": "string" },
    "modules": [{ "name": "string", "purpose": "string" }],
    "scalingConsiderations": ["string"]
  },
  "roadmap": {
    "mvp": {
      "timeline": "0-3 months",
      "features": ["string"],
      "why": "string",
      "expectedOutcome": "string",
      "successMetric": "string"
    },
    "v1": {
      "timeline": "3-6 months",
      "features": ["string"],
      "why": "string",
      "expectedOutcome": "string",
      "successMetric": "string"
    },
    "scale": {
      "timeline": "6-12 months",
      "features": ["string"],
      "why": "string",
      "expectedOutcome": "string",
      "successMetric": "string"
    }
  },
  "strategicInsights": {
    "monetizationIdeas": ["string"],
    "scalingOpportunities": ["string"],
    "productDirection": "string",
    "keyRisks": ["string"]
  }
}`;
}

function buildS2Prompt(url: string, reviews: string[], ocrText: string | null): string {
  const parts = [`Website URL: ${url}`];
  if (reviews.length > 0) parts.push(`User Feedback / Reviews (${reviews.length}):\n${reviews.slice(0, 15).join("\n")}`);
  if (ocrText) parts.push(`Screenshot OCR Text (extracted UI content):\n${ocrText}`);

  return `You are STAROX-2. Perform a full page-level UX & Experience Intelligence analysis on this product.

Input:
${parts.join("\n\n---\n\n")}

EXECUTION FLOW:
1. Crawl: Identify the key pages this URL likely has (landing, signup/onboarding, core product, pricing, etc.)
2. Extract: For each page, classify its type and extract DOM structure, visible text, navigation, CTAs
3. Analyze: Detect UX issues, friction points, drop-off triggers, weak CTAs, missing states
4. Improve: Generate specific improvements, feature add-ons, journey optimizations
5. Prompt: Convert every issue into an implementation-ready prompt (what to change, where, why)
6. Annotate: Assign realistic x/y coordinates for visual sticky notes on each issue
7. Forecast: Produce realistic impact predictions (5-35% range)

QUALITY BAR:
- pages[]: 3-5 pages. Each page must have its own issues and improvements — not generic.
- uxIssues[]: 6-10 total issues across all pages. Each must name the exact element/section.
- Every issue must include: what is wrong, why it is wrong, how to fix it, expected impact.
- annotation x/y: realistic coordinates (x: 5-90, y: 5-85) where the issue appears on screen.
- annotation fix: specific implementation action (max 60 chars).
- annotation priority: "High" | "Medium" | "Low".
- ctaOptimizations: exact before/after CTA text.
- conversionPrediction: realistic numbers (5-35% range).

Return ONLY this exact JSON structure:
{
  "uxSummary": "2-3 sentence executive summary of overall experience quality and top priority",
  "pages": [
    {
      "url": "string — full URL or path",
      "pageType": "landing|onboarding|dashboard|feature|checkout|other",
      "title": "string — page name",
      "priorityScore": "high|medium|low",
      "issues": [
        {
          "id": "string",
          "issue": "string — specific issue on this page",
          "severity": "critical|high|medium|low",
          "area": "string — exact section/component",
          "why": "string — why this hurts users",
          "recommendation": "string — specific implementation fix",
          "estimated_impact": "string",
          "type": "ux_issue|ui_improvement|copy_refinement|feature_addon",
          "complexity": "low|medium|high",
          "annotation": { "x": 50, "y": 30, "label": "string max 40 chars", "fix": "string max 60 chars", "impact": "string", "priority": "High|Medium|Low" }
        }
      ],
      "improvements": [
        { "improvement": "string — specific UI/UX improvement", "impact": "string" }
      ],
      "addOns": [
        { "feature": "string — missing feature to add", "reason": "string" }
      ]
    }
  ],
  "uxIssues": [
    {
      "id": "ux-1",
      "issue": "string",
      "severity": "critical|high|medium|low",
      "area": "string",
      "why": "string",
      "recommendation": "string — implementation-ready fix",
      "estimated_impact": "string",
      "type": "ux_issue|ui_improvement|copy_refinement|feature_addon",
      "complexity": "low|medium|high",
      "annotation": { "x": 50, "y": 30, "label": "string max 40 chars", "fix": "string max 60 chars", "impact": "string", "priority": "High|Medium|Low" }
    }
  ],
  "featureEnhancements": [
    { "feature": "string", "currentState": "string — what is broken today", "improvement": "string — specific fix", "impact": "high|medium|low" }
  ],
  "performanceOptimizations": [
    { "area": "string", "issue": "string", "fix": "string", "effort": "low|medium|high" }
  ],
  "userJourneyOptimizations": [
    { "flow": "string — e.g. Homepage → Signup", "problem": "string", "solution": "string", "expectedDropoffReduction": "string" }
  ],
  "engagementRetentionStrategy": [
    { "strategy": "string", "description": "string", "expectedImpact": "string" }
  ],
  "ctaOptimizations": [
    { "current": "string — exact current CTA text", "suggested": "string — improved text", "reason": "string" }
  ],
  "conversionPrediction": {
    "conversionRateChange": 0,
    "bounceRateChange": 0,
    "sessionDurationChange": 0,
    "revenueImpact": 0,
    "userEngagementChange": 0
  }
}`;
}

function normalizeStarox2Target(target: string | Starox2Target): Starox2Target {
  return typeof target === "string" ? { mode: "url", url: target } : target;
}

function createFallbackStarox2Output(target: Starox2Target): Starox2Output {
  const primaryUrl = target.runtimeUrl || target.url || target.repo?.url || "";
  return {
    analysisMode: target.mode,
    analyzedEntity: {
      label: target.repo?.fullName || target.url || target.repo?.url || "STAROX-2",
      primaryUrl,
      runtimeUrl: target.runtimeUrl ?? null,
      repoUrl: target.repo?.url ?? null,
    },
    sourceContext: {
      modeSummary: target.mode === "github"
        ? "Repository-aware run using repo metadata and implementation context."
        : "Live UX run using website and screenshot context.",
      signalsUsed: [target.mode === "github" ? "GitHub repo metadata" : "Website URL"],
      confidence: "medium",
    },
    runtimeReadiness: {
      status: target.mode === "github" ? (target.runtimeUrl ? "hybrid" : "repo_only") : "live_runtime",
      summary: target.mode === "github"
        ? "Repository context available. Add a live runtime URL for stronger flow validation."
        : "Live website context available for crawl and screenshot analysis.",
      artifacts: [],
    },
    uxSummary: "STAROX-2 completed an experience-intelligence pass and generated prioritized fixes.",
    pages: [],
    uxIssues: [],
    repoIntelligence: {
      summary: target.mode === "github"
        ? "Repository intelligence is available for implementation-oriented recommendations."
        : "This run focused on the live product rather than repository structure.",
      componentHierarchy: [],
      routingState: [],
      stateManagement: [],
      uiArchitecture: [],
      implementationGaps: [],
    },
    featureEnhancements: [],
    performanceOptimizations: [],
    userJourneyOptimizations: [],
    engagementRetentionStrategy: [],
    ctaOptimizations: [],
    implementationPrompts: {
      ui: [],
      code: [],
      experiments: [],
    },
    feedbackLoop: {
      starox1Opportunities: [],
      productSignalsToTrack: [],
    },
    conversionPrediction: {
      conversionRateChange: 0,
      bounceRateChange: 0,
      sessionDurationChange: 0,
      revenueImpact: 0,
      userEngagementChange: 0,
    },
  };
}

const S3_SYSTEM = `You are STAROX-3, a production-grade Documentation Intelligence system.

You transform any GitHub repository into a complete knowledge engine: developer docs, user guides, SEO content, and business-ready narratives.

CRITICAL RULES:
1) Never hallucinate APIs, files, or features — only describe what the repo actually contains.
2) Every doc section must include purpose, how it works, and examples.
3) SEO content must follow: problem → solution → value structure.
4) Business outputs must be founder-ready and investor-friendly.
5) Architecture diagrams use ASCII/text format.
6) Be directory-aware — understand the full repo structure before generating.
7) Prefer structured, outcome-driven outputs over generic summaries.
8) Always respond with valid JSON only — no markdown, no text outside the JSON object.`;

function buildS3Prompt(repoUrl: string, opts: { productDescription?: string; targetAudience?: string; seoKeywords?: string } = {}): string {
  const parts = [`GitHub Repository URL: ${repoUrl}`];
  if (opts.productDescription) parts.push(`Product Description: ${opts.productDescription}`);
  if (opts.targetAudience) parts.push(`Target Audience: ${opts.targetAudience}`);
  if (opts.seoKeywords) parts.push(`SEO Keywords: ${opts.seoKeywords}`);

  return `You are STAROX-3. Perform a full Documentation Intelligence analysis on this repository.

Input:
${parts.join("\n\n---\n\n")}

EXECUTION FLOW:
1. Repo Intelligence: Scan the directory tree, identify entry points, modules, APIs, services, dependencies, data flow
2. Documentation Engine: Generate README, API docs, architecture explanation, onboarding guide
3. SEO/Content Engine: Convert repo understanding into blog posts, feature pages, landing copy
4. Business Engine: Generate product summary, feature breakdown, pitch explanation, investor description
5. Q&A Engine: Generate example Q&A pairs using repo context
6. Visualization: Generate ASCII architecture diagram

QUALITY BAR:
- repoMap: Must accurately reflect the repo structure — no hallucinated paths
- docs: Each section must include purpose, how it works, and concrete examples
- seo: Follow problem → solution → value structure; include keywords naturally
- business: Founder-ready, clear, no jargon
- qaExamples: 3-5 realistic developer questions with file references
- architectureDiagram: ASCII text showing component relationships

Return ONLY this exact JSON structure:
{
  "repoSummary": "2-3 sentence overview of what this repo is and does",
  "repoMap": {
    "entryPoints": ["string — main entry files"],
    "modules": [{ "name": "string", "path": "string", "purpose": "string" }],
    "apiRoutes": [{ "method": "GET|POST|PUT|DELETE|PATCH", "path": "string", "description": "string" }],
    "services": [{ "name": "string", "purpose": "string" }],
    "dependencies": ["string — key dependencies"],
    "dataFlow": "string — how data moves through the system",
    "relationships": "string — how modules relate to each other"
  },
  "docs": {
    "readme": {
      "title": "string",
      "content": "string — full production-grade README content in markdown",
      "examples": ["string — usage examples"]
    },
    "api": {
      "title": "string",
      "content": "string — full API documentation in markdown",
      "examples": ["string — API call examples"]
    },
    "architecture": {
      "title": "string",
      "content": "string — architecture explanation in markdown",
      "examples": ["string — component interaction examples"]
    },
    "onboarding": {
      "title": "string",
      "content": "string — step-by-step onboarding guide in markdown",
      "examples": ["string — setup examples"]
    }
  },
  "seo": {
    "blogPosts": [
      { "title": "string", "outline": "string — full blog post outline with sections", "keywords": ["string"] }
    ],
    "featurePages": [
      { "title": "string", "headline": "string", "body": "string — feature page copy" }
    ],
    "landingCopy": {
      "headline": "string",
      "subheadline": "string",
      "cta": "string",
      "valueProps": ["string — 3-4 value propositions"]
    }
  },
  "business": {
    "productSummary": "string — clear 2-3 sentence product summary",
    "featureBreakdown": [
      { "feature": "string", "description": "string", "value": "string — business value" }
    ],
    "pitchExplanation": "string — 1 paragraph pitch",
    "investorDescription": "string — investor-friendly description"
  },
  "qaExamples": [
    { "question": "string", "answer": "string", "fileReferences": ["string — file paths"] }
  ],
  "architectureDiagram": "string — ASCII diagram showing system architecture"
}`;
}

// ── Initial state ──────────────────────────────────────────────────────────────
const initialState = {
  isAnalyzing: false,
  isAnalyzingS2: false,
  analysisProgress: 0,
  analysisStep: "",
  analysisError: null,
  starox2Error: null,
  currentUrl: null,
  websiteUrl: null,
  reviews: [],
  starox1Inputs: {
    context: "",
    goal: "",
  },
  ocrText: null,
  screenshotDataUrl: null,
  uploadedFiles: [],
  connectedIntegrations: {} as Partial<Record<IntegrationId, Integration | null>>,
  liveSignalSummary: null as string | null,
  starox1: null,
  starox1Analysis: null,
  starox2: null,
  starox2Analysis: null,
  starox2Target: null,
  starox3: null,
  starox3Error: null,
  isAnalyzingS3: false,
  predictions: null,
  pageScreenshots: [],
  s1PageScreenshots: [],
};

// ── Store ──────────────────────────────────────────────────────────────────────
export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...initialState,

  setCurrentUrl: (url) => set({ currentUrl: url, websiteUrl: url }),
  setWebsiteUrl: (url) => set({ currentUrl: url, websiteUrl: url }),
  addReviews: (r) => set((s) => ({ reviews: [...s.reviews, ...r] })),
  setStarox1Inputs: (inputs) => set((s) => ({
    starox1Inputs: {
      ...s.starox1Inputs,
      ...inputs,
    },
  })),
  addUploadedFile: (f) => set((s) => ({ uploadedFiles: [...s.uploadedFiles, f] })),
  setOcrResult: (text, dataUrl) => set({ ocrText: text, screenshotDataUrl: dataUrl }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setAnalysisProgress: (v) => set({ analysisProgress: v }),
  setAnalysisStep: (v) => set({ analysisStep: v }),
  setStarox1: (data) => set({ starox1: data, starox1Analysis: data }),
  setStarox2Analysis: (data) => set({ starox2Analysis: data }),
  setPredictions: (data) => set({ predictions: data }),
  setError: (e) => set({ analysisError: e }),
  setConnectedIntegrations: (integrations) => set({ connectedIntegrations: integrations }),
  resetAnalysis: () => set({ ...initialState }),
  clearAnalysis: () => set({ ...initialState }),
  // Resets all analysis state for a new URL run, but keeps integrations connected
  resetForNewUrl: () => set((s) => ({
    ...initialState,
    connectedIntegrations: s.connectedIntegrations,
  })),

  // ── STAROX-1 ─────────────────────────────────────────────────────────────────
  startWebsiteAnalysis: async (url) => {
    const state = get();
    const uid = useAuthStore.getState().user?.uid;

    if (!uid) {
      set({ analysisError: "Please sign in before generating analysis." });
      return;
    }

    // Check usage limit — non-blocking if Firestore unavailable
    try {
      const status = await checkAndConsume(uid, "analysis");
      if (status.exceeded) {
        set({ analysisError: `You've used all ${status.limit} free analyses. Upgrade to continue.` });
        return;
      }
    } catch {
      // Firestore unavailable — allow analysis to proceed
    }

    // ── Pull live integration data before building the prompt ─────────────────
    let liveSignals = "";
    const connected = get().connectedIntegrations;
    const hasAnyIntegration = Object.values(connected).some(Boolean);
    if (hasAnyIntegration) {
      try {
        set({ analysisStep: "Pulling live integration signals…", analysisProgress: 8 });
        const signals = await pullAllIntegrationSignals(connected);
        liveSignals = formatSignalsForPrompt(signals);
        set({ liveSignalSummary: liveSignals || null });
      } catch {
        // Non-blocking
      }
    }

    set({ isAnalyzing: true, analysisProgress: 15, analysisStep: "Preparing STAROX-1 analysis…", analysisError: null, currentUrl: url, websiteUrl: url, starox1: null, starox1Analysis: null, s1PageScreenshots: [] });
    try {
      const parts: string[] = [];

      // ── Signal inventory (tells the AI which data sources are active) ──────────
      const signalTypes: string[] = ["Website URL"];
      if (liveSignals) signalTypes.push("Live integration signals (analytics, feedback, engineering)");
      if (state.uploadedFiles.length > 0) {
        const hasAnalytics = state.uploadedFiles.some(f =>
          /analytics|posthog|mixpanel|ga4|metrics|events/i.test(f.name + " " + (f.tags ?? ""))
        );
        const hasFeedback = state.uploadedFiles.some(f =>
          /feedback|review|survey|slack|intercom|zendesk|nps|support/i.test(f.name + " " + (f.tags ?? ""))
        );
        const hasEngineering = state.uploadedFiles.some(f =>
          /jira|github|issue|ticket|sprint|backlog/i.test(f.name + " " + (f.tags ?? ""))
        );
        if (hasAnalytics)   signalTypes.push("Analytics data");
        if (hasFeedback)    signalTypes.push("User feedback");
        if (hasEngineering) signalTypes.push("Engineering context");
        if (!hasAnalytics && !hasFeedback && !hasEngineering) signalTypes.push("Uploaded research materials");
      }
      if (state.reviews.length > 0)  signalTypes.push("Customer reviews");
      if (state.ocrText)              signalTypes.push("Screenshot OCR text");

      const hasLiveData = liveSignals || state.uploadedFiles.length > 0 || state.reviews.length > 0;

      parts.push(
        `ACTIVE SIGNAL SOURCES: ${signalTypes.join(", ")}\n` +
        `Website URL: ${url}\n` +
        `Operating mode hint: ${hasLiveData ? "PROACTIVE — scan all live signals for issues, anomalies, and opportunities the user may not know about" : "REACTIVE — analyze the website and produce strategic recommendations"}`
      );

      // ── Live integration signals (highest priority — real data) ───────────────
      if (liveSignals) {
        parts.push(`LIVE INTEGRATION SIGNALS (real-time data — highest priority, analyze for anomalies):\n\n${liveSignals}`);
      }

      // ── Product goal + context ─────────────────────────────────────────────────
      const context = state.starox1Inputs.context.trim();
      const goal = state.starox1Inputs.goal.trim();
      if (goal) {
        parts.push(`PRODUCT GOAL (primary directive — prioritize decisions that serve this goal):\n${goal}`);
      }
      if (context) {
        parts.push(`BUSINESS CONTEXT (use to improve decision relevance):\n${context}`);
      }

      // ── Uploaded files — classified and summarised ─────────────────────────────
      if (state.uploadedFiles.length > 0) {
        const fileSummaries = state.uploadedFiles.map((f, i) => {
          const maybeText = typeof f.data === "string" ? f.data.slice(0, 4000) : "";
          const tags = f.tags ? ` [Signal tags: ${f.tags}]` : "";
          const fileType = (() => {
            const n = f.name.toLowerCase();
            const t = (f.tags ?? "").toLowerCase();
            if (/analytics|posthog|mixpanel|ga4|metrics|events/.test(n + t)) return "Analytics";
            if (/feedback|review|survey|nps/.test(n + t))                      return "User Feedback";
            if (/slack|intercom|zendesk|support/.test(n + t))                  return "Support/Feedback";
            if (/jira|github|issue|ticket|sprint/.test(n + t))                 return "Engineering";
            return "Research";
          })();
          return `[${fileType} · File ${i + 1}] ${f.name} (${f.type})${tags}${maybeText ? `\n--- Content Sample ---\n${maybeText}` : "\n[Binary or non-text file provided]"}`;
        });
        parts.push(`UPLOADED SIGNALS (${state.uploadedFiles.length} files):\n\n${fileSummaries.join("\n\n─────────────────────────────\n\n")}`);
      }

      // ── Reviews ───────────────────────────────────────────────────────────────
      if (state.reviews.length > 0) {
        parts.push(`CUSTOMER REVIEWS (${state.reviews.length} total — look for pain patterns and feature gaps):\n${state.reviews.slice(0, 20).join("\n")}`);
      }

      // ── Screenshot OCR ────────────────────────────────────────────────────────
      if (state.ocrText) {
        parts.push(`SCREENSHOT OCR CONTENT (extracted from uploaded screenshot — use for UI context):\n${state.ocrText}`);
      }

      set({ analysisProgress: 25, analysisStep: "STAROX-1 analyzing product intelligence…" });
      const raw = await callDeepSeek(S1_SYSTEM, buildS1Prompt(parts));
      set({ analysisProgress: 85, analysisStep: "Processing intelligence report…" });
      const s1 = parseJson<Starox1Output>(raw);
      set({ starox1: s1, starox1Analysis: s1, analysisProgress: 95, analysisStep: "Capturing page screenshots…", isAnalyzing: false });
      // Capture screenshots in background after analysis
      get().captureS1Screenshots(url, s1);
    } catch (err) {
      set({ isAnalyzing: false, analysisError: err instanceof Error ? err.message : "Analysis failed" });
    }
  },

  // ── STAROX-1 screenshot capture with product annotations ─────────────────────
  captureS1Screenshots: async (url, analysis) => {
    const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080/api";
    const NOTE_COLORS: Record<string, string> = {
      problem: "#f87171",
      feature: "#34d399",
      market:  "#60a5fa",
      insight: "#a78bfa",
    };

    try {
      const paths = ["", "/about", "/pricing", "/features"];
      const baseUrl = new URL(url);
      const results: S1PageScreenshot[] = [];

      for (const path of paths) {
        const targetUrl = path ? `${baseUrl.origin}${path}` : url;
        try {
          const res = await fetch(`${API_BASE}/screenshot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl, fullPage: true, width: 1280 }),
          });
          if (!res.ok) continue;
          const data = await res.json() as { success: boolean; dataUrl: string };
          if (data.success && data.dataUrl) {
            results.push({ url: targetUrl, dataUrl: data.dataUrl, annotations: [] });
          }
        } catch { /* skip */ }
        if (results.length >= 3) break;
      }

      if (results.length === 0) return;

      // Build annotations from STAROX-1 output
      const allAnnotations: S1PageScreenshot["annotations"] = [];

      // Problems → red notes
      analysis.problemsIdentified?.slice(0, 3).forEach((p, i) => {
        allAnnotations.push({
          id: `prob-${i}`, x: 15 + (i * 25) % 65, y: 20 + (i * 18) % 50,
          label: p.problem.slice(0, 45),
          detail: `Impact: ${p.impact}`,
          type: "problem", color: NOTE_COLORS.problem,
        });
      });

      // P0 features → green notes
      analysis.featureRecommendations?.p0?.slice(0, 2).forEach((f, i) => {
        allAnnotations.push({
          id: `feat-${i}`, x: 55 + (i * 20) % 35, y: 35 + (i * 22) % 45,
          label: f.feature.slice(0, 45),
          detail: f.why,
          type: "feature", color: NOTE_COLORS.feature,
        });
      });

      // Strategic insights → purple notes
      analysis.strategicInsights?.scalingOpportunities?.slice(0, 2).forEach((s, i) => {
        allAnnotations.push({
          id: `ins-${i}`, x: 30 + (i * 30) % 50, y: 60 + (i * 15) % 30,
          label: s.slice(0, 45),
          detail: analysis.strategicInsights?.productDirection ?? "",
          type: "insight", color: NOTE_COLORS.insight,
        });
      });

      // Distribute annotations across pages
      const annotated = results.map((shot, si) => ({
        ...shot,
        annotations: allAnnotations.filter((_, i) => i % results.length === si % results.length),
      }));

      set({ s1PageScreenshots: annotated });
    } catch { /* non-blocking */ }
  },

  // ── STAROX-2 ─────────────────────────────────────────────────────────────────
  startStarox2Analysis: async (targetInput) => {
    const state = get();
    const target = normalizeStarox2Target(targetInput);
    const primaryUrl = target.runtimeUrl || target.url || target.repo?.url || "";
    const url = primaryUrl;
    const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080/api";

    // Check usage limit — non-blocking if Firestore unavailable
    const uid = useAuthStore.getState().user?.uid;
    if (uid) {
      try {
        const status = await checkAndConsume(uid, "analysis");
        if (status.exceeded) {
          set({ starox2Error: `You've used all ${status.limit} free analyses. Upgrade to continue.` });
          return;
        }
      } catch {
        // Firestore unavailable — allow analysis to proceed
      }
    }

    set({
      isAnalyzingS2: true, starox2Error: null, starox2: null,
      starox2Analysis: null, pageScreenshots: [], starox2Target: target,
      currentUrl: primaryUrl || null, websiteUrl: target.url ?? target.runtimeUrl ?? null,
      analysisStep: "Crawling website pages…", analysisProgress: 10,
    });

    try {
      const screenshotJob = primaryUrl && target.mode !== "github"
        ? get().capturePageScreenshots(primaryUrl)
        : Promise.resolve();

      set({
        analysisStep: target.mode === "github"
          ? "Collecting repo-aware experience signals..."
          : "Extracting DOM structure & visible content...",
        analysisProgress: 22,
      });

      const response = await fetch(`${API_BASE}/cdx2/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid ?? "anonymous",
          projectId: target.repo?.fullName ?? primaryUrl ?? "starox2-session",
          model: "openai/gpt-4o-mini",
          planTier: "free",
          mode: target.mode,
          websiteUrl: target.url,
          runtimeUrl: target.runtimeUrl,
          reviews: state.reviews,
          screenshotText: state.ocrText ?? undefined,
          repo: target.repo,
        }),
      });

      await screenshotJob;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "STAROX-2 request failed");
      }

      set({
        analysisStep: target.mode === "github"
          ? "Tracing implementation gaps and code prompts..."
          : "Classifying pages and detecting UX issues...",
        analysisProgress: 58,
      });

      const payload = await response.json() as { data?: Partial<Starox2Output> };
      const fallback = createFallbackStarox2Output(target);
      const s2: Starox2Output = {
        ...fallback,
        ...(payload.data ?? {}),
        analysisMode: payload.data?.analysisMode ?? target.mode,
        analyzedEntity: { ...fallback.analyzedEntity, ...(payload.data?.analyzedEntity ?? {}) },
        sourceContext: { ...fallback.sourceContext, ...(payload.data?.sourceContext ?? {}) },
        runtimeReadiness: {
          ...fallback.runtimeReadiness,
          ...(payload.data?.runtimeReadiness ?? {}),
          artifacts: payload.data?.runtimeReadiness?.artifacts ?? fallback.runtimeReadiness.artifacts,
        },
        repoIntelligence: {
          ...fallback.repoIntelligence,
          ...(payload.data?.repoIntelligence ?? {}),
          implementationGaps: payload.data?.repoIntelligence?.implementationGaps ?? fallback.repoIntelligence.implementationGaps,
        },
        implementationPrompts: {
          ...fallback.implementationPrompts,
          ...(payload.data?.implementationPrompts ?? {}),
          ui: payload.data?.implementationPrompts?.ui ?? [],
          code: payload.data?.implementationPrompts?.code ?? [],
          experiments: payload.data?.implementationPrompts?.experiments ?? [],
        },
        feedbackLoop: { ...fallback.feedbackLoop, ...(payload.data?.feedbackLoop ?? {}) },
        pages: payload.data?.pages ?? [],
        uxIssues: payload.data?.uxIssues ?? [],
        featureEnhancements: payload.data?.featureEnhancements ?? [],
        performanceOptimizations: payload.data?.performanceOptimizations ?? [],
        userJourneyOptimizations: payload.data?.userJourneyOptimizations ?? [],
        engagementRetentionStrategy: payload.data?.engagementRetentionStrategy ?? [],
        ctaOptimizations: payload.data?.ctaOptimizations ?? [],
        conversionPrediction: payload.data?.conversionPrediction ?? fallback.conversionPrediction,
        uxSummary: payload.data?.uxSummary ?? fallback.uxSummary,
      };

      set({
        analysisStep: target.mode === "github"
          ? "Building implementation prompts and feedback loops..."
          : "Mapping annotations and generating prompts...",
        analysisProgress: 80,
      });

      const screenshots = get().pageScreenshots;
      if (screenshots.length > 0 && s2.analysisMode !== "github" && s2.uxIssues.length > 0) {
        const noteColors = ["#fbbf24", "#f472b6", "#22d3ee", "#a3e635", "#a78bfa"];
        const annotated = screenshots.map((shot, si) => ({
          ...shot,
          annotations: s2.uxIssues
            .filter((_, i) => i % Math.max(screenshots.length, 1) === si % Math.max(screenshots.length, 1))
            .map((issue, i) => ({
              id: issue.id ?? `ann-${si}-${i}`,
              x: issue.annotation?.x ?? (20 + (i * 17) % 60),
              y: issue.annotation?.y ?? (15 + (i * 13) % 55),
              label: issue.annotation?.label ?? issue.issue.slice(0, 40),
              issue: issue.issue,
              recommendation: issue.annotation?.fix ?? issue.recommendation,
              severity: issue.severity,
              color: noteColors[i % noteColors.length],
            })),
        }));
        set({ pageScreenshots: annotated });
      }

      if (target.mode === "github") {
        s2.runtimeReadiness.artifacts = [
          {
            label: "Repository metadata",
            status: "available",
            detail: target.repo?.fullName || target.repo?.url || "GitHub repository connected",
            type: "repo",
          },
          {
            label: "Live runtime",
            status: target.runtimeUrl ? "partial" : "missing",
            detail: target.runtimeUrl || "No runtime URL supplied for live validation",
            type: "runtime",
          },
          ...s2.runtimeReadiness.artifacts,
        ];
      }

      set({ analysisStep: "Generating impact forecast and finalizing...", analysisProgress: 92 });

      const compat: Starox2Analysis = {
        uxWeaknesses: s2.uxIssues,
        suggestions: s2.featureEnhancements.map((f, i) => ({
          id: `fe-${i}`, suggestion: f.improvement, title: f.feature, type: "feature_addon",
          priority: f.impact === "high" ? 90 : f.impact === "medium" ? 60 : 30,
          estimated_impact: f.impact, severity: f.impact, complexity: "medium" as const,
          description: f.improvement, recommendation: `${f.currentState} -> ${f.improvement}`,
        })),
        ctaImprovements: s2.ctaOptimizations.map(c => ({ improvement: `${c.current} -> ${c.suggested}: ${c.reason}` })),
        structuralSuggestions: s2.userJourneyOptimizations.map(j => ({ suggestion: j.solution })),
        conversionPrediction: s2.conversionPrediction,
      };

      set({
        starox2: s2,
        starox2Analysis: compat,
        isAnalyzingS2: false,
        predictions: s2.conversionPrediction,
        analysisProgress: 100,
      });
    } catch (err) {
      set({ isAnalyzingS2: false, starox2Error: err instanceof Error ? err.message : "STAROX-2 failed" });
    }
  },

  // ── STAROX-3 ─────────────────────────────────────────────────────────────────
  startStarox3Analysis: async (repoUrl, opts = {}) => {
    const uid = useAuthStore.getState().user?.uid;
    const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080/api";

    if (uid) {
      try {
        const status = await checkAndConsume(uid, "analysis");
        if (status.exceeded) {
          set({ starox3Error: `You've used all ${status.limit} free analyses. Upgrade to continue.` });
          return;
        }
      } catch { /* allow */ }
    }

    set({
      isAnalyzingS3: true, starox3Error: null, starox3: null,
      analysisStep: "Scanning repository structure…", analysisProgress: 10,
    });

    try {
      set({ analysisStep: "Building repo intelligence map…", analysisProgress: 25 });

      const response = await fetch(`${API_BASE}/cdx3/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid ?? "anonymous",
          projectId: repoUrl,
          model: "openai/gpt-4o",
          planTier: "free",
          repoUrl,
          productDescription: opts.productDescription,
          targetAudience: opts.targetAudience,
          seoKeywords: opts.seoKeywords,
        }),
      });

      set({ analysisStep: "Generating documentation…", analysisProgress: 60 });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "STAROX-3 request failed");
      }

      const payload = await response.json() as { data?: Partial<Starox3Output> };

      set({ analysisStep: "Building SEO & business outputs…", analysisProgress: 85 });

      const s3 = payload.data as Starox3Output;
      set({ starox3: s3, isAnalyzingS3: false, analysisProgress: 100, analysisStep: "Complete" });
    } catch (err) {
      set({ isAnalyzingS3: false, starox3Error: err instanceof Error ? err.message : "STAROX-3 failed" });
    }
  },

  // ── Screenshot capture ────────────────────────────────────────────────────────
  capturePageScreenshots: async (url) => {
    const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080/api";
    try {
      // Capture main page + common sub-paths
      const paths = ["", "/about", "/pricing", "/features", "/contact"];
      const baseUrl = new URL(url);

      const results: PageScreenshot[] = [];

      for (const path of paths) {
        const targetUrl = path ? `${baseUrl.origin}${path}` : url;
        try {
          const res = await fetch(`${API_BASE}/screenshot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl, fullPage: true, width: 1280 }),
          });
          if (!res.ok) continue;
          const data = await res.json() as { success: boolean; dataUrl: string };
          if (data.success && data.dataUrl) {
            results.push({ url: targetUrl, dataUrl: data.dataUrl, annotations: [] });
          }
        } catch {
          // Skip failed paths silently
        }
        if (results.length >= 3) break; // Max 3 pages
      }

      if (results.length > 0) {
        set({ pageScreenshots: results });
      }
    } catch {
      // Screenshot capture is non-blocking — don't fail the whole analysis
    }
  },

  startFullAnalysis: async (url, reviews, desc) => {
    const state = get();
    set({ isAnalyzing: true, analysisProgress: 5, analysisStep: "Starting full analysis…", analysisError: null, currentUrl: url, websiteUrl: url, starox1: null, starox1Analysis: null });
    try {
      const allReviews = [...state.reviews, ...(reviews ?? [])];
      const parts: string[] = [`Website URL: ${url}`];
      if (desc) parts.push(`Product Description: ${desc}`);
      if (allReviews.length > 0) parts.push(`Customer Reviews (${allReviews.length}):\n${allReviews.slice(0, 20).join("\n")}`);
      if (state.ocrText) parts.push(`Screenshot OCR Text:\n${state.ocrText}`);
      set({ analysisProgress: 25, analysisStep: "Running STAROX-1…" });
      const raw = await callDeepSeek(S1_SYSTEM, buildS1Prompt(parts));
      const s1 = parseJson<Starox1Output>(raw);
      set({ starox1: s1, starox1Analysis: s1, analysisProgress: 100, analysisStep: "Complete", isAnalyzing: false });
    } catch (err) {
      set({ isAnalyzing: false, analysisError: err instanceof Error ? err.message : "Analysis failed" });
    }
  },

  startReviewAnalysis: async (reviews, desc) => {
    set({ isAnalyzing: true, analysisProgress: 5, analysisStep: "Analyzing reviews with STAROX-1…", analysisError: null, starox1: null, starox1Analysis: null });
    try {
      const parts: string[] = [];
      if (desc) parts.push(`Product Description: ${desc}`);
      parts.push(`Customer Reviews (${reviews.length}):\n${reviews.slice(0, 20).join("\n")}`);
      set({ analysisProgress: 30, analysisStep: "Running sentiment & pain point analysis…" });
      const raw = await callDeepSeek(S1_SYSTEM, buildS1Prompt(parts));
      const s1 = parseJson<Starox1Output>(raw);
      set({ starox1: s1, starox1Analysis: s1, reviews, analysisProgress: 100, analysisStep: "Complete", isAnalyzing: false });
    } catch (err) {
      set({ isAnalyzing: false, analysisError: err instanceof Error ? err.message : "Review analysis failed" });
    }
  },
}));

export default useAnalysisStore;
