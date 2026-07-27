import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Search, Plus, X, Trash2, Sparkles, Link2,
  TrendingDown, Users, BarChart3, Cpu, ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const PROBLEM_TYPES = [
  { value: "all",           label: "All" },
  { value: "ux",            label: "UX" },
  { value: "performance",   label: "Performance" },
  { value: "security",      label: "Security" },
  { value: "growth",        label: "Growth" },
  { value: "retention",     label: "Retention" },
  { value: "tech_debt",     label: "Tech Debt" },
  { value: "feature_gap",   label: "Feature Gap" },
  { value: "business_risk", label: "Business" },
  { value: "revenue",       label: "Revenue" },
];

function getSeverityStyle(sev: string) {
  switch (sev) {
    case "critical": return { pill: "bg-red-500/10 border-red-500/20 text-red-400",    bar: "bg-red-500",    dot: "bg-red-400" };
    case "high":     return { pill: "bg-orange-500/10 border-orange-500/20 text-orange-400", bar: "bg-orange-500", dot: "bg-orange-400" };
    case "medium":   return { pill: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400", bar: "bg-yellow-500", dot: "bg-yellow-400" };
    default:         return { pill: "bg-zinc-800 border-zinc-700/50 text-zinc-400",     bar: "bg-zinc-500",   dot: "bg-zinc-500" };
  }
}

function getTypeLabel(type: string) {
  return PROBLEM_TYPES.find(t => t.value === type)?.label || "Product Risk";
}

export default function PmxProblems() {
  const { problems, fetchProblems } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle]                 = useState("");
  const [description, setDescription]     = useState("");
  const [type, setType]                   = useState("ux");
  const [severity, setSeverity]           = useState("medium");
  const [businessImpact, setBusinessImpact] = useState("");
  const [userImpact, setUserImpact]         = useState("");
  const [suggestedFix, setSuggestedFix]     = useState("");
  const [submitting, setSubmitting]         = useState(false);

  const filtered = problems.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      && (filterType === "all" || p.type === filterType);
  });

  const groupedBySeverity = {
    critical: filtered.filter(p => p.severity === "critical"),
    high:     filtered.filter(p => p.severity === "high"),
    medium:   filtered.filter(p => p.severity === "medium"),
    low:      filtered.filter(p => p.severity === "low"),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/problems`, { method: "POST", headers, body: JSON.stringify({ title, description, type, severity, businessImpact, userImpact, suggestedFix }) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Problem logged" });
        setTitle(""); setDescription(""); setBusinessImpact(""); setUserImpact(""); setSuggestedFix(""); setIsAdding(false);
        fetchProblems();
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete: "${name}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/problems/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed" }); fetchProblems(); }
  };

  const severityGroups = [
    { key: "critical", label: "Critical", color: "text-red-400", border: "border-red-500/20" },
    { key: "high",     label: "High",     color: "text-orange-400", border: "border-orange-500/20" },
    { key: "medium",   label: "Medium",   color: "text-yellow-400", border: "border-yellow-500/20" },
    { key: "low",      label: "Low",      color: "text-zinc-400",   border: "border-zinc-700/50" },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" /> AI Issue Intelligence Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {problems.length} issues detected · AI-prioritized by business impact & severity
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search issues..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex flex-wrap gap-1">
            {PROBLEM_TYPES.slice(0, 5).map(t => (
              <button key={t.value} onClick={() => setFilterType(t.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${filterType===t.value ? "bg-primary/10 border-primary/20 text-primary" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Problem
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {severityGroups.map(sg => {
          const count = groupedBySeverity[sg.key].length;
          const style = getSeverityStyle(sg.key);
          return (
            <div key={sg.key} className={`glass-card p-3 flex items-center gap-3 cursor-pointer border ${count > 0 ? style.pill : "border-border/30"}`} onClick={() => setFilterType("all")}>
              <div className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{sg.label}</p>
                <p className={`text-lg font-bold font-mono ${sg.color}`}>{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped problem cards */}
      <div className="space-y-8">
        {severityGroups.map(sg => {
          const items = groupedBySeverity[sg.key];
          if (items.length === 0) return null;
          return (
            <div key={sg.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${getSeverityStyle(sg.key).dot}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${sg.color}`}>{sg.label} Issues</h3>
                <span className="text-[10px] text-muted-foreground font-mono">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(prob => {
                  const style = getSeverityStyle(prob.severity);
                  const isExpanded = expandedId === prob._id;
                  return (
                    <motion.div key={prob._id} layout className="glass-card p-5 space-y-3 flex flex-col justify-between relative overflow-hidden">
                      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_0%_0%,rgba(239,68,68,0.02)_0%,transparent_60%)]`} />
                      <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] uppercase tracking-wider font-bold border px-2 py-0.5 rounded-full ${style.pill}`}>{prob.severity}</span>
                              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{getTypeLabel(prob.type)}</span>
                            </div>
                            <h3 className="text-xs font-bold text-foreground leading-snug">{prob.title}</h3>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setExpandedId(isExpanded ? null : prob._id)} className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button onClick={() => handleDelete(prob._id, prob.title)} className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{prob.description}</p>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">User Impact</span></div>
                                <p className="text-[10px] text-foreground/80 leading-snug">{prob.userImpact || "Impacts user flow."}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Business Impact</span></div>
                                <p className="text-[10px] text-foreground/80 leading-snug">{prob.businessImpact || "Affects conversions."}</p>
                              </div>
                            </div>
                            {prob.suggestedFix && (
                              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 space-y-1">
                                <span className="text-[9px] uppercase tracking-wider text-primary font-bold flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Recommended Fix</span>
                                <p className="text-[11px] text-foreground/80 leading-relaxed">{prob.suggestedFix}</p>
                              </div>
                            )}
                            {prob.evidence && prob.evidence.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />Evidence:</span>
                                {prob.evidence.map((ev, i) => (
                                  <span key={i} className="bg-card border border-border rounded px-1.5 py-0.5 text-[9px] font-mono truncate max-w-[100px]">{ev}</span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <AlertTriangle className="h-8 w-8 text-border" />
            <p className="text-xs">No problems detected. Import sources and run analysis to find issues.</p>
          </div>
        )}
      </div>

      {/* Add problem drawer */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[420px] h-full bg-card border-l border-border p-6 flex flex-col relative z-10 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Log Product Problem</h3>
                <button onClick={() => setIsAdding(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Problem Title</label>
                  <input required type="text" placeholder="e.g. Checkout 3DS failure rate" value={title} onChange={e => setTitle(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                      {PROBLEM_TYPES.filter(t => t.value !== "all").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Severity</label>
                    <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                      {["critical","high","medium","low"].map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select></div>
                </div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Description</label>
                  <textarea required rows={3} placeholder="Describe the problem..." value={description} onChange={e => setDescription(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">User Impact</label>
                  <input required type="text" placeholder="How users are affected" value={userImpact} onChange={e => setUserImpact(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Business Impact</label>
                  <input required type="text" placeholder="Revenue / conversion effect" value={businessImpact} onChange={e => setBusinessImpact(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Suggested Fix</label>
                  <textarea required rows={3} placeholder="Recommended solution..." value={suggestedFix} onChange={e => setSuggestedFix(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" /></div>
                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <span>Save Problem</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
