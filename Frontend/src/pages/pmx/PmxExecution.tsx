import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { usePmxStore, getPmxHeaders, PMX_DEPARTMENTS, type PmxExecutionTask, type PmxDepartment } from "@/lib/pmxStore";
import {
  isTaskBlocked, isTaskOverdue, computeSprintHealth, currentSprintNumber,
  DEPARTMENT_COLORS, HEALTH_STYLES,
} from "@/lib/pmxExecutionHealth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Plus, X, Trash2, Pencil, Cpu, Layout, Server, Terminal, User,
  Clock, ChevronRight, Zap, AlertCircle, AlertTriangle, TrendingUp, BarChart3,
  CheckCircle2, Circle, Activity, Database, ArrowRight, FileDown,
  RefreshCw, Sparkles, Flag, ListChecks, CalendarClock, Link2, X as XIcon
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generateTasksPdfBlob } from "@/lib/pdf/PmxTasksPdf";
import { CreateExecutionModal } from "@/components/pmx/CreateExecutionModal";

const BOARD_TITLE = "Sprint Execution Board";

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

function getDiffRing(diffStatus?: "added" | "updated") {
  if (diffStatus === "added") return "ring-2 ring-emerald-400/50";
  if (diffStatus === "updated") return "ring-2 ring-amber-400/50";
  return "";
}

