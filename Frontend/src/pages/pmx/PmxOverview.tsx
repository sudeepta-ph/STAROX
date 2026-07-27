import { useState } from "react";
import { usePmxStore } from "@/lib/pmxStore";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Clock,
  ArrowUpRight,
  Database,
  Github,
  Link2,
  Play,
  Zap,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Activity,
  Shield,
  BarChart3,
  Cpu,
  Target,
  ArrowRight,
  Plus,
  FileText
} from "lucide-react";

const WORKFLOW_STAGES = [
  { id: "sources",   label: "Sources",   icon: Database,     color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20",    path: "/pmx/sources" },
  { id: "analysis",  label: "Analysis",  icon: TrendingUp,   color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", path: "/pmx/analysis" },
  { id: "insights",  label: "Insights",  icon: Sparkles,     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", path: "/pmx/insights" },
  { id: "prd",       label: "PRD",       icon: FileText,     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  path: "/pmx/prd" },
  { id: "execution", label: "Execution", icon: Zap,          color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", path: "/pmx/execution" },
];

const ACTIVITY_LOG = [
  { time: "09:00", event: "Website synced", type: "sync" },
  { time: "09:03", event: "412 reviews analyzed", type: "analysis" },
  { time: "09:06", event: "18 UX issues detected", type: "problem" },
  { time: "09:10", event: "9 opportunities generated", type: "opportunity" },
  { time: "09:14", event: "PRD ready for review", type: "solution" },
  { time: "09:15", event: "Waiting for approval", type: "pending" },
];

function StageCount(props: { count: number; color: string }) {
  if (props.count === 0) return <span className="text-[10px] text-zinc-600 font-mono">0</span>;
  return <span className={`text-[10px] font-bold font-mono ${props.color}`}>{props.count}</span>;
}

export default function PmxOverview() {
  const navigate = useNavigate();
  const { inputs, problems, opportunities, decisions, evidence, solutions, tasks, history, loading } = usePmxStore();
  const [ideaText, setIdeaText] = useState("");
  const [showIdeaBuilder, setShowIdeaBuilder] = useState(false);

  const criticalProblems = problems.filter(p => p.severity === "critical" || p.severity === "high");
  const pendingDecisions = decisions.filter(d => d.status === "pending");
  const topOpportunity = opportunities[0];
  const criticalProblem = criticalProblems[0] || problems[0];

  const stageCounts: Record<string, number> = {
    sources:   inputs.length,
    analysis:  evidence.length + problems.length,
    insights:  opportunities.length + decisions.length,
    prd:       solutions.length,
    execution: tasks.length,
  };

  const anyLoading = Object.values(loading).some(Boolean);

  // Health scores (derived from data)
  const productScore = inputs.length > 0 ? Math.min(100, Math.round(60 + (solutions.length * 5) - (criticalProblems.length * 8))) : 0;
  const aiConfidence = opportunities.length > 0 ? Math.round(opportunities.reduce((a, b) => a + b.confidence, 0) / opportunities.length) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-24">

      {/* ── HERO: TWO PRIMARY WORKFLOWS ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing Product Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 space-y-4 relative overflow-hidden group"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_0%_0%,rgba(56,189,248,0.05)_0%,transparent_70%)]" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <Link2 className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Analyze Existing Product</h2>
                <p className="text-[11px] text-muted-foreground">Connect sources → AI detects problems & opportunities</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Connect your website, GitHub, analytics, and support tools. PMX continuously analyzes your product and generates actionable recommendations.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/pmx/sources")}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Connect Sources
              </button>
              <button
                onClick={() => navigate("/pmx/insights")}
                className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all"
              >
                View Insights <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Idea Builder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.07 }}
          className="glass-card p-6 space-y-4 relative overflow-hidden group"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(168,85,247,0.05)_0%,transparent_70%)]" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Build From Idea</h2>
                <p className="text-[11px] text-muted-foreground">Describe an idea → Full PRD & roadmap in one click</p>
              </div>
            </div>
            {!showIdeaBuilder ? (
              <>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Describe your product idea. PMX generates validation, market analysis, personas, feature list, user flows, and a complete PRD automatically.
                </p>
                <button
                  onClick={() => setShowIdeaBuilder(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-500/80 hover:bg-purple-500 px-3.5 py-2 text-xs font-semibold text-white transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Start From Idea
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={3}
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  placeholder='e.g. "I want an AI CRM for hospitals"'
                  className="w-full bg-card border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (ideaText.trim()) navigate(`/pmx/sources?idea=${encodeURIComponent(ideaText)}`); }}
                    disabled={!ideaText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-500/80 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-40"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Full PRD
                  </button>
                  <button onClick={() => setShowIdeaBuilder(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── COMMAND CENTER METRICS ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Product Score",     value: productScore > 0 ? `${productScore}/100` : "—",   color: "text-sky-400",    icon: Target,    desc: "Overall health" },
          { label: "AI Confidence",     value: aiConfidence > 0 ? `${aiConfidence}%` : "—",       color: "text-green-400",  icon: Cpu,       desc: `${opportunities.length} opportunities` },
          { label: "Active Connectors", value: inputs.length > 0 ? inputs.length : "—",            color: "text-purple-400", icon: Database,  desc: "Sources connected" },
          { label: "Pending Decisions", value: pendingDecisions.length > 0 ? pendingDecisions.length : "—", color: "text-yellow-400", icon: CheckCircle2, desc: "Need your approval" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
              <m.icon className={`h-3.5 w-3.5 ${m.color} opacity-70`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* ── VISUAL WORKFLOW PIPELINE ─────────────────────────────── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">AI Product Pipeline</h2>
          <span className="text-[10px] text-muted-foreground">Continuous • Auto-refreshing</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const count = stageCounts[stage.id] || 0;
            const active = count > 0;
            return (
              <div key={stage.id} className="flex items-center gap-1 shrink-0">
                <Link to={stage.path}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? `${stage.bg} ${stage.border} hover:brightness-110`
                        : "bg-card/40 border-border/50 opacity-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? stage.color : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{stage.label}</div>
                      <StageCount count={count} color={stage.color} />
                    </div>
                  </motion.div>
                </Link>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-border shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── INTEL + ACTIVITY ROW ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Critical Risks */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Critical Risks
            </h3>
            <Link to="/pmx/problems" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
              All <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          {criticalProblem ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${
                  criticalProblem.severity === "critical" ? "text-red-400 border-red-500/20 bg-red-500/5"
                  : "text-orange-400 border-orange-500/20 bg-orange-500/5"
                }`}>{criticalProblem.severity}</span>
                <p className="text-xs font-semibold text-foreground leading-snug">{criticalProblem.title}</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{criticalProblem.description}</p>
              {criticalProblem.suggestedFix && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <p className="text-[10px] text-primary/80 leading-snug">{criticalProblem.suggestedFix}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground py-4 text-center">No critical risks detected.</p>
          )}
        </div>

        {/* Highest ROI Opportunity */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Highest ROI
            </h3>
            <Link to="/pmx/opportunities" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
              Matrix <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          {topOpportunity ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground leading-snug">{topOpportunity.title}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-card/60 border border-border/50 p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">RICE</p>
                  <p className="text-sm font-bold font-mono text-yellow-400">{topOpportunity.riceScore}</p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border/50 p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">ICE</p>
                  <p className="text-sm font-bold font-mono text-yellow-400">{topOpportunity.iceScore}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{topOpportunity.description}</p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground py-4 text-center">No opportunities scored yet.</p>
          )}
        </div>

        {/* AI Activity Timeline */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> AI Activity
            </h3>
            <Link to="/pmx/history" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
              Full log <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {history.length > 0 ? (
              history.slice(0, 5).map((log) => (
                <div key={log._id} className="flex gap-2.5 text-[10px]">
                  <span className="text-muted-foreground font-mono shrink-0 pt-0.5">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground line-clamp-1">{log.details}</p>
                  </div>
                </div>
              ))
            ) : (
              ACTIVITY_LOG.map((entry, i) => (
                <div key={i} className="flex gap-2.5 text-[10px] opacity-40">
                  <span className="text-muted-foreground font-mono shrink-0">{entry.time}</span>
                  <p className="text-foreground">{entry.event}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── PENDING DECISIONS (QUICK APPROVE) ───────────────────── */}
      {pendingDecisions.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Pending AI Recommendations — Your Approval Needed
            </h2>
            <Link to="/pmx/insights" className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingDecisions.slice(0, 2).map((dec) => (
              <div key={dec._id} className="rounded-xl border border-green-500/10 bg-green-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">{dec.category}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{dec.confidence}% confidence</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{dec.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{dec.reasoning}</p>
                <Link
                  to="/pmx/insights"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Review & Approve <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowIdeaBuilder(true)} className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 px-3.5 py-2 text-xs font-medium text-purple-400 transition-all">
          <Sparkles className="h-3.5 w-3.5" /> Start From Idea
        </button>
        <button onClick={() => navigate("/pmx/sources")} className="flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 px-3.5 py-2 text-xs font-medium text-sky-400 transition-all">
          <Database className="h-3.5 w-3.5" /> Connect Sources
        </button>
        <button onClick={() => navigate("/pmx/analysis")} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all">
          <Play className="h-3.5 w-3.5" /> Run Analysis
        </button>
        <button onClick={() => navigate("/pmx/insights")} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all">
          <TrendingUp className="h-3.5 w-3.5" /> View Insights
        </button>
        <button onClick={() => navigate("/pmx/settings")} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all">
          <Shield className="h-3.5 w-3.5" /> Configure PMX
        </button>
      </div>

    </div>
  );
}
