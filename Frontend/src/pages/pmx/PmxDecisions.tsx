import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  HelpCircle,
  Clock,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  GitPullRequest
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxDecisions() {
  const { decisions, fetchDecisions, fetchSolutions } = usePmxStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredDecisions = decisions.filter((d) => d.status === activeTab);

  const handleStatusChange = async (id: string, title: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    toast({
      title: status === "approved" ? "Approving decision..." : "Rejecting recommendation...",
      description: status === "approved"
        ? `AI is now compiling solution PRDs for "${title}".`
        : `"${title}" has been delayed.`
    });

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions/${id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: status === "approved" ? "Decision approved" : "Decision rejected",
          description: status === "approved"
            ? `Solution blueprint successfully queued inside Solution Studio.`
            : `Recommendation marked as rejected.`
        });
        fetchDecisions();
        fetchSolutions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "build":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      case "improve":
        return "bg-green-500/10 border-green-500/20 text-green-400";
      case "optimize":
        return "bg-teal-500/10 border-teal-500/20 text-teal-400";
      case "remove":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case "experiment":
        return "bg-purple-500/10 border-purple-500/20 text-purple-400";
      default:
        return "bg-zinc-800 border-zinc-700/50 text-zinc-400";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-sky-400" /> STAROX AI Decision Center
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review recommendations proposed by the AI strategist based on evidence collection and priority ICE ranks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900/60 pb-3 gap-2">
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${
              activeTab === tab
                ? "bg-[#18181b] border-sky-500/30 text-white"
                : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab} Actions ({decisions.filter((d) => d.status === tab).length})
          </button>
        ))}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredDecisions.map((dec) => (
          <div
            key={dec._id}
            className="glass-card hover-lift p-6 space-y-6 relative overflow-hidden"
          >
            {/* Top Row: Title & Action */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-bold tracking-wider font-mono px-2.5 py-0.5 rounded-full border ${getCategoryTheme(dec.category)}`}>
                    {dec.category}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Confidence rating: {dec.confidence}%</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1.5">{dec.title}</h3>
              </div>

              {activeTab === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(dec._id, dec.title, "rejected")}
                    disabled={updatingId === dec._id}
                    className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-900/50 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delay/Reject recommendation"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleStatusChange(dec._id, dec.title, "approved")}
                    disabled={updatingId === dec._id}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-semibold text-black transition-all"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 fill-black text-black" />
                    <span>Approve & Write PRD</span>
                  </button>
                </div>
              )}
            </div>

            {/* Core details layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-zinc-900/80">
              
              {/* Left detail card */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Reasoning Analysis</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{dec.reasoning}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Evidence Quote Context</span>
                  <p className="text-xs text-zinc-400 italic leading-relaxed pl-3 border-l-2 border-zinc-800">
                    "{dec.evidence || "Based on aggregated user session friction data."}"
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Implementation Trade-offs</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{dec.tradeoffs}</p>
                </div>
              </div>

              {/* Right statistics scorecard */}
              <div className="space-y-4 rounded-xl bg-zinc-900/40 border border-zinc-900 p-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Expected Outcome</span>
                  <p className="text-xs text-white font-medium">{dec.expectedOutcome}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Estimated ROI Return</span>
                  <p className="text-xs text-sky-400 font-semibold">{dec.estimatedROI}</p>
                </div>

                {dec.alternativeSolutions && dec.alternativeSolutions.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-900/80">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Alternative paths rejected</span>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-zinc-400">
                      {dec.alternativeSolutions.map((sol, idx) => (
                        <li key={idx}>{sol}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>

          </div>
        ))}

        {filteredDecisions.length === 0 && (
          <div className="py-20 text-center text-zinc-600 text-xs">
            No recommendations in this status category.
          </div>
        )}
      </div>

    </div>
  );
}
