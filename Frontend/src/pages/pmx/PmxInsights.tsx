import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, AlertTriangle, Lightbulb, CheckSquare, FileText,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, ArrowRight,
  MessageSquare, BarChart3, Cpu, TrendingUp, Users, DollarSign,
  Search, Filter, Zap, Circle, CheckCircle2, X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

// ── Confidence ring ────────────────────────────────────────────────
function ConfidenceRing({ value }: { value: number }) {
  const r = 16, circ = 2 * Math.PI * r;
  const fill = circ - (value / 100) * circ;
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#eab308" : "#ef4444";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-border/50" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{value}%</text>
    </svg>
  );
}

// ── Evidence pill ─────────────────────────────────────────────────
function EvidencePill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <span className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// ── Step badge ────────────────────────────────────────────────────
const STEPS = [
  { id: "evidence",    label: "Evidence",    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "problem",     label: "Problem",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  { id: "opportunity", label: "Opportunity", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { id: "decision",    label: "Recommendation", color: "text-sky-400", bg: "bg-sky-500/10",    border: "border-sky-500/20" },
];

type ActiveFilter = "all" | "pending" | "approved" | "rejected";

export default function PmxInsights() {
  const navigate = useNavigate();
  const { evidence, problems, opportunities, decisions, fetchDecisions, fetchSolutions } = usePmxStore();
  const { toast } = useToast();

  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  // For each decision, find its linked opportunity and problems
  const getLinkedOpportunity = (dec: any) =>
    opportunities.find(o => dec.title.toLowerCase().includes(o.title.toLowerCase().slice(0, 20))) || opportunities[0];

  const getLinkedProblems = (dec: any) =>
    problems.filter(p => p.severity === "critical" || p.severity === "high").slice(0, 2);

  const getLinkedEvidence = (dec: any) =>
    evidence.slice(0, 3);

  const filtered = decisions.filter(d => {
    const matchStatus = activeFilter === "all" || d.status === activeFilter;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reasoning.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all:      decisions.length,
    pending:  decisions.filter(d => d.status === "pending").length,
    approved: decisions.filter(d => d.status === "approved").length,
    rejected: decisions.filter(d => d.status === "rejected").length,
  };

  const handleApprove = async (id: string, title: string) => {
    setUpdatingId(id);
    toast({ title: "Approving...", description: `Generating PRD for "${title}"` });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status: "approved" }) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Approved — PRD generating", description: "Blueprint queued in PRD workspace." });
        fetchDecisions(); fetchSolutions();
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setUpdatingId(null); }
  };

  const handleReject = async (id: string, title: string) => {
    setUpdatingId(id);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status: "rejected" }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Rejected" }); fetchDecisions(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setUpdatingId(null); }
  };

  const handleGeneratePrd = (id: string, title: string) => {
    toast({ title: "Redirecting to PRD workspace..." });
    navigate("/pmx/prd");
  };

  const isEmpty = decisions.length === 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">

      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">AI Product Insights</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          What should we build, fix, or improve — and why?
        </p>
      </div>

      {/* ── REASONING FLOW HEADER BAR ────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${step.bg} ${step.border} ${step.color}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
          </div>
        ))}
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-400 shrink-0">PRD</span>
      </div>

      {/* ── FILTERS & SEARCH ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search insights..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground w-52" />
        </div>
        {(["all", "pending", "approved", "rejected"] as ActiveFilter[]).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
              activeFilter === f ? "bg-primary/10 border-primary/20 text-primary" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
            }`}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="text-[9px] font-mono">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* ── EMPTY STATE ─────────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No insights yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Connect product sources and run AI analysis to generate insights, problems, opportunities, and recommendations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/pmx/sources")} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all">
              Connect Sources
            </button>
            <button onClick={() => navigate("/pmx/analysis")} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-4 py-2 text-xs font-medium text-muted-foreground transition-all">
              Run Analysis
            </button>
          </div>
        </div>
      )}

      {/* ── INSIGHT CARDS ───────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.map((dec, idx) => {
          const linkedOpp  = getLinkedOpportunity(dec);
          const linkedProbs = getLinkedProblems(dec);
          const linkedEvid  = getLinkedEvidence(dec);
          const isExpanded  = expandedId === dec._id;
          const isApproved  = dec.status === "approved";
          const isRejected  = dec.status === "rejected";
          const isPending   = dec.status === "pending";

          return (
            <motion.div key={dec._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className={`rounded-2xl border bg-card/40 overflow-hidden transition-all ${
                isApproved ? "border-green-500/20" : isRejected ? "border-border/30 opacity-60" : "border-border/50 hover:border-border"
              }`}>

              {/* ── TOP: Status + Title + Confidence ── */}
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-4">
                  <ConfidenceRing value={dec.confidence} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        dec.category === "build"   ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                        dec.category === "improve" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                        dec.category === "optimize"? "bg-teal-500/10 border-teal-500/20 text-teal-400" :
                        dec.category === "remove"  ? "bg-red-500/10 border-red-500/20 text-red-400" :
                        "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}>{dec.category}</span>
                      {isApproved && <span className="flex items-center gap-1 text-[9px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-2.5 w-2.5" />Approved</span>}
                      {isRejected && <span className="text-[9px] font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">Rejected</span>}
                      {isPending  && <span className="flex items-center gap-1 text-[9px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full"><Circle className="h-2 w-2 fill-current" />Pending Review</span>}
                    </div>
                    <h3 className="text-sm font-bold text-foreground leading-snug">{dec.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{dec.reasoning}</p>
                  </div>

                  {/* Metrics row */}
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    {linkedOpp && (
                      <>
                        <div className="text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Impact</p>
                          <p className="text-sm font-bold font-mono text-yellow-400">{linkedOpp.userImpact}/10</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Effort</p>
                          <p className="text-sm font-bold font-mono text-orange-400">{linkedOpp.effort}/10</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">RICE</p>
                          <p className="text-sm font-bold font-mono text-primary">{linkedOpp.riceScore}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Evidence pills ── */}
                <div className="flex flex-wrap gap-1.5">
                  {linkedEvid.map((ev, i) => (
                    <EvidencePill key={i} icon={
                      ev.category === "customer"    ? MessageSquare :
                      ev.category === "behavior"    ? TrendingUp :
                      ev.category === "business"    ? DollarSign :
                      ev.category === "engineering" ? Cpu : BarChart3
                    } label={ev.title.slice(0, 28)} color={
                      ev.category === "customer"    ? "bg-green-500/5 border-green-500/20 text-green-400" :
                      ev.category === "behavior"    ? "bg-blue-500/5 border-blue-500/20 text-blue-400" :
                      ev.category === "business"    ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400" :
                      ev.category === "engineering" ? "bg-purple-500/5 border-purple-500/20 text-purple-400" :
                      "bg-muted/50 border-border text-muted-foreground"
                    } />
                  ))}
                  {linkedProbs.slice(0, 1).map((p, i) => (
                    <EvidencePill key={`p-${i}`} icon={AlertTriangle} label={p.title.slice(0, 28)}
                      color={p.severity === "critical" ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-orange-500/5 border-orange-500/20 text-orange-400"} />
                  ))}
                </div>

                {/* ── CTA row ── */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => setExpandedId(isExpanded ? null : dec._id)}
                    className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "Hide reasoning" : "Full AI reasoning"}
                  </button>
                  <div className="flex-1" />
                  {isPending && (
                    <>
                      <button onClick={() => handleReject(dec._id, dec.title)} disabled={updatingId === dec._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-destructive/30 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all text-xs">
                        <ThumbsDown className="h-3 w-3" /> Reject
                      </button>
                      <button onClick={() => handleGeneratePrd(dec._id, dec.title)} disabled={updatingId === dec._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-all text-xs">
                        <FileText className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => handleApprove(dec._id, dec.title)} disabled={updatingId === dec._id}
                        className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all disabled:opacity-50">
                        {updatingId === dec._id
                          ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          : <><ThumbsUp className="h-3 w-3 fill-current" /> Approve</>}
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button onClick={() => navigate("/pmx/prd")}
                      className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 px-3.5 py-1.5 text-xs font-semibold text-green-400 transition-all">
                      <FileText className="h-3 w-3" /> Open PRD <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── EXPANDED: Full reasoning ─────────────────────── */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border/40 bg-card/20">
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Left: full reasoning chain */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Problem Detected</p>
                          {linkedProbs.length > 0 ? linkedProbs.map((p, i) => (
                            <div key={i} className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                              <p className="text-xs font-semibold text-foreground">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{p.description}</p>
                              {p.suggestedFix && <p className="text-[10px] text-primary/80 italic">{p.suggestedFix}</p>}
                            </div>
                          )) : <p className="text-[10px] text-muted-foreground">No linked problems found.</p>}
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] text-primary uppercase tracking-wider font-bold flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Reasoning</p>
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{dec.reasoning}</p>
                        </div>

                        {dec.evidence && (
                          <div className="rounded-lg bg-card/60 border border-border/40 p-3">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Supporting Evidence</p>
                            <p className="text-[11px] text-muted-foreground italic">"{dec.evidence}"</p>
                          </div>
                        )}

                        {dec.tradeoffs && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Trade-offs</p>
                            <p className="text-[11px] text-foreground/80 leading-relaxed">{dec.tradeoffs}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: opportunity + business impact */}
                      <div className="space-y-4">
                        {linkedEvid.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1"><Users className="h-3 w-3" />Customer Evidence</p>
                            {linkedEvid.slice(0, 2).map((ev, i) => (
                              <div key={i} className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 space-y-1">
                                <p className="text-xs font-semibold text-foreground">{ev.title}</p>
                                {ev.quote && <p className="text-[10px] text-muted-foreground italic pl-2 border-l border-purple-500/20">"{ev.quote}"</p>}
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{ev.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="rounded-xl bg-card/60 border border-border/40 p-4 space-y-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Business Impact</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center rounded-lg bg-card border border-border/50 p-2.5">
                              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Expected ROI</p>
                              <p className="text-xs font-bold text-primary mt-0.5">{dec.estimatedROI || "TBD"}</p>
                            </div>
                            <div className="text-center rounded-lg bg-card border border-border/50 p-2.5">
                              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Outcome</p>
                              <p className="text-xs font-bold text-foreground mt-0.5 line-clamp-1">{dec.expectedOutcome || "TBD"}</p>
                            </div>
                          </div>
                          {linkedOpp && (
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                              {[
                                { label: "Impact", value: `${linkedOpp.userImpact}/10`, color: "text-blue-400" },
                                { label: "RICE",   value: linkedOpp.riceScore,           color: "text-primary" },
                                { label: "Risk",   value: linkedOpp.risk,                color: linkedOpp.risk === "high" ? "text-red-400" : linkedOpp.risk === "medium" ? "text-yellow-400" : "text-green-400" },
                              ].map(m => (
                                <div key={m.label} className="text-center">
                                  <p className="text-[8px] text-muted-foreground uppercase">{m.label}</p>
                                  <p className={`text-xs font-bold font-mono capitalize ${m.color}`}>{m.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <button onClick={() => handleApprove(dec._id, dec.title)} disabled={updatingId === dec._id}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all disabled:opacity-50">
                            {updatingId === dec._id
                              ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                              : <><ThumbsUp className="h-3.5 w-3.5 fill-current" />Approve & Generate PRD</>}
                          </button>
                        )}
                        {isApproved && (
                          <button onClick={() => navigate("/pmx/prd")}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 px-4 py-2.5 text-xs font-semibold text-green-400 transition-all">
                            <FileText className="h-3.5 w-3.5" />Open PRD Blueprint <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {!isEmpty && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-xs">
            No insights match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
