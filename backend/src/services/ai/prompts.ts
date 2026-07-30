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

// ── PMX: Development PRD pipeline (backend/src/services/pmxIdeaPrd.ts) ───────
// The whole PRD is ONE markdown document (headings, tables, checklists,
// code fences, mermaid diagrams) so it can render as a living engineering
// spec and be edited in place by the AI prompt bar. Five compact calls each
// emit one markdown slice using the exact required "## Section" headings
// (critical: the frontend splits on these to drive per-section copy), kept
// dense and implementation-focused — no business theory, no filler.

const MARKDOWN_RULES = `Formatting rules: use "## Section Title" for each top-level section, exactly as named below — no other top-level headings. Use tables for structured data (fields, endpoints, comparisons). Use "- [ ]" checklists for task lists. Use fenced code blocks with a language tag for schemas/payloads/commands. Use "> **Note:**" blockquotes as callouts for risks or assumptions. Use a fenced \`\`\`mermaid code block for any diagram (architecture, ERD, or flow) — valid mermaid syntax only. Be dense and implementation-focused: no business theory, no filler, no repeated context between sections.`;

export function getIdeaDiscoveryPrompt(idea: string): string {
  return `A developer submitted this product idea for a Development PRD — a spec for building the product, not a business plan. It may be incomplete — fill reasonable gaps yourself and list every assumption you made.

Idea: "${idea}"

${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "productName": "string — short product name",
  "assumptions": ["string — each gap you filled and what you assumed, 4-8 items"],
  "stack": {
    "frontend": "string — e.g. React, Next.js, Vue",
    "backend": "string — e.g. Node.js/Express, NestJS, FastAPI",
    "database": "string — e.g. PostgreSQL, MongoDB, Supabase",
    "cloud": "string — e.g. Vercel + Railway, AWS, GCP",
    "authProvider": "string — e.g. Clerk, Auth0, Supabase Auth",
    "aiProvider": "string — e.g. OpenAI, Anthropic, none",
    "architecture": "string — Monolith | Modular Monolith | Microservices | Serverless"
  },
  "markdown": "string — markdown body containing exactly these sections in order: '## Executive Summary' (2-3 sentences: what it is, who it's for, why now), '## Product Goal' (1-2 sentences, the single measurable outcome), '## Problem Statement' (the concrete problem, who has it, current workaround), '## Users & Use Cases' (a short table: user type | primary use case | frequency)"
}
Pick the stack that best fits THIS idea — don't default to the same stack every time.`;
}

export function getIdeaProductSpecPrompt(context: string): string {
  return `Using this product discovery context, write the functional and architectural specification.

Context:
${context}

${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — markdown body containing exactly these sections in order: '## Functional Requirements' (a table per feature: Feature | Description | User Story | Priority (P0/P1/P2) | Key Acceptance Criteria — 6-10 features covering the full MVP scope), '## Technical Architecture' (2-3 sentence system overview, then a \`\`\`mermaid graph TD diagram showing frontend/backend/database/external services and data flow), '## Frontend Specification' (screens/routes as a list, each with purpose + key components + loading/empty/error states, plus state management approach), '## Backend Specification' (service structure, key modules, background jobs if any)"
}`;
}

export function getIdeaEngineeringSpecPrompt(context: string): string {
  return `Using this specification, write the data, API, and non-functional design.

Context:
${context}

${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — markdown body containing exactly these sections in order: '## Database Schema' (a \`\`\`mermaid erDiagram showing every table/collection and relationships, followed by a table of key fields per entity), '## API Design' (a table: Method | Route | Request | Response | Auth — one row per endpoint, 10-20 endpoints covering every screen's data needs), '## Authentication & Authorization' (auth method, session strategy, role/permission model), '## Integrations' (payments/email/analytics/notifications/third-party APIs — 'none' where not applicable), '## Non-Functional Requirements' (a table: Category (Performance/Scalability/Security/Accessibility/Reliability) | Requirement)"
}`;
}

export function getIdeaDeliveryPrompt(context: string): string {
  return `Using this engineering specification, write the delivery plan.

Context:
${context}

${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — markdown body containing exactly these sections in order: '## Engineering Tasks' (grouped under '### Frontend', '### Backend', '### Database', '### Infrastructure', '### QA' subheadings, each a '- [ ]' checklist of specific tickets referencing real screens/tables/routes from the context — no generic tasks), '## Milestones & Development Roadmap' (exactly 4 phases — Foundation, Core Build, Polish & QA, Launch — each with duration and milestones), '## Future Enhancements' (5-8 concrete post-MVP features, answering 'what should we build next?')"
}`;
}

export function getIdeaCodingPromptPrompt(context: string): string {
  return `Using this complete Development PRD, write ONE master build prompt for an AI coding IDE (Cursor, Windsurf, Claude Code, Copilot, Bolt, Lovable, Replit, etc.) to build the entire production-ready application in one pass with minimal follow-up prompting.

Full specification:
${context}

Write it as a well-structured markdown document covering, in order: (1) one-paragraph product summary and chosen stack, (2) database schema as a code block, (3) every screen to build with its components and states, (4) every API endpoint as a code block, (5) auth/security requirements, (6) build order referencing the roadmap phases, (7) explicit instruction to implement every functional requirement with its acceptance criteria, (8) a closing checklist of what "done" looks like. Be exhaustive and specific — this prompt is the only context the IDE will have.

Return exactly this JSON schema (and nothing else):
{ "markdown": "string — '## Master AI Coding Prompt' heading, then a single fenced code block containing the full prompt text, 800-1500 words" }`;
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
2. Only rewrite the specific sections this change actually touches (e.g. a stack swap touches Technical Architecture, Frontend/Backend Specification, Database Schema, API Design, Engineering Tasks, and the Master AI Coding Prompt — but not Problem Statement or Users & Use Cases).
3. Keep the same "## Section Title" headings, in the same order, covering the full 17-section structure (Executive Summary, Product Goal, Problem Statement, Users & Use Cases, Functional Requirements, Technical Architecture, Frontend Specification, Backend Specification, Database Schema, API Design, Authentication & Authorization, Integrations, Non-Functional Requirements, Engineering Tasks, Milestones & Development Roadmap, Future Enhancements, Master AI Coding Prompt).
4. If the change implies a new stack choice, update the "stack" object to match.
5. ${MARKDOWN_RULES}

Return exactly this JSON schema (and nothing else):
{
  "markdown": "string — the FULL updated PRD, all 17 sections, unaffected ones copied through unchanged",
  "stack": { "frontend": "string", "backend": "string", "database": "string", "cloud": "string", "authProvider": "string", "aiProvider": "string", "architecture": "string" },
  "changeSummary": "string — one sentence describing what actually changed"
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
