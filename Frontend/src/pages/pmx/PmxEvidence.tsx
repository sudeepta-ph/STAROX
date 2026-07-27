import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Fingerprint, TrendingUp, MessageSquare, DollarSign, Cpu, Globe,
  Trash2, Plus, X, PlusCircle, Star, BarChart3, Activity, Target
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const CATEGORIES = [
  { id: "all",         label: "All Evidence",  color: "text-foreground",  bg: "bg-muted",           border: "border-border",           icon: Fingerprint },
  { id: "customer",    label: "Customer",       color: "text-green-400",   bg: "bg-green-500/10",    border: "border-green-500/20",     icon: MessageSquare },
  { id: "behavior",    label: "Behavior",       color: "text-blue-400",    bg: "bg-blue-500/10",     border: "border-blue-500/20",      icon: TrendingUp },
  { id: "business",    label: "Business",       color: "text-yellow-400",  bg: "bg-yellow-500/10",   border: "border-yellow-500/20",    icon: DollarSign },
  { id: "engineering", label: "Engineering",    color: "text-purple-400",  bg: "bg-purple-500/10",   border: "border-purple-500/20",    icon: Cpu },
  { id: "market",      label: "Market",         color: "text-sky-400",     bg: "bg-sky-500/10",      border: "border-sky-500/20",       icon: Globe },
  { id: "performance", label: "Performance",    color: "text-orange-400",  bg: "bg-orange-500/10",   border: "border-orange-500/20",    icon: BarChart3 },
  { id: "retention",   label: "Retention",      color: "text-pink-400",    bg: "bg-pink-500/10",     border: "border-pink-500/20",      icon: Activity },
  { id: "revenue",     label: "Revenue",        color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/20",   icon: Target },
];

function getCatMeta(cat: string) {
  return CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];
}

function ConfidenceDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < value ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

export default function PmxEvidence() {
  const { evidence, fetchEvidence } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery]     = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAdding, setIsAdding]           = useState(false);

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]     = useState("customer");
  const [quote, setQuote]           = useState("");
  const [confidence, setConfidence] = useState(3);
  const [importance, setImportance] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const filtered = evidence.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchQ = item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || (item.quote && item.quote.toLowerCase().includes(q));
    const matchC = activeCategory === "all" || item.category === activeCategory;
    return matchQ && matchC;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/evidence`, { method: "POST", headers, body: JSON.stringify({ title, description, category, quote, confidence, importance }) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Evidence logged", description: `"${title}" added.` });
        setTitle(""); setDescription(""); setQuote(""); setConfidence(3); setImportance(3); setIsAdding(false); fetchEvidence();
      }
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to log evidence." }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove evidence: "${name}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/evidence/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed" }); fetchEvidence(); }
  };

  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.id === "all" ? evidence.length : evidence.filter(e => e.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" /> Customer Evidence Database
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {evidence.length} signals collected · AI confidence validated
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search signals, quotes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Evidence
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          const count = catCounts[cat.id] || 0;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
                active ? `${cat.bg} ${cat.border} ${cat.color}` : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}>
              <Icon className="h-3 w-3" />{cat.label}
              {count > 0 && <span className={`text-[9px] font-mono ${active ? cat.color : "text-muted-foreground"}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Evidence cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const meta = getCatMeta(item.category);
          const Icon = meta.icon;
          return (
            <motion.div layout key={item._id}
              className={`rounded-xl border ${meta.border} bg-card/40 p-5 space-y-3 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden group`}>
              <div aria-hidden className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full ${meta.bg} blur-2xl opacity-30`} />
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${meta.color} ${meta.bg} border ${meta.border} px-2 py-0.5 rounded-full`}>
                    <Icon className="h-3 w-3" />{meta.label}
                  </span>
                  <button onClick={() => handleDelete(item._id, item.title)} className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.description}</p>
                </div>
                {item.quote && (
                  <div className="rounded-lg bg-card/60 border border-border/50 p-3 relative">
                    <span className="absolute top-1 left-2 text-primary/20 text-3xl font-serif leading-none">"</span>
                    <p className="pl-4 text-[11px] text-foreground/80 leading-relaxed italic relative z-10">{item.quote}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[10px] text-muted-foreground relative z-10">
                <span className="font-mono truncate max-w-[120px]">{item.source}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground/60">Conf</span>
                    <ConfidenceDots value={item.confidence} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground/60">Imp</span>
                    <ConfidenceDots value={item.importance} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Fingerprint className="h-7 w-7 text-border" />
            <p className="text-xs">No evidence signals found. Add some to build your intelligence base.</p>
          </div>
        )}
      </div>

      {/* Add evidence drawer */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[420px] h-full bg-card border-l border-border p-6 flex flex-col relative z-10 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><PlusCircle className="h-4 w-4 text-primary" /> Log Evidence Signal</h3>
                <button onClick={() => setIsAdding(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Title</label>
                  <input required type="text" placeholder="e.g. Drop-off at checkout step 3" value={title} onChange={e => setTitle(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Category</label>
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {CATEGORIES.filter(c => c.id !== "all").map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button type="button" key={cat.id} onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-1 p-2 rounded-lg border text-[10px] transition-all ${category===cat.id ? `${cat.bg} ${cat.border} ${cat.color}` : "border-border/50 text-muted-foreground hover:border-border"}`}>
                          <Icon className="h-3 w-3" />{cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Observation</label>
                  <textarea required rows={4} placeholder="Describe what you observed..." value={description} onChange={e => setDescription(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Customer Quote (optional)</label>
                  <textarea rows={3} placeholder="Paste verbatim customer quote..." value={quote} onChange={e => setQuote(e.target.value)}
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none font-mono" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Confidence (1-5)</label>
                    <input type="range" min="1" max="5" value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="mt-2 w-full accent-sky-500" />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>Weak</span><span className="text-primary font-bold">{confidence}/5</span><span>Strong</span></div>
                  </div>
                  <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Importance (1-5)</label>
                    <input type="range" min="1" max="5" value={importance} onChange={e => setImportance(Number(e.target.value))} className="mt-2 w-full accent-sky-500" />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>Low</span><span className="text-primary font-bold">{importance}/5</span><span>High</span></div>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <span>Save Evidence</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