export default function PmxExecution() {
  const {
    tasks, fetchTasks, inputs, loading, projectId,
    executionPlan, solutions, ideaPrd, regenerateExecution, dismissExecutionDiff,
  } = usePmxStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isAdding, setIsAdding]     = useState(false);
  // Non-null while the drawer is open in edit mode (for that task's id);
  // null means the drawer, if open, is in create mode.
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<PmxExecutionTask | null>(null);
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [type, setType]             = useState("frontend");
  const [department, setDepartment] = useState<PmxDepartment>("Engineering");
  const [milestone, setMilestone]   = useState("");
  const [priority, setPriority]     = useState("medium");
  const [status, setStatus]         = useState("todo");
  const [sprintPlan, setSprintPlan] = useState("Sprint 1");
  const [timeEstimate, setTimeEstimate] = useState("1d");
  const [assignee, setAssignee]     = useState("Developer");
  const [submitting, setSubmitting] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const colCounts = Object.fromEntries(COLUMNS.map(c => [c.id, tasks.filter(t => t.status === c.id).length]));

  // ── Metrics & Sprint Health (computed over the whole board, not the
  //    department-filtered view below) ──────────────────────────────────
  const blockedCount = useMemo(() => tasks.filter(t => isTaskBlocked(t, tasks)).length, [tasks]);
  const completedCount = colCounts["done"] || 0;
  const inProgressCount = colCounts["in_progress"] || 0;
  const departmentsActive = useMemo(() => new Set(tasks.map(t => t.department)).size, [tasks]);
  const sprintNum = useMemo(() => currentSprintNumber(tasks), [tasks]);
  const health = useMemo(() => computeSprintHealth(tasks), [tasks]);
  const healthStyle = HEALTH_STYLES[health.status];

  const activeDepartments = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(t => counts.set(t.department, (counts.get(t.department) || 0) + 1));
    return PMX_DEPARTMENTS.filter(d => counts.has(d)).map(d => ({ department: d, count: counts.get(d)! }));
  }, [tasks]);

  const visibleTasks = selectedDepartments.length
    ? tasks.filter(t => selectedDepartments.includes(t.department))
    : tasks;

  const toggleDepartmentFilter = (dept: string) => {
    setSelectedDepartments(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  // ── Diff banner (from a Regenerate Execution run — triggered here or
  //    from /pmx/prd) ─────────────────────────────────────────────────
  const diffAdded = useMemo(() => tasks.filter(t => t.diffStatus === "added"), [tasks]);
  const diffUpdated = useMemo(() => tasks.filter(t => t.diffStatus === "updated"), [tasks]);
  const hasDiff = diffAdded.length > 0 || diffUpdated.length > 0;

  const handleDismissDiff = async () => {
    await dismissExecutionDiff();
  };

  // ── "PRD changed since last generation" staleness check ────────────
  const liveSourceVersion = executionPlan?.sourceType === "ideaPrd"
    ? (ideaPrd?._id === executionPlan.sourceId ? ideaPrd.version : undefined)
    : solutions.find(s => s._id === executionPlan?.sourceId)?.version;
  const isExecutionStale = !!(executionPlan && liveSourceVersion !== undefined && liveSourceVersion !== executionPlan.sourcePrdVersion);

  const handleRegenerate = async () => {
    if (!executionPlan) return;
    setRegenerating(true);
    try {
      const source = executionPlan.sourceType === "ideaPrd"
        ? { ideaPrdId: executionPlan.sourceId }
        : { solutionId: executionPlan.sourceId };
      const diff = await regenerateExecution(source);
      if (diff) {
        toast({
          title: "Execution plan regenerated",
          description: `${diff.added} added · ${diff.updated} updated · ${diff.removed} removed.`,
        });
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/tasks/${taskId}`, { method: "PUT", headers, body: JSON.stringify({ status: newStatus }) });
    const json = await res.json();
    if (json.success) fetchTasks();
    else toast({ variant: "destructive", title: "Couldn't move ticket" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ticket: "${name}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/tasks/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed" }); fetchTasks(); }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await generateTasksPdfBlob(BOARD_TITLE, tasks);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sprint-execution-board.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "PDF export failed" });
    }
  };

  const openCreateDrawer = () => {
    setEditingId(null);
    setEditingTask(null);
    setTitle(""); setDescription(""); setType("frontend"); setDepartment("Engineering"); setMilestone("");
    setPriority("medium"); setStatus("todo"); setSprintPlan("Sprint 1"); setTimeEstimate("1d"); setAssignee("Developer");
    setIsAdding(true);
  };

  const openEditDrawer = (task: PmxExecutionTask) => {
    setEditingId(task._id);
    setEditingTask(task);
    setTitle(task.title); setDescription(task.description); setType(task.type);
    setDepartment(task.department || "Engineering"); setMilestone(task.milestone || "");
    setPriority(task.priority);
    setStatus(task.status); setSprintPlan(task.sprintPlan); setTimeEstimate(task.timeEstimate); setAssignee(task.assignee || "");
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const body = { title, description, type, department, milestone: milestone || undefined, priority, status, sprintPlan, timeEstimate, assignee, projectId };
      const res = editingId
        ? await fetch(`${API_URL}/pmx/tasks/${editingId}`, { method: "PUT", headers, body: JSON.stringify(body) })
        : await fetch(`${API_URL}/pmx/tasks`, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast({ title: editingId ? "Ticket updated" : "Ticket created" });
        setIsAdding(false);
        fetchTasks();
      } else {
        toast({ variant: "destructive", title: editingId ? "Couldn't update ticket" : "Couldn't create ticket", description: json.error });
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSubmitting(false); }
  };

  // Execution runs off the analysis pipeline (solutions → tasks), which only
  // exists once sources are connected — an idea-only workspace has nothing
  // for a sprint board to show, so send the user to connect sources instead.
  if (!loading.inputs && inputs.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-center px-6">
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-bold text-foreground">No sources yet</h2>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Connect a source and run analysis to generate solutions the sprint board can turn into tasks.
        </p>
        <button
          onClick={() => navigate("/pmx/sources")}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-medium text-primary-foreground transition-all"
        >
          Connect a source <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Sources exist, but nothing has been generated onto the board yet — offer
  // both a PRD-based and a custom (no-PRD) way to populate it, instead of
  // implying a PRD is the only path in.
  if (!loading.tasks && tasks.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-center px-6">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground">Empty board</h2>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Turn a product plan into coordinated work — or start a focused execution.
        </p>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-medium text-primary-foreground transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" /> Create Execution
        </button>
        <CreateExecutionModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-3 pb-8 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/50 pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Sprint Execution Board</h1>
          {executionPlan && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="text-muted-foreground/70">Source:</span>{" "}
              {executionPlan.type === "custom" ? (
                <span className="text-foreground/80 font-medium">Custom execution{executionPlan.name ? ` — ${executionPlan.name}` : ""}</span>
              ) : (
                <span className="text-foreground/80 font-medium">PRD: {executionPlan.name || "Untitled PRD"}</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
            <span><span className="text-foreground font-bold">{tasks.length}</span> Tasks</span>
            <span className="text-border">·</span>
            <span><span className="text-emerald-400 font-bold">{completedCount}</span> Completed</span>
            <span className="text-border">·</span>
            <span><span className="text-blue-400 font-bold">{inProgressCount}</span> In Progress</span>
            <span className="text-border">·</span>
            <span><span className="text-red-400 font-bold">{blockedCount}</span> Blocked</span>
            <span className="text-border">·</span>
            <span><span className="text-foreground font-bold">{departmentsActive}</span> Departments</span>
            {sprintNum != null && (
              <>
                <span className="text-border">·</span>
                <span>Sprint <span className="text-foreground font-bold">{sprintNum}</span></span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sprint health */}
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Sprint Health</span>
            <div className="w-20 h-1.5 rounded-full bg-border/50">
              <div className={`h-full rounded-full transition-all ${healthStyle.bar}`} style={{ width: `${health.score}%` }} />
            </div>
            <span className={`text-[10px] font-mono font-semibold ${healthStyle.text}`}>{health.score}% {health.status}</span>
          </div>
          {isExecutionStale && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all disabled:opacity-50"
            >
              {regenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate Execution
            </button>
          )}
          <button onClick={handleExportPdf} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all">
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all">
            <Sparkles className="h-3.5 w-3.5" /> Create Execution
          </button>
          <button onClick={openCreateDrawer} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Create Task
          </button>
        </div>
      </div>

      <CreateExecutionModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />

      {/* Diff summary banner — after a Regenerate Execution run */}
      {hasDiff && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-sky-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Execution plan updated — <span className="font-semibold text-emerald-400">{diffAdded.length} added</span>, <span className="font-semibold text-amber-400">{diffUpdated.length} updated</span>.</span>
          </div>
          <button onClick={handleDismissDiff} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <XIcon className="h-3 w-3" /> Dismiss
          </button>
        </div>
      )}

      {/* Department filter chips */}
      {activeDepartments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {activeDepartments.map(({ department: dept, count }) => {
            const active = selectedDepartments.includes(dept);
            const colorClasses = DEPARTMENT_COLORS[dept as PmxDepartment] || "text-muted-foreground bg-muted/40 border-border/40";
            return (
              <button
                key={dept}
                onClick={() => toggleDepartmentFilter(dept)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                  active ? colorClasses : "text-muted-foreground bg-transparent border-border/40 hover:bg-muted/40"
                }`}
              >
                {dept} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
          {selectedDepartments.length > 0 && (
            <button onClick={() => setSelectedDepartments([])} className="text-[10px] text-muted-foreground hover:text-foreground underline">
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Column headers summary */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {COLUMNS.map(col => (
          <div key={col.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.bg} border border-border/30`}>
            <div className={`h-2 w-2 rounded-full ${col.dot}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{visibleTasks.filter(t => t.status === col.id).length}</span>
          </div>
        ))}
      </div>

      {/* Kanban grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 overflow-y-auto min-h-0 pb-2 scrollbar-thin">
        {COLUMNS.map(col => {
          const colTasks = visibleTasks.filter(t => t.status === col.id);
          const colIdx = COLUMNS.findIndex(c => c.id === col.id);
          return (
            <div key={col.id} className="rounded-xl border border-border/40 bg-card/20 p-3 flex flex-col overflow-hidden">
              <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none pr-0.5">
                {colTasks.map(task => {
                  const blocked = isTaskBlocked(task, tasks);
                  const overdue = isTaskOverdue(task);
                  const deptColor = DEPARTMENT_COLORS[task.department] || "text-muted-foreground bg-muted/40 border-border/40";
                  return (
                  <div key={task._id} onClick={() => openEditDrawer(task)}
                    className={`group/card p-3 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-all space-y-2.5 cursor-pointer ${getDiffRing(task.diffStatus)}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${deptColor}`}>{task.department}</span>
                        {blocked && (
                          <span className="flex items-center gap-0.5 text-[8px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-1.5 py-0.5">
                            <AlertTriangle className="h-2 w-2" /> Blocked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3 text-muted-foreground/50" />
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(task._id, task.title); }} className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{task.title}</h4>
                      {task.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-normal">{task.description}</p>}
                    </div>
                    {task.milestone && (
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
                        <Flag className="h-2.5 w-2.5 shrink-0" /> {task.milestone}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono">
                        {getTypeIcon(task.type)}
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{task.timeEstimate || "1d"}</span>
                        {typeof task.dueWeek === "number" && (
                          <span className={`flex items-center gap-0.5 ${overdue ? "text-red-400" : ""}`}>
                            <CalendarClock className="h-2.5 w-2.5" />W{task.dueWeek}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.assignee && <p className="text-[9px] text-muted-foreground flex items-center gap-1"><User className="h-2.5 w-2.5" />{task.assignee}</p>}
                    {task.acceptanceCriteria?.length > 0 && (
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <ListChecks className="h-2.5 w-2.5" />{task.acceptanceCriteria.length} acceptance criteria
                      </p>
                    )}
                    {/* Generated badge */}
                    {(task.solutionId || task.ideaPrdId) && (
                      <div className="flex items-center gap-1 text-[8px] text-primary/70 border border-primary/10 bg-primary/5 rounded px-1.5 py-0.5 w-fit">
                        <Zap className="h-2 w-2" /> Generated from PMX
                      </div>
                    )}
                    {/* Move buttons */}
                    <div className="flex gap-1 pt-1 border-t border-border/30 justify-end">
                      {colIdx > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task._id, COLUMNS[colIdx - 1].id); }}
                          className="text-[9px] font-semibold text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded px-1.5 py-0.5 transition-colors">← Back</button>
                      )}
                      {colIdx < COLUMNS.length - 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task._id, COLUMNS[colIdx + 1].id); }}
                          className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 flex items-center gap-0.5 transition-colors">
                          Move <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl py-10 text-[10px] text-muted-foreground/40 font-mono">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/edit task drawer — portaled to <body> so it's fixed to the real
          viewport instead of whatever containing block the route's layout
          happens to establish (the same fix ContactModal/AuthModal use). */}
      {createPortal(
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-50 flex items-center justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-[420px] max-w-full h-full max-h-screen bg-card border-l border-border flex flex-col relative z-10">
                <div className="shrink-0 flex items-center justify-between border-b border-border/50 px-6 py-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Award className="h-4 w-4 text-primary" />}
                    {editingId ? "Edit Task" : "Create Task"}
                  </h3>
                  <button onClick={() => setIsAdding(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4">
                  {editingTask && (editingTask.acceptanceCriteria?.length > 0 || editingTask.implementationNotes || editingTask.dependencies?.length > 0 || editingTask.prdSectionLink) && (
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
                      {editingTask.prdSectionLink && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <Link2 className="h-3 w-3 shrink-0" /> PRD section: <span className="text-foreground/80 font-medium">{editingTask.prdSectionLink}</span>
                        </p>
                      )}
                      {editingTask.acceptanceCriteria?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                            <ListChecks className="h-3 w-3" /> Acceptance Criteria
                          </p>
                          <ul className="space-y-1">
                            {editingTask.acceptanceCriteria.map((c, i) => (
                              <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {editingTask.implementationNotes && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Implementation Notes</p>
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{editingTask.implementationNotes}</p>
                        </div>
                      )}
                      {editingTask.dependencies?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Depends On</p>
                          <p className="text-[11px] text-foreground/80">{editingTask.dependencies.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Task Name</label>
                    <input required type="text" placeholder="e.g. Set up Clerk auth sync" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Department</label>
                      <select value={department} onChange={e => setDepartment(e.target.value as PmxDepartment)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                        {PMX_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</label>
                      <select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                        {["frontend","backend","infra","testing","ux","deployment","other"].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                      </select></div>
                  </div>
                  <div className={`grid gap-3 ${editingId ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Priority</label>
                      <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                        {["high","medium","low"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Milestone</label>
                      <input list="milestone-options" type="text" placeholder="e.g. Engineering MVP" value={milestone} onChange={e => setMilestone(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none" />
                      <datalist id="milestone-options">
                        {executionPlan?.milestones.map(m => <option key={m.name} value={m.name} />)}
                      </datalist>
                    </div>
                    {editingId && (
                      <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select></div>
                    )}
                  </div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Description</label>
                    <textarea required rows={4} placeholder="Describe the task..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none font-mono" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Assignee</label>
                      <input type="text" placeholder="Developer" value={assignee} onChange={e => setAssignee(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                    <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Time Estimate</label>
                      <input type="text" placeholder="e.g. 4h, 2d" value={timeEstimate} onChange={e => setTimeEstimate(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                  </div>
                  <div className="flex gap-2 pt-1 pb-1">
                    {editingId && (
                      <button type="button" onClick={() => { setIsAdding(false); handleDelete(editingId, title); }}
                        className="rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive px-4 py-2 text-xs font-semibold transition-all">
                        Delete
                      </button>
                    )}
                    <button type="submit" disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {submitting
                        ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        : <span>{editingId ? "Save Changes" : "Create Ticket"}</span>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
