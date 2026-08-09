// ── STAROX-1: Product Intelligence prompt ─────────────────────────────────────
export function getCdx1Prompt(userPrompt: string): string {
  return `You are STAROX-1, an elite AI Product Manager. Analyze the following input and return a comprehensive Product Intelligence report as valid JSON only — no markdown, no explanation outside the JSON.

Input: ${userPrompt}

Return this exact JSON structure:
{
  "productSummary": {
    "name": "string",
    "oneLiner": "string",
    "category": "string",
    "stage": "idea|mvp|growth|scale"
  },
  "targetUsers": [
    { "persona": "string", "painPoint": "string", "goal": "string" }
  ],
  "problemsIdentified": [
    { "problem": "string", "severity": "critical|high|medium|low", "impact": "string" }
  ],
  "featureRecommendations": {
    "p0": [{ "feature": "string", "why": "string", "effort": "low|medium|high" }],
    "p1": [{ "feature": "string", "why": "string", "effort": "low|medium|high" }],
    "p2": [{ "feature": "string", "why": "string", "effort": "low|medium|high" }]
  },
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
    "mvp": { "timeline": "string", "features": ["string"], "successMetric": "string" },
    "v1": { "timeline": "string", "features": ["string"], "successMetric": "string" },
    "scale": { "timeline": "string", "features": ["string"], "successMetric": "string" }
  },
  "strategicInsights": {
    "monetizationIdeas": ["string"],
    "scalingOpportunities": ["string"],
    "productDirection": "string",
    "keyRisks": ["string"]
  }
}`;
}

// ── STAROX-2: UX & Improvement prompt ─────────────────────────────────────────
export function getCdx2Prompt(userPrompt: string): string {
  let parsed: {
    prompt?: string;
    mode?: "url" | "github";
    websiteUrl?: string;
    runtimeUrl?: string;
    reviews?: string[];
    screenshotText?: string;
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
  } = {};

  try {
    parsed = JSON.parse(userPrompt) as typeof parsed;
  } catch {
    parsed = { prompt: userPrompt, mode: "url" };
  }

  const mode = parsed.mode ?? "url";
  const repoDetails = parsed.repo
    ? [
        `Repository URL: ${parsed.repo.url}`,
        parsed.repo.fullName ? `Repository Name: ${parsed.repo.fullName}` : null,
        parsed.repo.description ? `Description: ${parsed.repo.description}` : null,
        parsed.repo.language ? `Primary Language: ${parsed.repo.language}` : null,
        parsed.repo.defaultBranch ? `Default Branch: ${parsed.repo.defaultBranch}` : null,
        parsed.repo.visibility ? `Visibility: ${parsed.repo.visibility}` : null,
        typeof parsed.repo.stars === "number" ? `Stars: ${parsed.repo.stars}` : null,
        typeof parsed.repo.forks === "number" ? `Forks: ${parsed.repo.forks}` : null,
        parsed.repo.updatedAt ? `Updated At: ${parsed.repo.updatedAt}` : null,
      ].filter(Boolean).join("\n")
    : "";

  const context = [
    parsed.websiteUrl ? `Website URL: ${parsed.websiteUrl}` : "",
    parsed.runtimeUrl ? `Runtime URL: ${parsed.runtimeUrl}` : "",
    repoDetails,
    parsed.reviews?.length
      ? `User Feedback / Reviews (${parsed.reviews.length}):\n${parsed.reviews.slice(0, 15).join("\n")}`
      : "",
    parsed.screenshotText ? `Screenshot OCR Text:\n${parsed.screenshotText}` : "",
    parsed.prompt ? `Additional User Context:\n${parsed.prompt}` : "",
  ].filter(Boolean).join("\n\n---\n\n");

  return `You are STAROX-2, a production-grade Experience Intelligence Agent.

Your core question:
"What is wrong in the current product, and how exactly do we fix it?"

Supported modes:
- URL mode: live product UX analysis
- GitHub mode: repo, UI architecture, and implementation analysis

Active mode: ${mode}

Context:
${context}

Rules:
1. Be concrete. Name exact pages, sections, components, flows, or files.
2. Do not hallucinate hidden pages or files. Infer carefully from the provided context only.
3. In URL mode, prioritize usability, navigation clarity, visual hierarchy, accessibility, interaction feedback, and conversion friction.
4. In GitHub mode, prioritize component hierarchy, routing, state management, UI architecture, runtime readiness, and implementation gaps.
5. Every issue must include what is wrong, why it matters, and exactly how to fix it.
6. Implementation prompts must be ready for a designer or engineer to execute.
7. Code prompts must reference realistic file targets when in GitHub mode.
8. Forecast numbers should be realistic and usually stay within the 5-35 range.
9. Return valid JSON only.

Return this exact JSON structure:
{
  "analysisMode": "url|github",
  "analyzedEntity": {
    "label": "string",
    "primaryUrl": "string",
    "runtimeUrl": "string|null",
    "repoUrl": "string|null"
  },
  "sourceContext": {
    "modeSummary": "string",
    "signalsUsed": ["string"],
    "confidence": "high|medium|low"
  },
  "runtimeReadiness": {
    "status": "live_runtime|repo_only|hybrid",
    "summary": "string",
    "artifacts": [
      { "label": "string", "status": "available|partial|missing", "detail": "string", "type": "crawl|runtime|repo|screenshot|integration" }
    ]
  },
  "uxSummary": "string",
  "pages": [
    {
      "url": "string",
      "pageType": "landing|onboarding|dashboard|feature|checkout|other",
      "title": "string",
      "priorityScore": "high|medium|low",
      "issues": [
        {
          "id": "string",
          "issue": "string",
          "severity": "critical|high|medium|low",
          "area": "string",
          "why": "string",
          "recommendation": "string",
          "estimated_impact": "string",
          "type": "ux_issue|ui_improvement|copy_refinement|feature_addon",
          "complexity": "low|medium|high",
          "annotation": { "x": 50, "y": 30, "label": "string", "fix": "string", "impact": "string", "priority": "High|Medium|Low" }
        }
      ],
      "improvements": [{ "improvement": "string", "impact": "string" }],
      "addOns": [{ "feature": "string", "reason": "string" }]
    }
  ],
  "uxIssues": [
    {
      "id": "string",
      "issue": "string",
      "severity": "critical|high|medium|low",
      "area": "string",
      "why": "string",
      "recommendation": "string",
      "estimated_impact": "string",
      "type": "ux_issue|ui_improvement|copy_refinement|feature_addon",
      "complexity": "low|medium|high",
      "annotation": { "x": 50, "y": 30, "label": "string", "fix": "string", "impact": "string", "priority": "High|Medium|Low" }
    }
  ],
  "repoIntelligence": {
    "summary": "string",
    "componentHierarchy": ["string"],
    "routingState": ["string"],
    "stateManagement": ["string"],
    "uiArchitecture": ["string"],
    "implementationGaps": [
      { "title": "string", "description": "string", "priority": "high|medium|low" }
    ]
  },
  "featureEnhancements": [
    { "feature": "string", "currentState": "string", "improvement": "string", "impact": "high|medium|low" }
  ],
  "performanceOptimizations": [
    { "area": "string", "issue": "string", "fix": "string", "effort": "low|medium|high" }
  ],
  "userJourneyOptimizations": [
    { "flow": "string", "problem": "string", "solution": "string", "expectedDropoffReduction": "string" }
  ],
  "engagementRetentionStrategy": [
    { "strategy": "string", "description": "string", "expectedImpact": "string" }
  ],
  "ctaOptimizations": [
    { "current": "string", "suggested": "string", "reason": "string" }
  ],
  "implementationPrompts": {
    "ui": [
      { "title": "string", "prompt": "string", "priority": "High|Medium|Low", "issueId": "string|null" }
    ],
    "code": [
      { "title": "string", "file": "string", "issue": "string", "fix": "string", "priority": "High|Medium|Low", "validation": "string" }
    ],
    "experiments": [
      { "title": "string", "prompt": "string", "priority": "High|Medium|Low" }
    ]
  },
  "feedbackLoop": {
    "starox1Opportunities": ["string"],
    "productSignalsToTrack": ["string"]
  },
  "conversionPrediction": {
    "conversionRateChange": 0,
    "bounceRateChange": 0,
    "sessionDurationChange": 0,
    "revenueImpact": 0,
    "userEngagementChange": 0
  }
}`;
}

