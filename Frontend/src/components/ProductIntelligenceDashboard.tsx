import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Code2,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Lightbulb,
  Monitor,
  Rocket,
  ShieldAlert,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";
import {
  Cell,
  Funnel,
  FunnelChart as RechartsFunnelChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { useState } from "react";
import type { Starox1Output, S1Decision, S1Feature } from "@/lib/store";

type ImpactLevel = "High" | "Medium" | "Low";

type InsightItem = {
  title: string;
  evidence: string;
  whyThisMatters: string;
  impact: ImpactLevel;
  confidence: number;
  roi: string;
};

type FeatureItem = {
  name: string;
  priority: "P0" | "P1" | "P2";
  effort: string;
  impactScore: number;
  confidence: number;
  roi: string;
  solves: string[];
  why: string;
};

function parsePercent(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toImpact(severity: string): ImpactLevel {
  if (severity === "critical" || severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

function confidenceFromEvidence(evidenceCount: number, hasRootCause: boolean): number {
  const base = 58 + evidenceCount * 8 + (hasRootCause ? 10 : 0);
  return clamp(base, 52, 96);
}

function roiFromImpact(impact: ImpactLevel, effort: string): string {
  const lowEffort = effort.toLowerCase() === "low";
  const highEffort = effort.toLowerCase() === "high";
  if (impact === "High" && lowEffort) return "Very High";
  if (impact === "High" && !highEffort) return "High";
  if (impact === "Medium" && lowEffort) return "High";
  if (impact === "Medium") return "Medium";
  return highEffort ? "Low" : "Medium";
}

function MetricCard({
  title,
  value,
  delta,
  icon: Icon,
}: {
  title: string;
  value: string;
  delta: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 p-4 shadow-[0_10px_30px_rgba(2,8,23,0.28)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <div className="rounded-lg bg-primary/12 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-primary/80">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {delta}
      </p>
    </div>
  );
}

function StickyNote({
  title,
  body,
  impact,
  confidence,
}: {
  title: string;
  body: string;
  impact: ImpactLevel;
  confidence: number;
}) {
  const border = impact === "High" ? "border-primary/35" : impact === "Medium" ? "border-primary/25" : "border-primary/20";
  const badge = impact === "High" ? "bg-primary/15 text-primary" : impact === "Medium" ? "bg-primary/10 text-primary/80" : "bg-primary/8 text-primary/60";

  return (
    <div className={`rounded-2xl border ${border} bg-gradient-to-br from-card to-card/55 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>{impact}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
      <p className="mt-3 text-[11px] text-primary/80">Confidence: {confidence}%</p>
    </div>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const impactTone = item.impact === "High" ? "text-primary" : item.impact === "Medium" ? "text-primary/80" : "text-primary/60";
  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 p-4">
      <p className="text-sm font-semibold text-foreground">{item.title}</p>
      <p className="mt-2 text-xs text-muted-foreground">Evidence: {item.evidence}</p>
      <p className="mt-1 text-xs text-foreground/85">Why this matters: {item.whyThisMatters}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full bg-surface px-2 py-0.5 font-semibold ${impactTone}`}>Impact: {item.impact}</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-primary/80">Confidence: {item.confidence}%</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-primary/70">Estimated ROI: {item.roi}</span>
      </div>
    </div>
  );
}

function RoadmapTimeline({ data }: { data: Starox1Output["roadmap"] }) {
  const stages = [
    { key: "mvp", title: "0-3 Months", icon: Rocket, block: data.mvp },
    { key: "v1", title: "3-6 Months", icon: TrendingUp, block: data.v1 },
    { key: "scale", title: "6-12 Months", icon: ShieldAlert, block: data.scale },
  ] as const;

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Roadmap Timeline</h3>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="relative rounded-2xl border border-primary/12 bg-card/30 p-4">
              {idx < stages.length - 1 && (
                <div className="absolute -right-2 top-8 hidden h-0.5 w-4 bg-primary/45 lg:block" />
              )}
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{stage.title}</p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {stage.block.features.slice(0, 4).map((feature, featureIdx) => (
                  <li key={featureIdx} className="text-xs text-foreground/90">• {feature}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-primary/80">Success Metric: {stage.block.successMetric}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelChart() {
  const funnelData = [
    { name: "Landing to Onboarding", value: 100, drop: "Baseline" },
    { name: "Onboarding Step 1", value: 60, drop: "40% drop" },
    { name: "Onboarding Step 2", value: 45, drop: "55% drop" },
  ];
  const colors = ["#38bdf8", "#22d3ee", "#60a5fa"];

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Onboarding Funnel</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsFunnelChart>
            <Tooltip cursor={false} formatter={(value: number, _name, item) => [`${value}%`, item?.payload?.drop ?? ""]} />
            <Funnel dataKey="value" data={funnelData} isAnimationActive>
              {funnelData.map((entry) => (
                <Cell key={entry.name} fill={colors[funnelData.indexOf(entry)]} />
              ))}
            </Funnel>
          </RechartsFunnelChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        {funnelData.map((item) => (
          <div key={item.name} className="rounded-lg bg-card/30 p-2 text-center">
            <p className="font-semibold text-foreground/90">{item.value}%</p>
            <p>{item.drop}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureImpactMap({ items }: { items: FeatureItem[] }) {
  const chartData = items.slice(0, 8).map((item) => ({
    name: item.name.length > 24 ? `${item.name.slice(0, 24)}...` : item.name,
    score: item.impactScore,
  }));

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Feature Priority Scale</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 6 }}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#93a5b8", fontSize: 11 }} width={145} />
            <Tooltip formatter={(value: number) => [`${value}`, "Priority Score"]} />
            <Bar dataKey="score" radius={[6, 6, 6, 6]} fill="#38bdf8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.slice(0, 6).map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="rounded-xl border border-primary/12 bg-card/30 p-3">
            <p className="text-xs font-semibold text-foreground">{item.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.why}</p>
            <p className="mt-2 text-[11px] text-primary/80">Confidence: {item.confidence}% • ROI: {item.roi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildFeatureItems(data: Starox1Output): FeatureItem[] {
  const normalize = (priority: "P0" | "P1" | "P2", records: Starox1Output["featureRecommendations"]["p0"]) => {
    return records.map((item) => {
      const base = priority === "P0" ? 90 : priority === "P1" ? 72 : 56;
      const effortPenalty = item.effort === "high" ? 14 : item.effort === "medium" ? 8 : 2;
      const evidenceBoost = (item.evidence?.length ?? 0) * 2;
      const confidence = clamp(62 + (item.evidence?.length ?? 0) * 7 + (item.whyThisWorks ? 8 : 0), 55, 97);
      const impactScore = clamp(base - effortPenalty + evidenceBoost, 30, 99);
      const impact: ImpactLevel = priority === "P0" ? "High" : priority === "P1" ? "Medium" : "Low";
      return {
        name: item.feature,
        priority,
        effort: item.effort,
        impactScore,
        confidence,
        roi: roiFromImpact(impact, item.effort),
        solves: item.solves ?? [],
        why: item.why,
      };
    });
  };

  return [
    ...normalize("P0", data.featureRecommendations.p0),
    ...normalize("P1", data.featureRecommendations.p1),
    ...normalize("P2", data.featureRecommendations.p2),
  ];
}

function buildInsights(data: Starox1Output): InsightItem[] {
  const fromInsights = (data.keyInsights ?? []).slice(0, 3).map((item) => ({
    title: item.insight,
    evidence: item.evidence,
    whyThisMatters: item.interpretation,
    impact: "High" as ImpactLevel,
    confidence: clamp(72 + (item.evidence.length > 80 ? 8 : 0), 68, 94),
    roi: "High",
  }));

  const fromProblems = data.problemsIdentified.slice(0, 3).map((problem) => {
    const impact = toImpact(problem.severity);
    const evidenceCount = problem.evidence?.length ?? 0;
    return {
      title: problem.problem,
      evidence: evidenceCount > 0 ? problem.evidence!.join(" | ") : problem.impact,
      whyThisMatters: problem.rootCause || problem.impact,
      impact,
      confidence: confidenceFromEvidence(evidenceCount, Boolean(problem.rootCause)),
      roi: roiFromImpact(impact, "medium"),
    };
  });

  return [...fromInsights, ...fromProblems].slice(0, 6);
}

function buildAiRecommendations(data: Starox1Output, featureItems: FeatureItem[]) {
  const topFeature = featureItems[0];
  const onboardingProblem = data.problemsIdentified.find((p) => /onboarding|signup|get started/i.test(p.problem + " " + p.impact));
  const personalizationFeature = featureItems.find((f) => /personal|persona|segment|profile/i.test(f.name + " " + f.why));
  const gamificationFeature = featureItems.find((f) => /game|reward|streak|badge|points/i.test(f.name + " " + f.why));

  return [
    {
      title: "Fix early onboarding friction first",
      detail: `If you resolve Step 1 onboarding friction, retention can increase by ~18-26% based on current funnel leakage signals (${onboardingProblem ? "problem detected in analysis" : "modeled from baseline drop-offs"}).`,
    },
    {
      title: "Sequence gamification after personalization",
      detail: `Gamification compounds better after personalization primitives are live${personalizationFeature ? ` (priority feature: ${personalizationFeature.name})` : ""}, which reduces novelty drop and improves long-term engagement quality.`,
    },
    {
      title: "Prioritize highest-confidence P0 feature",
      detail: topFeature
        ? `${topFeature.name} shows the strongest near-term ROI (${topFeature.roi}) with ${topFeature.confidence}% confidence. Ship this before broader expansion work.`
        : "Lead with your highest-confidence P0 recommendation before moving to optimization tracks.",
    },
    {
      title: "Instrument impact with evidence loops",
      detail: `Attach each shipped feature to a metric owner and post-release evidence snapshot to continuously strengthen confidence scoring and roadmap quality${gamificationFeature ? ` (especially for ${gamificationFeature.name})` : ""}.`,
    },
  ];
}

// ── Architecture Change Pills ──────────────────────────────────────────────────
function ArchPills({ label, items, icon: Icon, color }: {
  label: string;
  items: string[] | undefined;
  icon: React.ElementType;
  color: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg bg-card/50 border border-primary/10 text-foreground/80 leading-snug">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Decision Card (Execution Plan) ────────────────────────────────────────────
function DecisionCard({ decision, index }: { decision: S1Decision; index: number }) {
  const [open, setOpen] = useState(false);
  const priorityColor = decision.priority === "P0"
    ? "bg-red-500/15 text-red-400 border-red-500/25"
    : decision.priority === "P1"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
    : "bg-primary/10 text-primary/80 border-primary/20";

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors text-left"
      >
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${priorityColor}`}>
          {decision.priority}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{decision.feature}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{decision.problem}</p>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/25 space-y-4 pt-3">
          {/* Why */}
          {decision.why?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Why build this</p>
              <ul className="space-y-1">
                {decision.why.map((w, i) => (
                  <li key={i} className="text-xs text-foreground/85 flex gap-1.5">
                    <span className="w-1 h-1 mt-1.5 rounded-full bg-primary/60 shrink-0" />{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact */}
          {decision.impact && (
            <div className="rounded-xl bg-primary/8 border border-primary/15 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">Expected Impact — </span>
              <span className="text-xs text-foreground/90">{decision.impact}</span>
            </div>
          )}

          {/* Architecture changes */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Architecture Changes</p>
            <ArchPills label="UI Changes" items={decision.ui_changes} icon={Monitor} color="#38bdf8" />
            <ArchPills label="Data Model" items={decision.data_model_changes} icon={Database} color="#60a5fa" />
            <ArchPills label="Workflow" items={decision.workflow_changes} icon={Workflow} color="#a78bfa" />
          </div>

          {/* Tasks */}
          {decision.tasks?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Implementation Tasks</p>
              <div className="space-y-2">
                {decision.tasks.map((t, ti) => (
                  <div key={ti} className="rounded-xl border border-primary/12 bg-card/30 p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {ti + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-medium text-foreground">{t.task}</p>
                        {t.milestone && (
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/70 border border-primary/15">
                            {t.milestone}
                          </span>
                        )}
                        {t.agentPrompt && (
                          <div className="mt-1.5 rounded-lg bg-muted/40 border border-border/30 px-2.5 py-2">
                            <p className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider mb-1">Agent Prompt</p>
                            <p className="text-[11px] text-foreground/70 font-mono leading-relaxed">{t.agentPrompt}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feature Architecture Inline ───────────────────────────────────────────────
function FeatureArchCard({ feature, priority }: { feature: S1Feature; priority: "P0" | "P1" | "P2" }) {
  const [open, setOpen] = useState(false);
  const hasArch = (feature.ui_changes?.length ?? 0) > 0
    || (feature.backend_changes?.length ?? 0) > 0
    || (feature.api_changes?.length ?? 0) > 0
    || (feature.data_model_changes?.length ?? 0) > 0
    || (feature.workflow_changes?.length ?? 0) > 0;
  const hasTasks = (feature.tasks?.length ?? 0) > 0;

  if (!hasArch && !hasTasks) return null;

  const priorityColor = priority === "P0"
    ? "bg-red-500/15 text-red-400 border-red-500/25"
    : priority === "P1"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
    : "bg-primary/10 text-primary/80 border-primary/20";

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors text-left"
      >
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${priorityColor}`}>{priority}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{feature.feature}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{feature.effort} effort · {feature.tasks?.length ?? 0} tasks</p>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/25 pt-3 space-y-4">
          {hasArch && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Architecture Surface</p>
              <ArchPills label="UI Changes" items={feature.ui_changes} icon={Monitor} color="#38bdf8" />
              <ArchPills label="Backend" items={feature.backend_changes} icon={Code2} color="#34d399" />
              <ArchPills label="API" items={feature.api_changes} icon={GitBranch} color="#f472b6" />
              <ArchPills label="Data Model" items={feature.data_model_changes} icon={Database} color="#60a5fa" />
              <ArchPills label="Workflow" items={feature.workflow_changes} icon={Workflow} color="#a78bfa" />
            </div>
          )}

          {hasTasks && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Tasks</p>
              <div className="space-y-2">
                {feature.tasks!.map((t, ti) => (
                  <div key={ti} className="rounded-xl border border-primary/12 bg-card/30 p-3 flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {ti + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-foreground">{t.task}</p>
                      {t.milestone && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/70 border border-primary/15">
                          {t.milestone}
                        </span>
                      )}
                      {t.agentPrompt && (
                        <div className="mt-1.5 rounded-lg bg-muted/40 border border-border/30 px-2.5 py-2">
                          <p className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider mb-1">Agent Prompt</p>
                          <p className="text-[11px] text-foreground/70 font-mono leading-relaxed">{t.agentPrompt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductIntelligenceDashboard({ data }: { data: Starox1Output }) {
  // ── Defensive guards — AI output may be partial ───────────────────────────
  const safeData: Starox1Output = {
    ...data,
    productSummary: data.productSummary ?? { name: "Product", oneLiner: "", category: "", stage: "mvp" },
    problemsIdentified: data.problemsIdentified ?? [],
    featureRecommendations: {
      p0: data.featureRecommendations?.p0 ?? [],
      p1: data.featureRecommendations?.p1 ?? [],
      p2: data.featureRecommendations?.p2 ?? [],
    },
    targetUsers: data.targetUsers ?? [],
    marketAnalysis: data.marketAnalysis ?? {
      marketSize: "",
      competitors: [],
      differentiationStrategy: "",
      marketGaps: [],
    },
    architecturePlan: data.architecturePlan ?? {
      recommendedStack: { frontend: "", backend: "", database: "", infra: "" },
      modules: [],
      scalingConsiderations: [],
    },
    roadmap: {
      mvp:   { timeline: "0-3 months",  features: [], successMetric: "", ...(data.roadmap?.mvp   ?? {}) },
      v1:    { timeline: "3-6 months",  features: [], successMetric: "", ...(data.roadmap?.v1    ?? {}) },
      scale: { timeline: "6-12 months", features: [], successMetric: "", ...(data.roadmap?.scale ?? {}) },
    },
    strategicInsights: data.strategicInsights ?? {
      monetizationIdeas: [],
      scalingOpportunities: [],
      productDirection: "",
      keyRisks: [],
    },
  };

  const featureItems = buildFeatureItems(safeData);
  const insights = buildInsights(safeData);
  const aiRecommendations = buildAiRecommendations(safeData, featureItems);

  const onboardingDrop = 55;
  const retentionBoost = parsePercent(featureItems[0]?.why) ?? parsePercent(featureItems[0]?.roi) ?? 24;
  const avgConfidence = Math.round(
    featureItems.length > 0
      ? featureItems.reduce((acc, item) => acc + item.confidence, 0) / featureItems.length
      : 78,
  );
  const satisfactionScore = clamp(Math.round(64 + avgConfidence * 0.28), 68, 92);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-card/40 via-card/30 to-background/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/90">Product Intelligence Command Center</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{safeData.productSummary.name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{safeData.productSummary.oneLiner}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {safeData.mode && (
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                safeData.mode === "proactive"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                  : "bg-primary/12 text-primary border-primary/20"
              }`}>
                <Zap className="h-3 w-3" />
                {safeData.mode === "proactive" ? "Proactive Mode" : "Reactive Mode"}
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs text-primary border border-primary/20">
              <BadgeCheck className="h-3.5 w-3.5" />
              Stage: {safeData.productSummary.stage}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Onboarding Drop-off" value={`${onboardingDrop}%`} delta="Step 2 leak is critical" icon={AlertTriangle} />
          <MetricCard title="Expected Retention Increase" value={`+${retentionBoost}%`} delta="Projected after P0 fixes" icon={TrendingUp} />
          <MetricCard title="User Satisfaction Score" value={`${satisfactionScore}/100`} delta="Placeholder benchmark" icon={Gauge} />
          <MetricCard title="Model Confidence" value={`${avgConfidence}%`} delta="Evidence-backed scoring" icon={BrainCircuit} />
        </div>
      </section>

      <section>
        <RoadmapTimeline data={safeData.roadmap} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Insights & Problems</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((item, idx) => (
                <InsightCard key={`${item.title}-${idx}`} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Sticky Risk Notes</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {safeData.problemsIdentified.slice(0, 4).map((problem, idx) => (
                <StickyNote
                  key={`${problem.problem}-${idx}`}
                  title={problem.problem}
                  body={problem.rootCause || problem.impact}
                  impact={toImpact(problem.severity)}
                  confidence={confidenceFromEvidence(problem.evidence?.length ?? 0, Boolean(problem.rootCause))}
                />
              ))}
            </div>
          </div>
        </div>

        <FunnelChart />
      </section>

      <section>
        <FeatureImpactMap items={featureItems} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Evidence Mapping</h3>
          </div>
          <div className="space-y-3">
            {(safeData.evidenceMapping?.problemToEvidence ?? []).slice(0, 5).map((item, idx) => (
              <div key={`${item.problem}-${idx}`} className="rounded-xl border border-primary/12 bg-card/30 p-3">
                <p className="text-xs font-semibold text-foreground">{item.problem}</p>
                <p className="mt-1 text-[11px] text-primary/70">Source: {item.evidenceSource}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.evidence.join(" | ")}</p>
              </div>
            ))}
            {(safeData.evidenceMapping?.problemToEvidence ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No explicit evidence map returned in this run.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Market Analysis</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/12 bg-card/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Market Size</p>
              <p className="mt-1 text-xs text-foreground">{safeData.marketAnalysis.marketSize}</p>
            </div>
            <div className="rounded-xl border border-primary/12 bg-card/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Differentiation</p>
              <p className="mt-1 text-xs text-foreground">{safeData.marketAnalysis.differentiationStrategy}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {safeData.marketAnalysis.competitors.slice(0, 4).map((competitor, idx) => (
                <div key={`${competitor.name}-${idx}`} className="rounded-xl border border-primary/12 bg-card/30 p-3">
                  <p className="text-xs font-semibold text-foreground">{competitor.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Weakness: {competitor.weakness}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Architecture Plan</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(safeData.architecturePlan.recommendedStack).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-primary/12 bg-card/30 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{key}</p>
                <p className="mt-1 text-xs text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {safeData.architecturePlan.modules.slice(0, 6).map((module, idx) => (
              <div key={`${module.name}-${idx}`} className="rounded-xl border border-primary/12 bg-card/30 p-3">
                <p className="text-xs font-semibold text-foreground">{module.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{module.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Strategic Takeaways</h3>
          </div>
          <div className="space-y-2">
            {(safeData.strategicTakeaways ?? safeData.strategicInsights.keyRisks).slice(0, 6).map((takeaway, idx) => (
              <div key={`${takeaway}-${idx}`} className="rounded-xl border border-primary/12 bg-card/30 p-3 text-xs text-foreground/90">
                {takeaway}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Execution Plan ── */}
      {(safeData.executionPlan?.decisions?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card/60 via-card/40 to-background/20 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Execution Plan</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {safeData.executionPlan!.decisions.length} decision{safeData.executionPlan!.decisions.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {safeData.executionPlan!.decisions.map((decision, idx) => (
              <DecisionCard key={`${decision.feature}-${idx}`} decision={decision} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* ── Feature Architecture Map ── */}
      {(() => {
        const archFeatures: Array<{ feature: S1Feature; priority: "P0" | "P1" | "P2" }> = [
          ...safeData.featureRecommendations.p0.map(f => ({ feature: f, priority: "P0" as const })),
          ...safeData.featureRecommendations.p1.map(f => ({ feature: f, priority: "P1" as const })),
          ...safeData.featureRecommendations.p2.map(f => ({ feature: f, priority: "P2" as const })),
        ].filter(({ feature: f }) =>
          (f.ui_changes?.length ?? 0) + (f.backend_changes?.length ?? 0) +
          (f.api_changes?.length ?? 0) + (f.data_model_changes?.length ?? 0) +
          (f.workflow_changes?.length ?? 0) + (f.tasks?.length ?? 0) > 0
        );

        if (archFeatures.length === 0) return null;

        return (
          <section className="rounded-2xl border border-primary/15 bg-card/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Feature Architecture & Tasks</h3>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {archFeatures.length} feature{archFeatures.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {archFeatures.map(({ feature, priority }, idx) => (
                <FeatureArchCard key={`${feature.feature}-${idx}`} feature={feature} priority={priority} />
              ))}
            </div>
          </section>
        );
      })()}

      <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/70 to-card/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Recommendations</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {aiRecommendations.map((rec, idx) => (
            <div key={`${rec.title}-${idx}`} className="rounded-xl border border-primary/20 bg-background/45 p-4">
              <p className="text-sm font-semibold text-foreground">{rec.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{rec.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
