import { useState, useRef, useEffect } from "react";
import { getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Upload, Sparkles, ChevronDown, ChevronUp,
  Download, RefreshCw, X, Eye, Layers, Type, Contrast,
  MousePointer2, Navigation, Layout, Puzzle, Accessibility,
  Smartphone, GitBranch, Zap, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Plus, ImagePlus, Info,
  History, Clock, Trash2, ArrowRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import WebsiteViewer from "@/components/WebsiteViewer";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";
const HISTORY_KEY = "ui_audit_history";
const MAX_HISTORY  = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

interface UIIssue {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  screen: string;
  category: string;
  problem: string;
  change: string;
  improvement: string;
}

interface AuditResult {
  pageTitle: string;
  overallScore: number;
  summary: string;
  issues: UIIssue[];
}

interface HistoryEntry {
  id: string;
  pageTitle: string;
  overallScore: number;
  summary: string;
  issueCount: number;
  auditSrc: "url" | "screenshot";
  url?: string;
  createdAt: string; // ISO string
  result: AuditResult;
}

interface UploadedScreen {
  dataUrl: string;
  label: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_META = {
  critical: { label: "Critical", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",       dot: "bg-red-400"    },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
  medium:   { label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400" },
  low:      { label: "Low",      color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20",       dot: "bg-sky-400"    },
};

const CATEGORY_ICONS: Record<string, any> = {
  "Visual Hierarchy":             Eye,
  "Spacing & Alignment":          Layers,
  "Typography":                   Type,
  "Color & Contrast":             Contrast,
  "CTA Placement":                MousePointer2,
  "Navigation":                   Navigation,
  "Layout Balance":               Layout,
  "Component Consistency":        Puzzle,
  "Accessibility":                Accessibility,
  "Responsiveness":               Smartphone,
  "User Flow":                    GitBranch,
  "Usability Friction":           Zap,
  "Cross-Screen Inconsistencies": Layers,
};

function scoreColor(s: number) { return s >= 75 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400"; }
function scoreLabel(s: number) { return s >= 80 ? "Good" : s >= 60 ? "Needs Work" : s >= 40 ? "Poor" : "Critical Issues"; }

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ── History helpers ───────────────────────────────────────────────────────────

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function pushHistory(entry: HistoryEntry) {
  const existing = loadHistory().filter(e => e.id !== entry.id);
  saveHistory([entry, ...existing]);
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 14 }: { score: number; size?: number }) {
  const r = size * 0.78, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
  const px = size * 4;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: px, height: px }}>
      <svg className="-rotate-90" width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        <circle cx={px/2} cy={px/2} r={r} fill="none" stroke="#27272a" strokeWidth={size * 0.35} />
        <circle cx={px/2} cy={px/2} r={r} fill="none"
          stroke={score >= 75 ? "#4ade80" : score >= 50 ? "#facc15" : "#f87171"}
          strokeWidth={size * 0.35} strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className={`absolute font-black ${scoreColor(score)}`} style={{ fontSize: size * 0.85 }}>{score}</span>
    </div>
  );
}

// ── IssueCard ─────────────────────────────────────────────────────────────────

function IssueCard({ issue, index }: { issue: UIIssue; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = SEVERITY_META[issue.severity] || SEVERITY_META.low;
  const Icon = CATEGORY_ICONS[issue.category] || Zap;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl border ${meta.bg} overflow-hidden`}
    >
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-400 flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <span className={`shrink-0 mt-0.5 ${meta.color}`}><Icon className="h-3.5 w-3.5" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-white leading-tight">{issue.title}</h3>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">{issue.screen} · {issue.category}</p>
        </div>
        <span className="shrink-0 text-zinc-600 mt-0.5">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Problem</span>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{issue.problem}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">What to change</span>
                <p className="text-[11px] text-sky-300 mt-1 leading-relaxed">{issue.change}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Expected improvement</span>
                <p className="text-[11px] text-green-300 mt-1 leading-relaxed">{issue.improvement}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PmxAnalysis() {
  const { toast } = useToast();
  const fileRef        = useRef<HTMLInputElement>(null);
  const enhanceFileRef = useRef<HTMLInputElement>(null);

  // ── Input state ───────────────────────────────────────────────────────────
  const [urlInput,      setUrlInput]      = useState("");
  const [previewUrl,    setPreviewUrl]    = useState("");
  const [activeTab,     setActiveTab]     = useState<"url" | "upload">("url");
  const [uploadedImage, setUploadedImage] = useState<UploadedScreen | null>(null);

  // ── Enhancement ───────────────────────────────────────────────────────────
  const [enhanceScreens,   setEnhanceScreens]   = useState<UploadedScreen[]>([]);
  const [showEnhancePanel, setShowEnhancePanel] = useState(false);
  const [enhancing,        setEnhancing]        = useState(false);

  // ── Audit state ───────────────────────────────────────────────────────────
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState<AuditResult | null>(null);
  const [auditSrc, setAuditSrc] = useState<"url" | "screenshot" | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ── Right panel tab: "analysis" | "history" ───────────────────────────────
  const [rightTab, setRightTab] = useState<"analysis" | "history">("analysis");

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  // ── Panel state ───────────────────────────────────────────────────────────
  const [panelState, setPanelState] = useState<"both" | "left-collapsed" | "right-collapsed">("both");
  const collapseLeft  = () => setPanelState("left-collapsed");
  const collapseRight = () => setPanelState("right-collapsed");
  const expandBoth    = () => setPanelState("both");

  // ── File helpers ──────────────────────────────────────────────────────────

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = e => res(e.target!.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleInitialFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImage({ dataUrl: await readFileAsDataUrl(file), label: file.name.replace(/\.[^.]+$/, "") });
  };

  const handleEnhanceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const screens = await Promise.all(files.map(async f => ({ dataUrl: await readFileAsDataUrl(f), label: f.name.replace(/\.[^.]+$/, "") })));
    setEnhanceScreens(prev => [...prev, ...screens]);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    Array.from(e.clipboardData?.items ?? []).forEach(item => {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (!file) return;
        readFileAsDataUrl(file).then(dataUrl => {
          if (result) {
            setEnhanceScreens(prev => [...prev, { dataUrl, label: "Pasted screenshot" }]);
            setShowEnhancePanel(true);
            toast({ title: "Screenshot queued", description: "Click Improve Analysis to update." });
          } else {
            setUploadedImage({ dataUrl, label: "Pasted screenshot" });
            setActiveTab("upload");
            toast({ title: "Screenshot pasted", description: "Ready to audit." });
          }
        });
      }
    });
  };

  // ── Persist result to history ─────────────────────────────────────────────

  const persistToHistory = (res: AuditResult, src: "url" | "screenshot", url?: string) => {
    const entry: HistoryEntry = {
      id:          crypto.randomUUID(),
      pageTitle:   res.pageTitle,
      overallScore: res.overallScore,
      summary:     res.summary,
      issueCount:  res.issues.length,
      auditSrc:    src,
      url,
      createdAt:   new Date().toISOString(),
      result:      res,
    };
    pushHistory(entry);
    setHistory(loadHistory());
    return entry;
  };

  // ── Initial audit ─────────────────────────────────────────────────────────

  const runAudit = async () => {
    const isUrl = activeTab === "url";
    if (isUrl && !urlInput.trim()) return;
    if (!isUrl && !uploadedImage) return;

    setRunning(true);
    setResult(null);
    setEnhanceScreens([]);
    setShowEnhancePanel(false);
    setRightTab("analysis");

    try {
      const headers = await getPmxHeaders();
      const body: any = {};
      const src: "url" | "screenshot" = isUrl ? "url" : "screenshot";

      if (isUrl) {
        body.url   = urlInput.trim();
        body.title = urlInput.trim();
        setPreviewUrl(urlInput.trim());
      } else if (uploadedImage) {
        body.screenshots      = [uploadedImage.dataUrl];
        body.screenshotLabels = [uploadedImage.label];
        body.title            = uploadedImage.label;
      }

      setAuditSrc(src);

      const res  = await fetch(`${API_URL}/pmx/analysis/ui-audit`, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Audit failed");

      setResult(json.data);
      persistToHistory(json.data, src, isUrl ? urlInput.trim() : undefined);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Audit failed", description: err.message });
    } finally {
      setRunning(false);
    }
  };

  // ── Enhancement run ───────────────────────────────────────────────────────

  const runEnhancement = async () => {
    if (!enhanceScreens.length) return;
    setEnhancing(true);

    try {
      const headers = await getPmxHeaders();
      const body: any = {
        url:              previewUrl || undefined,
        title:            result?.pageTitle,
        screenshots:      enhanceScreens.map(s => s.dataUrl),
        screenshotLabels: enhanceScreens.map(s => s.label),
      };

      const res  = await fetch(`${API_URL}/pmx/analysis/ui-audit`, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Enhancement failed");

      setResult(json.data);
      setEnhanceScreens([]);
      setShowEnhancePanel(false);
      persistToHistory(json.data, auditSrc ?? "url", previewUrl || undefined);
      toast({ title: "Analysis updated", description: `${json.data.issues.length} issues found across all screens.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enhancement failed", description: err.message });
    } finally {
      setEnhancing(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = (r?: AuditResult) => {
    const data = r || result;
    if (!data) return;
    let md = `# UI Audit: ${data.pageTitle}\n\n**Score:** ${data.overallScore}/100 — ${scoreLabel(data.overallScore)}\n\n**Summary:** ${data.summary}\n\n---\n\n`;
    data.issues.forEach((iss, i) => {
      md += `### ${i + 1}. [${iss.severity.toUpperCase()}] ${iss.title}\n- **Screen:** ${iss.screen}\n- **Category:** ${iss.category}\n- **Problem:** ${iss.problem}\n- **Change:** ${iss.change}\n- **Improvement:** ${iss.improvement}\n\n`;
    });
    const blob = new Blob([md], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `ui-audit-${Date.now()}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const deleteHistoryEntry = (id: string) => {
    const updated = loadHistory().filter(e => e.id !== id);
    saveHistory(updated);
    setHistory(updated);
  };

  const clearHistory = () => { saveHistory([]); setHistory([]); };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setAuditSrc(entry.auditSrc);
    if (entry.url) { setUrlInput(entry.url); setPreviewUrl(entry.url); setActiveTab("url"); }
    setEnhanceScreens([]);
    setShowEnhancePanel(false);
    setRightTab("analysis");
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const allCategories  = result ? [...new Set(result.issues.map(i => i.category))].sort() : [];
  const filteredIssues = result ? result.issues.filter(i =>
    (severityFilter === "all" || i.severity === severityFilter) &&
    (categoryFilter === "all" || i.category === categoryFilter)
  ) : [];
  const severityCounts = result
    ? Object.fromEntries((["critical","high","medium","low"] as const).map(s => [s, result.issues.filter(i => i.severity === s).length]))
    : null;

  const leftWidth  = panelState === "left-collapsed"  ? "w-0 opacity-0 pointer-events-none"
                   : panelState === "right-collapsed" ? "flex-1" : "w-1/2";
  const rightWidth = panelState === "right-collapsed" ? "w-0 opacity-0 pointer-events-none"
                   : panelState === "left-collapsed"  ? "flex-1" : "w-1/2";

  // Input card hides once a URL is set OR audit is running
  const showInputCard = !running && !previewUrl && !uploadedImage;
  const showSplit = !!(previewUrl || uploadedImage);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" onPaste={handlePaste}>

      {/* ── COMPACT TOP BAR (shown only when in workspace) ─────────────────── */}
      {showSplit && (
        <div className="shrink-0 px-4 py-2 flex items-center gap-2 border-b border-zinc-900 bg-background">
          <Globe className="h-3 w-3 text-zinc-600 shrink-0" />
          <input type="url" placeholder="https://yourproduct.com"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onBlur={() => { if (urlInput.trim()) setPreviewUrl(urlInput.trim()); }}
            onKeyDown={e => e.key === "Enter" && runAudit()}
            className="flex-1 bg-transparent text-xs text-zinc-300 focus:outline-none placeholder-zinc-600"
          />
          <button
            onClick={() => {
              setResult(null); setPreviewUrl(""); setUploadedImage(null);
              setUrlInput(""); setEnhanceScreens([]); setShowEnhancePanel(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-[11px] text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> New Audit
          </button>
          <button onClick={runAudit} disabled={running || !urlInput.trim()}
            className="flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-black transition-all shrink-0"
          >
            <Sparkles className="h-3 w-3" /> Re-audit
          </button>
        </div>
      )}

      {/* ── SPLIT WORKSPACE ───────────────────────────────────────────────── */}
      {showSplit ? (
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* LEFT: website / image preview */}
          <div className={`relative flex flex-col border-r border-zinc-900 bg-zinc-950 overflow-hidden transition-all duration-300 ease-in-out ${leftWidth}`}>
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-900">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-sky-400" /> {previewUrl ? "Live Preview" : "Screenshot"}
              </span>
              <div className="flex items-center gap-1">
                {panelState === "right-collapsed" && (
                  <button onClick={expandBoth}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-white transition-colors">
                    <PanelRightOpen className="h-3 w-3" /> Expand Analysis
                  </button>
                )}
                {panelState === "both" && (
                  <button onClick={collapseLeft}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800 text-[10px] text-zinc-500 hover:text-white transition-colors">
                    <PanelLeftClose className="h-3 w-3" /> Collapse
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {previewUrl
                ? <WebsiteViewer url={previewUrl} />
                : uploadedImage
                  ? <div className="h-full overflow-y-auto p-4"><img src={uploadedImage.dataUrl} alt={uploadedImage.label} className="w-full rounded-lg border border-zinc-800" /></div>
                  : null}
            </div>
          </div>

          {panelState === "both" && <div className="shrink-0 w-px bg-zinc-900" />}

          {/* RIGHT: AI analysis + history */}
          <div className={`relative flex flex-col bg-background overflow-hidden transition-all duration-300 ease-in-out ${rightWidth}`}>

            {/* Panel header with tab switcher */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-900 bg-zinc-950">
              {/* Left: tabs */}
              <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900/40">
                <button onClick={() => setRightTab("analysis")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    rightTab === "analysis" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-sky-400" /> Analysis
                  {result && <span className={`ml-1 font-mono ${scoreColor(result.overallScore)}`}>{result.overallScore}</span>}
                </button>
                <button onClick={() => setRightTab("history")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    rightTab === "history" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <History className="h-3 w-3" /> History
                  {history.length > 0 && (
                    <span className="ml-1 text-[9px] bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5">{history.length}</span>
                  )}
                </button>
              </div>

              {/* Right: panel controls */}
              <div className="flex items-center gap-1">
                {panelState === "left-collapsed" && (
                  <button onClick={expandBoth}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-white transition-colors">
                    <PanelLeftOpen className="h-3 w-3" /> Expand Website
                  </button>
                )}
                {panelState === "both" && (
                  <button onClick={collapseRight}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800 text-[10px] text-zinc-500 hover:text-white transition-colors">
                    <PanelRightClose className="h-3 w-3" /> Collapse
                  </button>
                )}
                {result && rightTab === "analysis" && (
                  <button onClick={() => handleExport()}
                    className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors" title="Export">
                    <Download className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── ANALYSIS TAB ──────────────────────────────────────────── */}
            {rightTab === "analysis" && (
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">

                {/* Loading */}
                {running && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                    <div className="h-8 w-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-zinc-400">Running UI intelligence scan...</p>
                    <p className="text-[10px] text-zinc-600 max-w-xs leading-relaxed">
                      Detecting visual hierarchy, spacing, contrast, CTA, and usability issues.
                    </p>
                  </div>
                )}

                {/* Empty */}
                {!running && !result && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                    <Sparkles className="h-8 w-8 text-zinc-700" />
                    <p className="text-xs text-zinc-500 font-semibold">No analysis yet</p>
                    <p className="text-[11px] text-zinc-600 max-w-xs leading-relaxed">Click Audit UI to begin.</p>
                  </div>
                )}

                {/* Results */}
                {result && !running && (
                  <div className="p-4 space-y-3">

                    {/* Best-results notice */}
                    {auditSrc === "url" && (
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 flex gap-2.5">
                        <Info className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-sky-300 leading-relaxed">
                          <span className="font-bold">Best Results:</span> If your website has multiple pages or flows, upload screenshots of those screens below. The AI will combine the live analysis with the screenshots for a more complete review.
                        </p>
                      </div>
                    )}

                    {/* Score card */}
                    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4">
                      <div className="flex items-start gap-3">
                        <ScoreRing score={result.overallScore} size={14} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">{result.pageTitle}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 ${scoreColor(result.overallScore)}`}>
                              {scoreLabel(result.overallScore)}
                            </span>
                            {auditSrc === "screenshot" && <span className="text-[9px] text-sky-400 font-bold">Multi-screen</span>}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{result.summary}</p>
                          {severityCounts && (
                            <div className="flex gap-2 pt-2 flex-wrap">
                              {(["critical","high","medium","low"] as const).map(s => {
                                const m = SEVERITY_META[s]; const count = (severityCounts as any)[s] || 0;
                                if (!count) return null;
                                return (
                                  <div key={s} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${m.bg}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                                    <span className={`text-[9px] font-bold ${m.color}`}>{count} {m.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Improve Analysis CTA / panel */}
                    {!showEnhancePanel ? (
                      <button onClick={() => setShowEnhancePanel(true)}
                        className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900 p-3.5 text-left transition-all group"
                      >
                        <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                          <ImagePlus className="h-4 w-4 text-sky-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">Improve Analysis</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Upload screenshots from key pages (Dashboard, Settings, Checkout, Profile) for a multi-screen review.</p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                      </button>
                    ) : (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <ImagePlus className="h-3.5 w-3.5 text-sky-400" /> Add Screenshots
                          </p>
                          <button onClick={() => setShowEnhancePanel(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {enhanceScreens.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {enhanceScreens.map((s, i) => (
                              <div key={i} className="relative group">
                                <img src={s.dataUrl} alt={s.label} className="h-14 w-20 object-cover rounded-lg border border-zinc-800" />
                                <button onClick={() => setEnhanceScreens(prev => prev.filter((_,idx) => idx !== i))}
                                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-zinc-800 hover:bg-red-500 text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                                <p className="text-[8px] text-zinc-500 mt-0.5 text-center truncate max-w-[80px]">{s.label}</p>
                              </div>
                            ))}
                            <button onClick={() => enhanceFileRef.current?.click()}
                              className="h-14 w-20 rounded-lg border-2 border-dashed border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div onClick={() => enhanceFileRef.current?.click()}
                            className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl p-5 text-center cursor-pointer transition-all">
                            <Upload className="h-5 w-5 text-zinc-600 mx-auto mb-1.5" />
                            <p className="text-[11px] text-zinc-500 font-semibold">Click to add or paste (Ctrl+V)</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">Dashboard, Settings, Checkout, Profile, etc.</p>
                          </div>
                        )}
                        <input ref={enhanceFileRef} type="file" accept="image/*" multiple onChange={handleEnhanceFileSelect} className="hidden" />

                        <button onClick={runEnhancement} disabled={enhancing || enhanceScreens.length === 0}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-black transition-all">
                          {enhancing
                            ? <><div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Updating...</>
                            : <><Sparkles className="h-3.5 w-3.5" /> Improve Analysis ({enhanceScreens.length} screen{enhanceScreens.length !== 1 ? "s" : ""})</>}
                        </button>
                      </div>
                    )}

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] text-zinc-600 font-mono">{filteredIssues.length}/{result.issues.length}</span>
                      <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-400 focus:outline-none">
                        <option value="all">All Severities</option>
                        {(["critical","high","medium","low"] as const).map(s => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
                      </select>
                      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-400 focus:outline-none">
                        <option value="all">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Issue list */}
                    <div className="space-y-2">
                      {filteredIssues.map((issue, i) => <IssueCard key={issue.id} issue={issue} index={i} />)}
                      {filteredIssues.length === 0 && (
                        <p className="text-center py-10 text-zinc-600 italic text-xs">No issues match the filter.</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ───────────────────────────────────────────── */}
            {rightTab === "history" && (
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-4 space-y-3">

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {history.length} saved audit{history.length !== 1 ? "s" : ""}
                  </p>
                  {history.length > 0 && (
                    <button onClick={clearHistory}
                      className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>

                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <History className="h-8 w-8 text-zinc-700" />
                    <p className="text-xs text-zinc-500 font-semibold">No history yet</p>
                    <p className="text-[10px] text-zinc-600 max-w-xs">Completed audits are saved here automatically.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id}
                      className="rounded-xl border border-zinc-900 bg-zinc-950 hover:border-zinc-800 transition-colors overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <ScoreRing score={entry.overallScore} size={10} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{entry.pageTitle}</p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-2.5 w-2.5" /> {fmtDate(entry.createdAt)}
                            <span>·</span> {entry.issueCount} issues
                            <span>·</span> {entry.auditSrc === "url" ? "URL" : "Screenshot"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => restoreFromHistory(entry)}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-sky-500 hover:text-black text-[10px] text-zinc-400 hover:text-white font-semibold transition-all"
                          >
                            Load
                          </button>
                          <button onClick={() => handleExport(entry.result)}
                            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-white transition-colors" title="Export">
                            <Download className="h-3 w-3" />
                          </button>
                          <button onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>{/* end right panel */}
        </div>

      ) : (
        /* ── HERO LANDING ─────────────────────────────────────────────────── */
        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">

          {/* Ambient bottom glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-72 -z-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(56,189,248,0.18) 0%, transparent 70%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-3"
            >
              How good is your product experience?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-muted-foreground text-sm mb-10"
            >
              Detect UX issues, prioritize fixes, and ship better experiences.
            </motion.p>

            {/* Input card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-2xl bg-card backdrop-blur-md shadow-2xl overflow-hidden border border-border"
            >
              {/* Text input area */}
              {activeTab === "url" ? (
                <input
                  type="url"
                  placeholder="https://yourproduct.com"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onBlur={() => { if (urlInput.trim()) setPreviewUrl(urlInput.trim()); }}
                  onKeyDown={e => e.key === "Enter" && runAudit()}
                  className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              ) : (
                <div className="px-5 pt-4 pb-2">
                  {uploadedImage ? (
                    <div className="flex items-center gap-2">
                      <img src={uploadedImage.dataUrl} alt="" className="h-8 w-12 object-cover rounded border border-border shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{uploadedImage.label}</span>
                      <button onClick={() => setUploadedImage(null)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Click to upload a screenshot — PNG, JPG, WEBP
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleInitialFileSelect} className="hidden" />
                    </div>
                  )}
                </div>
              )}

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                {/* Left: mode toggle */}
                <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
                  {(["url","upload"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activeTab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "url" ? <><Globe className="h-3 w-3" /> Live URL</> : <><Upload className="h-3 w-3" /> Screenshot</>}
                    </button>
                  ))}
                </div>

                {/* Right: audit button */}
                <button
                  onClick={runAudit}
                  disabled={running || (activeTab === "url" ? !urlInput.trim() : !uploadedImage)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {running
                    ? <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    : <ArrowRight className="h-4 w-4 text-black" />}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

    </div>
  );
}
