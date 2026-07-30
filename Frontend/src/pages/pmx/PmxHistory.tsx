import { useState, useEffect } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { Clock, RefreshCw, Database, Sparkles, Zap, Timer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxHistory() {
  const { history, fetchHistory, loading, inputs, setSelectedSourceIds } = usePmxStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"timeline" | "sessions">("timeline");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/history/sessions?projectId=default`, {
        headers
      });
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRerunSession = async (session: any) => {
    toast({
      title: "Rerunning session...",
      description: `Rerunning pipeline with identical source selection (${session.selectedSourceIds.length} sources).`
    });

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/history/sessions/${session._id}/rerun`, {
        method: "POST",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Session complete",
          description: "Previous pipeline selection rerun successfully."
        });
        setSelectedSourceIds(session.selectedSourceIds);
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Rerun failed",
        description: "Could not rerun session.",
        variant: "destructive"
      });
    }
  };

  const getActionBadgeStyle = (action: string) => {
    if (action.includes("created") || action.includes("added")) {
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    }
    if (action.includes("deleted") || action.includes("removed")) {
      return "bg-red-500/10 border-red-500/20 text-red-400";
    }
    if (action.includes("pipeline") || action.includes("reprocessed")) {
      return "bg-purple-500/10 border-purple-500/20 text-purple-400";
    }
    return "bg-zinc-800 border-zinc-700/50 text-zinc-400";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-400" /> PMX Activity & History Log
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse all user actions, strategic overrides, and AI pipeline sweeps logged in this project workspace.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "timeline") {
              fetchHistory();
            } else {
              fetchSessions();
            }
          }}
          disabled={loading.history || sessionsLoading}
          className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${(loading.history || sessionsLoading) ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "timeline"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity Timeline
        </button>
        <button
          onClick={() => {
            setActiveTab("sessions");
            fetchSessions();
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "sessions"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pipeline Runs History
        </button>
      </div>

      {/* Timeline Layout */}
      {activeTab === "timeline" && (
        history.length > 0 ? (
          <div className="relative border-l border-border ml-4 pl-6 space-y-6 py-2">
            {history.map((log) => (
              <div key={log._id} className="relative text-xs group">
                <div className="absolute -left-[30.5px] top-1.5 h-3 w-3 rounded-full bg-background border-2 border-border group-hover:border-sky-400 transition-colors" />

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] uppercase tracking-wider font-bold font-mono px-2 py-0.5 border rounded-md ${getActionBadgeStyle(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">· Entity: {log.entityType}</span>
                  </div>

                  <p className="text-foreground mt-1.5 font-medium leading-relaxed bg-muted/40 border border-border rounded-lg p-3">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground text-xs">
            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            No activity logs synced for this PMX workspace.
          </div>
        )
      )}

      {/* Pipeline Runs History Layout */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          {sessionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="h-6 w-6 text-muted-foreground/40 animate-spin mb-2" />
              <p className="text-xs">Fetching past runs sessions...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => {
                const durationSec = (session.durationMs / 1000).toFixed(1);
                return (
                  <div key={session._id} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/30 transition-all">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(session.createdAt).toLocaleString()}
                        </span>
                        <span className="text-[9px] font-semibold bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-sky-400" /> {session.aiModel}
                        </span>
                        <span className="text-[9px] font-semibold bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Timer className="h-2.5 w-2.5 text-yellow-400" /> {durationSec}s
                        </span>
                      </div>

                      {/* Source Name Bubbles */}
                      <div className="flex flex-wrap gap-1 py-1">
                        {session.selectedSourceIds.map((sid: string) => {
                          const src = inputs.find((i: any) => i._id === sid);
                          return (
                            <span key={sid} className="text-[9px] bg-sky-500/5 border border-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Database className="h-2.5 w-2.5 shrink-0" />
                              {src ? src.name : `Source (${sid.slice(-4)})`}
                            </span>
                          );
                        })}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-4 gap-2 bg-muted/40 border border-border rounded-lg p-2 max-w-lg text-[10px] text-muted-foreground font-mono">
                        <div className="text-center border-r border-border">
                          <span className="block text-foreground font-bold text-xs">{session.resultsSummary?.evidenceCount ?? 0}</span>
                          Evidence
                        </div>
                        <div className="text-center border-r border-border">
                          <span className="block text-foreground font-bold text-xs">{session.resultsSummary?.problemCount ?? 0}</span>
                          Problems
                        </div>
                        <div className="text-center border-r border-border">
                          <span className="block text-foreground font-bold text-xs">{session.resultsSummary?.opportunityCount ?? 0}</span>
                          Opps
                        </div>
                        <div className="text-center">
                          <span className="block text-foreground font-bold text-xs">{session.resultsSummary?.decisionCount ?? 0}</span>
                          Decisions
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRerunSession(session)}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-2 text-xs font-bold text-black transition-colors self-start md:self-center"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Rerun Selection</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/10">
              <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              No pipeline run sessions executed yet. Select sources and trigger the agent to start.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