// ── STAROX-3: Documentation Intelligence prompt ───────────────────────────────
export function getCdx3Prompt(userPrompt: string): string {
  let parsed: {
    repoUrl?: string;
    productDescription?: string;
    targetAudience?: string;
    seoKeywords?: string;
  } = {};

  try {
    parsed = JSON.parse(userPrompt) as typeof parsed;
  } catch {
    parsed = { repoUrl: userPrompt };
  }

  const parts = [
    parsed.repoUrl ? `GitHub Repository URL: ${parsed.repoUrl}` : "",
    parsed.productDescription ? `Product Description: ${parsed.productDescription}` : "",
    parsed.targetAudience ? `Target Audience: ${parsed.targetAudience}` : "",
    parsed.seoKeywords ? `SEO Keywords: ${parsed.seoKeywords}` : "",
  ].filter(Boolean).join("\n\n---\n\n");

  return `You are STAROX-3, a production-grade Documentation Intelligence system.

You transform any GitHub repository into a complete knowledge engine: developer docs, user guides, SEO content, and business-ready narratives.

CRITICAL RULES:
1) Never hallucinate APIs, files, or features — only describe what the repo actually contains based on the URL and context provided.
2) Every doc section must include purpose, how it works, and examples.
3) SEO content must follow: problem → solution → value structure.
4) Business outputs must be founder-ready and investor-friendly.
5) Architecture diagrams use ASCII/text format.
6) Be directory-aware — understand the full repo structure before generating.
7) Prefer structured, outcome-driven outputs over generic summaries.
8) Always respond with valid JSON only — no markdown, no text outside the JSON object.

Input:
${parts}

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

// ── PMX: Product Understanding prompt ─────────────────────────────────────────
export function getProductUnderstandingPrompt(context: string): string {
  return `Analyze the following customer evidence, product notes, website details, or documents and synthesize them into a comprehensive Product Understanding block.

Inputs:
${context}

Return exactly this JSON schema (and nothing else):
{
  "productSummary": {
    "name": "string (name of the product)",
    "oneLiner": "string (clear elevator pitch)",
    "category": "string (SaaS, E-commerce, Tool, Platform, etc.)",
    "stage": "idea | mvp | growth | scale"
  },
  "businessModel": "string (brief summary of how it works and monetization)",
  "coreFeatures": [
    { "name": "string", "description": "string", "priority": "high | medium | low" }
  ],
  "targetAudience": "string (summary of the ideal customer profile)",
  "personas": [
    { "name": "string (e.g. Developer Dan)", "role": "string (job role/title)", "painPoints": ["string"], "goals": ["string"] }
  ],
  "customerSegments": ["string"],
  "businessGoals": [
    { "goal": "string (e.g. Reduce churn by 10%)", "successMetric": "string (e.g. Monthly Retention Rate)" }
  ],
  "valueProposition": "string (why customers choose this)",
  "customerJourney": [
    { "stage": "string (e.g. Onboarding)", "actions": ["string"], "painPoints": ["string"] }
  ]
}`;
}

// ── PMX: Extract Evidence Signals prompt ──────────────────────────────────────
export function getEvidenceSignalsPrompt(context: string): string {
  return `Read the following product inputs and extract concrete pieces of evidence (customer quotes, behavior observations, business metrics, engineering logs, or competitor market intelligence).
Avoid summarizing generally; extract specific evidence items.

Inputs:
${context}

Return exactly this JSON schema (and nothing else):
{
  "evidence": [
    {
      "title": "string (short name of evidence, e.g. Payment Gateway Failure)",
      "description": "string (detailed explanation)",
      "category": "customer | behavior | business | engineering | market",
      "source": "string (e.g. Intercom chat, PostHog log, Stripe report)",
      "quote": "string (verbatim customer quote or logs if available, else omit/blank)",
      "confidence": 1-5 (number 1 low, 5 high),
      "importance": 1-5 (number 1 low, 5 high),
      "relatedFeatures": ["string"],
      "relatedProblems": ["string"]
    }
  ]
}`;
}

// ── PMX: Detect Problems prompt ───────────────────────────────────────────────
export function getProductProblemsPrompt(evidenceStr: string, context: string): string {
  return `Review the following evidence list and product inputs. Automatically identify the top product problems (UX bottlenecks, growth drops, retention drops, technical debt, feature gaps, business risks).

Evidence Signals:
${evidenceStr}

Context:
${context}

Return exactly this JSON schema (and nothing else):
{
  "problems": [
    {
      "title": "string (clear issue title)",
      "description": "string (what is wrong)",
      "type": "ux | growth | retention | tech_debt | feature_gap | business_risk",
      "evidence": ["string (evidence items/quotes supporting this problem)"],
      "confidence": 0-100 (percentage of confidence),
      "severity": "critical | high | medium | low",
      "businessImpact": "string (impact on revenues/costs)",
      "userImpact": "string (impact on customer satisfaction/usage)",
      "suggestedFix": "string (how to resolve this)",
      "affectedFeatures": ["string"]
    }
  ]
}`;
}

// ── PMX: Opportunity Priority Scoring prompt ──────────────────────────────────
export function getOpportunitiesPrompt(problemsStr: string, understandingStr: string): string {
  return `Based on the following detected problems and product understanding, generate actionable product opportunities/features to solve them.
Calculate their impact and complexity scores (values between 1 and 10).

Detected Problems:
${problemsStr}

Product Context:
${understandingStr}

Return exactly this JSON schema (and nothing else):
{
  "opportunities": [
    {
      "title": "string (feature/opportunity title, e.g. Interactive Wizard Builder)",
      "description": "string (detailed description of the solution)",
      "userImpact": 1-10 (scale of 1-10),
      "revenueImpact": 1-10 (scale of 1-10),
      "retentionImpact": 1-10 (scale of 1-10),
      "strategicAlignment": 1-10 (scale of 1-10),
      "confidence": 1-100 (percentage confidence),
      "effort": 1-10 (complexity/effort scale, 1 is easy, 10 is very hard),
      "risk": "low | medium | high"
    }
  ]
}`;
}

// ── PMX: Decision Recommendations prompt ──────────────────────────────────────
export function getDecisionsPrompt(problemsStr: string, opportunitiesStr: string): string {
  return `Review the following problems and prioritized opportunities. Formulate AI-backed recommendations categorizing them into:
Build (new features), Improve (existing logic), Optimize (performance/UX), Remove (feature deprecation), Experiment (A/B testing), Delay (push to backlog).

Every recommendation must clearly document: Reasoning, Trade-offs, ROI, Confidence, and Alternative options.

Return the 4-8 highest-priority decisions only — do not create one decision per problem or opportunity; consolidate related ones. Keep each field concise (1-2 sentences).

Problems:
${problemsStr}

Opportunities:
${opportunitiesStr}

Return exactly this JSON schema (and nothing else):
{
  "decisions": [
    {
      "title": "string (e.g. Migrate database to PostgreSQL)",
      "category": "build | improve | optimize | remove | experiment | delay",
      "reasoning": "string (clear detail of WHY PMX recommends this)",
      "evidence": "string (associated quotes/metrics/confidence factors)",
      "tradeoffs": "string (pros and cons, implementation risks)",
      "expectedOutcome": "string (success indicator, e.g. page load under 2s)",
      "confidence": 0-100 (percentage of recommendation accuracy)",
      "estimatedROI": "string (description of returns vs costs, e.g. High, 3x revenue in 3mo)",
      "alternativeSolutions": ["string (other paths considered and rejected)"]
    }
  ]
}`;
}

// ── PMX: Solution Studio prompt ───────────────────────────────────────────────
export function getSolutionDetailsPrompt(decisionTitle: string, decisionCategory: string, reasoning: string): string {
  return `We have approved the decision to "${decisionTitle}" (Category: ${decisionCategory}).
Your task is to generate the complete developer implementation blueprint, formatted as detailed JSON fields containing rich Markdown.

Reasoning: ${reasoning}

Ensure the PRD is structured, include epic goals, user stories with acceptance criteria, complete technical specs, database schemas, API structures, security notes, and edge cases.

IMPORTANT: Keep all descriptions, Markdown specs, and lists extremely brief and concise (1-2 sentences per field maximum) to keep the entire response short and fit within the token limit.

Return exactly this JSON schema (and nothing else):
{
  "title": "string (blueprint title)",
  "prd": "string (comprehensive Product Requirement Document in Markdown)",
  "epic": "string (High-level epic description & milestones in Markdown)",
  "userStories": [
    {
      "story": "string (As a user... I want... So that...)",
      "acceptanceCriteria": "string (Given... When... Then... in Markdown)"
    }
  ],
  "techSpecs": "string (Technical Architecture, system design details, components diagram in Markdown)",
  "apiContracts": "string (JSON schemas or API request/response paths in Markdown)",
  "databaseChanges": "string (Mongoose schemas, fields, or migration plans in Markdown)",
  "securityNotes": "string (RBAC, sanitization rules, rate-limiting in Markdown)",
  "uxImprovements": "string (wireframe description, flow improvements in Markdown)",
  "edgeCases": "string (handling network disconnects, invalid payloads, timeouts)"
}`;
}

// ── PMX: Solution Studio combine prompt ───────────────────────────────────────
// Merges N approved blueprints into one cohesive document — used when the
// user picks several Solution Studio tabs and asks for a unified PRD instead
// of shipping them as separate, possibly-overlapping documents.
export function getCombineSolutionsPrompt(blueprints: Array<{ title: string; prd: string; techSpecs: string }>): string {
  const blocks = blueprints
    .map((b, i) => `### Blueprint ${i + 1}: ${b.title}\n\nPRD:\n${b.prd}\n\nTech Specs:\n${b.techSpecs || "(none)"}`)
    .join("\n\n---\n\n");

  return `Merge the following ${blueprints.length} approved product blueprints into ONE unified, cohesive Product Requirement Document — the way a PM would combine several related feature specs into a single release plan, not just concatenate them.

${blocks}

Rules:
1. De-duplicate overlapping goals, user stories, and technical concerns instead of repeating them per blueprint.
2. Preserve every distinct requirement, acceptance criterion, and technical detail from every blueprint — nothing gets dropped, only reorganized and de-duplicated.
3. Organize the merged PRD so a reader can still tell which original feature area each part serves (e.g. subsections or clear headings per feature), while framing the whole as one initiative.
4. Keep all descriptions concise (1-2 sentences per field maximum where possible) to fit within the token limit.

Return exactly this JSON schema (and nothing else):
{
  "title": "string (a single title covering the combined scope)",
  "prd": "string (the unified Product Requirement Document in Markdown)",
  "epic": "string (High-level epic description & milestones covering all merged blueprints, in Markdown)",
  "userStories": [
    {
      "story": "string (As a user... I want... So that...)",
      "acceptanceCriteria": "string (Given... When... Then... in Markdown)"
    }
  ],
  "techSpecs": "string (unified Technical Architecture covering all merged blueprints, in Markdown)",
  "apiContracts": "string (merged API request/response paths in Markdown)",
  "databaseChanges": "string (merged schema/migration plans in Markdown)",
  "securityNotes": "string (merged RBAC, sanitization, rate-limiting notes in Markdown)",
  "uxImprovements": "string (merged wireframe/flow notes in Markdown)",
  "edgeCases": "string (merged edge case handling notes in Markdown)"
}`;
}

