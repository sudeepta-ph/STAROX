import { useState, useEffect } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Link2, Github, FileText, MessageSquare, Upload, Search,
  RefreshCw, Trash2, ExternalLink, ChevronRight, Sparkles, Database,
  Activity, BarChart3, Bell, Plug, FolderOpen, GitBranch, LayoutGrid,
  Calendar, Zap, CheckCircle2, AlertCircle, Clock, Settings
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const CONNECTOR_TYPES = [
  { group: "Website & Code", items: [
    { id: "url",      label: "Website",   icon: Link2,      color: "text-sky-400",    bg: "bg-sky-500/10",     border: "border-sky-500/20" },
    { id: "repo",     label: "GitHub",    icon: Github,     color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { id: "gitlab",   label: "GitLab",    icon: GitBranch,  color: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  ]},
  { group: "Analytics", items: [
    { id: "analytics",label: "Google Analytics", icon: BarChart3, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { id: "mixpanel", label: "Mixpanel",  icon: Activity,   color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { id: "posthog",  label: "PostHog",  icon: Activity,   color: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  ]},
  { group: "Support & Feedback", items: [
    { id: "support",  label: "Intercom",  icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { id: "zendesk",  label: "Zendesk",   icon: MessageSquare, color: "text-teal-400",  bg: "bg-teal-500/10",  border: "border-teal-500/20" },
    { id: "interview",label: "Interview Notes", icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  ]},
  { group: "Documents & Data", items: [
    { id: "csv",      label: "CSV / Excel", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { id: "text",     label: "PDF / Doc",   icon: FolderOpen, color: "text-zinc-400",  bg: "bg-zinc-500/10",   border: "border-zinc-500/20" },
    { id: "report",   label: "Report",      icon: LayoutGrid, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  ]},
];

const SCHEDULE_OPTIONS = [
  { value: "1h",     label: "Every hour" },
  { value: "2h",     label: "Every 2 hours" },
  { value: "daily",  label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly",label: "Monthly" },
  { value: "manual", label: "Manual only" },
];

function getConnectorMeta(type: string) {
  for (const group of CONNECTOR_TYPES) {
    const found = group.items.find(i => i.id === type);
    if (found) return found;
  }
  return { id: type, label: type, icon: Upload, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };
}

export default function PmxSources() {
  const { inputs, fetchInputs, runPipeline, loading, selectedSourceIds, setSelectedSourceIds } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInput, setSelectedInput] = useState<any>(null);
  const [pipelinePhase, setPipelinePhase] = useState<"idle"|"queued"|"processing"|"analyzing"|"completed"|"failed">("idle");
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("url");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [schedule, setSchedule] = useState("manual");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let t1: any, t2: any;
    const onStart = () => { setPipelinePhase("queued"); t1 = setTimeout(() => setPipelinePhase("processing"), 2500); t2 = setTimeout(() => setPipelinePhase("analyzing"), 8000); };
    const onDone  = () => { clearTimeout(t1); clearTimeout(t2); setPipelinePhase("completed"); setTimeout(() => setPipelinePhase("idle"), 5000); };
    const onFail  = () => { clearTimeout(t1); clearTimeout(t2); setPipelinePhase("failed");    setTimeout(() => setPipelinePhase("idle"), 5000); };
    window.addEventListener("pmx-pipeline-started",   onStart);
    window.addEventListener("pmx-pipeline-completed", onDone);
    window.addEventListener("pmx-pipeline-failed",    onFail);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("pmx-pipeline-started",onStart); window.removeEventListener("pmx-pipeline-completed",onDone); window.removeEventListener("pmx-pipeline-failed",onFail); };
  }, []);

  const filteredInputs = inputs.filter(i => {
    const q = searchQuery.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || (i.summary && i.summary.toLowerCase().includes(q));
    const matchType = filterType === "all" || i.type === filterType;
    return matchSearch && matchType;
  });

  const handleCheckboxClick = (index: number, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && lastCheckedIndex !== null) {
      const start = Math.min(lastCheckedIndex, index), end = Math.max(lastCheckedIndex, index);
      const rangeIds = filteredInputs.slice(start, end + 1).map(i => i._id);
      const checked = selectedSourceIds.includes(id);
      const next = checked ? selectedSourceIds.filter(x => !rangeIds.includes(x)) : [...new Set([...selectedSourceIds, ...rangeIds])];
      setSelectedSourceIds(next);
    } else {
      setSelectedSourceIds(selectedSourceIds.includes(id) ? selectedSourceIds.filter(x => x !== id) : [...selectedSourceIds, id]);
    }
    setLastCheckedIndex(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs`, { method: "POST", headers, body: JSON.stringify({ name, type, url: (type==="url"||type==="repo"||type==="gitlab") ? url : undefined, content }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Connector added", description: `"${name}" is now syncing.` }); setName(""); setUrl(""); setContent(""); setIsAdding(false); fetchInputs(); }
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to add connector." }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, inputName: string) => {
    if (!confirm(`Remove "${inputName}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/inputs/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed", description: `"${inputName}" disconnected.` }); setSelectedInput(null); fetchInputs(); }
  };

  const handleReprocess = async (id: string, inputName: string) => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/inputs/${id}/reprocess`, { method: "POST", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Reprocessed", description: `Signals updated for "${inputName}".` }); fetchInputs(); if (selectedInput?._id === id) setSelectedInput(json.data); }
  };

  const statusBadge = (input: any) => {
    if (pipelinePhase === "idle") return null;
    if (!selectedSourceIds.includes(input._id)) return <span className="text-[9px] font-semibold px-2 py-0.5 rounded border bg-card border-border text-muted-foreground">Skipped</span>;
    const map: Record<string, string> = { queued: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse", processing: "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse", analyzing: "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse", completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", failed: "bg-red-500/10 border-red-500/20 text-red-400" };
    const labels: Record<string, string> = { queued: "Queued", processing: "Processing", analyzing: "Analyzing", completed: "Done", failed: "Failed" };
    return <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${map[pipelinePhase]}`}>{labels[pipelinePhase]}</span>;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* LEFT: Connector List */}
      <div className="flex-1 flex flex-col border-r border-border/50 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-card/20">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search connectors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 bg-card border-border text-muted-foreground text-xs h-[30px] rounded-lg">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-xs">
              <SelectItem value="all">All Types</SelectItem>
              {CONNECTOR_TYPES.flatMap(g => g.items).map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Connector
          </button>
        </div>

        {/* Selection bar */}
        <div className="px-4 py-2 border-b border-border/40 bg-card/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{selectedSourceIds.length} of {filteredInputs.length} selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedSourceIds(filteredInputs.map(i => i._id))} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Select All</button>
            <span className="text-border text-xs">|</span>
            <button onClick={() => setSelectedSourceIds([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Clear</button>
          </div>
        </div>

        {/* Connector cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {filteredInputs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Plug className="h-8 w-8 text-border" />
              <p className="text-xs">No connectors yet. Add one to start analysis.</p>
              <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 px-3 py-1.5 text-xs text-primary transition-all">
                <Plus className="h-3.5 w-3.5" /> Add First Connector
              </button>
            </div>
          )}
          {filteredInputs.map((input, index) => {
            const meta = getConnectorMeta(input.type);
            const Icon = meta.icon;
            const isChecked = selectedSourceIds.includes(input._id);
            const isSelected = selectedInput?._id === input._id;
            return (
              <motion.div key={input._id} layout onClick={() => setSelectedInput(input)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${isChecked ? "bg-card border-primary/30 shadow-[0_0_12px_rgba(56,189,248,0.07)]" : isSelected ? "bg-card/80 border-border" : "bg-card/30 border-border/50 hover:border-border"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isChecked} onClick={e => handleCheckboxClick(index, input._id, e)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg} border ${meta.border} shrink-0`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-foreground truncate">{input.name}</h4>
                      <span className={`text-[9px] uppercase font-mono ${meta.color} ${meta.bg} border ${meta.border} px-1.5 py-0.5 rounded shrink-0`}>{meta.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{input.summary || "Extracting signals..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {statusBadge(input)}
                  <span className="text-[9px] text-muted-foreground">{new Date(input.createdAt).toLocaleDateString([], { month:"short", day:"numeric" })}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.div key="add" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            className="w-96 border-l border-border/50 bg-card p-6 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Plug className="h-4 w-4 text-primary" /> Add Connector</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {/* Connector type grid */}
            <div className="space-y-4 mb-5">
              {CONNECTOR_TYPES.map(group => (
                <div key={group.group} className="space-y-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{group.group}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.items.map(ct => {
                      const Ico = ct.icon;
                      return (
                        <button key={ct.id} onClick={() => setType(ct.id)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-all ${type===ct.id ? `${ct.bg} ${ct.border} ${ct.color}` : "border-border/50 text-muted-foreground hover:border-border"}`}>
                          <Ico className="h-4 w-4" />
                          <span className="text-[9px] font-medium">{ct.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Connector Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production Website"
                  className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
              {(type==="url"||type==="repo"||type==="gitlab") && (
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">URL</label>
                  <input required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://"
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
              )}
              {type==="csv" && (
                <div className="relative border-2 border-dashed border-border hover:border-ring rounded-xl p-5 text-center cursor-pointer transition-all">
                  <input type="file" accept=".csv,.xlsx" required onChange={e => { const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=ev=>{if(ev.target?.result)setContent(ev.target.result as string)}; r.readAsText(f); }}} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Click to upload CSV / Excel</p>
                  {content && <p className="text-[9px] text-green-400 mt-1">✓ Loaded ({content.length} chars)</p>}
                </div>
              )}
              {!["url","repo","gitlab","csv"].includes(type) && (
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Paste Content</label>
                  <textarea rows={6} value={content} onChange={e=>setContent(e.target.value)} placeholder="Paste transcripts, logs, reports..."
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none font-mono" /></div>
              )}
              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Auto-refresh schedule</label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger className="mt-1 w-full bg-background border-border text-muted-foreground text-xs h-[32px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-xs">
                    {SCHEDULE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                {submitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><Sparkles className="h-3.5 w-3.5" /><span>Connect & Sync</span></>}
              </button>
            </form>
          </motion.div>
        )}

        {selectedInput && !isAdding && (
          <motion.div key="detail" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            className="w-96 border-l border-border/50 bg-card p-6 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
              <div className="flex items-center gap-2">
                {(() => { const m=getConnectorMeta(selectedInput.type); const Ico=m.icon; return <div className={`p-1.5 rounded-lg ${m.bg} border ${m.border}`}><Ico className={`h-4 w-4 ${m.color}`} /></div>; })()}
                <h3 className="text-sm font-bold text-foreground truncate">{selectedInput.name}</h3>
              </div>
              <button onClick={() => setSelectedInput(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-5 flex-1">
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-primary font-bold flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{selectedInput.summary || "Extracting signals..."}</p>
              </div>
              {selectedInput.url && (
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Source URL</span>
                  <a href={selectedInput.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline truncate">
                    <span className="truncate">{selectedInput.url}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Status", value: selectedInput.status, color: "text-green-400" },
                  { label: "Records", value: "—", color: "text-foreground" },
                  { label: "Signals", value: "—", color: "text-primary" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-card/60 border border-border/50 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground space-y-1 border-t border-border/40 pt-3">
                <p>ID: <span className="font-mono">{selectedInput._id}</span></p>
                <p>Added: {new Date(selectedInput.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4 mt-4 flex gap-2">
              <button onClick={() => handleReprocess(selectedInput._id, selectedInput.name)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground/80 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Now
              </button>
              <button onClick={() => handleDelete(selectedInput._id, selectedInput.name)} className="flex items-center justify-center rounded-lg border border-destructive/20 hover:bg-destructive/10 p-2 text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
