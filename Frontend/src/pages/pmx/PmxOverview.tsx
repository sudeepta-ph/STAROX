import { useState, useEffect, useMemo, useRef } from "react";
import { usePmxStore, getPmxHeaders, type PmxUnderstanding } from "@/lib/pmxStore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Database,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const PLACEHOLDERS = [
  "A B2B SaaS tool for managing contractor invoices...",
  "An AI-powered onboarding flow for fintech apps...",
  "A marketplace for freelance product designers...",
  "A dashboard for tracking SaaS churn in real time...",
  "A mobile app that turns voice notes into PRDs...",
];

function formatClockTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return "--:--";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Groups the audit trail by calendar day so the timeline reads like a log
// rather than an undifferentiated stack of timestamps.
function dayBucketLabel(dateStr: string | Date | undefined): string {
  if (!dateStr) return "Earlier";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Earlier";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatRelativeTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function PmxOverview() {
  const navigate = useNavigate();
  const {
    inputs,
    history,
    decisions,
    solutions,
    tasks,
    understanding,
    problems,
    projectId,
    openTabIds,
    workspaces,
  } = usePmxStore();

  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [ideaPrd, setIdeaPrd] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect for fresh home idea hero
  useEffect(() => {
    const current = PLACEHOLDERS[phIdx];
    let delay = 45;
    let next: () => void;

    if (!deleting && typedText.length < current.length) {
      next = () => setTypedText(current.slice(0, typedText.length + 1));
    } else if (!deleting && typedText.length === current.length) {
      delay = 1800;
      next = () => setDeleting(true);
    } else if (deleting && typedText.length > 0) {
      delay = 25;
      next = () => setTypedText(current.slice(0, typedText.length - 1));
    } else {
      delay = 300;
      next = () => {
        setDeleting(false);
        setPhIdx((i) => (i + 1) % PLACEHOLDERS.length);
      };
    }

    const id = setTimeout(next, delay);
    return () => clearTimeout(id);
  }, [typedText, deleting, phIdx]);

  // Fetch idea PRD doc if exists
  useEffect(() => {
    setIdeaPrd(null);
    (async () => {
      try {
        const headers = await getPmxHeaders();
        const res = await fetch(`${API_URL}/pmx/idea/prd/latest?projectId=${encodeURIComponent(projectId)}`, { headers });
        const json = await res.json();
        if (json.success) setIdeaPrd(json.data);
      } catch {
        /* no idea PRD */
      }
    })();
  }, [projectId]);

  const rawSessionExists = inputs.length > 0 || decisions.length > 0 || !!ideaPrd || solutions.length > 0 || tasks.length > 0;

  const [graduated, setGraduated] = useState(false);
  useEffect(() => {
    try {
      setGraduated(localStorage.getItem(`pmx_workspace_graduated_${projectId}`) === "1");
    } catch {
      setGraduated(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (rawSessionExists && !graduated) {
      try {
        localStorage.setItem(`pmx_workspace_graduated_${projectId}`, "1");
      } catch {
        /* ignore */
      }
      setGraduated(true);
    }
  }, [rawSessionExists, graduated, projectId]);

  const isPromotedWorkspace = openTabIds.includes(projectId);
  const sessionExists = isPromotedWorkspace && (rawSessionExists || graduated);

  const submit = () => {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    navigate("/pmx/prd", { state: { initialIdea: idea, source: "idea-input" } });
  };

  if (sessionExists) {
    return (
      <WorkspaceOverview
        navigate={navigate}
        workspaceName={
          understanding?.productSummary?.name ||
          workspaces.find((w) => w.projectId === projectId)?.name ||
          "Product Workspace"
        }
        inputs={inputs}
        decisions={decisions}
        solutions={solutions}
        tasks={tasks}
        history={history}
        ideaPrd={ideaPrd}
        problems={problems}
        understanding={understanding}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Ambient top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 h-64 -z-0"
        style={{
          background: "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(56,189,248,0.13) 0%, transparent 70%)",
        }}
      />

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/8 border border-sky-500/15 px-3 py-1 rounded-full tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            Product Intelligence Workspace
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12] mb-4 max-w-2xl"
        >
          What should you
          <br className="hidden sm:block" /> build next?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm text-muted-foreground max-w-md leading-relaxed mb-10"
        >
          Describe your product, feature, startup, or idea. PMX will research, validate, and generate an execution-ready plan.
        </motion.p>

        {/* Prompt input */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl mb-6"
        >
          <div
            className={`relative flex items-center rounded-2xl border transition-all duration-200 bg-card/70 backdrop-blur-md shadow-lg ${
              focused ? "border-sky-500/40 shadow-[0_0_0_3px_rgba(56,189,248,0.08)]" : "border-border/60 hover:border-border"
            }`}
          >
            {!idea && (
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 flex items-center text-sm text-muted-foreground/45 truncate pr-40 w-full">
                {typedText}
                <span className="ml-0.5 inline-block h-4 w-px bg-muted-foreground/45 animate-pulse" />
              </span>
            )}

            <input
              ref={inputRef}
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={generating}
              className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground focus:outline-none placeholder-transparent disabled:opacity-60"
            />

            <div className="pr-2 shrink-0">
              <button
                onClick={submit}
                disabled={!idea.trim() || generating}
                aria-label="Build from idea"
                className="group inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground transition-all duration-200 shadow-[0_2px_12px_rgba(56,189,248,0.22)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.35)] hover:-translate-y-px active:translate-y-0"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Secondary actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.26 }}
          className="flex flex-wrap items-center justify-center gap-2.5"
        >
          <button
            onClick={() => navigate("/pmx/analysis")}
            className="nav-shimmer relative inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-500 dark:text-sky-300 hover:bg-sky-500/15 hover:border-sky-500/40 transition-all duration-200 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
            AI Experience Intelligence
          </button>
          <button
            onClick={() => navigate("/pmx/sources")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Analyze Existing Product
          </button>
        </motion.div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   AUDIT TRAIL VOCABULARY

   The backend writes structured audit rows (`action` + `entityType`, see
   backend/src/workspaces/pmx/routes/pmx.ts logAudit calls). Mapping off
   those fields — rather than pattern-matching the free-text `details` —
   keeps the activity timeline accurate as copy changes server-side.
   ══════════════════════════════════════════════════════════════════════ */

const ENTITY_AREA: Record<string, string> = {
  PmxInput: "Sources",
  PmxUnderstanding: "Workspace",
  PmxProject: "Workspace",
  PmxEvidence: "Insights",
  PmxProblem: "Insights",
  PmxOpportunity: "Insights",
  PmxDecision: "Insights",
  PmxSolution: "PRD",
  PmxIdeaPrd: "PRD",
  PmxExecutionTask: "Execution",
  PmxArtifact: "Artifacts",
  PmxScreenshotProject: "UI Analysis",
  PmxSession: "Pipeline",
};

const ACTION_COPY: Record<string, { title: string; context: string }> = {
  input_created: { title: "Source connected", context: "Ingestion" },
  input_updated: { title: "Source updated", context: "Ingestion" },
  input_reprocessed: { title: "Source reprocessed", context: "Ingestion" },
  input_deleted: { title: "Source removed", context: "Ingestion" },
  understanding_updated: { title: "Product understanding updated", context: "Context model" },
  project_renamed: { title: "Workspace renamed", context: "Settings" },
  project_deleted: { title: "Workspace deleted", context: "Settings" },
  evidence_created: { title: "Evidence recorded", context: "Signals" },
  evidence_deleted: { title: "Evidence removed", context: "Signals" },
  problem_created: { title: "Problem logged", context: "Diagnosis" },
  problem_deleted: { title: "Problem removed", context: "Diagnosis" },
  opportunity_created: { title: "Opportunity logged", context: "Prioritisation" },
  opportunity_updated: { title: "Opportunity reprioritised", context: "Prioritisation" },
  opportunity_deleted: { title: "Opportunity removed", context: "Prioritisation" },
  decision_status_changed: { title: "Insight decision recorded", context: "Review" },
  decision_deleted: { title: "Insight removed", context: "Review" },
  solution_created: { title: "PRD created", context: "Specification" },
  solution_updated: { title: "PRD updated", context: "Specification" },
  solution_refined: { title: "PRD refined", context: "Refinement" },
  solution_rewound: { title: "PRD rolled back", context: "Version history" },
  solutions_combined: { title: "PRDs merged", context: "Specification" },
  idea_prd_generated: { title: "PRD generated", context: "Specification" },
  idea_prd_refined: { title: "PRD refined", context: "Refinement" },
  idea_prd_rewound: { title: "PRD rolled back", context: "Version history" },
  task_created: { title: "Execution item created", context: "Backlog" },
  task_updated: { title: "Execution item updated", context: "Backlog" },
  task_status_changed: { title: "Execution status changed", context: "Board" },
  task_deleted: { title: "Execution item removed", context: "Backlog" },
  tasks_generated: { title: "Execution plan compiled", context: "Backlog" },
  artifact_created: { title: "Artifact exported", context: "Documents" },
  screenshot_audit_started: { title: "UI audit started", context: "Experience intelligence" },
  screenshot_audit_deleted: { title: "UI audit removed", context: "Experience intelligence" },
  ai_experience_intelligence_run: { title: "Experience intelligence run", context: "Analysis" },
  pipeline_run: { title: "Intelligence pipeline completed", context: "Analysis" },
};

// Most audit details carry their subject in double quotes —
// `Refined PRD (v2): "Improve mobile touch targets"`. Surfacing just that
// fragment keeps the timeline readable without repeating the action verb.
function extractSubject(details: string | undefined): string | null {
  if (!details) return null;
  const quoted = details.match(/"([^"]{2,120})"/);
  return quoted ? quoted[1] : null;
}

function titleForLog(log: { action?: string; details?: string }): string {
  const base = ACTION_COPY[log.action || ""]?.title;
  if (!base) {
    // Unknown/new server-side action — humanise the slug rather than
    // dropping the row from the trail entirely.
    return (log.action || "Workspace activity").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
  const version = log.details?.match(/\bto v(\d+)/i);
  if (version && base.includes("rolled back")) return `${base} to v${version[1]}`;
  return base;
}

type PulseLevel = "high" | "medium" | "ready" | "info" | "clear";

const PULSE_TONE: Record<PulseLevel, { dot: string; label: string; text: string }> = {
  high: { dot: "bg-rose-400", label: "High", text: "text-rose-400" },
  medium: { dot: "bg-amber-400", label: "Medium", text: "text-amber-400" },
  ready: { dot: "bg-sky-400", label: "Ready", text: "text-sky-400" },
  info: { dot: "bg-muted-foreground/50", label: "Note", text: "text-muted-foreground" },
  clear: { dot: "bg-emerald-400", label: "Clear", text: "text-emerald-400" },
};

interface PulseSignal {
  id: string;
  level: PulseLevel;
  title: string;
  detail: string;
  timestamp?: string;
  actionLabel?: string;
  actionHref?: string;
}

/* ══════════════════════════════════════════════════════════════════════
   WORKSPACE OVERVIEW
   ══════════════════════════════════════════════════════════════════════ */

function WorkspaceOverview({
  navigate,
  workspaceName,
  inputs,
  decisions,
  solutions,
  tasks,
  history,
  ideaPrd,
  problems,
  understanding,
}: {
  navigate: (path: string) => void;
  workspaceName: string;
  inputs: any[];
  decisions: any[];
  solutions: any[];
  tasks: any[];
  history: any[];
  ideaPrd: any;
  problems: any[];
  understanding: PmxUnderstanding | null;
}) {
  const pendingInsights = decisions.filter((d) => d.status === "pending").length;
  const approvedInsights = decisions.filter((d) => d.status === "approved" || d.status === "implemented").length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const doneTasks = tasks.length - openTasks;
  const failedSources = inputs.filter((i) => i.status === "failed").length;
  const processingSources = inputs.filter((i) => i.status === "pending" || i.status === "processing").length;
  const prdVersion = ideaPrd?.version ?? solutions[0]?.version ?? 1;
  const hasPrd = !!ideaPrd || solutions.length > 0;

  const lastAnalyzedDate = useMemo(() => {
    const stamps = [
      ...history.map((h) => new Date(h.createdAt).getTime()),
      ...inputs.map((i) => new Date(i.updatedAt || i.createdAt).getTime()),
      ...solutions.map((s: any) => new Date(s.updatedAt || s.createdAt).getTime()),
    ].filter((t) => !isNaN(t));
    return stamps.length ? new Date(Math.max(...stamps)) : null;
  }, [history, inputs, solutions]);

  /* ── Product pulse: real signals, ordered by what actually blocks work ── */
  const pulse = useMemo<PulseSignal[]>(() => {
    const signals: PulseSignal[] = [];

    // Sources that failed to ingest silently poison every downstream
    // inference, so they outrank everything else on the page.
    if (failedSources > 0) {
      const failed = inputs.find((i) => i.status === "failed");
      signals.push({
        id: "source-failed",
        level: "high",
        title: `${failedSources} source${failedSources === 1 ? "" : "s"} failed to process`,
        detail: "PMX could not read this input, so it is excluded from the current product understanding.",
        timestamp: formatRelativeTime(failed?.updatedAt || failed?.createdAt),
        actionLabel: "Fix source",
        actionHref: "/pmx/sources",
      });
    }

    // Unresolved critical/high problems — the substance of the diagnosis.
    problems
      .filter((p) => p.severity === "critical" || p.severity === "high")
      .slice(0, 2)
      .forEach((p, i) => {
        signals.push({
          id: `problem-${p._id || i}`,
          level: p.severity === "critical" ? "high" : "medium",
          title: p.title,
          detail:
            p.userImpact ||
            p.businessImpact ||
            p.description ||
            "Identified during analysis and still open.",
          timestamp: formatRelativeTime(p.createdAt),
          actionLabel: "Review insight",
          actionHref: "/pmx/insights",
        });
      });

    if (pendingInsights > 0) {
      const topPending = decisions.find((d) => d.status === "pending");
      signals.push({
        id: "insights-pending",
        level: "medium",
        title: `${pendingInsights} insight${pendingInsights === 1 ? "" : "s"} awaiting your decision`,
        detail: topPending?.title
          ? `Oldest: ${topPending.title}`
          : "Recommendations are queued for approval before they can become specifications.",
        timestamp: formatRelativeTime(topPending?.createdAt),
        actionLabel: "Review insights",
        actionHref: "/pmx/insights",
      });
    }

    // Recent PRD version movement, read from the structured audit trail.
    const prdEvent = history.find(
      (h) => h.action === "solution_rewound" || h.action === "idea_prd_rewound"
    );
    if (prdEvent) {
      signals.push({
        id: "prd-rollback",
        level: "medium",
        title: titleForLog(prdEvent),
        detail: `The specification history moved backwards — v${prdVersion} is the version engineering is reading today.`,
        timestamp: formatRelativeTime(prdEvent.createdAt),
        actionLabel: "Open PRD",
        actionHref: "/pmx/prd",
      });
    }

    if (approvedInsights > 0 && !hasPrd) {
      signals.push({
        id: "approved-no-prd",
        level: "ready",
        title: `${approvedInsights} approved insight${approvedInsights === 1 ? "" : "s"} without a specification`,
        detail: "Approved decisions are ready to be written up as a PRD before they reach engineering.",
        actionLabel: "Create PRD",
        actionHref: "/pmx/prd",
      });
    }

    if (hasPrd && tasks.length === 0) {
      signals.push({
        id: "prd-no-tasks",
        level: "ready",
        title: "PRD has no execution plan yet",
        detail: `v${prdVersion} is specified but has not been broken down into work items.`,
        actionLabel: "Plan execution",
        actionHref: "/pmx/execution",
      });
    } else if (openTasks > 0) {
      signals.push({
        id: "tasks-open",
        level: "ready",
        title: `${openTasks} execution item${openTasks === 1 ? "" : "s"} open`,
        detail:
          doneTasks > 0
            ? `${doneTasks} of ${tasks.length} complete across the current board.`
            : "Work is specified and waiting to be picked up on the execution board.",
        timestamp: formatRelativeTime(tasks[0]?.updatedAt || tasks[0]?.createdAt),
        actionLabel: "View board",
        actionHref: "/pmx/execution",
      });
    }

    if (processingSources > 0) {
      signals.push({
        id: "sources-processing",
        level: "info",
        title: `${processingSources} source${processingSources === 1 ? "" : "s"} still processing`,
        detail: "Insights on this page will change once ingestion finishes.",
        actionLabel: "View sources",
        actionHref: "/pmx/sources",
      });
    }

    if (inputs.length === 1 && failedSources === 0) {
      signals.push({
        id: "single-source",
        level: "info",
        title: "Everything PMX knows comes from one source",
        detail: "A second input — repository, analytics export, or customer notes — materially raises confidence.",
        actionLabel: "Add source",
        actionHref: "/pmx/sources",
      });
    }

    if (signals.length === 0) {
      signals.push({
        id: "clear",
        level: "clear",
        title: "Nothing needs your attention",
        detail: "No open problems, pending decisions, or unassigned work in this workspace.",
        timestamp: lastAnalyzedDate ? formatRelativeTime(lastAnalyzedDate) : undefined,
      });
    }

    return signals.slice(0, 5);
  }, [
    inputs,
    failedSources,
    processingSources,
    problems,
    decisions,
    pendingInsights,
    approvedInsights,
    history,
    prdVersion,
    hasPrd,
    tasks,
    openTasks,
    doneTasks,
    lastAnalyzedDate,
  ]);

  const attentionCount = pulse.filter((s) => s.level === "high" || s.level === "medium").length;

  /* ── Activity trail, grouped by day ── */
  const activityDays = useMemo(() => {
    const rows = [...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .map((log) => ({
        id: log._id,
        time: formatClockTime(log.createdAt),
        day: dayBucketLabel(log.createdAt),
        title: titleForLog(log),
        subject: extractSubject(log.details),
        area: ENTITY_AREA[log.entityType] || "Workspace",
        context: ACTION_COPY[log.action || ""]?.context || "Activity",
        raw: log.details as string | undefined,
      }));

    const groups: Array<{ day: string; rows: typeof rows }> = [];
    rows.forEach((row) => {
      const last = groups[groups.length - 1];
      if (last && last.day === row.day) last.rows.push(row);
      else groups.push({ day: row.day, rows: [row] });
    });
    return groups;
  }, [history]);

  const isLowData = inputs.length === 0 && decisions.length === 0 && tasks.length === 0 && !hasPrd;

  return (
    <div className="relative flex flex-col min-h-full bg-background selection:bg-sky-500/20">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-72"
        style={{
          background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(56,189,248,0.05) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1160px] mx-auto px-5 sm:px-8 pt-9 pb-24"
      >
        {/* ── WORKSPACE HEADER ───────────────────────────────────────── */}
        <header className="pb-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-sky-400/90 mb-2">
                Product Intelligence Workspace
              </p>
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.022em] text-foreground leading-[1.15] truncate">
                {workspaceName}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed max-w-xl">
                {understanding?.productSummary?.oneLiner
                  ? understanding.productSummary.oneLiner
                  : "PMX is tracking your product context, decisions, insights, and execution."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:mt-[26px]">
              <button
                onClick={() => navigate("/pmx/analysis")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] hover:bg-sky-500/[0.13] hover:border-sky-500/40 text-[12px] font-semibold text-sky-400 transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Run UX audit
              </button>
              <button
                onClick={() => navigate("/pmx/sources")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 hover:border-border hover:bg-muted/50 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add source
              </button>
            </div>
          </div>

          {/* Compact metadata strip */}
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-5 text-[12px]">
            {[
              { label: "Last analyzed", value: lastAnalyzedDate ? formatRelativeTime(lastAnalyzedDate) : "never" },
              { label: "Sources", value: `${inputs.length} connected` },
              { label: "PRD", value: hasPrd ? `v${prdVersion}` : "none", mono: true },
              { label: "Open insights", value: `${pendingInsights}`, mono: true },
              { label: "Open execution", value: `${openTasks}`, mono: true },
            ].map((meta, i) => (
              <div key={meta.label} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="hidden sm:block h-3 w-px bg-border/70" />}
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-muted-foreground/70">{meta.label}</dt>
                  <dd className={`text-foreground/90 font-medium ${meta.mono ? "tabular-nums" : ""}`}>{meta.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </header>

        {isLowData ? (
          <LowDataState navigate={navigate} />
        ) : (
          <>
            {/* ── WHAT'S HAPPENING + WORKSPACE STATE ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-10 pt-8 items-start">
              {/* Product pulse */}
              <section className="lg:col-span-8 min-w-0">
                <SectionHeader
                  label="Product pulse"
                  trailing={
                    <span className={attentionCount > 0 ? "text-foreground/80" : "text-muted-foreground"}>
                      {attentionCount > 0
                        ? `${attentionCount} thing${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your attention`
                        : "Up to date"}
                    </span>
                  }
                />

                <div className="divide-y divide-border/40 border-y border-border/40">
                  {pulse.map((signal) => {
                    const tone = PULSE_TONE[signal.level];
                    return (
                      <article key={signal.id} className="group py-3.5 flex gap-3.5">
                        <span className="mt-[7px] shrink-0">
                          <span className={`block h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2.5 flex-wrap">
                            <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${tone.text}`}>
                              {tone.label}
                            </span>
                            <h3 className="text-[13.5px] font-semibold text-foreground leading-snug">
                              {signal.title}
                            </h3>
                          </div>
                          <p className="text-[12.5px] text-muted-foreground leading-relaxed mt-1 max-w-2xl">
                            {signal.detail}
                          </p>
                          {signal.actionHref && (
                            <button
                              onClick={() => navigate(signal.actionHref!)}
                              className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-sky-400 transition-colors"
                            >
                              {signal.actionLabel}
                              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          )}
                        </div>

                        {signal.timestamp && (
                          <span className="shrink-0 text-[11px] text-muted-foreground/60 tabular-nums pt-0.5">
                            {signal.timestamp}
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* ── SECONDARY RAIL ───────────────────────────────────── */}
              <aside className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-8 gap-y-8 min-w-0">
              {/* Product state */}
              <section>
                <SectionHeader label="Product state" />
                <div className="border-y border-border/40 divide-y divide-border/30">
                  <StateRow
                    label="Sources"
                    value={inputs.length === 0 ? "none" : `${inputs.length} connected`}
                    hint={failedSources > 0 ? `${failedSources} failed` : processingSources > 0 ? `${processingSources} processing` : undefined}
                    hintTone={failedSources > 0 ? "text-rose-400" : "text-muted-foreground"}
                    onClick={() => navigate("/pmx/sources")}
                  />
                  <StateRow
                    label="Insights"
                    value={
                      decisions.length === 0
                        ? "none"
                        : `${pendingInsights} pending · ${approvedInsights} approved`
                    }
                    onClick={() => navigate("/pmx/insights")}
                  />
                  <StateRow
                    label="PRD"
                    value={hasPrd ? `v${prdVersion} current` : "not created"}
                    onClick={() => navigate("/pmx/prd")}
                  />
                  <StateRow
                    label="Execution"
                    value={tasks.length === 0 ? "none" : `${openTasks} open`}
                    hint={doneTasks > 0 ? `${doneTasks} done` : undefined}
                    onClick={() => navigate("/pmx/execution")}
                  />
                </div>
              </section>

              {/* PMX understanding */}
              <section>
                <SectionHeader label="PMX understanding" />
                <div className="border-y border-border/40 py-3.5 space-y-3">
                  {understanding?.productSummary ? (
                    <dl className="space-y-1.5">
                      {understanding.productSummary.category && (
                        <UnderstandingRow label="Category" value={sentenceCase(understanding.productSummary.category)} />
                      )}
                      {understanding.productSummary.stage && (
                        <UnderstandingRow label="Stage" value={sentenceCase(understanding.productSummary.stage)} />
                      )}
                      {(understanding.coreFeatures?.length ?? 0) > 0 && (
                        <UnderstandingRow label="Features" value={`${understanding.coreFeatures.length} mapped`} />
                      )}
                      {(understanding.personas?.length ?? 0) > 0 && (
                        <UnderstandingRow label="Personas" value={`${understanding.personas.length} defined`} />
                      )}
                    </dl>
                  ) : (
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      PMX has not built a product model yet. Processing a source will produce one.
                    </p>
                  )}

                  <p className="text-[12px] text-muted-foreground/85 leading-relaxed pt-3 border-t border-border/30">
                    Built from{" "}
                    <span className="text-foreground/85">
                      {inputs.length} source{inputs.length === 1 ? "" : "s"}
                    </span>
                    ,{" "}
                    <span className="text-foreground/85">
                      {decisions.length} insight{decisions.length === 1 ? "" : "s"}
                    </span>
                    ,{" "}
                    <span className="text-foreground/85">{hasPrd ? `1 PRD (v${prdVersion})` : "no PRD"}</span>, and{" "}
                    <span className="text-foreground/85">
                      {tasks.length} execution item{tasks.length === 1 ? "" : "s"}
                    </span>
                    .
                  </p>

                  {inputs.length < 3 && (
                    <p className="text-[11.5px] text-muted-foreground/60 leading-relaxed">
                      Each additional source raises the confidence behind every insight.
                    </p>
                  )}
                </div>
              </section>

              {/* Continue working */}
              <section className="sm:col-span-2 lg:col-span-1">
                <SectionHeader label="Continue working" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-8">
                  <ContinueLink label="Open PRD" onClick={() => navigate("/pmx/prd")} />
                  <ContinueLink label="Review insights" onClick={() => navigate("/pmx/insights")} />
                  <ContinueLink label="View execution" onClick={() => navigate("/pmx/execution")} />
                  <ContinueLink label="Add source" onClick={() => navigate("/pmx/sources")} />
                </div>
              </section>
              </aside>
            </div>

            {/* ── ACTIVITY TRAIL (full width) ────────────────────────── */}
            <section className="pt-10">
              <SectionHeader
                label="Activity"
                trailing={
                  <Link
                    to="/pmx/history"
                    className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Full audit trail
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                }
              />

              {activityDays.length > 0 ? (
                <div className="space-y-5">
                  {activityDays.map((group) => (
                    <div key={group.day}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 pb-2 mb-1 border-b border-border/30">
                        {group.day}
                      </p>
                      <ol>
                        {group.rows.map((row) => (
                          <li
                            key={row.id}
                            title={row.raw}
                            className="group flex gap-3 sm:gap-4 py-2 border-b border-border/20 last:border-0 hover:bg-muted/20 -mx-2 px-2 rounded transition-colors"
                          >
                            <time className="shrink-0 w-[38px] pt-px text-[11px] tabular-nums text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                              {row.time}
                            </time>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] text-foreground/90 leading-snug">{row.title}</p>
                              {row.subject ? (
                                <p className="text-[12px] text-muted-foreground/80 leading-snug mt-0.5 truncate">
                                  “{row.subject}”
                                </p>
                              ) : (
                                <p className="text-[11.5px] text-muted-foreground/55 leading-snug mt-0.5 sm:hidden">
                                  {row.area} · {row.context}
                                </p>
                              )}
                            </div>
                            <span className="hidden sm:block shrink-0 w-[190px] text-right text-[11.5px] text-muted-foreground/45 pt-px">
                              {row.area} · {row.context}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-foreground py-4 border-y border-border/40">
                  No activity recorded in this workspace yet.
                </p>
              )}
            </section>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── Small page-local primitives ─────────────────────────────────────── */

function SectionHeader({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</h2>
      {trailing && <div className="text-[11.5px] shrink-0">{trailing}</div>}
    </div>
  );
}

function StateRow({
  label,
  value,
  hint,
  hintTone = "text-muted-foreground",
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-baseline justify-between gap-3 py-2.5 text-left hover:bg-muted/20 -mx-2 px-2 rounded transition-colors"
    >
      <span className="text-[12.5px] text-muted-foreground shrink-0">{label}</span>
      <span className="flex items-baseline gap-2 min-w-0">
        <span className="text-[12.5px] font-medium text-foreground/90 truncate tabular-nums">{value}</span>
        {hint && <span className={`text-[11px] shrink-0 ${hintTone}`}>· {hint}</span>}
        <ChevronRight className="h-3 w-3 shrink-0 self-center text-muted-foreground/25 group-hover:text-muted-foreground/70 transition-colors" />
      </span>
    </button>
  );
}

function UnderstandingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12.5px] text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-[12.5px] text-foreground/90 font-medium truncate text-right">{value}</dd>
    </div>
  );
}

// Model-authored fields (category, stage) arrive in inconsistent casing.
function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ContinueLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center justify-between gap-3 py-2 text-left border-b border-border/25 hover:border-border/60 transition-colors"
    >
      <span className="text-[12.5px] text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/35 group-hover:text-sky-400 transition-colors" />
    </button>
  );
}

/* ── Low-data state: potential, not emptiness ────────────────────────── */

const SOURCE_YIELD = [
  {
    source: "Product URL",
    learns: "Navigation, accessibility, responsiveness, and conversion friction on live screens.",
  },
  {
    source: "Repository",
    learns: "Architecture, technical debt, and the delivery constraints behind each decision.",
  },
  {
    source: "Customer notes",
    learns: "Pain points, recurring requests, and the language your users actually use.",
  },
  {
    source: "Analytics export",
    learns: "Where activation stalls, where users drop off, and which features carry retention.",
  },
];

function LowDataState({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="pt-9 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-9 items-start">
      <div className="lg:col-span-7">
        <SectionHeader label="Product intelligence" />
        <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-foreground leading-snug">
          Your workspace is connected.
          <br />
          PMX is ready to build its understanding of your product.
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-3 max-w-lg">
          Nothing has been ingested yet, so there is nothing to report. Connect one input and PMX will start producing
          evidence, problems, prioritised decisions, and an execution plan from it.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <button
            onClick={() => navigate("/pmx/sources")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12.5px] font-semibold transition-colors"
          >
            <Database className="h-3.5 w-3.5" />
            Add a source
          </button>
          <button
            onClick={() => navigate("/pmx/prd")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/50 text-[12.5px] font-medium text-foreground/85 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Create PRD
          </button>
          <button
            onClick={() => navigate("/pmx/analysis")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] hover:bg-sky-500/[0.13] hover:border-sky-500/40 text-[12.5px] font-semibold text-sky-400 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Run AI Experience Intelligence
          </button>
        </div>
      </div>

      <div className="lg:col-span-5">
        <SectionHeader label="What PMX learns from each source" />
        <dl className="border-y border-border/40 divide-y divide-border/30">
          {SOURCE_YIELD.map((item) => (
            <div key={item.source} className="py-3">
              <dt className="text-[12.5px] font-medium text-foreground/90">{item.source}</dt>
              <dd className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{item.learns}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