// ── PMX: Development PRD pipeline (backend/src/services/pmxIdeaPrd.ts) ───────
// The whole PRD is ONE markdown document (headings, tables, checklists,
// code fences, mermaid diagrams) so it can render as a living engineering
// spec and be edited in place by the AI prompt bar. One call produces the
// full document in one pass using the exact required "## Section" headings
// (critical: the frontend splits on these to drive per-section copy), kept
// dense and implementation-focused — no business theory, no filler.

const MARKDOWN_RULES = `Formatting rules: use "## Section Title" for each top-level section, exactly as named below — no other top-level headings. Use tables for structured data (fields, endpoints, comparisons). Use "- [ ]" checklists for task lists. Use fenced code blocks with a language tag for schemas/payloads/commands. Use "> **Note:**" blockquotes as callouts for risks or assumptions. Use a fenced \`\`\`mermaid code block for any diagram (architecture, ERD, or flow) — valid mermaid syntax only. Be dense and implementation-focused: no business theory, no filler, no repeated context between sections.`;

// One-shot Idea→PRD generation — replaces the old 5-call discovery →
// product spec → engineering spec → delivery plan → coding prompt chain
// with a single call that produces the complete document in one pass.
export function getIdeaOneShotPrompt(idea: string): string {
  return `A developer submitted this product idea for a Development PRD — a spec for building the product, not a business plan. It may be incomplete — fill reasonable gaps yourself and list every assumption you made.

Idea: "${idea}"

Produce the complete PRD in one pass, covering: an overview of what it is and why now, the problem and its solution, target users, core features, user stories, a tech stack recommendation, and MVP scope. Also work out the concrete page/screen structure the MVP needs and how they're laid out/navigated.

${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else). "markdown" is listed first deliberately — write it first, before the other fields — so that if you run out of room, the PRD content itself is what's already complete rather than the metadata around it:
{
  "markdown": "string — markdown body containing exactly these sections in order: '## Overview' (2-3 sentences: what it is, who it's for, why now), '## Problem & Solution' (the concrete problem, who has it, current workaround, and how this product solves it), '## Target Users' (a short table: user type | primary use case | frequency), '## Core Features' (a table per feature: Feature | Description | Priority (P0/P1/P2) | Key Acceptance Criteria — 6-10 features covering the full MVP scope), '## User Stories' (5-10 stories as 'As a [user], I want [goal], so that [benefit]', each with one-line acceptance criteria), '## Tech Stack' (2-3 sentence rationale, then a \`\`\`mermaid graph TD diagram showing frontend/backend/database/external services and data flow), '## MVP Scope' (what ships in v1 vs what's explicitly deferred, plus a '- [ ]' checklist of the concrete build tasks to reach it)",
  "productName": "string — short product name",
  "assumptions": ["string — one short sentence per gap you filled, 3-5 items max — keep each brief regardless of field order"],
  "stack": {
    "frontend": "string — e.g. React, Next.js, Vue",
    "backend": "string — e.g. Node.js/Express, NestJS, FastAPI",
    "database": "string — e.g. PostgreSQL, MongoDB, Supabase",
    "cloud": "string — e.g. Vercel + Railway, AWS, GCP",
    "authProvider": "string — e.g. Clerk, Auth0, Supabase Auth",
    "aiProvider": "string — e.g. OpenAI, Anthropic, none",
    "architecture": "string — Monolith | Modular Monolith | Microservices | Serverless"
  },
  "pages": [
    { "name": "string — page/screen name, e.g. 'Dashboard'", "purpose": "string — one short sentence on what it's for and its key contents" }
  ],
  "layout": "string — 2-4 sentences on overall navigation/layout structure: shell (sidebar/topbar/tabs), how the pages above connect, and any responsive notes"
}
Pick the stack that best fits THIS idea — don't default to the same stack every time. List 5-9 pages covering the full MVP, ordered the way a user would encounter them.`;
}

