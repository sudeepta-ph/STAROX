import { usePmxStore } from "@/lib/pmxStore";
import { Clock, RefreshCw, Layers } from "lucide-react";

export default function PmxHistory() {
  const { history, fetchHistory, loading } = usePmxStore();

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-400" /> PMX Activity Audit Timeline
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Browse all user actions, strategic overrides, and AI pipeline sweeps logged in this project workspace.
          </p>
        </div>

        <button
          onClick={() => fetchHistory()}
          disabled={loading.history}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading.history ? "animate-spin" : ""}`} />
          <span>Refresh timeline</span>
        </button>
      </div>

      {/* Timeline Layout */}
      {history.length > 0 ? (
        <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-6 py-2">
          {history.map((log) => (
            <div key={log._id} className="relative text-xs group">
              {/* Vertical timeline node */}
              <div className="absolute -left-[30.5px] top-1.5 h-3 w-3 rounded-full bg-zinc-950 border-2 border-zinc-700 group-hover:border-sky-400 transition-colors" />

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] uppercase tracking-wider font-bold font-mono px-2 py-0.5 border rounded-md ${getActionBadgeStyle(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-zinc-500">· Entity: {log.entityType}</span>
                </div>

                <p className="text-zinc-200 mt-1.5 font-medium leading-relaxed bg-[#18181b]/20 border border-zinc-900/50 rounded-lg p-3">
                  {log.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-600 text-xs">
          <Clock className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
          No activity logs synced for this PMX workspace.
        </div>
      )}

    </div>
  );
}
