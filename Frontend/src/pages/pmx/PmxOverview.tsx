import { usePmxStore } from "@/lib/pmxStore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileText,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Database,
  Search,
  Github,
  Link2,
  FileSpreadsheet,
  Cpu
} from "lucide-react";

export default function PmxOverview() {
  const navigate = useNavigate();
  const {
    inputs,
    problems,
    opportunities,
    decisions,
    history,
    loading
  } = usePmxStore();

  const criticalProblem = problems.find(p => p.severity === "critical" || p.severity === "high") || problems[0];
  const topOpportunity = opportunities[0];
  const pendingDecision = decisions.find(d => d.status === "pending") || decisions[0];

  if (
    loading.inputs ||
    loading.understanding ||
    loading.problems ||
    loading.opportunities ||
    loading.decisions
  ) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs tracking-wider uppercase animate-pulse">Consulting AI Strategist...</p>
        </div>
      </div>
    );
  }

  // Quick Action Buttons Handler
  const handleQuickAction = (action: string) => {
    if (action === "sources") {
      navigate("/pmx/sources");
    } else if (action === "analysis") {
      navigate("/pmx/analysis");
    } else {
      // General sources drawer redirect
      navigate("/pmx/sources");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12 pb-24">
      
      {/* ── HERO PROMPT SECTION ─────────────────────────────────── */}
      <div className="text-center py-8 space-y-4 max-w-2xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-display leading-tight"
        >
          What would you like PMX to help you improve today?
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Import source nodes to crawl, prioritize feature metrics, and author engineering blueprints.
        </p>
      </div>

      {/* ── ACTION GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* Add Website */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("sources")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 w-fit">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Add Website <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-sky-400 transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Analyze user flows and site maps.</p>
          </div>
        </motion.button>

        {/* Connect GitHub */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("sources")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Connect GitHub <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Sync code bases and tech specifications.</p>
          </div>
        </motion.button>

        {/* Upload Documents */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("sources")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Upload Documents <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Crawl PDF briefs and PRDs.</p>
          </div>
        </motion.button>

        {/* Import Feedback */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("sources")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 w-fit">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Import Feedback <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Extract user review transcripts.</p>
          </div>
        </motion.button>

        {/* Analyze Products */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("analysis")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 w-fit">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Analyze Products <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-red-400 transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Run accessibility and UX crawl audits.</p>
          </div>
        </motion.button>

        {/* Resume Previous Analysis */}
        <motion.button
          whileHover={{ y: -3 }}
          onClick={() => handleQuickAction("sources")}
          className="glass-card hover-lift p-5 text-left flex flex-col justify-between h-36 relative overflow-hidden group select-none"
        >
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary w-fit">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              Resume Analysis <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Reprocess active nodes and feeds.</p>
          </div>
        </motion.button>

      </div>

      {/* ── CONVERSATIONAL WORKSPACE CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        
        {/* Critical Product Risks */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="h-4 w-4" /> Critical Product Risks
            </h3>
            <Link to="/pmx/problems" className="text-[10px] text-red-400/80 hover:text-red-300 transition-colors font-medium">
              Resolve problems
            </Link>
          </div>
          
          <div className="min-h-[100px] flex items-center">
            {problems.length > 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                We have flagged <span className="text-red-400 font-semibold">{problems.length} friction issues</span>. 
                {criticalProblem && (
                  <>
                    {" "}The most severe risk is <span className="text-foreground font-bold">"{criticalProblem.title}"</span>. 
                    It targets usability across <span className="text-zinc-300">{criticalProblem.affectedFeatures?.join(", ") || "core systems"}</span>. 
                    Recommended patch: <span className="text-sky-400 italic">"{criticalProblem.suggestedFix}"</span>.
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                All systems quiet. AI PM hasn't detected any severe UX anomalies or development debt in the current source logs.
              </p>
            )}
          </div>
        </div>

        {/* Highest Impact Opportunities */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5 font-mono">
              <Lightbulb className="h-4 w-4" /> Highest Impact Opportunities
            </h3>
            <Link to="/pmx/opportunities" className="text-[10px] text-yellow-400/80 hover:text-yellow-300 transition-colors font-medium">
              View matrix
            </Link>
          </div>
          
          <div className="min-h-[100px] flex items-center">
            {opportunities.length > 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                Out of your prioritized backlog, <span className="text-foreground font-bold">"{topOpportunity.title}"</span> yields the highest leverage with a RICE score of <span className="text-yellow-400 font-semibold">{topOpportunity.riceScore}</span>. 
                It targets <span className="text-zinc-300">user impact: {topOpportunity.userImpact}/10</span> and estimated development effort is <span className="text-zinc-300">{topOpportunity.effort}/10</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                Prioritization matrix is empty. Upload node materials to sync RICE scoring.
              </p>
            )}
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-mono">
              <Sparkles className="h-4 w-4" /> Strategic Recommendations
            </h3>
            <Link to="/pmx/decisions" className="text-[10px] text-purple-400/80 hover:text-purple-300 transition-colors font-medium">
              Decide
            </Link>
          </div>
          
          <div className="min-h-[100px] flex items-center">
            {decisions.length > 0 ? (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  AI recommends we <span className="text-purple-400 font-semibold">{pendingDecision.category.toUpperCase()}</span>: <span className="text-foreground font-bold">"{pendingDecision.title}"</span>. 
                  Reasoning: <span className="text-zinc-300">{pendingDecision.reasoning}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                No active strategic recommendations. Import node targets to formulate choices.
              </p>
            )}
          </div>
        </div>

        {/* AI Intelligence Feed */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
              <Clock className="h-4 w-4" /> AI Intelligence Feed
            </h3>
            <Link to="/pmx/history" className="text-[10px] text-zinc-400/80 hover:text-zinc-300 transition-colors font-medium">
              Timeline log
            </Link>
          </div>
          
          <div className="min-h-[100px] flex flex-col justify-center space-y-3">
            {history.slice(0, 2).map((log) => (
              <div key={log._id} className="text-[11px] font-mono leading-relaxed border-l-2 border-border/80 pl-3">
                <span className="text-zinc-600 block text-[9px]">
                  {new Date(log.createdAt).toLocaleDateString()} · {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-foreground font-medium mt-0.5">{log.action.replace(/_/g, ' ').toUpperCase()}</p>
                <p className="text-muted-foreground mt-0.5">{log.details}</p>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">No actions timeline logs synced.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