// ── PMX: Development PRD refinement (AI prompt bar / theme controls) ─────────
export function getIdeaRefinePrompt(currentMarkdown: string, stack: Record<string, string | undefined>, instruction: string): string {
  return `You are editing an existing Development PRD in place, the way Cursor or Claude Canvas apply an edit to a live document — not regenerating it from scratch.

Current stack: ${JSON.stringify(stack)}

Current PRD (markdown, section headings are "## Title"):
${currentMarkdown}

Requested change: "${instruction}"

Rules:
1. Preserve every section and every sentence that isn't affected by this change, verbatim.
2. Only rewrite the specific sections this change actually touches (e.g. a stack swap mainly touches Tech Stack, and often Core Features or MVP Scope if it changes what's feasible — but not Problem & Solution or Target Users).
3. Keep the same "## Section Title" headings, in the same order, covering the full 7-section structure (Overview, Problem & Solution, Target Users, Core Features, User Stories, Tech Stack, MVP Scope).
4. If the change implies a new stack choice, update the "stack" object to match.
5. ${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — the FULL updated PRD, all 7 sections, unaffected ones copied through unchanged",
  "stack": { "frontend": "string", "backend": "string", "database": "string", "cloud": "string", "authProvider": "string", "aiProvider": "string", "architecture": "string" },
  "changeSummary": "string — one sentence describing what actually changed"
}`;
}

