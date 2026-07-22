import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowUpRight, Boxes, BrainCircuit, CheckCircle2, Code2, Download,
  ExternalLink, FileCode2, Github, Globe, LineChart, Loader2, Play, RefreshCw,
  Route, Sparkles, Target, Zap,
} from "lucide-react";
import { useAnalysisStore } from "@/lib/store";
import type { Starox2CodePrompt, Starox2Output, Starox2UiPrompt } from "@/lib/store";
import { exportStarox2PDF } from "@/lib/pdfExport";
import AgentLoadingState from "./AgentLoadingState";

function Section({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary/15 bg-card/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/25 bg-muted/20">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {badge !== undefined && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function PriorityPill({ value }: { value: string }) {
  const tone = value.toLowerCase() === "high"
    ? "bg-primary/12 text-primary border-primary/20"
    : value.toLowerCase() === "medium"
      ? "bg-primary/8 text-primary/80 border-primary/15"
      : "bg-muted/30 text-muted-foreground border-border/20";
  return <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${tone}`}>{value}</span>;
}

function IssueCard({ issue, index }: { issue: Starox2Output["uxIssues"][number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-primary/15 bg-card/35 p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <PriorityPill value={issue.severity} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55">{issue.type.replace(/_/g, " ")}</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground leading-snug">{issue.issue}</h4>
          <p className="text-xs text-primary/70 mt-1">{issue.area}</p>
        </div>
        {issue.annotation && <PriorityPill value={issue.annotation.priority || "Medium"} />}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{issue.why}</p>
      <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-1.5">Fix</p>
        <p className="text-xs text-foreground/80 leading-relaxed">{issue.recommendation}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-primary/80">{issue.estimated_impact}</span>
        <span className="text-[11px] text-muted-foreground/60">Complexity: {issue.complexity}</span>
      </div>
    </motion.div>
  );
}

function PromptCard({ prompt, icon: Icon, extra }: { prompt: Starox2UiPrompt | Starox2CodePrompt; icon: React.ElementType; extra?: React.ReactNode }) {
  const text = "file" in prompt
    ? `${prompt.title}\nFile: ${prompt.file}\nIssue: ${prompt.issue}\nFix: ${prompt.fix}\nValidation: ${prompt.validation}`
    : `${prompt.title}\n${prompt.prompt}`;

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/35 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{prompt.title}</h4>
            {"priority" in prompt && <p className="text-[11px] text-primary/70 mt-1">Priority: {prompt.priority}</p>}
          </div>
        </div>
        <button
          onClick={() => void navigator.clipboard.writeText(text)}
          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/8 text-primary font-semibold hover:bg-primary/15 transition-colors"
        >
          Copy
        </button>
      </div>
      {"file" in prompt ? (
        <div className="space-y-2 text-xs">
          <p className="text-primary/80 font-mono">{prompt.file}</p>
          <p className="text-muted-foreground leading-relaxed">{prompt.issue}</p>
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-foreground/80 leading-relaxed">{prompt.fix}</div>
          <p className="text-[11px] text-muted-foreground/70">Validation: {prompt.validation}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/20 bg-muted/30 p-3 text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {prompt.prompt}
        </div>
      )}
      {extra}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg text-center rounded-[28px] border border-primary/15 bg-card/40 p-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <LineChart className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">STAROX-2 Experience Intelligence</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          Run a live product or GitHub repository analysis to surface UX friction, repo-level implementation gaps, and execution-ready improvement prompts.
        </p>
      </div>
    </div>
  );
}

export default function Starox2Panel() {
  const {
    starox2, starox2Target, starox2Error, isAnalyzingS2, analysisStep, analysisProgress,
    startStarox2Analysis, currentUrl, pageScreenshots,
  } = useAnalysisStore();
  const [exporting, setExporting] = useState(false);

  const rerunTarget = starox2Target ?? (currentUrl ? { mode: "url" as const, url: currentUrl } : null);

  const handleExport = async () => {
    if (!starox2 || !currentUrl) return;
    setExporting(true);
    try {
      await exportStarox2PDF(starox2, pageScreenshots, currentUrl);
    } finally {
      setExporting(false);
    }
  };

  if (isAnalyzingS2) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/35">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <LineChart className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">STAROX-2</p>
            <p className="text-[11px] text-muted-foreground">Experience Intelligence</p>
          </div>
        </div>
        <AgentLoadingState
          step={analysisStep || "Analyzing experience intelligence..."}
          progress={analysisProgress}
          icon={LineChart}
          steps={[
            { label: "Scanning live product and pages", icon: Globe, threshold: 22 },
            { label: "Building intelligence map", icon: Route, threshold: 58 },
            { label: "Detecting UX issues and prompts", icon: Target, threshold: 80 },
            { label: "Forecasting conversion impact", icon: Sparkles, threshold: 100 },
          ]}
        />
      </div>
    );
  }

  if (starox2Error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-[28px] border border-red-500/20 bg-card/40 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">STAROX-2 failed</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">{starox2Error}</p>
          {rerunTarget && (
            <button
              onClick={() => void startStarox2Analysis(rerunTarget)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!starox2) {
    return <EmptyState />;
  }

  const isGithub = starox2.analysisMode === "github";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/35">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <LineChart className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">STAROX-2</p>
            <PriorityPill value={isGithub ? "github" : "url"} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{starox2.analyzedEntity.label}</p>
        </div>
        {rerunTarget && (
          <button
            onClick={() => void startStarox2Analysis(rerunTarget)}
            className="p-2 rounded-xl border border-border/20 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            title="Re-run analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isGithub ? <Github className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Experience Intelligence Summary</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground leading-tight">{starox2.uxSummary}</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{starox2.sourceContext.modeSummary}</p>
            </div>
            <a
              href={starox2.analyzedEntity.primaryUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80"
            >
              Open source <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Issues", value: starox2.uxIssues.length },
              { label: "Pages", value: starox2.pages.length },
              { label: "Code prompts", value: starox2.implementationPrompts.code.length },
              { label: "Experiments", value: starox2.implementationPrompts.experiments.length },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-primary/15 bg-card/35 p-4">
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <Section title="Runtime Coverage" icon={Play} badge={starox2.runtimeReadiness.status.replace(/_/g, " ")}>
          <p className="text-sm text-muted-foreground leading-relaxed">{starox2.runtimeReadiness.summary}</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {starox2.runtimeReadiness.artifacts.map((artifact, index) => (
              <div key={`${artifact.label}-${index}`} className="rounded-2xl border border-border/20 bg-card/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{artifact.label}</p>
                  <PriorityPill value={artifact.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{artifact.detail}</p>
                <p className="text-[11px] text-primary/70 mt-2 uppercase tracking-[0.18em]">{artifact.type}</p>
              </div>
            ))}
          </div>
        </Section>

        {starox2.pages.length > 0 && (
          <Section title="Page-Level Intelligence" icon={Globe} badge={starox2.pages.length}>
            <div className="grid xl:grid-cols-2 gap-3">
              {starox2.pages.map((page, index) => (
                <motion.div
                  key={`${page.url}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-primary/15 bg-card/35 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{page.title}</h4>
                      <p className="text-xs text-primary/70 mt-1">{page.pageType}</p>
                    </div>
                    <PriorityPill value={page.priorityScore} />
                  </div>
                  <a href={page.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary">
                    {page.url} <ArrowUpRight className="w-3 h-3" />
                  </a>
                  <div className="space-y-2 mt-4">
                    {page.improvements.slice(0, 2).map((item, itemIndex) => (
                      <div key={itemIndex} className="rounded-xl border border-border/20 bg-muted/25 p-3">
                        <p className="text-xs text-foreground/80">{item.improvement}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{item.impact}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Prioritized Issues" icon={AlertTriangle} badge={starox2.uxIssues.length}>
          <div className="grid xl:grid-cols-2 gap-3">
            {starox2.uxIssues.map((issue, index) => (
              <IssueCard key={issue.id || `${issue.issue}-${index}`} issue={issue} index={index} />
            ))}
          </div>
        </Section>

        <Section title="Improvements and Flow Fixes" icon={Route} badge={starox2.userJourneyOptimizations.length + starox2.featureEnhancements.length}>
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              {starox2.featureEnhancements.map((item, index) => (
                <div key={`${item.feature}-${index}`} className="rounded-2xl border border-primary/15 bg-card/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">{item.feature}</h4>
                    <PriorityPill value={item.impact} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{item.currentState}</p>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 mt-3 text-xs text-foreground/80">{item.improvement}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {starox2.userJourneyOptimizations.map((item, index) => (
                <div key={`${item.flow}-${index}`} className="rounded-2xl border border-primary/15 bg-card/35 p-4">
                  <h4 className="text-sm font-semibold text-foreground">{item.flow}</h4>
                  <p className="text-xs text-muted-foreground mt-2">{item.problem}</p>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 mt-3 text-xs text-foreground/80">{item.solution}</div>
                  <p className="text-[11px] text-primary/70 mt-2">{item.expectedDropoffReduction}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {isGithub && (
          <Section title="Repo Intelligence" icon={Boxes} badge={starox2.repoIntelligence.implementationGaps.length}>
            <p className="text-sm text-muted-foreground leading-relaxed">{starox2.repoIntelligence.summary}</p>
            <div className="grid xl:grid-cols-2 gap-4 mt-4">
              {[
                { title: "Component hierarchy", items: starox2.repoIntelligence.componentHierarchy, icon: Boxes },
                { title: "Routing state", items: starox2.repoIntelligence.routingState, icon: Route },
                { title: "State management", items: starox2.repoIntelligence.stateManagement, icon: BrainCircuit },
                { title: "UI architecture", items: starox2.repoIntelligence.uiArchitecture, icon: FileCode2 },
              ].map((group) => (
                <div key={group.title} className="rounded-2xl border border-border/20 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <group.icon className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                  </div>
                  <div className="space-y-2">
                    {group.items.length > 0 ? group.items.map((item, index) => (
                      <div key={index} className="text-xs text-foreground/80 rounded-xl border border-border/15 bg-muted/25 p-3">{item}</div>
                    )) : (
                      <p className="text-xs text-muted-foreground/60">No structured findings returned for this category.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {starox2.repoIntelligence.implementationGaps.length > 0 && (
              <div className="space-y-3 mt-4">
                {starox2.repoIntelligence.implementationGaps.map((gap, index) => (
                  <div key={`${gap.title}-${index}`} className="rounded-2xl border border-primary/15 bg-card/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-foreground">{gap.title}</h4>
                      <PriorityPill value={gap.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{gap.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section title="Implementation Prompts" icon={Code2} badge={starox2.implementationPrompts.ui.length + starox2.implementationPrompts.code.length}>
          <div className="space-y-4">
            {starox2.implementationPrompts.ui.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">UI Prompts</h4>
                </div>
                <div className="grid xl:grid-cols-2 gap-3">
                  {starox2.implementationPrompts.ui.map((prompt, index) => (
                    <PromptCard key={`${prompt.title}-${index}`} prompt={prompt} icon={Sparkles} />
                  ))}
                </div>
              </div>
            )}

            {starox2.implementationPrompts.code.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Code Prompts</h4>
                </div>
                <div className="grid xl:grid-cols-2 gap-3">
                  {starox2.implementationPrompts.code.map((prompt, index) => (
                    <PromptCard key={`${prompt.title}-${index}`} prompt={prompt} icon={FileCode2} />
                  ))}
                </div>
              </div>
            )}

            {starox2.implementationPrompts.experiments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Experiments</h4>
                </div>
                <div className="grid xl:grid-cols-2 gap-3">
                  {starox2.implementationPrompts.experiments.map((prompt, index) => (
                    <PromptCard key={`${prompt.title}-${index}`} prompt={prompt} icon={Target} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section title="Optimization Strategy" icon={Zap} badge={starox2.feedbackLoop.productSignalsToTrack.length}>
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-primary/15 bg-card/35 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Signals to track</h4>
              </div>
              <div className="space-y-2">
                {starox2.feedbackLoop.productSignalsToTrack.map((item, index) => (
                  <div key={index} className="text-xs text-foreground/80 rounded-xl border border-border/15 bg-muted/25 p-3">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-card/35 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Feed back into STAROX-1</h4>
              </div>
              <div className="space-y-2">
                {starox2.feedbackLoop.starox1Opportunities.map((item, index) => (
                  <div key={index} className="text-xs text-foreground/80 rounded-xl border border-border/15 bg-muted/25 p-3">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
