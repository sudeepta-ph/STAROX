import { useState, useEffect, useRef } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Plus, ChevronRight, Github, Link2, BarChart3,
  Activity, FileText, GitBranch, MessageSquare, Upload,
  FolderOpen, LayoutGrid, TrendingUp, Loader2, Database, Sparkles,
  BookOpen, Award, Clock } from "lucide-react";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

// ── Connector meta (kept for Recent Sources) ──────────────────────────────────
const CONNECTOR_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  url:       { label: "Website",   icon: Link2,         color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20" },
  repo:      { label: "GitHub",    icon: Github,        color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  gitlab:    { label: "GitLab",    icon: GitBranch,     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  analytics: { label: "Analytics", icon: BarChart3,     color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
  mixpanel:  { label: "Mixpanel",  icon: Activity,      color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  posthog:   { label: "PostHog",   icon: Activity,      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  support:   { label: "Intercom",  icon: MessageSquare, color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/20" },
  zendesk:   { label: "Zendesk",   icon: MessageSquare, color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20" },
  interview: { label: "Interview", icon: MessageSquare, color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20" },
  csv:       { label: "CSV",       icon: FileText,      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  text:      { label: "PDF / Doc", icon: FolderOpen,    color: "text-zinc-400",    bg: "bg-zinc-500/10",    border: "border-zinc-500/20" },
  report:    { label: "Report",    icon: LayoutGrid,    color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
};
function getConnectorMeta(type: string) {
  return CONNECTOR_META[type] || { label: type, icon: Upload, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };
}
function getStatusStyle(status: string) {
  const n = status?.toLowerCase() || "completed";
  if (n === "queued")     return { bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  text: "text-yellow-400",  label: "Queued"    };
  if (n === "processing") return { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    label: "Syncing"   };
  if (n === "analyzing")  return { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  label: "Analyzing" };
  if (["completed","synced","active"].includes(n))
    return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Synced" };
  if (["failed","error"].includes(n))
    return { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Failed" };
  return { bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-400", label: n };
}

const PLACEHOLDERS = [
  "A B2B SaaS tool for managing contractor invoices...",
  "An AI-powered onboarding flow for fintech apps...",
  "A marketplace for freelance product designers...",
  "A dashboard for tracking SaaS churn in real time...",
  "A mobile app that turns voice notes into PRDs...",
];

export default function PmxOverview() {
  const navigate   = useNavigate();
  const { toast }  = useToast();
  const { inputs, history, decisions, solutions, tasks, understanding, projectId, openTabIds } = usePmxStore();
  const [idea, setIdea]     = useState("");
  const [focused, setFocused] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [phIdx, setPhIdx]   = useState(0);
  const [typedText, setTypedText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [ideaPrd, setIdeaPrd] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect: types out each placeholder, pauses, deletes, then moves to the next
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
      next = () => { setDeleting(false); setPhIdx(i => (i + 1) % PLACEHOLDERS.length); };
    }

    const id = setTimeout(next, delay);
    return () => clearTimeout(id);
  }, [typedText, deleting, phIdx]);

  const recentInputs = [...inputs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Whether there's an idea→PRD document for this workspace. Fetched
  // unconditionally (not gated behind a "has data" check) since it's one of
  // the two signals that decide whether this workspace has real data at all.
  useEffect(() => {
    setIdeaPrd(null);
    (async () => {
      try {
        const headers = await getPmxHeaders();
        const res = await fetch(`${API_URL}/pmx/idea/prd/latest?projectId=${encodeURIComponent(projectId)}`, { headers });
        const json = await res.json();
        if (json.success) setIdeaPrd(json.data);
      } catch { /* treated the same as "no idea PRD yet" */ }
    })();
  }, [projectId]);

  // Only show the returning-workspace dashboard once there's something real
  // to show — sources that have actually produced insights, or a generated
  // idea PRD. A stray audit-log entry (e.g. a leftover "product deleted" log
  // for an emptied-out workspace) shouldn't be enough to skip the hero.
  const rawSessionExists = (inputs.length > 0 && decisions.length > 0) || !!ideaPrd;

  // Once a workspace has graduated into the dashboard view, it should stay
  // there — e.g. clearing out decisions later shouldn't resurrect the idea
  // hero for a workspace that's clearly already in use. Tracked per
  // projectId in localStorage rather than a new backend field.
  const [graduated, setGraduated] = useState(false);
  useEffect(() => {
    try { setGraduated(localStorage.getItem(`pmx_workspace_graduated_${projectId}`) === "1"); }
    catch { setGraduated(false); }
  }, [projectId]);
  useEffect(() => {
    if (rawSessionExists && !graduated) {
      try { localStorage.setItem(`pmx_workspace_graduated_${projectId}`, "1"); } catch { /* ignore */ }
      setGraduated(true);
    }
  }, [rawSessionExists, graduated, projectId]);

  // "Home" (the topbar button / a fresh startFreshWorkspace() context) is a
  // projectId that's deliberately never added to openTabIds until it's
  // promoted into a real workspace — see promoteToTab in pmxStore. Until
  // that happens this must always be the idea hero, never the returning-
  // workspace dashboard, no matter what graduated/session data says (which
  // can otherwise still be true for a moment while the store is still
  // holding the previous active workspace's data during the projectId swap).
  const isPromotedWorkspace = openTabIds.includes(projectId);
  const sessionExists = isPromotedWorkspace && (rawSessionExists || graduated);

  // Hand the idea straight to /pmx/prd — generation now happens there, in the
  // PRD workspace's left-pane conversation, instead of blocking here.
  const submit = () => {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    navigate("/pmx/prd", { state: { initialIdea: idea, source: "idea-input" } });
  };

  if (sessionExists) {
    return (
      <DashboardView
        navigate={navigate}
        workspaceName={understanding?.productSummary?.name}
        inputs={inputs}
        decisions={decisions}
        solutions={solutions}
        tasks={tasks}
        history={history}
        ideaPrd={ideaPrd}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Ambient top glow ─────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 h-64 -z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(56,189,248,0.13) 0%, transparent 70%)",
        }}
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/8 border border-sky-500/15 px-3 py-1 rounded-full tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            AI Product Intelligence Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12] mb-4 max-w-2xl"
        >
          What should you<br className="hidden sm:block" /> build next?
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm text-muted-foreground max-w-md leading-relaxed mb-10"
        >
          Describe your product, feature, startup, or idea. PMX will research,
          validate, and generate an execution-ready plan.
        </motion.p>

        {/* ── Prompt input ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl mb-6"
        >
          <div
            className={`relative flex items-center rounded-2xl border transition-all duration-200 bg-card/70 backdrop-blur-md shadow-lg ${
              focused
                ? "border-sky-500/40 shadow-[0_0_0_3px_rgba(56,189,248,0.08)]"
                : "border-border/60 hover:border-border"
            }`}
          >
            {/* Typewriter placeholder rendered as overlay when input is empty */}
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
              onChange={e => setIdea(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => e.key === "Enter" && submit()}
              disabled={generating}
              className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground focus:outline-none placeholder-transparent disabled:opacity-60"
            />

            {/* CTA */}
            <div className="pr-2 shrink-0">
              <button
                onClick={submit}
                disabled={!idea.trim() || generating}
                aria-label="Build from idea"
                className="group inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground transition-all duration-200 shadow-[0_2px_12px_rgba(56,189,248,0.22)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.35)] hover:-translate-y-px active:translate-y-0"
              >
                {generating
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Secondary actions ────────────────────────────────────── */}
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
            <span className="pointer-events-none absolute inset-0 rounded-xl opacity-60"
              style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.18) 0%, transparent 70%)" }} />
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

      {/* ── BELOW FOLD ───────────────────────────────────────────── */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-6 pb-24 space-y-8 mt-4">

        {/* Divider */}
        <div className="border-t border-border/30" />

        {/* Connect Sources */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="flex items-center justify-between gap-4 py-1"
        >
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-sky-400" /> Connect Your Sources
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PMX becomes smarter when connected to your product ecosystem.
            </p>
          </div>
          <button
            onClick={() => navigate("/pmx/sources")}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Connect Sources
          </button>
        </motion.div>

        {/* Recent Sources */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Recent Sources</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resume analysing your previously connected sources.</p>
            </div>
            <Link
              to="/pmx/sources"
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-semibold"
            >
              See All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentInputs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentInputs.map(input => {
                const meta   = getConnectorMeta(input.type);
                const Icon   = meta.icon;
                const status = getStatusStyle(input.status);
                return (
                  <div
                    key={input._id}
                    onClick={() => navigate("/pmx/sources")}
                    className="rounded-xl border border-border/50 bg-card/40 hover:border-border hover:bg-card/70 backdrop-blur-sm p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between h-28 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.bg} border ${meta.border} shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{input.name}</p>
                          <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${status.bg} ${status.border} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/30 pt-2">
                      <span className="text-[9px] text-muted-foreground">Last synced</span>
                      <span className="text-[9px] text-foreground font-medium">
                        {new Date(input.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">
              No recently connected sources. Add a source above to get started.
            </p>
          )}
        </motion.div>

      </div>
    </div>
  );
}

// ── Dashboard: shown once a workspace has actually been worked on ──────────
function DashboardView({ navigate, workspaceName, inputs, decisions, solutions, tasks, history, ideaPrd }: {
  navigate: (path: string) => void;
  workspaceName?: string;
  inputs: any[];
  decisions: any[];
  solutions: any[];
  tasks: any[];
  history: any[];
  ideaPrd: any;
}) {
  const pendingInsights = decisions.filter(d => d.status === "pending").length;
  const openTasks = tasks.filter(t => t.status !== "done").length;
  const prdVersion = ideaPrd?.version ?? solutions[0]?.version ?? null;
  const recentActivity = [...history]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    { label: "Sources Connected", value: inputs.length,                          icon: Database },
    { label: "Pending Insights",  value: pendingInsights,                        icon: Sparkles },
    { label: "PRD Version",       value: prdVersion ? `v${prdVersion}` : "—",     icon: FileText },
    { label: "Open Tasks",        value: openTasks,                              icon: Award },
  ];

  return (
    <div className="relative flex flex-col min-h-full bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 h-64 -z-0"
        style={{ background: "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(56,189,248,0.10) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 pt-12 pb-24 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/8 border border-sky-500/15 px-3 py-1 rounded-full tracking-wide mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            Workspace Overview
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{workspaceName || "Welcome back"}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Here's where this product stands in the pipeline.</p>
        </motion.div>

        {/* Stat tiles */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <stat.icon className="w-4 h-4 text-primary mx-auto mb-2" />
              <p className="text-xl font-display font-bold gradient-text">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}
          className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => navigate("/pmx/sources")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200">
            <Plus className="h-3.5 w-3.5" /> Add Sources
          </button>
          <button onClick={() => navigate("/pmx/insights")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200">
            <Sparkles className="h-3.5 w-3.5" /> Review Insights
          </button>
          <button onClick={() => navigate("/pmx/prd")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200">
            <BookOpen className="h-3.5 w-3.5" /> Open PRD
          </button>
          <button onClick={() => navigate("/pmx/execution")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200">
            <Award className="h-3.5 w-3.5" /> View Execution Board
          </button>
        </motion.div>

        {/* Recent activity */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Recent Activity</p>
            <Link to="/pmx/history" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-semibold">
              See All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((log: any) => (
                <div key={log._id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 px-4 py-3">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground/80 leading-relaxed">{log.details}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">No activity logged yet.</p>
          )}
        </motion.div>

      </div>
    </div>
  );
}