// ── PMX: Solution Studio PRD refine (backend/src/services/pmxAi.ts) ──────────
// Same "edit in place" contract as getIdeaRefinePrompt, but for a Solution's
// `prd` field, which has no fixed section structure to preserve.
export function getSolutionRefinePrompt(currentMarkdown: string, instruction: string): string {
  return `You are editing an existing Product Requirements Document in place, the way Cursor or Claude Canvas apply an edit to a live document — not regenerating it from scratch.

Current PRD (markdown):
${currentMarkdown}

Requested change: "${instruction}"

Rules:
1. Preserve every section and every sentence that isn't affected by this change, verbatim.
2. Only rewrite the specific parts this change actually touches.
3. Keep the existing heading structure and ordering.
4. ${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — the FULL updated PRD, unaffected sections copied through unchanged",
  "changeSummary": "string — one sentence describing what actually changed"
}`;
}

// ── PMX: Artifact compilation prompt ──────────────────────────────────────────
// Synthesizes one cohesive exportable document from the whole workspace
// (PRD/blueprints, evidence, problems, opportunities, decisions, connected
// sources, UI analysis, sprint tasks) — not a template that just echoes
// whichever fields happen to already be loaded client-side. `context` is the
// pre-assembled raw dump of everything currently available for the project;
// the model's job is to read it and produce the requested document type.
const ARTIFACT_TYPE_BRIEF: Record<string, string> = {
  prd: "a Product Requirements Document: overview, problem & solution, target users, core features (prioritized), user stories, and scope (in vs. out for this release)",
  technical_spec: "a Technical Architecture Specification: system design summary, stack/architecture rationale, API structure, data model / schema changes, security notes, and edge cases",
  sprint_plan: "a Sprint Execution Plan: tasks grouped by sprint/category (frontend, backend, infra, testing, deployment), with priority, estimate, and assignee where known",
  roadmap: "a Strategic Product Roadmap: value proposition, target personas, phased milestones (now / next / later), and the key risks or bets each phase depends on",
  // Execution-plan-generated artifact types (see routes/pmx.ts generateArtifactsForPlan):
  architecture_summary: "an Architecture Summary: system components, how they interact, chosen stack and why, and the key scaling/reliability considerations",
  api_contract: "an API Contract: endpoints grouped by resource, method/path, request/response shapes, and auth requirements — as a reference table plus example payloads",
  database_schema: "a Database Schema doc: collections/tables, fields with types, relationships, and any migration notes for existing data",
  ui_specification: "a UI Specification: screen-by-screen breakdown, key components per screen, states (empty/loading/error), and interaction notes",
  component_inventory: "a Component Inventory: reusable UI components needed, their props/variants, and which screens consume them",
  test_plan: "a Test Plan: test strategy, coverage areas (unit/integration/regression), critical user flows to verify, and edge cases to check before release",
  release_checklist: "a Release Checklist: pre-release verification steps, rollback plan, and sign-off criteria, as a checklist",
  launch_plan: "a Launch Plan: positioning, messaging pillars, launch timeline, and channels/owners for the release",
  newsletter_draft: "a Newsletter Draft announcing this release: subject line, a short punchy body, and a clear call to action",
  faq: "a Frequently Asked Questions doc for this feature: the questions users/support will actually ask, with concise answers",
  help_center_outline: "a Help Center Outline: article titles and a one-line summary of what each should cover, organized by topic",
};

