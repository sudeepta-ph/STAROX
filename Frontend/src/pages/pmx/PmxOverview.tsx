import { useState, useEffect } from "react";
import { usePmxStore } from "@/lib/pmxStore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Database,
  Github,
  Link2,
  Zap,
  TrendingUp,
  ChevronRight,
  Activity,
  BarChart3,
  ArrowRight,
  Plus,
  FileText,
  GitBranch,
  MessageSquare,
  Upload,
  FolderOpen,
  LayoutGrid
} from "lucide-react";

const CONNECTOR_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  url:       { label: "Website",   icon: Link2,      color: "text-sky-400",    bg: "bg-sky-500/10",     border: "border-sky-500/20" },
  repo:      { label: "GitHub",    icon: Github,     color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  gitlab:    { label: "GitLab",    icon: GitBranch,  color: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  analytics: { label: "Google Analytics", icon: BarChart3, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  mixpanel:  { label: "Mixpanel",  icon: Activity,   color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  posthog:   { label: "PostHog",   icon: Activity,   color: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  support:   { label: "Intercom",  icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  zendesk:   { label: "Zendesk",   icon: MessageSquare, color: "text-teal-400",  bg: "bg-teal-500/10",  border: "border-teal-500/20" },
  interview: { label: "Interview Notes", icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  csv:       { label: "CSV / Excel", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  text:      { label: "PDF / Doc",   icon: FolderOpen, color: "text-zinc-400",  bg: "bg-zinc-500/10",   border: "border-zinc-500/20" },
  report:    { label: "Report",      icon: LayoutGrid, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

function getConnectorMeta(type: string) {
  return CONNECTOR_META[type] || { label: type, icon: Upload, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };
}

function getStatusStyle(status: string) {
  const norm = status?.toLowerCase() || "completed";
  if (norm === "queued") return { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", label: "Queued" };
  if (norm === "processing") return { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Syncing" };
  if (norm === "analyzing") return { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", label: "Analyzing" };
  if (norm === "completed" || norm === "synced" || norm === "active") return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Synced" };
  if (norm === "failed" || norm === "error") return { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Failed" };
  return { bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-400", label: norm };
}

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function PmxOverview() {
  const navigate = useNavigate();
  const { inputs, history } = usePmxStore();
  const [ideaText, setIdeaText] = useState("");
  
  const placeholders = [
    "Build an AI project management platform...",
    "Improve my SaaS onboarding...",
    "Analyse my existing ecommerce website...",
    "Generate a PRD for a healthcare dashboard...",
    "Create a roadmap for an internal tool..."
  ];
  
  const suggestionChips = [
    "Analyse my SaaS...",
    "Generate a PRD...",
    "Improve onboarding...",
    "Audit my website...",
    "Build a roadmap..."
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const recentInputs = [...inputs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const sessionExists = inputs.length > 0 || history.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-16 pb-28 pt-8">

      {/* ── SECTION 1: WORKSPACE HERO PROMPT ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex flex-col items-center justify-center text-center"
      >
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground max-w-xl mb-3">
          What would you like PMX to help you build today?
        </h1>
        <p className="text-xs text-muted-foreground max-w-lg leading-relaxed mb-8">
          Describe your product, feature, business idea or existing application.
          PMX will understand it, gather evidence, analyse opportunities and generate an execution plan.
        </p>

        <div className="w-full relative mb-4">
          <textarea
            rows={4}
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder={placeholders[placeholderIndex]}
            className="w-full bg-zinc-950/80 border border-zinc-800/80 focus:border-primary/40 rounded-2xl p-5 text-sm text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/50 shadow-[0_4px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all"
          />
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-xl">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setIdeaText(chip)}
              className="text-[11px] font-medium text-muted-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted border border-border/40 hover:border-border px-3 py-1 rounded-full transition-all"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate("/pmx/sources")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border hover:bg-muted hover:text-foreground px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-all"
          >
            Analyse Existing Product
          </button>
          
          <button
            onClick={() => { if (ideaText.trim()) navigate(`/pmx/sources?idea=${encodeURIComponent(ideaText)}`); }}
            disabled={!ideaText.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all shadow-[0_4px_12px_rgba(26,115,232,0.2)]"
          >
            <img src="/strx.png" alt="STAROX" className="h-[18px] w-[18px] object-contain shrink-0" /> Build From Idea
          </button>

          {sessionExists && (
            <button
              onClick={() => navigate("/pmx/analysis")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-5 py-2.5 text-xs font-semibold text-primary transition-all"
            >
              Continue Previous Session
            </button>
          )}
        </div>
      </motion.div>

      {/* ── SECTION 2: CONNECT SOURCES ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: smoothEase }}
        className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-sky-400" /> Connect Your Sources
          </h3>
          <p className="text-xs text-muted-foreground">
            PMX becomes smarter when connected to your product ecosystem.
          </p>
        </div>
        <button
          onClick={() => navigate("/pmx/sources")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all shrink-0 self-start sm:self-center"
        >
          <Plus className="h-3.5 w-3.5" /> Connect Sources
        </button>
      </motion.div>

      {/* ── SECTION 3: RECENT SOURCES ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: smoothEase }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground">Recent Sources</h3>
            <p className="text-xs text-muted-foreground">Resume analysing your previously connected sources.</p>
          </div>
          <Link
            to="/pmx/sources"
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-semibold"
          >
            See All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentInputs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentInputs.map((input) => {
              const meta = getConnectorMeta(input.type);
              const Icon = meta.icon;
              const status = getStatusStyle(input.status);
              return (
                <div
                  key={input._id}
                  onClick={() => navigate("/pmx/sources")}
                  className="glass-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between h-32 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg} border ${meta.border} shrink-0`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors max-w-[130px]">
                          {input.name}
                        </h4>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{meta.label}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border shrink-0 ${status.bg} ${status.border} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-2">
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
          <div className="text-center py-8 rounded-xl border border-dashed border-border/40 bg-card/10 text-muted-foreground text-xs">
            No recently connected sources. Add a source above to get started.
          </div>
        )}
      </motion.div>

    </div>
  );
}
