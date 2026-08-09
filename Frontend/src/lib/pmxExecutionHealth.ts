import type { PmxExecutionTask, PmxDepartment } from "./pmxStore";

// One fixed color per department, following the same
// text-*-400 bg-*-500/10 border-*-500/20 tag convention already used for
// priority pills elsewhere in PMX (PmxExecution.tsx's getPriorityStyle).
export const DEPARTMENT_COLORS: Record<PmxDepartment, string> = {
  Product: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  Design: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  Engineering: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  QA: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  DevOps: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Security: "text-red-400 bg-red-500/10 border-red-500/20",
  Marketing: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Sales: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  "Customer Success": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Support: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Leadership: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

// A todo/in_progress task is "blocked" if any of its resolved dependencies
// hasn't reached "done" yet. Deliberately not a stored field — computed
// from live task state so it can never go stale.
export function isTaskBlocked(task: PmxExecutionTask, allTasks: PmxExecutionTask[]): boolean {
  if (task.status === "done" || task.status === "review") return false;
  if (!task.dependencyTaskIds || task.dependencyTaskIds.length === 0) return false;
  const byId = new Map(allTasks.map((t) => [t._id, t]));
  return task.dependencyTaskIds.some((depId) => {
    const dep = byId.get(depId);
    return !!dep && dep.status !== "done";
  });
}

export function isTaskOverdue(task: PmxExecutionTask): boolean {
  if (task.status === "done" || !task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export interface SprintHealth {
  score: number;
  status: "Healthy" | "At Risk" | "Critical";
}

// Literal Tailwind class strings (not template-interpolated) so the JIT
// compiler's static content scan picks them up — see DEPARTMENT_COLORS above.
export const HEALTH_STYLES: Record<SprintHealth["status"], { bar: string; text: string }> = {
  Healthy: { bar: "bg-emerald-400", text: "text-emerald-400" },
  "At Risk": { bar: "bg-amber-400", text: "text-amber-400" },
  Critical: { bar: "bg-red-400", text: "text-red-400" },
};

// Weighted blend: completion rate (35%), inverse blocked ratio (25%),
// inverse overdue ratio (20%), inverse dependency-risk ratio (10%), inverse
// department-load imbalance (10%). Each component is 0..1, higher = better;
// final score is a 0-100 percentage.
export function computeSprintHealth(tasks: PmxExecutionTask[]): SprintHealth {
  if (tasks.length === 0) return { score: 0, status: "Critical" };

  const total = tasks.length;
  const completionRate = tasks.filter((t) => t.status === "done").length / total;

  const blockedCount = tasks.filter((t) => isTaskBlocked(t, tasks)).length;
  const blockedRatio = blockedCount / total;

  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;
  const overdueRatio = overdueCount / total;

  const openWithUnresolvedDeps = tasks.filter(
    (t) => t.status === "todo" && t.dependencies.length > t.dependencyTaskIds.length
  ).length;
  const dependencyRiskRatio = openWithUnresolvedDeps / total;

  const openByDept = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "done") continue;
    openByDept.set(t.department, (openByDept.get(t.department) || 0) + 1);
  }
  const loads = Array.from(openByDept.values());
  let loadImbalance = 0;
  if (loads.length > 1) {
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((a, b) => a + (b - mean) ** 2, 0) / loads.length;
    const stddev = Math.sqrt(variance);
    loadImbalance = mean > 0 ? Math.min(1, stddev / mean) : 0;
  }

  const raw =
    0.35 * completionRate +
    0.25 * (1 - blockedRatio) +
    0.2 * (1 - overdueRatio) +
    0.1 * (1 - dependencyRiskRatio) +
    0.1 * (1 - loadImbalance);

  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  const status: SprintHealth["status"] = score >= 80 ? "Healthy" : score >= 60 ? "At Risk" : "Critical";
  return { score, status };
}

export function currentSprintNumber(tasks: PmxExecutionTask[]): number | null {
  const openSprints = tasks
    .filter((t) => t.status !== "done" && typeof t.sprintNumber === "number")
    .map((t) => t.sprintNumber as number);
  if (openSprints.length === 0) return null;
  return Math.min(...openSprints);
}