export function getCompileArtifactPrompt(docType: string, title: string, context: string): string {
  const brief = ARTIFACT_TYPE_BRIEF[docType] || ARTIFACT_TYPE_BRIEF.prd;
  return `Compile ${brief} titled "${title}", synthesized from everything gathered on this product so far.

Source material (PRD/blueprints, evidence, problems, opportunities, decisions, connected sources, UI analysis, sprint tasks — not all sections will be present):
${context}

Rules:
1. Synthesize, don't just concatenate — pull the material that's actually relevant to this document type and organize it into one cohesive document, not a dump of every input section back-to-back.
2. Ground claims in the source material above; if something relevant is missing, note the gap briefly rather than inventing specifics.
3. ${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "content": "string — the full compiled document in Markdown, using '## Section Title' headings"
}`;
}

// ── PMX: Execution Planning prompt ────────────────────────────────────────────
export function getExecutionTasksPrompt(prd: string, techSpecs: string): string {
  return `Take the following PRD and Technical Specifications and translate them into a list of developer tickets/tasks. Group them by Sprint 1 tasks, frontend, backend, infra, testing, or deployment. Add time estimates and assignees.

PRD:
${prd.substring(0, 3000)}

Tech Specs:
${techSpecs.substring(0, 3000)}

Return exactly this JSON schema (and nothing else):
{
  "tasks": [
    {
      "title": "string (clear ticket name, e.g. Create POST /api/pmx/inputs router)",
      "description": "string (detailed checklist/instructions for developer)",
      "type": "frontend | backend | infra | testing | deployment | ux",
      "sprintPlan": "string (e.g. Sprint 1, Sprint 2, Backlog)",
      "priority": "high | medium | low",
      "timeEstimate": "string (e.g. 4h, 2d, 1d)",
      "assignee": "string (e.g. Frontend Engineer, Backend Lead, Devops)",
      "dependencies": ["string (titles of dependent tasks)"]
    }
  ]
}`;
}

// ── PMX: Execution Plan — department detection & scaffold ────────────────────
// First call of the "Create Execution"/"Regenerate Execution" pipeline
// (backend/src/services/pmxAi.ts generateExecutionScaffold). Reads scope
// off the PRD and decides which departments are actually required — never
// all of them by default — then lays out milestones and a sprint plan. Task
// generation (getDepartmentTasksPrompt) runs per detected department off of
// this scaffold's milestones/sprints, so those two must stay in the same
// vocabulary (task.milestone must equal one of these milestone names).
const PMX_DEPARTMENTS_LIST = "Product, Design, Engineering, QA, DevOps, Security, Marketing, Sales, Customer Success, Support, Leadership";

