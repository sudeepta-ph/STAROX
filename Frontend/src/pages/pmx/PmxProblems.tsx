import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Plus,
  X,
  Trash2,
  ThumbsUp,
  TrendingDown,
  Layers,
  Sparkles,
  Link2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxProblems() {
  const { problems, fetchProblems } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("ux");
  const [severity, setSeverity] = useState("medium");
  const [businessImpact, setBusinessImpact] = useState("");
  const [userImpact, setUserImpact] = useState("");
  const [suggestedFix, setSuggestedFix] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredProblems = problems.filter((prob) => {
    const matchesSearch =
      prob.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prob.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || prob.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/problems`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          type,
          severity,
          businessImpact,
          userImpact,
          suggestedFix
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Problem registered",
          description: `"${title}" has been successfully added to tracking list.`
        });
        setTitle("");
        setDescription("");
        setBusinessImpact("");
        setUserImpact("");
        setSuggestedFix("");
        setIsAdding(false);
        fetchProblems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete problem card: "${name}"?`)) return;

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/problems/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Problem card removed",
          description: `"${name}" removed.`
        });
        fetchProblems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/10 border-orange-500/20 text-orange-400";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700/50";
    }
  };

  const getProblemTypeLabel = (pType: string) => {
    switch (pType) {
      case "ux":
        return "UX Issue";
      case "growth":
        return "Growth bottleneck";
      case "retention":
        return "Retention Risk";
      case "tech_debt":
        return "Technical Debt";
      case "feature_gap":
        return "Feature Gap";
      case "business_risk":
        return "Business Risk";
      default:
        return "Product Risk";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" /> Active Product Problems & Vulnerabilities
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Analyzing product health using AI diagnostics and verified customer evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b]/50 border border-zinc-800 focus:border-zinc-700 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#18181b] border border-zinc-800 text-zinc-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">All Risk Types</option>
            <option value="ux">UX Issues</option>
            <option value="growth">Growth Problems</option>
            <option value="retention">Retention Risks</option>
            <option value="tech_debt">Technical Debt</option>
            <option value="feature_gap">Feature Gaps</option>
            <option value="business_risk">Business Risks</option>
          </select>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-medium text-black transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Problem</span>
          </button>
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProblems.map((prob) => (
          <div
            key={prob._id}
            className="glass-card hover-lift p-5 space-y-4 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Glow gradient */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_65%_at_0%_0%,rgba(239,68,68,0.02)_0%,transparent_50%)]" />

            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    {getProblemTypeLabel(prob.type)}
                  </span>
                  <h3 className="text-xs font-bold text-white leading-snug">{prob.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] uppercase tracking-wider font-semibold border px-2.5 py-0.5 rounded-full ${getSeverityStyles(prob.severity)}`}>
                    {prob.severity}
                  </span>
                  <button
                    onClick={() => handleDelete(prob._id, prob.title)}
                    className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-zinc-900/50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">{prob.description}</p>

              {/* Impact statements */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900/80">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">User Impact</span>
                  <p className="text-[10px] text-zinc-300 leading-normal">{prob.userImpact || "Blocks flow."}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Business Impact</span>
                  <p className="text-[10px] text-zinc-300 leading-normal">{prob.businessImpact || "Reduces conversions."}</p>
                </div>
              </div>

              {/* AI Recommended fix block */}
              {prob.suggestedFix && (
                <div className="rounded-xl border border-sky-500/10 bg-sky-500/5 p-4 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Recommended Solution Action
                  </span>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {prob.suggestedFix}
                  </p>
                </div>
              )}
            </div>

            {/* Evidence nodes attachments */}
            {prob.evidence && prob.evidence.length > 0 && (
              <div className="border-t border-zinc-900/80 pt-3 flex flex-wrap gap-1.5 items-center text-[10px] text-zinc-500 relative z-10">
                <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> Evidence logs:</span>
                {prob.evidence.map((ev, idx) => (
                  <span key={idx} className="bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-0.5 text-[9px] truncate max-w-[120px] text-zinc-400 font-mono">
                    {ev}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredProblems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 text-xs">
            <AlertTriangle className="h-8 w-8 mb-3 text-zinc-800" />
            No product vulnerability problems detected yet.
          </div>
        )}
      </div>

      {/* Drawer details for custom entry */}
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
                    <AlertTriangle className="h-4 w-4 text-sky-400" /> Log Vulnerability Risk
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
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Problem Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stripe checkout 3DS failures"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Risk Category</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="ux">UX Usability</option>
                        <option value="growth">Growth Bottleneck</option>
                        <option value="retention">Retention Risk</option>
                        <option value="tech_debt">Tech Debt</option>
                        <option value="feature_gap">Feature Gap</option>
                        <option value="business_risk">Business Risk</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Problem Description</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Outline what vulnerability exists in your product ecosystem..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">User Impact</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Customers can't access payment screen"
                      value={userImpact}
                      onChange={(e) => setUserImpact(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Business Impact</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5% reduction in onboarding upgrades"
                      value={businessImpact}
                      onChange={(e) => setBusinessImpact(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Proposed Action Fix</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Integrate automatic fallback gateway check..."
                      value={suggestedFix}
                      onChange={(e) => setSuggestedFix(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sky-500 text-black font-semibold rounded-lg px-4 py-2 text-xs hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Save Problem Node</span>
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
