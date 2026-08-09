import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  BarChart3, Database, Lightbulb, TrendingUp, ClipboardCheck, FileCode2,
  ListChecks, FolderKanban, RefreshCw, Plug, Sparkles, Timer, Clock,
  AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { getPmxHeaders } from "@/lib/pmxStore";
import { useAuthStore } from "@/lib/authStore";
import { getUsage, LIMITS } from "@/lib/usageLimit";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

// Fixed, never-themed status colors (see dataviz skill) — always paired
// with an icon + text label, never shown as color alone.
const STATUS = {
  neutral:  "#6b7280",
  good:     "#0ca30c",
  warning:  "#fab219",
  serious:  "#ec835a",
  critical: "#d03b3b",
};

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

interface Totals {
  sources: number; evidence: number; problems: number; opportunities: number;
  decisions: number; solutions: number; tasks: number; artifacts: number; sessions: number;
}
interface Overview {
  totals: Totals;
  tasksByStatus: { todo: number; in_progress: number; review: number; done: number };
  problemsBySeverity: { critical: number; high: number; medium: number; low: number };
  decisionsByStatus: { pending: number; approved: number; rejected: number; implemented: number };
  sessionsTimeline: Array<{ date: string; count: number }>;
  avgSessionDurationMs: number;
  recentSessions: Array<{ _id: string; createdAt: string; aiModel: string; durationMs: number; resultsSummary?: Record<string, number> }>;
  recentActivity: Array<{ _id: string; action: string; details: string; createdAt: string }>;
}

const STAT_TILES: Array<{ key: keyof Totals; label: string; icon: typeof Database }> = [
  { key: "sources", label: "Sources", icon: Database },
  { key: "evidence", label: "Evidence", icon: Lightbulb },
  { key: "problems", label: "Problems", icon: AlertTriangle },
  { key: "opportunities", label: "Opportunities", icon: TrendingUp },
  { key: "decisions", label: "Decisions", icon: ClipboardCheck },
  { key: "solutions", label: "Solutions", icon: FileCode2 },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "sessions", label: "Pipeline Runs", icon: Sparkles },
];

const chartConfig: ChartConfig = {
  count: { label: "Pipeline runs", color: "hsl(var(--primary))" },
};