export function getExecutionScaffoldPrompt(prd: string, techSpecs: string): string {
  return `You are a Technical Program Manager turning an approved PRD into an execution plan skeleton — the department/milestone/sprint scaffold that individual department task lists will be generated against next. You are not writing tasks yet.

PRD:
${prd.substring(0, 6000)}

Technical Specs:
${(techSpecs || "").substring(0, 3000)}

Step 1 — Detect scope and required departments. Choose only from this fixed list: ${PMX_DEPARTMENTS_LIST}. Do NOT include a department the work doesn't actually need — judge scope the way a TPM would:
- A narrow engineering-only change (e.g. an internal API, a backend migration) → just Engineering (add QA only if it clearly needs dedicated test coverage beyond the engineer's own testing).
- A UX-heavy feature (new user-facing flow/screen) → Design, Engineering, QA.
- A full product launch (new product/major feature going to market) → Product, Design, Engineering, QA, Marketing, Sales, Customer Success, Support, Leadership.
- Enterprise/infrastructure work (auth overhaul, compliance, platform migration) → Product, Engineering, DevOps, Security, QA, Leadership.
Use these as calibration, not a rigid lookup — infer from what the PRD actually describes.

Step 2 — Define milestones (typically 3-6, fewer for narrow scope): named checkpoints the selected departments' work rolls up to, in order, each with a one-sentence goal (e.g. "Engineering MVP" — core flows implemented and demoable).

Step 3 — Define a sprint plan (1-2 weeks per sprint, typically 2-5 sprints depending on scope): which departments are active each sprint and what that sprint is focused on. Departments should generally onboard in a sensible order (e.g. Product/Design before Engineering ramps, QA overlapping the tail of Engineering, Marketing/Sales/Support/Leadership clustering near launch) — not everyone active in every sprint.

Return exactly this JSON schema (and nothing else):
{
  "scopeSummary": "string — 2-3 sentences on what's being built and why these departments/this shape of plan fits it",
  "departments": ["string — subset of: ${PMX_DEPARTMENTS_LIST}"],
  "milestones": [
    { "name": "string", "order": "number (1-based)", "goal": "string — one sentence" }
  ],
  "sprints": [
    { "number": "number (1-based)", "label": "string, e.g. Sprint 1", "departments": ["string"], "focus": "string — one sentence" }
  ]
}`;
}

// ── PMX: Custom Execution — scaffold (no PRD, no department detection) ──────
// Powers a custom execution's scaffold step: unlike getExecutionScaffoldPrompt,
// departments are already fixed by the user's own selection (not detected),
// so this prompt's only job is producing milestones/sprints scoped to just
// those departments — keeping the board's existing milestone-grouping and
// Sprint Health logic working identically for PRD and custom executions.
export function getCustomExecutionScaffoldPrompt(name: string, goal: string, description: string, departments: string[]): string {
  return `You are a Technical Program Manager laying out the milestone/sprint skeleton for a focused, non-PRD execution — a specific outcome someone wants done, not a full product plan. The departments involved are already decided; do not add, remove, or second-guess them.

Execution name: "${name}"
Goal: ${goal}
${description ? `Additional context: ${description}\n` : ""}
Departments involved: ${departments.join(", ")}

Step 1 — Define milestones: typically 1-3 for a focused execution like this (don't over-scaffold a small, single-outcome effort), each a named checkpoint the involved departments' work rolls up to, in order, with a one-sentence goal.

Step 2 — Define a sprint plan (1-2 weeks per sprint, typically 1-3 sprints for this scope): which of the given departments are active each sprint and what that sprint is focused on. Every sprint's "departments" must be a subset of exactly: ${departments.join(", ")}.

Return exactly this JSON schema (and nothing else):
{
  "scopeSummary": "string — 1-2 sentences on what this execution accomplishes",
  "milestones": [
    { "name": "string", "order": "number (1-based)", "goal": "string — one sentence" }
  ],
  "sprints": [
    { "number": "number (1-based)", "label": "string, e.g. Sprint 1", "departments": ["string — subset of the given departments"], "focus": "string — one sentence" }
  ]
}`;
}

// ── PMX: Execution Plan — per-department task generation ─────────────────────
// Second call of the pipeline, run once per department returned by the
// scaffold (parallel fan-out in routes/pmx.ts POST /execution/generate).
// Bounded to one department's tasks so output stays realistic in size and
// quality instead of one giant call trying to cover the whole backlog.
const PMX_DEPARTMENT_TASK_MENUS: Record<string, string> = {
  Product: "Finalize scope, define milestones, approve requirements, stakeholder review",
  Design: "User flows, wireframes, high-fidelity UI, design system updates, accessibility review",
  Engineering: "Frontend implementation, backend implementation, API development, database migrations, integrations, performance optimization, security hardening",
  QA: "Test strategy, unit testing, integration testing, regression testing, release validation",
  DevOps: "CI/CD, environment setup, monitoring, deployment automation",
  Security: "Threat modeling, access-control review, dependency/vulnerability audit, security sign-off",
  Marketing: "Positioning, messaging, landing page, newsletter, launch campaign",
  Sales: "Demo material, rollout plan, pricing/packaging alignment, sales enablement",
  "Customer Success": "Customer onboarding, rollout plan, feedback collection, success playbook",
  Support: "Help documentation, FAQ, troubleshooting guides, support macros",
  Leadership: "Executive review, budget approval, launch readiness, risk assessment",
};

