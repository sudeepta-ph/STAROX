import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Sparkles, Bell, Cpu, Shield, Users, Lock,
  Zap, ChevronRight, Package, Check,
  AlertCircle, RefreshCw, Database, Key, Plug, Trash2,
  DownloadCloud, Layers, ChevronDown, Plus, X, Activity,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ProductSwitcher, { type Product } from "@/components/pmx/ProductSwitcher";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

const CATEGORY_PRESETS = [
  "SaaS", "Marketplace", "E-commerce", "Fintech", "Healthtech", "EdTech",
  "Developer Tools", "AI / ML", "Productivity", "Social", "Gaming", "Other",
];

const AUDIENCE_PRESETS = [
  "Developers", "Marketers", "Founders / Startups", "Enterprises",
  "Small Businesses", "Consumers", "Students", "Freelancers",
  "Non-technical Users", "Sales Teams", "Support Teams", "Designers",
];

// Single-select dropdown that also lets the user type and save a value not in the preset list.
function CreatableSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setAdding(false); setCustomInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  const commitCustom = () => {
    const v = customInput.trim();
    if (v) { onChange(v); setOpen(false); }
    setAdding(false); setCustomInput("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border hover:border-ring/50 rounded-lg px-3 py-2 text-xs text-left focus:outline-none transition-colors">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {allOptions.map(o => (
                <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${o === value ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-muted/50"}`}>
                  {o}
                  {o === value && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              {adding ? (
                <input
                  autoFocus
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } if (e.key === "Escape") { setAdding(false); setCustomInput(""); } }}
                  onBlur={commitCustom}
                  placeholder="Type a new category..."
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                />
              ) : (
                <button type="button" onClick={() => setAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add custom category
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Multi-select tag picker (backed by a single comma-separated string, matching the
// existing free-text `targetAudience` field on the understanding doc) that also lets
// the user type a custom audience tag not in the preset list.
function TagMultiSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag];
    onChange(next.join(", "));
  };

  const addCustom = () => {
    const tag = customInput.trim();
    setCustomInput("");
    if (!tag || selected.includes(tag)) return;
    onChange([...selected, tag].join(", "));
  };

  const allOptions = [...new Set([...options, ...selected])];

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] flex flex-wrap items-center gap-1.5 bg-background border border-border hover:border-ring/50 rounded-lg px-3 py-2 text-xs text-left transition-colors">
        {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
        {selected.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 text-[10px] font-medium">
            {tag}
            <span role="button" onClick={e => { e.stopPropagation(); toggle(tag); }} className="hover:text-destructive cursor-pointer">
              <X className="h-2.5 w-2.5" />
            </span>
          </span>
        ))}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {allOptions.map(o => {
                const isSel = selected.includes(o);
                return (
                  <button key={o} type="button" onClick={() => toggle(o)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSel ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-muted/50"}`}>
                    {o}
                    {isSel && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border p-2 flex items-center gap-1.5">
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder="Add custom audience..."
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
              />
              <button type="button" onClick={addCustom} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

// ── AI Usage Card ─────────────────────────────────────────────────────────────
type UsageRange = "today" | "week" | "month";
const USAGE_RANGES: Array<{ id: UsageRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

interface UsageStageRow { stage: string; totalTokens: number; costUsd: number; }
interface UsageModelRow { aiModel: string; totalTokens: number; costUsd: number; }

// Read-only summary — no gating/blocking on the numbers it shows, just a
// display of what GET /api/pmx/usage reports for the signed-in user.
function UsageCard() {
  const [range, setRange] = useState<UsageRange>("month");
  const [data, setData] = useState<{
    totalTokens: number;
    reasoningTokens: number;
    totalCostUsd: number;
    byStage: UsageStageRow[];
    byModel: UsageModelRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdownBy, setBreakdownBy] = useState<"model" | "stage">("model");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const headers = await getPmxHeaders();
        const res = await fetch(`${API_URL}/pmx/usage?range=${range}`, { headers });
        const json = await res.json();
        if (!cancelled && json.success) setData(json.data);
      } catch {
        // Best-effort display only — leave the card showing its last known
        // values (or the loading placeholder) rather than surfacing an error.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const breakdownRows = breakdownBy === "model" ? (data?.byModel ?? []) : (data?.byStage ?? []);

  return (
    <div className="rounded-xl border border-border bg-card/30 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" /> AI Usage
        </p>
        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
          {USAGE_RANGES.map(r => (
            <button key={r.id} type="button" onClick={() => setRange(r.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${range === r.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Tokens Used</p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {loading ? "—" : (data?.totalTokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Reasoning Tokens</p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {loading ? "—" : (data?.reasoningTokens ?? 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">Included in Tokens Used, billed as output</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Estimated Cost</p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {loading ? "—" : `$${(data?.totalCostUsd ?? 0).toFixed(4)}`}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cost Breakdown</p>
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <button type="button" onClick={() => setBreakdownBy("model")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${breakdownBy === "model" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Cpu className="h-2.5 w-2.5" /> By Model
            </button>
            <button type="button" onClick={() => setBreakdownBy("stage")}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${breakdownBy === "stage" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              By Stage
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-[11px] text-muted-foreground py-1">Loading…</p>
        ) : breakdownRows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1">No AI usage recorded for this range yet.</p>
        ) : (
          <div className="space-y-1">
            {breakdownRows.map((row) => {
              const label = breakdownBy === "model" ? (row as UsageModelRow).aiModel : (row as UsageStageRow).stage;
              return (
                <div key={label} className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground/80 truncate">{label}</span>
                  <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
                    <span className="font-mono">{row.totalTokens.toLocaleString()} tok</span>
                    <span className="font-mono font-semibold text-foreground">${row.costUsd.toFixed(4)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PmxSettings() {
  const { understanding, fetchUnderstanding, deleteProject, projectId, setProjectId, workspaces, fetchWorkspaces, startFreshWorkspace } = usePmxStore();
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // ── Product switcher — backed by real PMX workspaces ────────────────────────
  useEffect(() => { fetchWorkspaces(); }, []);

  const products: Product[] = workspaces.map(w => ({
    id: w.projectId,
    name: w.name,
    category: w.isProject ? "Project" : "Source",
    stage: "",
    workspace: `${w.sourceCount} source${w.sourceCount === 1 ? "" : "s"}`,
    lastSynced: timeAgo(w.updatedAt),
  }));
  const selectedProduct = products.find(p => p.id === projectId) ?? null;

  // Populate form fields from the active workspace's understanding doc
  useEffect(() => {
    if (understanding?.productSummary) {
      setName(understanding.productSummary.name || "");
      setCategory(understanding.productSummary.category || "SaaS");
      setStage(understanding.productSummary.stage || "mvp");
      setOneLiner(understanding.productSummary.oneLiner || "");
      setBusinessModel(understanding.businessModel || "");
      setTargetAudience(understanding.targetAudience || "");
      setValueProposition(understanding.valueProposition || "");
    }
  }, [understanding]);

  // Marked dirty explicitly by each field's own onChange handler below —
  // NOT by a blanket effect watching every field, which used to fire
  // markDirty() the moment the understanding-population effect above (or
  // even initial mount) set these same fields, flagging the form as
  // "unsaved" before the user had touched anything.
  const markDirty = useCallback(() => setSaveStatus("unsaved"), []);

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
          projectId,
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
        fetchWorkspaces();
        toast({ title: "Settings saved" });
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
            <Field label="Category">
              <CreatableSelect value={category} onChange={v => { setCategory(v); markDirty(); }} options={CATEGORY_PRESETS} placeholder="Select category..." />
            </Field>
          </div>
          <Field label="Target Audience">
            <TagMultiSelect value={targetAudience} onChange={v => { setTargetAudience(v); markDirty(); }} options={AUDIENCE_PRESETS} placeholder="Who are your users..." />
          </Field>

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
                const ok = await deleteProject(projectId);
                setDeleting(false);

                if (!ok) {
                  toast({ variant: "destructive", title: "Delete failed", description: "Could not delete product data. Please try again." });
                  return;
                }

                toast({ variant: "destructive", title: "Product deleted", description: "All sources, insights, and execution data have been removed." });
                setSaveStatus("idle");

                const remaining = workspaces.filter(w => w.projectId !== projectId);
                if (remaining[0]) setProjectId(remaining[0].projectId);
                else startFreshWorkspace();
                fetchWorkspaces();
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
          <UsageCard />
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
                    setProjectId(p.id);
                  }}
                  onCreateNew={() => { startFreshWorkspace(); navigate("/pmx/overview"); }}
                  onManage={() => navigate("/projects")}
                />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