function StackedStatusBar({
  segments,
}: {
  segments: Array<{ label: string; count: number; color: string; icon: typeof CheckCircle2 }>;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted/40">
        {total === 0 ? (
          <div className="h-full w-full rounded-full bg-muted" />
        ) : (
          segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.count}`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
              />
            ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <s.icon className="h-3 w-3 shrink-0" style={{ color: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-mono font-medium tabular-nums text-foreground">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const nearLimit = pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums text-foreground">{used} / {limit}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: nearLimit ? STATUS.warning : "hsl(var(--primary))" }}
        />
      </div>
    </div>
  );
}

export default function Analytics() {
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const { user } = useAuthStore();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [connectedCount, setConnectedCount] = useState<number | null>(null);
  const TOTAL_CONNECTORS = 11;

  const [analysisUsage, setAnalysisUsage] = useState<{ used: number } | null>(null);
  const [pdfUsage, setPdfUsage] = useState<{ used: number } | null>(null);

  const fetchOverview = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/analytics/overview`, { headers });
      const json = await res.json();
      if (json.success) setOverview(json.data);
      else setError(json.error || "Failed to load analytics");
    } catch {
      setError("Failed to load analytics — check your network and try again");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConnectorStatus = async () => {
    try {
      const headers = await getPmxHeaders();
      const [connRes, ghRes, notionRes, slackRes] = await Promise.all([
        fetch(`${API_URL}/connectors/status`, { headers }),
        fetch(`${API_URL}/pmx/github/status`, { headers }),
        fetch(`${API_URL}/pmx/notion/status`, { headers }),
        fetch(`${API_URL}/pmx/slack/status`, { headers }),
      ]);
      const [connJson, ghJson, notionJson, slackJson] = await Promise.all([
        connRes.json(), ghRes.json(), notionRes.json(), slackRes.json(),
      ]);
      const status: Record<string, { connected: boolean }> = connJson.success ? connJson.data : {};
      status.github = { connected: !!ghJson.connected };
      status.notion = { connected: !!notionJson.connected };
      status.slack = { connected: !!slackJson.connected };
      const count = Object.values(status).filter((s) => s.connected).length;
      setConnectedCount(count);
    } catch {
      setConnectedCount(null);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchConnectorStatus();
    if (user?.uid) {
      getUsage(user.uid, "analysis").then(setAnalysisUsage).catch(() => {});
      getUsage(user.uid, "pdf").then(setPdfUsage).catch(() => {});
    }
  }, [user?.uid]);

  const timelineData = useMemo(
    () => (overview?.sessionsTimeline ?? []).map((d) => ({
      ...d,
      label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    [overview?.sessionsTimeline]
  );

  const hasAnySessions = (overview?.totals.sessions ?? 0) > 0;

  const taskSegments = overview ? [
    { label: "To Do", count: overview.tasksByStatus.todo, color: STATUS.neutral, icon: ListChecks },
    { label: "In Progress", count: overview.tasksByStatus.in_progress, color: "hsl(var(--primary))", icon: RefreshCw },
    { label: "Review", count: overview.tasksByStatus.review, color: STATUS.warning, icon: AlertTriangle },
    { label: "Done", count: overview.tasksByStatus.done, color: STATUS.good, icon: CheckCircle2 },
  ] : [];

  const severitySegments = overview ? [
    { label: "Low", count: overview.problemsBySeverity.low, color: STATUS.good, icon: CheckCircle2 },
    { label: "Medium", count: overview.problemsBySeverity.medium, color: STATUS.warning, icon: AlertTriangle },
    { label: "High", count: overview.problemsBySeverity.high, color: STATUS.serious, icon: AlertTriangle },
    { label: "Critical", count: overview.problemsBySeverity.critical, color: STATUS.critical, icon: AlertTriangle },
  ] : [];

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-y-auto transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="mx-auto w-full max-w-6xl p-6 space-y-6 pb-16">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" /> Analytics
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Your STAROX activity across every source, insight, and pipeline run.
              </p>
            </div>
            <button
              onClick={() => { fetchOverview(true); fetchConnectorStatus(); }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <RefreshCw className="mb-3 h-6 w-6 animate-spin text-muted-foreground/40" />
              <p className="text-xs">Loading analytics…</p>
            </div>
          ) : overview ? (
            <>
              {/* Stat tiles */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {STAT_TILES.map((t) => (
                  <div key={t.key} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <t.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">{t.label}</span>
                    </div>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                      {overview.totals[t.key].toLocaleString()}
                    </p>
                  </div>
                ))}
              </motion.div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Sessions trend */}
                <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Pipeline runs — last 30 days</h2>
                    {overview.avgSessionDurationMs > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <Timer className="h-3 w-3" /> avg {(overview.avgSessionDurationMs / 1000).toFixed(1)}s/run
                      </span>
                    )}
                  </div>
                  {hasAnySessions ? (
                    <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-[220px] w-full">
                      <AreaChart data={timelineData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeOpacity={0.25} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={4}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip content={<ChartTooltipContent labelKey="count" nameKey="count" />} />
                        <Area
                          dataKey="count"
                          name="count"
                          type="monotone"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#sessionsFill)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                      <Sparkles className="h-6 w-6 text-muted-foreground/30" />
                      <p className="text-xs">No pipeline runs yet.</p>
                      <Link to="/pmx/sources" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Connect sources to get started <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Connectors + AI usage */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plug className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">Connected sources</span>
                    </div>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                      {connectedCount ?? "—"} <span className="text-sm font-normal text-muted-foreground">/ {TOTAL_CONNECTORS}</span>
                    </p>
                    <Link to="/connectors" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Manage connectors <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">AI usage</span>
                    </div>
                    <UsageBar label="Analyses" used={analysisUsage?.used ?? 0} limit={LIMITS.analysis} />
                    <UsageBar label="PDF exports" used={pdfUsage?.used ?? 0} limit={LIMITS.pdf} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ListChecks className="h-4 w-4 text-muted-foreground" /> Task status
                  </h2>
                  <StackedStatusBar segments={taskSegments} />
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Problem severity
                  </h2>
                  <StackedStatusBar segments={severitySegments} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Recent pipeline runs */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" /> Recent pipeline runs
                    </h2>
                    <Link to="/pmx/history" className="text-xs font-medium text-primary hover:underline">View all</Link>
                  </div>
                  {overview.recentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {overview.recentSessions.map((s) => (
                        <div key={s._id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(s.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <span className="font-mono text-foreground">{(s.durationMs / 1000).toFixed(1)}s</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">No runs yet.</p>
                  )}
                </div>

                {/* Recent activity */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Recent activity
                  </h2>
                  {overview.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {overview.recentActivity.map((a) => (
                        <div key={a._id} className="text-xs">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-mono">{new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="mt-0.5 text-foreground">{a.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">No activity logged yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
