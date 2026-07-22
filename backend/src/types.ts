export type PlanTier = "free" | "starter" | "pro";
export type CdxType = "cdx1" | "cdx2" | "cdx3";

export interface GenerationInput {
  projectId: string;
  prompt: string;
  model: string;
}

export interface CdxResponse {
  sections: string[];   // sections[0] is the JSON string for structured output
  model: string;
  provider: string;
}

// ── STAROX-1 structured output ─────────────────────────────────────────────────
export interface Starox1Output {
  productSummary: {
    name: string;
    oneLiner: string;
    category: string;
    stage: "idea" | "mvp" | "growth" | "scale";
  };
  targetUsers: Array<{ persona: string; painPoint: string; goal: string }>;
  problemsIdentified: Array<{ problem: string; severity: string; impact: string }>;
  featureRecommendations: {
    p0: Array<{ feature: string; why: string; effort: string }>;
    p1: Array<{ feature: string; why: string; effort: string }>;
    p2: Array<{ feature: string; why: string; effort: string }>;
  };
  marketAnalysis: {
    marketSize: string;
    competitors: Array<{ name: string; weakness: string }>;
    differentiationStrategy: string;
    marketGaps: string[];
  };
  architecturePlan: {
    recommendedStack: { frontend: string; backend: string; database: string; infra: string };
    modules: Array<{ name: string; purpose: string }>;
    scalingConsiderations: string[];
  };
  roadmap: {
    mvp: { timeline: string; features: string[]; successMetric: string };
    v1: { timeline: string; features: string[]; successMetric: string };
    scale: { timeline: string; features: string[]; successMetric: string };
  };
  strategicInsights: {
    monetizationIdeas: string[];
    scalingOpportunities: string[];
    productDirection: string;
    keyRisks: string[];
  };
}
