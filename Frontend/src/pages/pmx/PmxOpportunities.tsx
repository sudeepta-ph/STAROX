import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Search,
  Sparkles,
  ArrowUpDown,
  Plus,
  X,
  Trash2,
  HelpCircle,
  Sliders,
  ChevronDown,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxOpportunities() {
  const { opportunities, fetchOpportunities } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"riceScore" | "iceScore" | "effort" | "userImpact">("riceScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);

  // Form / Slider states for editing or creating
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userImpact, setUserImpact] = useState(5);
  const [revenueImpact, setRevenueImpact] = useState(5);
  const [retentionImpact, setRetentionImpact] = useState(5);
  const [strategicAlignment, setStrategicAlignment] = useState(5);
  const [confidence, setConfidence] = useState(80);
  const [effort, setEffort] = useState(5);
  const [risk, setRisk] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredOpportunities = opportunities
    .filter((opp) => {
      return (
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/opportunities`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: editingOpp?._id || undefined,
          title,
          description,
          userImpact,
          revenueImpact,
          retentionImpact,
          strategicAlignment,
          confidence,
          effort,
          risk
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: editingOpp ? "Opportunity updated" : "Opportunity recorded",
          description: `"${title}" prioritization ratings updated.`
        });
        handleCloseDrawer();
        fetchOpportunities();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (opp: any) => {
    setEditingOpp(opp);
    setTitle(opp.title);
    setDescription(opp.description);
    setUserImpact(opp.userImpact);
    setRevenueImpact(opp.revenueImpact);
    setRetentionImpact(opp.retentionImpact);
    setStrategicAlignment(opp.strategicAlignment);
    setConfidence(opp.confidence);
    setEffort(opp.effort);
    setRisk(opp.risk);
    setIsAdding(true);
  };

  const handleCloseDrawer = () => {
    setIsAdding(false);
    setEditingOpp(null);
    setTitle("");
    setDescription("");
    setUserImpact(5);
    setRevenueImpact(5);
    setRetentionImpact(5);
    setStrategicAlignment(5);
    setConfidence(80);
    setEffort(5);
    setRisk("medium");
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete priority scorecard: "${name}"?`)) return;

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/opportunities/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Opportunity removed",
          description: `"${name}" removed successfully.`
        });
        fetchOpportunities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" /> RICE & ICE Opportunity Prioritization Matrix
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Evaluate Reach, Impact, Confidence, and Ease to determine what features star teams should build next.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b]/50 border border-zinc-800 focus:border-zinc-700 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-medium text-black transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Opportunity</span>
          </button>
        </div>
      </div>

      {/* RICE explanation card */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 flex items-start gap-3 relative overflow-hidden">
        <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-400 leading-relaxed">
          <p className="font-semibold text-white">How Opportunity Scoring Works:</p>
          <p className="mt-1">
            <strong>RICE Score (Out of 1000):</strong> (Reach × Impact × Confidence) / Effort. Reach is estimated dynamically using User Impact. Effort acts as complexity.
          </p>
          <p className="mt-0.5">
            <strong>ICE Score (Out of 100):</strong> Impact × Confidence × Ease. Ease is calculated as (11 - Effort) so that smaller effort features rank higher.
          </p>
        </div>
      </div>

      {/* Main Sortable Table View */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-900 bg-zinc-950/80 text-zinc-400 font-semibold font-mono">
              <th className="p-3.5">Opportunity Detail</th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort("userImpact")}>
                <div className="flex items-center gap-1">Impact <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort("effort")}>
                <div className="flex items-center gap-1">Effort <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="p-3.5">Risk</th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort("iceScore")}>
                <div className="flex items-center gap-1">ICE Score <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort("riceScore")}>
                <div className="flex items-center gap-1">RICE Score <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50">
            {filteredOpportunities.map((opp) => (
              <tr
                key={opp._id}
                onClick={() => handleEditClick(opp)}
                className="hover:bg-zinc-900/30 cursor-pointer transition-colors"
              >
                <td className="p-3.5 max-w-sm">
                  <h4 className="font-semibold text-white text-xs">{opp.title}</h4>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{opp.description}</p>
                </td>
                <td className="p-3.5 font-mono">{opp.userImpact}/10</td>
                <td className="p-3.5 font-mono">{opp.effort}/10</td>
                <td className="p-3.5">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    opp.risk === "high"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : opp.risk === "medium"
                      ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
                      : "bg-green-500/5 border-green-500/20 text-green-400"
                  }`}>
                    {opp.risk}
                  </span>
                </td>
                <td className="p-3.5 font-mono font-bold text-white">{opp.iceScore}/100</td>
                <td className="p-3.5 font-mono font-bold text-sky-400">{opp.riceScore}/1000</td>
                <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleDelete(opp._id, opp.title, e)}
                    className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredOpportunities.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-600 text-xs">
                  No prioritizable opportunities currently configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer containing detailed RICE sliders */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[420px] h-full bg-zinc-950 border-l border-zinc-900 p-6 flex flex-col justify-between relative z-10 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-sky-400" /> {editingOpp ? "Configure Opportunity" : "Create Prioritization Node"}
                  </h3>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-1 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Opportunity / Feature</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Integrate Apple Pay checkout option"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Description / Scope</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="What does this feature solve and what is the engineering scope..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-4 pt-3 border-t border-zinc-900">
                    <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Scoring parameters</h4>
                    
                    {/* User Impact Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">User Value / Impact</span>
                        <span className="font-semibold text-white font-mono">{userImpact}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={userImpact}
                        onChange={(e) => setUserImpact(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    {/* Revenue Impact Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">Revenue Impact</span>
                        <span className="font-semibold text-white font-mono">{revenueImpact}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={revenueImpact}
                        onChange={(e) => setRevenueImpact(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    {/* Effort Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">Complexity / Effort (Lower is better)</span>
                        <span className="font-semibold text-white font-mono">{effort}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={effort}
                        onChange={(e) => setEffort(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    {/* Confidence Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">AI Confidence</span>
                        <span className="font-semibold text-white font-mono">{confidence}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={confidence}
                        onChange={(e) => setConfidence(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Implementation Risk</label>
                      <select
                        value={risk}
                        onChange={(e) => setRisk(e.target.value)}
                        className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="low">Low Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>
                  </div>

                  {/* Immediate score preview */}
                  <div className="rounded-xl border border-sky-500/10 bg-sky-500/5 p-4 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-zinc-400 font-mono">Calculated ICE (Out of 100)</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {Math.round((userImpact * (confidence / 100) * (11 - effort)) * 10) / 10}/100
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-mono">Calculated RICE (Out of 1000)</p>
                      <p className="text-lg font-bold text-sky-400 mt-1">
                        {Math.round(((userImpact * 10 * userImpact * (confidence / 100)) / effort) * 10) / 10}/1000
                      </p>
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
                      <span>Save Scorecard</span>
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
