import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Search, Sparkles, ArrowUpDown, Plus, X, Trash2, Sliders,
  Info, TrendingUp, DollarSign, Users, Zap, AlertCircle, ChevronDown, ChevronUp, BarChart3
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

function getRiskStyle(risk: string) {
  if (risk === "high")   return "bg-red-500/10 border-red-500/20 text-red-400";
  if (risk === "medium") return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  return "bg-green-500/10 border-green-500/20 text-green-400";
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border/50">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-12 text-right">{value}/{max}</span>
    </div>
  );
}

export default function PmxOpportunities() {
  const { opportunities, fetchOpportunities } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery]   = useState("");
  const [sortField, setSortField]       = useState<"riceScore"|"iceScore"|"effort"|"userImpact">("riceScore");
  const [sortAsc, setSortAsc]           = useState(false);
  const [isAdding, setIsAdding]         = useState(false);
  const [editingOpp, setEditingOpp]     = useState<any>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const [title, setTitle]                         = useState("");
  const [description, setDescription]             = useState("");
  const [userImpact, setUserImpact]               = useState(5);
  const [revenueImpact, setRevenueImpact]         = useState(5);
  const [retentionImpact, setRetentionImpact]     = useState(5);
  const [strategicAlignment, setStrategicAlignment] = useState(5);
  const [confidence, setConfidence]               = useState(80);
  const [effort, setEffort]                       = useState(5);
  const [risk, setRisk]                           = useState("medium");
  const [submitting, setSubmitting]               = useState(false);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(p => !p);
    else { setSortField(field); setSortAsc(false); }
  };

  const filtered = opportunities
    .filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()) || o.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField], vb = b[sortField];
      return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });

  const calcICE  = () => Math.round(userImpact * (confidence / 100) * (11 - effort) * 10) / 10;
  const calcRICE = () => Math.round(((userImpact * 10 * userImpact * (confidence / 100)) / effort) * 10) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/opportunities`, { method: "POST", headers, body: JSON.stringify({ id: editingOpp?._id, title, description, userImpact, revenueImpact, retentionImpact, strategicAlignment, confidence, effort, risk }) });
      const json = await res.json();
      if (json.success) { toast({ title: editingOpp ? "Updated" : "Added", description: `"${title}" saved.` }); closeDrawer(); fetchOpportunities(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSubmitting(false); }
  };

  const openEdit = (opp: any) => { setEditingOpp(opp); setTitle(opp.title); setDescription(opp.description); setUserImpact(opp.userImpact); setRevenueImpact(opp.revenueImpact); setRetentionImpact(opp.retentionImpact); setStrategicAlignment(opp.strategicAlignment); setConfidence(opp.confidence); setEffort(opp.effort); setRisk(opp.risk); setIsAdding(true); };

  const closeDrawer = () => { setIsAdding(false); setEditingOpp(null); setTitle(""); setDescription(""); setUserImpact(5); setRevenueImpact(5); setRetentionImpact(5); setStrategicAlignment(5); setConfidence(80); setEffort(5); setRisk("medium"); };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/opportunities/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed" }); fetchOpportunities(); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" /> RICE & ICE Prioritization Matrix
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {opportunities.length} opportunities scored · Sorted by {sortField === "riceScore" ? "RICE" : sortField}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search opportunities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Opportunity
          </button>
        </div>
      </div>

      {/* Score info */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">RICE Score: </span>(Reach × Impact × Confidence) ÷ Effort — higher is better (max ~1000).
          <span className="ml-3 font-semibold text-foreground">ICE Score: </span>Impact × Confidence × Ease — quick filter for low-effort wins (max 100).
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-card/60 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
              <th className="p-3.5">Opportunity</th>
              <th className="p-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort("userImpact")}><div className="flex items-center gap-1">Impact <ArrowUpDown className="h-3 w-3" /></div></th>
              <th className="p-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort("effort")}><div className="flex items-center gap-1">Effort <ArrowUpDown className="h-3 w-3" /></div></th>
              <th className="p-3.5">Risk</th>
              <th className="p-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort("iceScore")}><div className="flex items-center gap-1">ICE <ArrowUpDown className="h-3 w-3" /></div></th>
              <th className="p-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort("riceScore")}><div className="flex items-center gap-1">RICE <ArrowUpDown className="h-3 w-3" /></div></th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((opp, idx) => {
              const isExpanded = expandedId === opp._id;
              return (
                <>
                  <tr key={opp._id} onClick={() => setExpandedId(isExpanded ? null : opp._id)} className="hover:bg-card/60 cursor-pointer transition-colors">
                    <td className="p-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground/60 w-5">#{idx + 1}</span>
                        <div>
                          <h4 className="font-semibold text-foreground text-xs">{opp.title}</h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{opp.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5"><span className="font-mono text-foreground">{opp.userImpact}/10</span></td>
                    <td className="p-3.5"><span className="font-mono text-foreground">{opp.effort}/10</span></td>
                    <td className="p-3.5"><span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getRiskStyle(opp.risk)}`}>{opp.risk}</span></td>
                    <td className="p-3.5"><span className="font-mono font-bold text-foreground">{opp.iceScore}</span><span className="text-muted-foreground text-[9px]">/100</span></td>
                    <td className="p-3.5"><span className="font-mono font-bold text-primary">{opp.riceScore}</span><span className="text-muted-foreground text-[9px]">/1000</span></td>
                    <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(opp)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"><Sliders className="h-3.5 w-3.5" /></button>
                        <button onClick={e => handleDelete(opp._id, opp.title, e)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${opp._id}-expanded`} className="bg-card/40">
                      <td colSpan={7} className="px-8 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="space-y-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1"><Users className="h-3 w-3" /> User Impact</p>
                            <ScoreBar value={opp.userImpact} max={10} color="bg-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1"><DollarSign className="h-3 w-3" /> Revenue Impact</p>
                            <ScoreBar value={opp.revenueImpact} max={10} color="bg-yellow-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Retention Impact</p>
                            <ScoreBar value={opp.retentionImpact} max={10} color="bg-green-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Confidence</p>
                            <ScoreBar value={opp.confidence} max={100} color="bg-primary" />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed max-w-2xl">{opp.description}</p>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-xs"><Lightbulb className="h-6 w-6 text-border mx-auto mb-2" />No opportunities yet. Run analysis to discover them.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Score slider drawer */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[420px] h-full bg-card border-l border-border p-6 flex flex-col relative z-10 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Sliders className="h-4 w-4 text-primary" />{editingOpp ? "Edit Opportunity" : "Add Opportunity"}</h3>
                <button onClick={closeDrawer} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Title</label>
                  <input required type="text" placeholder="e.g. Integrate Apple Pay" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Description</label>
                  <textarea required rows={3} placeholder="Scope and value..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" /></div>
                <div className="space-y-4 pt-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scoring Parameters</p>
                  {[
                    { label: "User Impact", value: userImpact, max: 10, setter: setUserImpact, color: "text-blue-400" },
                    { label: "Revenue Impact", value: revenueImpact, max: 10, setter: setRevenueImpact, color: "text-yellow-400" },
                    { label: "Effort (lower = better)", value: effort, max: 10, setter: setEffort, color: "text-orange-400" },
                  ].map(s => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-foreground/80">{s.label}</span><span className={`font-bold font-mono ${s.color}`}>{s.value}/{s.max}</span></div>
                      <input type="range" min="1" max={s.max} value={s.value} onChange={e => s.setter(Number(e.target.value))} className="w-full accent-sky-500" />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-foreground/80">AI Confidence</span><span className="font-bold font-mono text-primary">{confidence}%</span></div>
                    <input type="range" min="10" max="100" step="5" value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Risk Level</label>
                    <select value={risk} onChange={e => setRisk(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      <option value="low">Low Risk</option><option value="medium">Medium Risk</option><option value="high">High Risk</option>
                    </select></div>
                </div>
                {/* Score preview */}
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 grid grid-cols-2 gap-4 text-center">
                  <div><p className="text-[9px] text-muted-foreground font-mono uppercase">Predicted ICE</p><p className="text-xl font-bold text-foreground mt-1">{calcICE()}<span className="text-muted-foreground text-xs">/100</span></p></div>
                  <div><p className="text-[9px] text-muted-foreground font-mono uppercase">Predicted RICE</p><p className="text-xl font-bold text-primary mt-1">{calcRICE()}<span className="text-muted-foreground text-xs">/1000</span></p></div>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <span>Save Scorecard</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
