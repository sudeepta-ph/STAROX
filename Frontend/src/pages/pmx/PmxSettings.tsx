import { useState, useEffect, useRef, useCallback } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Save, Sparkles, Bell, Cpu, Shield, Users, Lock,
  Zap, ChevronRight, Star, Search, Plus, Package, Check,
  AlertCircle, Clock, RefreshCw, Database, Key, Plug, Trash2,
  DownloadCloud, Layers, X, ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";
const LAST_PRODUCT_KEY = "pmx_last_product";
const FAVORITES_KEY    = "pmx_fav_products";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  category: string;
  stage: string;
  workspace: string;
  lastSynced?: string;
}

// ── Nav groups ────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { id: "product",   label: "Product",   icon: Package },
      { id: "workspace", label: "Workspace", icon: Layers  },
    ],
  },
  {
    label: "AI",
    items: [
      { id: "ai",       label: "AI Engine",        icon: Cpu      },
      { id: "knowledge",label: "Knowledge Sources", icon: Database },
    ],
  },
  {
    label: "Automation",
    items: [
      { id: "automation",    label: "Automation",    icon: Zap  },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "team",        label: "Team & Users", icon: Users  },
      { id: "permissions", label: "Permissions",  icon: Lock   },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "apikeys",    label: "API Keys",      icon: Key         },
      { id: "integrations",label: "Integrations", icon: Plug        },
      { id: "dataexport", label: "Data & Export", icon: DownloadCloud },
    ],
  },
];

// ── Small reusable primitives ─────────────────────────────────────────────────
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border pb-4 mb-6">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground transition-colors" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none placeholder:text-muted-foreground transition-colors" />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-2 text-xs focus:outline-none transition-colors">
      {children}
    </select>
  );
}

