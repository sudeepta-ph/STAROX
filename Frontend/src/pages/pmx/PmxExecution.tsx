import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Plus,
  X,
  Trash2,
  Cpu,
  Layout,
  Server,
  Terminal,
  Play,
  ArrowRight,
  User,
  Clock,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxExecution() {
  const { tasks, fetchTasks } = usePmxStore();
  const { toast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("frontend");
  const [priority, setPriority] = useState("medium");
  const [sprintPlan, setSprintPlan] = useState("Sprint 1");
  const [timeEstimate, setTimeEstimate] = useState("1d");
  const [assignee, setAssignee] = useState("Developer");
  const [submitting, setSubmitting] = useState(false);

  const columns = [
    { id: "todo", label: "To Do" },
    { id: "in_progress", label: "In Progress" },
    { id: "review", label: "Code Review" },
    { id: "done", label: "Completed" }
  ];

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks/${taskId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ticket: "${name}"?`)) return;

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Sprint ticket deleted",
          description: `"${name}" removed.`
        });
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          type,
          priority,
          sprintPlan,
          timeEstimate,
          assignee
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Sprint ticket created",
          description: `"${title}" has been successfully added to sprint.`
        });
        setTitle("");
        setDescription("");
        setAssignee("Developer");
        setTimeEstimate("1d");
        setIsAdding(false);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case "frontend":
        return <Layout className="h-3.5 w-3.5 text-blue-400" />;
      case "backend":
        return <Server className="h-3.5 w-3.5 text-green-400" />;
      case "infra":
        return <Terminal className="h-3.5 w-3.5 text-purple-400" />;
      case "testing":
        return <Cpu className="h-3.5 w-3.5 text-orange-400" />;
      default:
        return <Award className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-sky-400" /> Sprint Agile Execution Board
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track implementation tickets generated from Solution Studio design specifications.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-medium text-black transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto min-h-0 select-none pb-4 scrollbar-thin">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3 shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {col.label}
                </span>
                <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5 font-mono">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List inside Column */}
              <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-none pr-1">
                {colTasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950 hover:border-zinc-800/80 transition-all flex flex-col justify-between space-y-3 cursor-grab"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          {getTaskIcon(task.type)}
                          <span className="text-[9px] uppercase tracking-wider font-semibold font-mono text-zinc-500">
                            {task.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(task._id, task.title)}
                          className="p-0.5 rounded text-zinc-700 hover:text-red-400 hover:bg-zinc-900/50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 leading-snug">{task.title}</h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-3 leading-normal">{task.description}</p>
                    </div>

                    <div className="border-t border-zinc-900/80 pt-2 flex items-center justify-between text-[10px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-zinc-600" />
                        <span className="truncate max-w-[80px]">{task.assignee || "Assignee"}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-zinc-600" />
                        <span>{task.timeEstimate || "1d"}</span>
                      </div>
                    </div>

                    {/* Quick Move Buttons */}
                    <div className="flex gap-1 pt-1.5 border-t border-zinc-900/80 justify-end">
                      {col.id !== "todo" && (
                        <button
                          onClick={() => handleUpdateStatus(task._id, columns[columns.findIndex(c => c.id === col.id) - 1].id)}
                          className="text-[9px] font-semibold text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5"
                        >
                          Back
                        </button>
                      )}
                      {col.id !== "done" && (
                        <button
                          onClick={() => handleUpdateStatus(task._id, columns[columns.findIndex(c => c.id === col.id) + 1].id)}
                          className="text-[9px] font-semibold text-sky-400 hover:text-sky-300 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 flex items-center gap-0.5"
                        >
                          <span>Move</span>
                          <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-900 rounded-xl py-12 text-[10px] text-zinc-600 font-mono text-center">
                    No tickets
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Slide-over Drawer for adding task */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-96 h-full bg-zinc-950 border-l border-zinc-900 p-6 flex flex-col justify-between relative z-10 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="h-4 w-4 text-sky-400" /> Log Engineering Task
                  </h3>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="p-1 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Task Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Set up Clerk auth sync endpoints"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Dev Type</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="frontend">Frontend UI</option>
                        <option value="backend">Backend API</option>
                        <option value="infra">Infrastructure</option>
                        <option value="testing">Testing QA</option>
                        <option value="ux">UX / Design</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Task Instructions</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe what needs to be coded or configured..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Assignee</label>
                      <input
                        type="text"
                        placeholder="Developer"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Time Estimate</label>
                      <input
                        type="text"
                        placeholder="e.g. 4h, 2d"
                        value={timeEstimate}
                        onChange={(e) => setTimeEstimate(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sky-500 text-black font-semibold rounded-lg px-4 py-2 text-xs hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Save Sprint Ticket</span>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