export function getDepartmentTasksPrompt(
  department: string,
  prd: string,
  techSpecs: string,
  milestones: Array<{ name: string; goal: string }>,
  sprints: Array<{ number: number; label: string; departments: string[]; focus: string }>,
  scopeSummary: string
): string {
  const relevantSprints = sprints.filter(s => s.departments.includes(department));
  return `You are the ${department} lead writing this department's sprint backlog for an approved PRD, the way a senior Product Manager / Engineering Manager / Design Lead / QA Lead / GTM Lead actually writes tickets — concrete, dependency-aware, immediately actionable. Avoid generic AI-slop tasks ("Improve the UI", "Test everything") — every task should read like it was written by someone who has actually scoped this work.

Plan context: ${scopeSummary}

PRD:
${prd.substring(0, 5000)}

Technical Specs:
${(techSpecs || "").substring(0, 2500)}

Milestones this plan is organized around (each task's "milestone" field must exactly match one of these names):
${milestones.map(m => `- ${m.name}: ${m.goal}`).join("\n")}

Sprints where ${department} is active (each task's "sprintNumber" must be one of these numbers):
${relevantSprints.length ? relevantSprints.map(s => `- Sprint ${s.number} (${s.label}): ${s.focus}`).join("\n") : sprints.map(s => `- Sprint ${s.number} (${s.label}): ${s.focus}`).join("\n")}

Typical ${department} work to draw from (adapt to what this PRD actually needs, don't force all of these in): ${PMX_DEPARTMENT_TASK_MENUS[department] || "work directly relevant to this PRD"}.

Generate ${department}'s tasks for this plan (typically 4-10, scaled to actual scope — don't pad). For each task:
- "dependencies": titles of other tasks (in this or another department) that must complete first, or a milestone-gate label (e.g. "API Contract Approved", "Design Handoff Complete") if the dependency isn't a specific ticket.
- "acceptanceCriteria": 2-5 concrete, checkable bullets — what "done" means, not restated description.
- "implementationNotes": 1-3 sentences of real guidance (approach, gotcha, or key decision) — skip if genuinely nothing useful to add, but don't leave it generic filler.
- "prdSectionLink": the PRD heading/section this task traces back to.
- "dueWeek": the 1-based week number within the overall plan this should land by (weeks are ~1:1 with sprint number unless the task spans longer).

Return exactly this JSON schema (and nothing else):
{
  "tasks": [
    {
      "title": "string",
      "description": "string — 1-3 sentences, what to actually do",
      "type": "frontend | backend | infra | testing | deployment | ux | other",
      "milestone": "string — must match one of the milestone names above",
      "sprintNumber": "number",
      "priority": "high | medium | low",
      "timeEstimate": "string, e.g. 4h, 2d, 3d",
      "assignee": "string — suggested owner role, e.g. Backend Engineer, Design Lead, QA Engineer",
      "dueWeek": "number",
      "prdSectionLink": "string",
      "dependencies": ["string"],
      "acceptanceCriteria": ["string"],
      "implementationNotes": "string"
    }
  ]
}`;
}

// ── PMX: Execution Plan — regeneration diff ───────────────────────────────────
// Third call, used only by POST /execution/regenerate. Given the latest PRD
// plus the current plan/tasks, decides what changed. Tasks already marked
// "done" are still shown for context (so the model doesn't recreate them)
// but the route hard-filters them out of update/remove before applying the
// diff regardless of what the model returns — completed work is never
// touched by regeneration.
export function getExecutionDiffPrompt(
  prd: string,
  techSpecs: string,
  currentDepartments: string[],
  currentMilestones: Array<{ name: string; goal: string }>,
  currentSprints: Array<{ number: number; label: string; departments: string[]; focus: string }>,
  existingTasksJson: string
): string {
  return `The PRD for this execution plan has changed. Reconcile the existing sprint backlog against the updated PRD — the way a TPM re-plans mid-sprint, not a full rewrite.

Updated PRD:
${prd.substring(0, 6000)}

Technical Specs:
${(techSpecs || "").substring(0, 2500)}

Current departments: ${currentDepartments.join(", ")}
Current milestones: ${currentMilestones.map(m => `${m.name} — ${m.goal}`).join("; ")}
Current sprints: ${currentSprints.map(s => `Sprint ${s.number} (${s.label}): ${s.focus}`).join("; ")}

Existing tasks (each has a real "_id" — reference it exactly in your diff; tasks with status "done" are shown for context only, never propose updating or removing them):
${existingTasksJson}

Rules:
1. Preserve completed work — never touch a task whose status is "done".
2. Update tasks whose scope actually changed because of the PRD change; leave everything else alone.
3. Remove tasks that are now obsolete (not status "done").
4. Add newly-required tasks the PRD change introduces, following the same field shape as an existing task (including milestone/sprintNumber matched to the — possibly revised — milestones/sprints below).
5. Do NOT duplicate an existing task under a new title — if it already exists, that's an update, not an add.
6. Departments/milestones/sprints below may be the same as current, or adjusted if the PRD change requires it (e.g. a newly-needed department).

Return exactly this JSON schema (and nothing else):
{
  "departments": ["string"],
  "milestones": [{ "name": "string", "order": "number", "goal": "string" }],
  "sprints": [{ "number": "number", "label": "string", "departments": ["string"], "focus": "string" }],
  "diff": {
    "add": [
      {
        "title": "string", "description": "string", "type": "frontend | backend | infra | testing | deployment | ux | other",
        "department": "string", "milestone": "string", "sprintNumber": "number", "priority": "high | medium | low",
        "timeEstimate": "string", "assignee": "string", "dueWeek": "number", "prdSectionLink": "string",
        "dependencies": ["string"], "acceptanceCriteria": ["string"], "implementationNotes": "string"
      }
    ],
    "update": [
      { "matchId": "string — the _id of the existing task being changed", "changes": { "any of the task fields above that changed": "new value" }, "reason": "string — one sentence" }
    ],
    "remove": ["string — _id of an obsolete existing task"]
  }
}`;
}
