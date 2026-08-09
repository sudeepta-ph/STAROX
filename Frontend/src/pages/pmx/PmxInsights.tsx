import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, AlertTriangle, FileText, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, ArrowRight, MessageSquare, TrendingUp,
  Cpu, DollarSign, Search, CheckCircle2, Circle, Loader2, BarChart3,
  Layers, Users, X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

type ActiveFilter = "all" | "pending" | "approved" | "rejected";

export default function PmxInsights() {
  const navigate = useNavigate();
  const { evidence, problems, opportunities, decisions, fetchDecisions, fetchSolutions } = usePmxStore();
  const { toast } = useToast();

  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [updatingId, setUpdatingId]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Link decisions to corresponding opportunities, problems, and evidence
  const getLinkedOpportunity = (dec: any) =>
    opportunities.find(o => dec.title.toLowerCase().includes(o.title.toLowerCase().slice(0, 20))) || opportunities[0];

  const getLinkedProblems = (dec: any) =>
    problems.filter(p => p.severity === "critical" || p.severity === "high").slice(0, 2);

  const getLinkedEvidence = (dec: any) =>
    evidence.slice(0, 3);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllExpanded = () => {
    if (expandedIds.size === filtered.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filtered.map(d => d._id)));
    }
  };

  const filtered = decisions.filter(d => {
    const matchStatus = activeFilter === "all" || d.status === activeFilter;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reasoning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.category && d.category.toLowerCase().includes(searchQuery.toLowerCase()));
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
    toast({ title: "Approving...", description: `Generating PRD blueprint for "${title}"` });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status: "approved" }) });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Approved — PRD generating",
          description: "Blueprint queued in PRD workspace.",
          action: <ToastAction altText="Open PRD" onClick={() => navigate("/pmx/prd")}>Open PRD</ToastAction>,
        });
        fetchDecisions(); fetchSolutions();
      }
    } catch { toast({ variant: "destructive", title: "Error approving recommendation" }); }
    finally { setUpdatingId(null); }
  };

  const handleReject = async (id: string, title: string) => {
    setUpdatingId(id);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status: "rejected" }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Recommendation marked as rejected" }); fetchDecisions(); }
    } catch { toast({ variant: "destructive", title: "Error rejecting recommendation" }); }
    finally { setUpdatingId(null); }
  };

  const handleGeneratePrd = (id: string, title: string) => {
    toast({ title: "Opening PRD workspace..." });
    navigate("/pmx/prd");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateDecisionStatus = async (id: string, status: "approved" | "rejected") => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, { method: "PUT", headers, body: JSON.stringify({ status }) });
    return res.json();
  };

  const handleBulkApprove = async () => {
    const ids = selectedIds.filter(id => decisions.find(d => d._id === id)?.status === "pending");
    if (ids.length === 0) return;
    setBulkProcessing(true);
    toast({ title: `Approving ${ids.length} recommendation${ids.length === 1 ? "" : "s"}...`, description: "Generating PRD blueprints — this can take a moment." });
    try {
      for (const id of ids) await updateDecisionStatus(id, "approved");
      toast({
        title: "Approved",
        description: `${ids.length} recommendation${ids.length === 1 ? "" : "s"} approved — blueprints queued in PRD workspace.`,
        action: <ToastAction altText="Open PRD" onClick={() => navigate("/pmx/prd")}>Open PRD</ToastAction>,
      });
    } catch {
      toast({ variant: "destructive", title: "Some approvals failed", description: "Refresh to see which ones went through." });
    } finally {
      setSelectedIds([]);
      setBulkProcessing(false);
      fetchDecisions(); fetchSolutions();
    }
  };

  const handleBulkReject = async () => {
    const ids = selectedIds.filter(id => decisions.find(d => d._id === id)?.status === "pending");
    if (ids.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(ids.map(id => updateDecisionStatus(id, "rejected")));
      toast({ title: `Rejected ${ids.length} recommendation${ids.length === 1 ? "" : "s"}` });
    } catch {
      toast({ variant: "destructive", title: "Some rejections failed", description: "Refresh to see which ones went through." });
    } finally {
      setSelectedIds([]);
      setBulkProcessing(false);
      fetchDecisions();
    }
  };

  const isEmpty = decisions.length === 0;
  const pendingFiltered = filtered.filter(d => d.status === "pending");

  // Summary generation from actual data
  const topPending = decisions.find(d => d.status === "pending") || decisions[0];
  const uniqueCategories = [...new Set(decisions.map(d => d.category).filter(Boolean))];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-28">

      {/* ── 1. PAGE HEADER ────────────────────────────────────────── */}
      <div className="space-y-4 pb-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                AI Product Insights
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              What should we build, fix, or improve — and why?
            </p>
          </div>
          <button
            onClick={() => navigate("/pmx/analysis")}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-semibold text-black transition-all shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Run AI Experience Intelligence →
          </button>
        </div>

        {/* Intelligence pipeline progression */}
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/70 overflow-x-auto scrollbar-none pt-1">
          <span className="text-foreground/90 font-semibold">Evidence</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-foreground/90 font-semibold">Problem</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-foreground/90 font-semibold">Opportunity</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-sky-400 font-semibold">Recommendation</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-muted-foreground">PRD Blueprint</span>
        </div>

        {/* Metric counts line */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
          <span className="font-semibold text-foreground">{counts.all} recommendations</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span className="font-medium text-foreground">{counts.pending}</span> pending review
          </span>
          {counts.approved > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-foreground">{counts.approved}</span> approved
              </span>
            </>
          )}
          {counts.rejected > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="font-medium text-foreground">{counts.rejected}</span> rejected
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── 2. PRODUCT SIGNAL / EXECUTIVE SUMMARY ─────────────────── */}
      {!isEmpty && (
        <section className="space-y-2 pb-6 border-b border-border/40">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Product Signal
          </h2>
          <p className="text-xs text-foreground/90 leading-relaxed font-normal">
            PMX synthesized <span className="font-semibold text-foreground">{decisions.length} actionable product opportunities</span> across your active codebase and UX scan.
            {topPending && (
              <> The highest-priority initiative is <span className="font-semibold text-foreground">"{topPending.title}"</span> ({topPending.category}), with complementary signals across {uniqueCategories.slice(0, 3).join(", ")}.</>
            )}
          </p>
        </section>
      )}

      {/* ── 3. FILTER & SEARCH CONTROLS ───────────────────────────── */}
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Segmented status filter */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 self-start sm:self-auto">
            {(["all", "pending", "approved", "rejected"] as ActiveFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  activeFilter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                <span>{f === "all" ? "All" : f}</span>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-muted/30 border border-border/50 focus:border-ring rounded-md py-1 pl-8 pr-3 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/60 transition-colors"
              />
            </div>

            {/* Expand / Collapse all */}
            <button
              onClick={toggleAllExpanded}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1"
            >
              {expandedIds.size === filtered.length ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>
      )}

      {/* ── 4. CONTEXTUAL BULK ACTIONS TOOLBAR ─────────────────────── */}
      {pendingFiltered.length > 0 && selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2 text-xs"
        >
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-[11px]">
              <span className="font-semibold text-foreground">{selectedIds.length}</span> of {pendingFiltered.length} pending selected
            </span>
            <button
              onClick={() => setSelectedIds(pendingFiltered.map(d => d._id))}
              className="text-[11px] text-sky-400 hover:underline font-medium"
            >
              Select all pending
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkReject}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs disabled:opacity-50"
            >
              <ThumbsDown className="h-3 w-3" /> Reject {selectedIds.length}
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-1 text-xs font-semibold text-black transition-all disabled:opacity-50 shadow-sm"
            >
              {bulkProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ThumbsUp className="h-3 w-3 fill-current" />
              )}
              Approve {selectedIds.length}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── 5. EMPTY STATE ─────────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Sparkles className="h-8 w-8 text-border" />
          <p className="text-xs font-semibold text-foreground">No insights yet</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-sm leading-relaxed">
            Run PMX Experience Intelligence or connect product sources to identify high-impact opportunities and recommendations.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => navigate("/pmx/sources")}
              className="px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              Connect Sources
            </button>
            <button
              onClick={() => navigate("/pmx/analysis")}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-black transition-colors"
            >
              Run UX Audit
            </button>
          </div>
        </div>
      )}

      {/* ── 6. PRIORITIZED DECISION REPORT ─────────────────────────── */}
      <div className="divide-y divide-border/30">
        {filtered.map((dec, idx) => {
          const linkedOpp  = getLinkedOpportunity(dec);
          const linkedProbs = getLinkedProblems(dec);
          const linkedEvid  = getLinkedEvidence(dec);
          const isExpanded  = expandedIds.has(dec._id);
          const isApproved  = dec.status === "approved";
          const isRejected  = dec.status === "rejected";
          const isPending   = dec.status === "pending";
          const numStr      = String(idx + 1).padStart(2, "0");

          return (
            <div key={dec._id} className="py-6 first:pt-0 last:pb-0 space-y-3 transition-colors">

              {/* Row Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Select checkbox for pending */}
                  {isPending ? (
                    <div className="pt-0.5 shrink-0">
                      <Checkbox
                        checked={selectedIds.includes(dec._id)}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(dec._id); }}
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-muted-foreground/60 shrink-0 mt-0.5 select-none">
                      {numStr}
                    </span>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {dec.title}
                      </h3>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                          Rejected
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span className="capitalize font-medium text-sky-400">
                        {dec.category || "Recommendation"}
                      </span>
                      <span>·</span>
                      <span>Product Signals & UX Audit</span>
                      <span>·</span>
                      <span>{dec.confidence}% confidence</span>
                    </div>

                    {/* One-sentence summary */}
                    <p className="text-xs text-foreground/80 leading-relaxed pt-0.5 font-normal">
                      {dec.reasoning}
                    </p>

                    {/* Compact RICE & Impact metrics */}
                    {linkedOpp && (
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground/70">Impact:</span>
                          <span className="font-mono font-semibold text-foreground">{linkedOpp.userImpact}/10</span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground/70">Effort:</span>
                          <span className="font-mono font-semibold text-foreground">{linkedOpp.effort}/10</span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground/70">RICE:</span>
                          <span className="font-mono font-semibold text-sky-400">{linkedOpp.riceScore}</span>
                        </span>
                        {dec.estimatedROI && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="text-muted-foreground/70">Expected ROI:</span>
                              <span className="font-semibold text-foreground">{dec.estimatedROI}</span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Decision Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleReject(dec._id, dec.title)}
                        disabled={updatingId === dec._id}
                        className="px-2.5 py-1.5 rounded-md border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                        title="Reject recommendation"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleGeneratePrd(dec._id, dec.title)}
                        disabled={updatingId === dec._id}
                        className="px-2.5 py-1.5 rounded-md border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleApprove(dec._id, dec.title)}
                        disabled={updatingId === dec._id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-semibold text-black transition-all shadow-sm disabled:opacity-50"
                      >
                        {updatingId === dec._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-3 w-3 fill-current" />
                        )}
                        Approve →
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => navigate("/pmx/prd")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 hover:border-foreground/30 hover:bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground transition-all"
                    >
                      <FileText className="h-3 w-3 text-sky-400" />
                      Open PRD →
                    </button>
                  )}
                </div>
              </div>

              {/* Expand reasoning toggle */}
              <div className="pl-6">
                <button
                  onClick={() => toggleExpand(dec._id)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-sky-400 transition-colors"
                >
                  {isExpanded ? (
                    <>Hide reasoning <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Why PMX recommends this <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              </div>

              {/* Expanded Reasoning & Evidence Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-6 pt-3 space-y-4 text-xs leading-relaxed border-l-2 border-border/40 ml-2">

                      {/* Problems detected */}
                      {linkedProbs.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Problem Detected
                          </span>
                          <div className="space-y-1.5 mt-1">
                            {linkedProbs.map((p, i) => (
                              <div key={i} className="text-foreground/85">
                                <span className="font-semibold text-foreground">{p.title}</span>
                                {p.description && <span className="text-muted-foreground ml-1.5">— {p.description}</span>}
                                {p.suggestedFix && (
                                  <p className="text-[11px] text-sky-400 mt-0.5">Suggested fix: {p.suggestedFix}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supporting Evidence */}
                      {dec.evidence && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Supporting Evidence
                          </span>
                          <p className="text-foreground/80 mt-0.5 italic">
                            "{dec.evidence}"
                          </p>
                        </div>
                      )}

                      {/* Trade-offs & Expected Outcome */}
                      {(dec.tradeoffs || dec.expectedOutcome) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {dec.tradeoffs && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Trade-offs
                              </span>
                              <p className="text-foreground/80 mt-0.5">{dec.tradeoffs}</p>
                            </div>
                          )}
                          {dec.expectedOutcome && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Expected Outcome
                              </span>
                              <p className="text-foreground/80 mt-0.5">{dec.expectedOutcome}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer quotes if present */}
                      {linkedEvid.some(e => e.quote) && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            User Feedback
                          </span>
                          <div className="space-y-1 mt-0.5">
                            {linkedEvid.filter(e => e.quote).map((e, i) => (
                              <p key={i} className="text-muted-foreground italic text-[11px]">
                                "{e.quote}" — <span className="text-foreground/70 not-italic">{e.title}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {!isEmpty && filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-xs italic">
            No recommendations match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