function ComingSoon({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="py-16 text-center flex flex-col items-center gap-3">
      <Icon className="h-10 w-10 text-border" />
      <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}

// ── Product Switcher ──────────────────────────────────────────────────────────
function ProductSwitcher({
  products, selected, onSelect, onCreateNew, onManage,
}: {
  products: Product[];
  selected: Product | null;
  onSelect: (p: Product) => void;
  onCreateNew: () => void;
  onManage: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [favs, setFavs]       = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });
  const [cursor, setCursor]   = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const filtered = products.filter(p =>
    !query || [p.name, p.workspace, p.category].some(f => f.toLowerCase().includes(query.toLowerCase()))
  );
  const recents  = products.slice(0, 3);
  const favList  = products.filter(p => favs.includes(p.id));

  const allVisible = query ? filtered : products;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allVisible.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && allVisible[cursor]) { onSelect(allVisible[cursor]); setOpen(false); setQuery(""); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 bg-card border border-border hover:border-ring/50 rounded-xl px-4 py-3 text-left transition-all group"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {selected ? selected.name : "Select a product..."}
          </p>
          {selected && <p className="text-[10px] text-muted-foreground truncate">{selected.workspace} · {selected.category}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={handleKey}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
              />
              {query && <button onClick={() => setQuery("")}><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>}
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {!query && favList.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Starred</p>
                  {favList.map((p, i) => <ProductRow key={p.id} p={p} isFav={true} isSelected={selected?.id === p.id} isCursor={cursor === i} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />)}
                  <div className="mx-3 my-1 border-t border-border/50" />
                </>
              )}
              {!query && (
                <>
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Recent</p>
                  {recents.map((p, i) => <ProductRow key={p.id} p={p} isFav={favs.includes(p.id)} isSelected={selected?.id === p.id} isCursor={cursor === i + favList.length} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />)}
                  <div className="mx-3 my-1 border-t border-border/50" />
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">All Products</p>
                </>
              )}
              {allVisible.map((p, i) => (
                <ProductRow key={p.id} p={p} isFav={favs.includes(p.id)} isSelected={selected?.id === p.id}
                  isCursor={cursor === i} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />
              ))}
              {allVisible.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground text-center">No products found</p>}
            </div>

            {/* Footer actions */}
            <div className="border-t border-border flex divide-x divide-border">
              <button onClick={() => { onCreateNew(); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New Product
              </button>
              <button onClick={() => { onManage(); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Settings className="h-3.5 w-3.5" /> Manage Products
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductRow({ p, isFav, isSelected, isCursor, onSelect, onToggleFav }: {
  p: Product; isFav: boolean; isSelected: boolean; isCursor: boolean;
  onSelect: () => void; onToggleFav: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isCursor ? "bg-muted/60" : "hover:bg-muted/40"}`}
    >
      <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Package className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{p.workspace} · {p.category}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isSelected && <Check className="h-3 w-3 text-primary" />}
        <button onClick={e => onToggleFav(p.id, e)}
          className={`transition-colors ${isFav ? "text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`}>
          <Star className="h-3 w-3" fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

// ── Product Summary Card ──────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const stageColors: Record<string, string> = {
    idea: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    mvp:  "bg-blue-500/10 text-blue-500 border-blue-500/20",
    growth: "bg-green-500/10 text-green-500 border-green-500/20",
    scale: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };
  const stageClass = stageColors[product.stage.toLowerCase()] || stageColors.idea;
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-wrap items-center gap-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Package className="h-4.5 w-4.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">{product.workspace}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">{product.category}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stageClass} capitalize`}>{product.stage}</span>
        {product.lastSynced && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {product.lastSynced}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Save Status Badge ─────────────────────────────────────────────────────────
function SaveBadge({ status }: { status: "saved" | "saving" | "unsaved" | "idle" }) {
  if (status === "idle") return null;
  const map = {
    saved:   { icon: Check,        text: "Saved",            cls: "text-green-500 bg-green-500/10 border-green-500/20" },
    saving:  { icon: RefreshCw,    text: "Saving...",        cls: "text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse" },
    unsaved: { icon: AlertCircle,  text: "Unsaved Changes",  cls: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${m.cls}`}>
      <Icon className={`h-3 w-3 ${status === "saving" ? "animate-spin" : ""}`} /> {m.text}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PmxSettings() {
  const { understanding, fetchUnderstanding, deleteProject } = usePmxStore();
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState("product");
  const [saveStatus, setSaveStatus]       = useState<"idle" | "saved" | "saving" | "unsaved">("idle");
  const [unsavedWarning, setUnsavedWarning] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  // ── Product fields ────────────────────────────────────────────────────────
  const [name,             setName]             = useState(understanding?.productSummary?.name || "");
  const [oneLiner,         setOneLiner]         = useState(understanding?.productSummary?.oneLiner || "");
  const [category,         setCategory]         = useState(understanding?.productSummary?.category || "SaaS");
  const [stage,            setStage]            = useState(understanding?.productSummary?.stage || "idea");
  const [businessModel,    setBusinessModel]    = useState(understanding?.businessModel || "");
  const [targetAudience,   setTargetAudience]   = useState(understanding?.targetAudience || "");
  const [valueProposition, setValueProposition] = useState(understanding?.valueProposition || "");

  // ── AI fields ─────────────────────────────────────────────────────────────
  const [model,         setModel]         = useState("openai/gpt-4o-mini");
  const [autoAnalysis,  setAutoAnalysis]  = useState(true);
  const [deepReasoning, setDeepReasoning] = useState(false);

  // ── Automation fields ─────────────────────────────────────────────────────
  const [schedule,     setSchedule]     = useState("daily");
  const [runOnPush,    setRunOnPush]    = useState(false);
  const [runOnReview,  setRunOnReview]  = useState(true);
  const [runOnError,   setRunOnError]   = useState(true);

  // ── Notification fields ───────────────────────────────────────────────────
  const [slackNotifs,  setSlackNotifs]  = useState(false);
  const [emailNotifs,  setEmailNotifs]  = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyPrd,   setMonthlyPrd]   = useState(false);

  // ── Product switcher ──────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    try { return JSON.parse(localStorage.getItem(LAST_PRODUCT_KEY) || "null"); } catch { return null; }
  });

  // Seed products from understanding
  useEffect(() => {
    if (understanding?.productSummary?.name) {
      const p: Product = {
        id: "default",
        name: understanding.productSummary.name,
        category: understanding.productSummary.category || "SaaS",
        stage: understanding.productSummary.stage || "mvp",
        workspace: "Default Workspace",
        lastSynced: "just now",
      };
      setProducts([p]);
      if (!selectedProduct) setSelectedProduct(p);
      setName(p.name); setCategory(p.category); setStage(p.stage);
      setOneLiner(understanding.productSummary.oneLiner || "");
      setBusinessModel(understanding.businessModel || "");
      setTargetAudience(understanding.targetAudience || "");
      setValueProposition(understanding.valueProposition || "");
    }
  }, [understanding]);

  // Mark unsaved on any field change
  const markDirty = useCallback(() => setSaveStatus("unsaved"), []);
  useEffect(() => { if (name || oneLiner) markDirty(); }, [name, oneLiner, category, stage, businessModel, targetAudience, valueProposition, model, autoAnalysis, deepReasoning, schedule, runOnPush, runOnReview, runOnError, slackNotifs, emailNotifs, weeklyReport, monthlyPrd]);

  // Save product to localStorage
  const persistProduct = (p: Product) => {
    localStorage.setItem(LAST_PRODUCT_KEY, JSON.stringify(p));
    setSelectedProduct(p);
  };

  // Section switch with unsaved guard
  const requestSection = (id: string) => {
    if (saveStatus === "unsaved" && id !== activeSection) {
      setPendingSection(id);
      setUnsavedWarning(true);
    } else {
      setActiveSection(id);
    }
  };

  const confirmDiscard = () => {
    if (pendingSection) setActiveSection(pendingSection);
    setSaveStatus("idle");
    setUnsavedWarning(false);
    setPendingSection(null);
  };

  // Save
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaveStatus("saving");
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/understanding`, {
        method: "PUT", headers,
        body: JSON.stringify({
          productSummary: { name, oneLiner, category, stage },
          businessModel, targetAudience, valueProposition,
          coreFeatures: understanding?.coreFeatures || [],
          personas: understanding?.personas || [],
          customerSegments: understanding?.customerSegments || [],
          businessGoals: understanding?.businessGoals || [],
          customerJourney: understanding?.customerJourney || [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus("saved");
        fetchUnderstanding();
        toast({ title: "Settings saved" });
        if (selectedProduct) {
          const updated = { ...selectedProduct, name, category, stage };
          persistProduct(updated);
          setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
        }
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    } catch {
      toast({ variant: "destructive", title: "Error saving settings" });
      setSaveStatus("unsaved");
    }
  };

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [name, oneLiner, category, stage, businessModel, targetAudience, valueProposition]);

  // ── Section content ───────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case "product": return (
        <form onSubmit={handleSave} className="space-y-5">
          <SectionHeader title="Product Profile" description="Core product information used by PMX to generate accurate analysis." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Name"><TextInput value={name} onChange={v => { setName(v); markDirty(); }} placeholder="My Product" /></Field>
            <Field label="Category"><TextInput value={category} onChange={v => { setCategory(v); markDirty(); }} placeholder="SaaS, Marketplace..." /></Field>
          </div>
          <Field label="One-liner Elevator Pitch"><TextInput value={oneLiner} onChange={v => { setOneLiner(v); markDirty(); }} placeholder="The AI product manager for..." /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Stage">
              <Select value={stage} onChange={v => { setStage(v); markDirty(); }}>
                <option value="idea">Idea Stage</option>
                <option value="mvp">MVP</option>
                <option value="growth">Growth</option>
                <option value="scale">Enterprise Scale</option>
              </Select>
            </Field>
            <Field label="Business Model"><TextInput value={businessModel} onChange={v => { setBusinessModel(v); markDirty(); }} placeholder="SaaS, freemium, B2B..." /></Field>
          </div>
          <Field label="Target Audience"><Textarea value={targetAudience} onChange={v => { setTargetAudience(v); markDirty(); }} placeholder="Who are your users..." /></Field>
          <Field label="Value Proposition"><Textarea value={valueProposition} onChange={v => { setValueProposition(v); markDirty(); }} placeholder="Why customers choose you..." /></Field>

          {/* Danger zone */}
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <p className="text-xs font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" /> Danger Zone
            </p>
            <p className="text-[10px] text-muted-foreground">Permanently delete this product and all its data — sources, signals, insights, PRDs, and execution tasks. This cannot be undone.</p>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm(`Delete "${name || "this product"}" and all its data? This cannot be undone.`)) return;

                setDeleting(true);
                const ok = await deleteProject(selectedProduct?.id);
                setDeleting(false);

                if (!ok) {
                  toast({ variant: "destructive", title: "Delete failed", description: "Could not delete product data. Please try again." });
                  return;
                }

                toast({ variant: "destructive", title: "Product deleted", description: "All sources, insights, and execution data have been removed." });
                setName(""); setOneLiner(""); setCategory("SaaS"); setStage("idea");
                setBusinessModel(""); setTargetAudience(""); setValueProposition("");
                setSelectedProduct(null);
                localStorage.removeItem(LAST_PRODUCT_KEY);
                setProducts([]);
                setSaveStatus("idle");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background hover:bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting..." : "Delete Product"}
            </button>
          </div>
        </form>
      );
      case "workspace": return (
        <div>
          <SectionHeader title="Workspace Settings" description="General configuration for this PMX workspace." />
          <ComingSoon icon={Layers} message="Workspace settings — renaming, billing, and domain config — coming soon." />
        </div>
      );
      case "ai": return (
        <div className="space-y-5">
          <SectionHeader title="AI Engine Configuration" description="Control how PMX reasons, which models it uses, and analysis depth." />
          <Field label="Active LLM Model">
            <Select value={model} onChange={v => { setModel(v); markDirty(); }}>
              <option value="openai/gpt-4o-mini">GPT-4o Mini — Fast & Efficient</option>
              <option value="openai/gpt-4o">GPT-4o — Deep Strategy</option>
              <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet — Best PRD Output</option>
              <option value="deepseek/deepseek-r1">DeepSeek R1 — Engineering Reasoning</option>
            </Select>
          </Field>
          <div className="rounded-xl border border-border bg-card/30 px-4 divide-y divide-border/40">
            <Toggle value={autoAnalysis} onChange={v => { setAutoAnalysis(v); markDirty(); }} label="Auto-run Analysis" description="Re-analyzes automatically when sources change" />
            <Toggle value={deepReasoning} onChange={v => { setDeepReasoning(v); markDirty(); }} label="Deep Reasoning Mode" description="Uses more tokens for higher quality recommendations (slower)" />
          </div>
        </div>
      );
      case "knowledge": return (
        <div>
          <SectionHeader title="Knowledge Sources" description="Configure what data PMX learns from for this product." />
          <ComingSoon icon={Database} message="Knowledge source pinning and source weighting coming soon." />
        </div>
      );
      case "automation": return (
        <div className="space-y-5">
          <SectionHeader title="Automation Center" description="Configure when PMX automatically runs analysis and generates reports." />
          <Field label="Analysis Schedule">
            <Select value={schedule} onChange={v => { setSchedule(v); markDirty(); }}>
              <option value="1h">Every hour</option>
              <option value="2h">Every 2 hours</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual only</option>
            </Select>
          </Field>
          <div className="rounded-xl border border-border bg-card/30 px-4 divide-y divide-border/40">
            <Toggle value={runOnPush} onChange={v => { setRunOnPush(v); markDirty(); }} label="Run after GitHub Push" description="Trigger analysis on new commits" />
            <Toggle value={runOnReview} onChange={v => { setRunOnReview(v); markDirty(); }} label="Run after New Reviews" description="Analyze when new user feedback arrives" />
            <Toggle value={runOnError} onChange={v => { setRunOnError(v); markDirty(); }} label="Run after Production Errors" description="Analyze when Sentry/Crashlytics detects errors" />
          </div>
        </div>
      );
      case "notifications": return (
        <div>
          <SectionHeader title="Notifications" description="Control when and how PMX alerts your team." />
          <div className="rounded-xl border border-border bg-card/30 px-4 divide-y divide-border/40">
            <Toggle value={slackNotifs} onChange={v => { setSlackNotifs(v); markDirty(); }} label="Slack Notifications" description="Send PMX insights to a Slack channel" />
            <Toggle value={emailNotifs} onChange={v => { setEmailNotifs(v); markDirty(); }} label="Email Notifications" description="Receive email summaries" />
            <Toggle value={weeklyReport} onChange={v => { setWeeklyReport(v); markDirty(); }} label="Weekly Product Report" description="Auto weekly product health email every Monday" />
            <Toggle value={monthlyPrd} onChange={v => { setMonthlyPrd(v); markDirty(); }} label="Monthly PRD Generation" description="Auto-generate a PRD summary each month" />
          </div>
        </div>
      );
      case "team":        return <div><SectionHeader title="Team & Users" description="Manage who has access to this PMX workspace." /><ComingSoon icon={Users} message="Team management coming soon. Your workspace is currently single-user." /></div>;
      case "permissions": return <div><SectionHeader title="Permissions" description="Configure access levels and data visibility." /><ComingSoon icon={Lock} message="Permissions management available on Team plan." /></div>;
      case "apikeys":     return <div><SectionHeader title="API Keys" description="Manage API keys for external integrations." /><ComingSoon icon={Key} message="API key management coming soon." /></div>;
      case "integrations":return <div><SectionHeader title="Integrations" description="Connect third-party tools to PMX." /><ComingSoon icon={Plug} message="Native integrations panel coming soon." /></div>;
      case "dataexport":  return <div><SectionHeader title="Data & Export" description="Export your product intelligence data." /><ComingSoon icon={DownloadCloud} message="Full data export coming soon." /></div>;
      default: return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Unsaved changes warning ──────────────────────────────────────── */}
      <AnimatePresence>
        {unsavedWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Unsaved changes</h3>
                  <p className="text-xs text-muted-foreground mt-1">You have unsaved changes. Do you want to discard them and switch sections?</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setUnsavedWarning(false); setPendingSection(null); }}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  Keep Editing
                </button>
                <button onClick={confirmDiscard}
                  className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-colors">
                  Discard Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left sidebar nav */}
        <aside className="w-52 shrink-0 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
          <div className="px-4 pt-5 pb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Settings</p>
          </div>
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-1">
              <p className="px-4 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button key={item.id} onClick={() => requestSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-3 w-3 text-primary/60" />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Top header with breadcrumbs + save status */}
          <div className="shrink-0 border-b border-border px-6 py-3 flex items-center justify-between gap-4 bg-background/60 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">PMX Settings</span>
              {selectedProduct && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-primary font-semibold truncate max-w-[160px]">{selectedProduct.name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SaveBadge status={saveStatus} />
              {saveStatus === "unsaved" && (
                <button onClick={() => handleSave()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              )}
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

              {/* Product Switcher */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Product</p>
                <ProductSwitcher
                  products={products}
                  selected={selectedProduct}
                  onSelect={p => {
                    if (saveStatus === "unsaved") {
                      toast({ title: "Save your changes first before switching products." });
                      return;
                    }
                    persistProduct(p);
                  }}
                  onCreateNew={() => toast({ title: "Create New Product", description: "Multi-product workspace coming soon." })}
                  onManage={() => toast({ title: "Manage Products", description: "Product manager coming soon." })}
                />
                {selectedProduct && <ProductCard product={selectedProduct} />}
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Section content */}
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {renderSection()}
              </motion.div>

              {/* Sticky save button for form sections */}
              {["product","ai","automation","notifications"].includes(activeSection) && saveStatus === "unsaved" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background to-transparent">
                  <button onClick={() => handleSave()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all shadow-lg">
                    <Save className="h-4 w-4" /> Save Changes
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
