import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Sparkles, TrendingUp, ThumbsUp, ThumbsDown, GitPullRequest,
  MessageSquare, Clock, BarChart3, ArrowRight, FileText, ChevronRight, Cpu
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

function getCategoryTheme(cat: string) {
  const themes: Record<string, string> = {
    build:      "bg-blue-500/10 border-blue-500/20 text-blue-400",
    improve:    "bg-green-500/10 border-green-500/20 text-green-400",
    optimize:   "bg-teal-500/10 border-teal-500/20 text-teal-400",
    remove:     "bg-red-500/10 border-red-500/20 text-red-400",
    experiment: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    delay:      "bg-zinc-800 border-zinc-700/50 text-zinc-400",
  };
  return themes[cat] || themes.delay;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-border/50">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{value}%</span>
    </div>
  );
}

export default function PmxDecisions() {
  const { decisions, fetchDecisions, fetchSolutions } = usePmxStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab]   = useState<"pending"|"approved"|"rejected">("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const counts = {
    pending:  decisions.filter(d => d.status === "pending").length,
    approved: decisions.filter(d => d.status === "approved").length,
    rejected: decisions.filter(d => d.status === "rejected").length,
  };

  const filtered = decisions.filter(d => d.status === activeTab);

  const handleStatusChange = async (id: string, title: string, status: "approved"|"rejected") => {
    setUpdatingId(id);
    toast({ title: status === "approved" ? "Approving..." : "Rejecting...", description: status === "approved" ? `Generating PRD for "${title}"` : `"${title}" rejected.` });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status }) });
      const json = await res.json();
      if (json.success) {
        toast({ title: status === "approved" ? "Approved — PRD queued" : "Rejected", description: status === "approved" ? "Find the blueprint in Solution Studio." : undefined });
        fetchDecisions(); fetchSolutions();
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setUpdatingId(null); }
  };

  const tabStyle = (tab: string) =>
    activeTab === tab
      ? "bg-card border-primary/20 text-foreground"
      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" /> AI Decision Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review and approve AI recommendations · Approved decisions auto-generate PRDs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40 pb-0">
        {([
          { id: "pending",  label: "Pending Approval", dotColor: "bg-yellow-400" },
          { id: "approved", label: "Approved",         dotColor: "bg-green-400" },
          { id: "rejected", label: "Rejected",         dotColor: "bg-red-400" },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold border border-b-0 capitalize transition-all ${tabStyle(tab.id)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tab.dotColor}`} />
            {tab.label}
            <span className="ml-1 text-[9px] font-mono text-muted-foreground bg-muted border border-border rounded-full px-1.5 py-0.5">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Decision cards */}
      <div className="space-y-4">
        {filtered.map(dec => (
          <motion.div key={dec._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-5 relative overflow-hidden">
            {/* Approve glow */}
            {activeTab === "approved" && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_0%_0%,rgba(34,197,94,0.04)_0%,transparent_60%)]" />}

            {/* Top row */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border font-mono ${getCategoryTheme(dec.category)}`}>{dec.category}</span>
                  {activeTab === "pending" && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">Awaiting Approval</span>}
                  {activeTab === "approved" && <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><ThumbsUp className="h-2.5 w-2.5" /> Approved</span>}
                </div>
                <h3 className="text-sm font-bold text-foreground">{dec.title}</h3>
              </div>

              {activeTab === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleStatusChange(dec._id, dec.title, "rejected")} disabled={updatingId === dec._id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-destructive/30 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all text-xs">
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button onClick={() => handleStatusChange(dec._id, dec.title, "approved")} disabled={updatingId === dec._id}
                    className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all disabled:opacity-50">
                    {updatingId === dec._id ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><ThumbsUp className="h-3.5 w-3.5 fill-current" /><span>Approve & Generate PRD</span></>}
                  </button>
                </div>
              )}
              {activeTab === "approved" && (
                <div className="flex items-center gap-1.5 text-xs text-primary border border-primary/20 bg-primary/5 px-3 py-2 rounded-lg">
                  <FileText className="h-3.5 w-3.5" /> PRD in Solution Studio
                </div>
              )}
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-border/40">
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">AI Reasoning</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{dec.reasoning}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Supporting Evidence</p>
                  <p className="text-xs text-muted-foreground italic leading-relaxed pl-3 border-l-2 border-border">"{dec.evidence || "Based on aggregated product signals."}"</p>
                </div>
                {dec.tradeoffs && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Trade-offs</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{dec.tradeoffs}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-card/60 border border-border/50 p-4 space-y-4">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1">AI Confidence</p>
                  <ConfidenceBar value={dec.confidence} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Expected Outcome</p>
                  <p className="text-xs text-foreground font-medium">{dec.expectedOutcome}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Estimated ROI</p>
                  <p className="text-xs text-primary font-semibold">{dec.estimatedROI}</p>
                </div>
                {dec.alternativeSolutions && dec.alternativeSolutions.length > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Alternatives Rejected</p>
                    <ul className="space-y-1">
                      {dec.alternativeSolutions.map((sol, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/40" />{sol}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center text-muted-foreground text-xs flex flex-col items-center gap-3">
            <CheckSquare className="h-8 w-8 text-border" />
            <p>No {activeTab} recommendations. {activeTab === "pending" ? "Run AI analysis to generate decisions." : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
