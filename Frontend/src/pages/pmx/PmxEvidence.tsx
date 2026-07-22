import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Fingerprint,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Cpu,
  Globe,
  Trash2,
  Plus,
  X,
  PlusCircle,
  HelpCircle,
  ThumbsUp
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxEvidence() {
  const { evidence, fetchEvidence } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("customer");
  const [quote, setQuote] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [importance, setImportance] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const filteredEvidence = evidence.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.quote && item.quote.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/evidence`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          category,
          quote,
          confidence,
          importance
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Evidence logged",
          description: `"${title}" has been added to your intelligence boards.`
        });
        setTitle("");
        setDescription("");
        setQuote("");
        setConfidence(3);
        setImportance(3);
        setIsAdding(false);
        fetchEvidence();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove this evidence node: "${name}"?`)) return;

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/evidence/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Evidence card removed",
          description: `"${name}" removed successfully.`
        });
        fetchEvidence();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "customer":
        return { label: "Customer Signal", border: "border-green-500/20", bg: "bg-green-500/5", text: "text-green-400", icon: <MessageSquare className="h-3.5 w-3.5" /> };
      case "behavior":
        return { label: "User Behavior", border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-400", icon: <TrendingUp className="h-3.5 w-3.5" /> };
      case "business":
        return { label: "Business/Revenue", border: "border-yellow-500/20", bg: "bg-yellow-500/5", text: "text-yellow-400", icon: <DollarSign className="h-3.5 w-3.5" /> };
      case "engineering":
        return { label: "Engineering/Tech", border: "border-purple-500/20", bg: "bg-purple-500/5", text: "text-purple-400", icon: <Cpu className="h-3.5 w-3.5" /> };
      case "market":
        return { label: "Market Research", border: "border-sky-500/20", bg: "bg-sky-500/5", text: "text-sky-400", icon: <Globe className="h-3.5 w-3.5" /> };
      default:
        return { label: "Signal Node", border: "border-zinc-800", bg: "bg-zinc-900/40", text: "text-zinc-400", icon: <Fingerprint className="h-3.5 w-3.5" /> };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-sky-400" /> Customer Evidence Ledger
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Validating opportunities using user logs, support discussions, and analytics context.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search quotes or signals..."
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
            <span>Add Evidence</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-900/50 pb-4">
        {["all", "customer", "behavior", "business", "engineering", "market"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
              activeCategory === cat
                ? "bg-[#18181b] border-sky-500/35 text-white"
                : "bg-transparent border-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvidence.map((item) => {
          const theme = getCategoryTheme(item.category);
          return (
            <motion.div
              layout
              key={item._id}
              className={`rounded-xl border ${theme.border} bg-[#0c0c0e]/40 p-5 space-y-4 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all relative overflow-hidden`}
            >
              {/* Radial gradient glow */}
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(24,24,27,0.1)_0%,transparent_60%)]" />

              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] uppercase font-bold tracking-wider font-mono flex items-center gap-1.5 ${theme.text} ${theme.bg} border ${theme.border} px-2.5 py-0.5 rounded-full`}>
                    {theme.icon}
                    {theme.label}
                  </span>
                  <button
                    onClick={() => handleDelete(item._id, item.title)}
                    className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-zinc-900/50 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{item.description}</p>
                </div>

                {item.quote && (
                  <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/80 p-3 italic text-[11px] text-zinc-300 relative">
                    <span className="absolute top-1 left-2 text-sky-500/20 text-3xl font-serif leading-none">“</span>
                    <p className="pl-3 relative z-10">{item.quote}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-900/80 pt-3 mt-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono relative z-10">
                <span>Source: {item.source}</span>
                <div className="flex gap-2">
                  <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    Conf: {item.confidence}/5
                  </span>
                  <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    Imp: {item.importance}/5
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredEvidence.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-600 text-xs">
            <Fingerprint className="h-7 w-7 mb-3 text-zinc-800" />
            No matching evidence signals found.
          </div>
        )}
      </div>

      {/* Slide-over Overlay Drawer for adding new item */}
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
                    <PlusCircle className="h-4 w-4 text-sky-400" /> Log Evidence Signal
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
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Navigation drop-off peak"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="customer">Customer feedback (Intercom, etc.)</option>
                      <option value="behavior">Behavior signal (PostHog, etc.)</option>
                      <option value="business">Business metric (Stripe MRR, etc.)</option>
                      <option value="engineering">Engineering log/console stack</option>
                      <option value="market">Market analysis/Competitors</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Observation Description</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe what you observed and why it matters to the product scope..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Direct Customer Quote (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Paste verbatim customer quote, query, or raw log data snippet..."
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Confidence (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={confidence}
                        onChange={(e) => setConfidence(Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Importance (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={importance}
                        onChange={(e) => setImportance(Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                      <span>Save Evidence Node</span>
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
