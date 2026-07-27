import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Plus, X, Trash2, Cpu, Layout, Server, Terminal, User,
  Clock, ChevronRight, Zap, AlertCircle, TrendingUp, BarChart3,
  CheckCircle2, Circle, Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const COLUMNS = [
  { id: "todo",        label: "To Do",       color: "text-muted-foreground",  bg: "bg-muted/30",           dot: "bg-zinc-500" },
  { id: "in_progress", label: "In Progress", color: "text-blue-400",           bg: "bg-blue-500/5",         dot: "bg-blue-400" },
  { id: "review",      label: "In Review",   color: "text-purple-400",         bg: "bg-purple-500/5",       dot: "bg-purple-400" },
  { id: "done",        label: "Completed",   color: "text-green-400",          bg: "bg-green-500/5",        dot: "bg-green-400" },
] as const;

function getPriorityStyle(p: string) {
  if (p === "high")   return "text-red-400 bg-red-500/10 border-red-500/20";
  if (p === "medium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  return "text-zinc-400 bg-zinc-800 border-zinc-700/50";
}

function getTypeIcon(type: string) {
  switch (type) {
    case "frontend":   return <Layout className="h-3.5 w-3.5 text-blue-400" />;
    case "backend":    return <Server className="h-3.5 w-3.5 text-green-400" />;
    case "infra":      return <Terminal className="h-3.5 w-3.5 text-purple-400" />;
    case "testing":    return <Cpu className="h-3.5 w-3.5 text-orange-400" />;
    case "ux":         return <Layout className="h-3.5 w-3.5 text-pink-400" />;
    default:           return <Award className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export default function PmxExecution() {
  const { tasks, fetchTasks } = usePmxStore();
  const { toast } = useToast();

  const [isAdding, setIsAdding]     = useState(false);
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [type, setType]             = useState("frontend");
  const [priority, setPriority]     = useState("medium");
  const [sprintPlan, setSprintPlan] = useState("Sprint 1");
  const [timeEstimate, setTimeEstimate] = useState("1d");
  const [assignee, setAssignee]     = useState("Developer");
  const [submitting, setSubmitting] = useState(false);

  const colCounts = Object.fromEntries(COLUMNS.map(c => [c.id, tasks.filter(t => t.status === c.id).length]));
  const donePercent = tasks.length > 0 ? Math.round((colCounts["done"] / tasks.length) * 100) : 0;

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/tasks/${taskId}`, { method: "PUT", headers, body: JSON.stringify({ status: newStatus }) });
    const json = await res.json();
    if (json.success) fetchTasks();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ticket: "${name}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/tasks/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed" }); fetchTasks(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks`, { method: "POST", headers, body: JSON.stringify({ title, description, type, priority, sprintPlan, timeEstimate, assignee }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Ticket created" }); setTitle(""); setDescription(""); setAssignee("Developer"); setTimeEstimate("1d"); setIsAdding(false); fetchTasks(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4 pb-8 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/50 pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Sprint Execution Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} tasks · {donePercent}% complete · Generated from PMX blueprints</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sprint health bar */}
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Sprint Health</span>
            <div className="w-20 h-1.5 rounded-full bg-border/50">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${donePercent}%` }} />
            </div>
            <span className="text-[10px] font-mono text-primary">{donePercent}%</span>
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Create Task
          </button>
        </div>
      </div>

      {/* Column headers summary */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {COLUMNS.map(col => (
          <div key={col.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.bg} border border-border/30`}>
            <div className={`h-2 w-2 rounded-full ${col.dot}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{colCounts[col.id]}</span>
          </div>
        ))}
      </div>

      {/* Kanban grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 overflow-y-auto min-h-0 pb-2 scrollbar-thin">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const colIdx = COLUMNS.findIndex(c => c.id === col.id);
          return (
            <div key={col.id} className="rounded-xl border border-border/40 bg-card/20 p-3 flex flex-col overflow-hidden">
              <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none pr-0.5">
                {colTasks.map(task => (
                  <div key={task._id} className="p-3 rounded-xl border border-border/40 bg-card hover:border-border transition-all space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(task.type)}
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">{task.type}</span>
                      </div>
                      <button onClick={() => handleDelete(task._id, task.title)} className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{task.title}</h4>
                      {task.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-normal">{task.description}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{task.timeEstimate || "1d"}</span>
                      </div>
                    </div>
                    {task.assignee && <p className="text-[9px] text-muted-foreground flex items-center gap-1"><User className="h-2.5 w-2.5" />{task.assignee}</p>}
                    {/* Generated badge */}
                    {task.solutionId && (
                      <div className="flex items-center gap-1 text-[8px] text-primary/70 border border-primary/10 bg-primary/5 rounded px-1.5 py-0.5 w-fit">
                        <Zap className="h-2 w-2" /> Generated from PMX
                      </div>
                    )}
                    {/* Move buttons */}
                    <div className="flex gap-1 pt-1 border-t border-border/30 justify-end">
                      {colIdx > 0 && (
                        <button onClick={() => handleUpdateStatus(task._id, COLUMNS[colIdx - 1].id)}
                          className="text-[9px] font-semibold text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded px-1.5 py-0.5 transition-colors">← Back</button>
                      )}
                      {colIdx < COLUMNS.length - 1 && (
                        <button onClick={() => handleUpdateStatus(task._id, COLUMNS[colIdx + 1].id)}
                          className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 flex items-center gap-0.5 transition-colors">
                          Move <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl py-10 text-[10px] text-muted-foreground/40 font-mono">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add task drawer */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[420px] h-full bg-card border-l border-border p-6 flex flex-col relative z-10 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Create Task</h3>
                <button onClick={() => setIsAdding(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Task Name</label>
                  <input required type="text" placeholder="e.g. Set up Clerk auth sync" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      {["frontend","backend","infra","testing","ux","deployment"].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      {["high","medium","low"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select></div>
                </div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Description</label>
                  <textarea required rows={4} placeholder="Describe the task..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none font-mono" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Assignee</label>
                    <input type="text" placeholder="Developer" value={assignee} onChange={e => setAssignee(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Time Estimate</label>
                    <input type="text" placeholder="e.g. 4h, 2d" value={timeEstimate} onChange={e => setTimeEstimate(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <span>Create Ticket</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
