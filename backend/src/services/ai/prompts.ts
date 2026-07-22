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
