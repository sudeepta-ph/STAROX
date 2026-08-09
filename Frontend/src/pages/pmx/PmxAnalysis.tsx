import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Upload, Sparkles, ChevronDown, ChevronUp,
  Download, RefreshCw, X, Eye, Layers, Type, Contrast,
  MousePointer2, Navigation, Layout, Puzzle, Accessibility,
  Smartphone, GitBranch, Zap, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Plus, ImagePlus, Info,
  History, Clock, Trash2, ArrowRight, Loader2, CheckCircle2, AlertCircle, FileDown,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import WebsiteViewer from "@/components/WebsiteViewer";
import { generateAuditPdfBlob } from "@/lib/pdf/PmxAuditPdf";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";
const HISTORY_KEY = "ui_audit_history";
const MAX_HISTORY  = 30;
// Matches the backend's POST /analysis/ui-audit screenshots[]/screenshotLabels[] design.
const MAX_SCREENSHOTS = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface UIIssue {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  screen: string;
  // 0-based index into the screenshots that were submitted, or null — see
  // resolveScreenshotIndex in backend/src/services/uiAuditAi.ts.
  screenshotIndex: number | null;
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
  // URL-mode only, server-captured (see backend uiAuditAi.ts/pmx.ts) — the
  // single full-page screenshot the audit was based on. Absent for
  // screenshot-mode (those images live client-side in uploadedImages) and
  // for URL-mode audits where capture failed or predate this field.
  screenshots?: UploadedScreen[];
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
  // Which workspace this audit was run under. Optional — entries persisted
  // before this field existed won't have it; restoreFromHistory treats that
  // as "unknown" rather than guessing.
  projectId?: string;
}

interface UploadedScreen {
  dataUrl: string;
  label: string;
}

const SEVERITY_META: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: "Critical", color: "text-red-400",    dot: "bg-red-400"    },
  high:     { label: "High",     color: "text-orange-400", dot: "bg-orange-400" },
  medium:   { label: "Medium",   color: "text-amber-400",  dot: "bg-amber-400"  },
  low:      { label: "Low",      color: "text-sky-400",    dot: "bg-sky-400"    },
};

function scoreColor(s: number) { return s >= 75 ? "text-green-400" : s >= 50 ? "text-amber-400" : "text-red-400"; }
function scoreLabel(s: number) { return s >= 80 ? "Good" : s >= 60 ? "Needs Work" : s >= 40 ? "Poor" : "Critical Issues"; }

function severityCountsFor(issues: UIIssue[]) {
  return Object.fromEntries(
    (["critical", "high", "medium", "low"] as const).map(s => [s, issues.filter(i => i.severity === s).length])
  ) as Record<"critical" | "high" | "medium" | "low", number>;
}

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

// ── FindingItem (Editorial Claude-style report row) ──────────────────────────

function FindingItem({
  issue,
  index,
  open,
  onToggle,
}: {
  issue: UIIssue;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = SEVERITY_META[issue.severity] || SEVERITY_META.low;
  const numStr = String(index + 1).padStart(2, "0");

  return (
    <div className="border-b border-border/30 last:border-b-0 py-4 transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 text-left group focus:outline-none"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="font-mono text-xs font-semibold text-muted-foreground/60 shrink-0 mt-0.5 select-none">
            {numStr}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-sky-400 transition-colors leading-snug">
              {issue.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <span className={meta.color}>{meta.label}</span>
              </span>
              <span>·</span>
              <span className="truncate max-w-[180px] sm:max-w-xs">{issue.screen}</span>
              <span>·</span>
              <span className="text-muted-foreground/80">{issue.category}</span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors mt-0.5">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-7 pt-3 space-y-3 text-xs leading-relaxed">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Observation
                </span>
                <p className="text-foreground/85 mt-0.5">{issue.problem}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recommendation
                </span>
                <p className="text-sky-500 dark:text-sky-300 mt-0.5">{issue.change}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Why it matters / Impact
                </span>
                <p className="text-muted-foreground/90 mt-0.5">{issue.improvement}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function validateAndNormalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let formatted = trimmed;
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }
  try {
    const parsed = new URL(formatted);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname || parsed.hostname.length < 3) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// The actual audit workspace (URL/screenshot input, split preview + analysis
// panel, history). Extracted so it can be reused both as the standalone
// `/pmx/analysis` page and embedded inline (e.g. in an Insights modal)
// without duplicating any of this markup. `onSavedToInsights` is optional —
// only the embedded usage needs to know when a save completes, to refresh
// whatever list it's showing behind the panel.
export function UiAuditWorkspace({ onSavedToInsights }: { onSavedToInsights?: () => void } = {}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { projectId, workspaces, fetchProblems, fetchDecisions, setProjectId } = usePmxStore();
  const fileRef        = useRef<HTMLInputElement>(null);
  const enhanceFileRef = useRef<HTMLInputElement>(null);

  // ── Input state ───────────────────────────────────────────────────────────
  const [urlInput,      setUrlInput]      = useState("");
  const [previewUrl,    setPreviewUrl]    = useState("");
  const [activeTab,      setActiveTab]      = useState<"url" | "upload">("url");
  const [uploadedImages, setUploadedImages] = useState<UploadedScreen[]>([]);

  // ── Enhancement ───────────────────────────────────────────────────────────
  const [enhanceScreens,   setEnhanceScreens]   = useState<UploadedScreen[]>([]);
  const [showEnhancePanel, setShowEnhancePanel] = useState(false);
  const [enhancing,        setEnhancing]        = useState(false);

  // ── Audit state ───────────────────────────────────────────────────────────
  const [running,    setRunning]    = useState(false);
  const [result,     setResult]     = useState<AuditResult | null>(null);
  const [auditSrc,   setAuditSrc]   = useState<"url" | "screenshot" | null>(null);
  // Screenshot-mode-only: URL mode keeps relying on the destructive toast it
  // already had, so this stays unset (and unrendered) for that path.
  const [auditError, setAuditError] = useState<string | null>(null);
  // The workspace this `result` actually belongs to — frozen at the moment
  // the audit was submitted (or restored from history), NOT read live from
  // the store. usePmxStore().projectId is global and can change out from
  // under this component if the user switches tabs while the result is
  // still on screen; addToInsights must save to the workspace the audit was
  // actually run under, not whatever happens to be active when they click.
  const [auditProjectId, setAuditProjectId] = useState<string | null>(null);

  // ── Refs for readiness & duplicate prevention ─────────────────────────────
  const pendingAuditUrlRef = useRef<string | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const previewReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewReadyTimeoutRef.current) {
        clearTimeout(previewReadyTimeoutRef.current);
      }
    };
  }, []);

  // ── Add to Insights ───────────────────────────────────────────────────────
  const [addingToInsights, setAddingToInsights]     = useState(false);
  const [addedToInsights,  setAddedToInsights]      = useState(false);
  const [showProjectMismatch, setShowProjectMismatch] = useState(false);
  // Per-issue failures from the last save-to-insights call — set only when
  // the backend reports a partial result (some issues saved, some didn't).
  // A retry sends only these issueIds, never the full set again, so issues
  // that already succeeded don't get duplicated.
  const [insightsFailures, setInsightsFailures] = useState<Array<{ issueId: string; error: string }> | null>(null);

  const [downloadingReport, setDownloadingReport] = useState(false);

  const workspaceName = (id: string | null) => (id && workspaces.find(w => w.projectId === id)?.name) || "an unnamed workspace";

  // `issuesToSave` defaults to the full result on a first attempt; a retry
  // passes just the subset that failed last time.
  const performAddToInsights = async (issuesToSave?: UIIssue[]) => {
    if (!result) return;
    const targetIssues = issuesToSave ?? result.issues;
    setAddingToInsights(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/analysis/ui-audit/save-to-insights`, {
        method: "POST", headers,
        body: JSON.stringify({ projectId: auditProjectId ?? projectId, url: previewUrl || undefined, result: { ...result, issues: targetIssues } }),
      });
      const json = await res.json();
      if (json.success) {
        const failed: Array<{ issueId: string; error: string }> = json.failed ?? [];
        const createdCount = json.created?.length ?? json.addedToInsights ?? 0;
        const savedProjectId = auditProjectId ?? projectId;
        // Only match against the *live* active project — never blindly
        // overwrite the store's problems/decisions with a different,
        // currently-inactive project's data (that would corrupt what every
        // other open view of "the active project" is showing).
        const isActiveWorkspace = savedProjectId === projectId;

        setAddedToInsights(true);

        if (createdCount > 0 && isActiveWorkspace) {
          fetchProblems();
          fetchDecisions();
        }

        if (failed.length > 0) {
          setInsightsFailures(failed);
          toast({
            variant: "destructive",
            title: `${createdCount} saved, ${failed.length} failed`,
            description: "Some issues couldn't be added — see below to retry just those.",
          });
        } else {
          setInsightsFailures(null);
          if (isActiveWorkspace) {
            toast({ title: "Added to Insights", description: `${createdCount} finding${createdCount === 1 ? "" : "s"} ready for review.` });
          } else {
            const name = workspaceName(savedProjectId);
            toast({
              title: "Added to Insights",
              description: `${createdCount} finding${createdCount === 1 ? "" : "s"} saved to ${name}, not your currently active workspace.`,
              action: (
                <ToastAction altText={`Switch to ${name}`} onClick={() => { setProjectId(savedProjectId); navigate("/pmx/insights"); }}>
                  View in {name}
                </ToastAction>
              ),
            });
          }
        }
        onSavedToInsights?.();
      } else {
        toast({ variant: "destructive", title: "Couldn't add to Insights", description: json.error || "Please try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Couldn't add to Insights", description: "Check your connection and try again." });
    } finally {
      setAddingToInsights(false);
    }
  };

  // Gate: if the audit's frozen projectId no longer matches the live/active
  // one, don't silently pick either — ask. A null auditProjectId (e.g. a
  // history entry saved before this field existed) is treated as "unknown,
  // trust the live value" rather than always forcing a prompt.
  const addToInsights = () => {
    if (!result || addingToInsights) return;
    if (auditProjectId && auditProjectId !== projectId) {
      setShowProjectMismatch(true);
      return;
    }
    performAddToInsights();
  };

  const retryFailedInsights = () => {
    if (!result || !insightsFailures?.length) return;
    const failedIds = new Set(insightsFailures.map(f => f.issueId));
    performAddToInsights(result.issues.filter(i => failedIds.has(i.id)));
  };

  // ── Filters & Expansion ───────────────────────────────────────────────────
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());

  const toggleIssue = (id: string) => setExpandedIssueIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllIssues = () => {
    if (!result) return;
    if (expandedIssueIds.size === filteredIssues.length) {
      setExpandedIssueIds(new Set());
    } else {
      setExpandedIssueIds(new Set(filteredIssues.map(i => i.id)));
    }
  };

  // Auto-expand the first 2 findings whenever a fresh result arrives
  useEffect(() => {
    if (result?.issues?.length) {
      setExpandedIssueIds(new Set(result.issues.slice(0, 2).map(i => i.id)));
    }
  }, [result]);

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
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file(s) later
    if (!files.length) return;

    const remaining = MAX_SCREENSHOTS - uploadedImages.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: `You can upload up to ${MAX_SCREENSHOTS} screenshots`, description: "Remove one to add another." });
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      toast({ title: `Added ${accepted.length} of ${files.length}`, description: `Maximum ${MAX_SCREENSHOTS} screenshots per audit.` });
    }
    const screens = await Promise.all(accepted.map(async f => ({ dataUrl: await readFileAsDataUrl(f), label: f.name.replace(/\.[^.]+$/, "") })));
    setUploadedImages(prev => [...prev, ...screens]);
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
          } else if (uploadedImages.length >= MAX_SCREENSHOTS) {
            toast({ variant: "destructive", title: `You can upload up to ${MAX_SCREENSHOTS} screenshots` });
          } else {
            setUploadedImages(prev => [...prev, { dataUrl, label: "Pasted screenshot" }]);
            setActiveTab("upload");
            toast({ title: "Screenshot pasted", description: "Ready to audit." });
          }
        });
      }
    });
  };

  // ── Persist result to history ─────────────────────────────────────────────

  const persistToHistory = (res: AuditResult, src: "url" | "screenshot", url: string | undefined, forProjectId: string) => {
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
      projectId:   forProjectId,
    };
    pushHistory(entry);
    setHistory(loadHistory());
    return entry;
  };

  // ── Initial audit & submission handlers ─────────────────────────────────────

  const runAudit = async (overrideUrl?: string) => {
    if (inFlightRef.current) return;

    if (previewReadyTimeoutRef.current) {
      clearTimeout(previewReadyTimeoutRef.current);
      previewReadyTimeoutRef.current = null;
    }
    pendingAuditUrlRef.current = null;

    const isUrl = activeTab === "url";
    const targetUrl = isUrl ? (overrideUrl || previewUrl || urlInput).trim() : undefined;

    if (isUrl && !targetUrl) return;
    if (!isUrl && uploadedImages.length === 0) return;

    inFlightRef.current = true;
    setRunning(true);
    setResult(null);
    setAuditError(null);
    setAddedToInsights(false);
    setInsightsFailures(null);
    setEnhanceScreens([]);
    setShowEnhancePanel(false);
    setRightTab("analysis");

    try {
      const headers = await getPmxHeaders();
      const body: any = {};
      const src: "url" | "screenshot" = isUrl ? "url" : "screenshot";

      if (isUrl && targetUrl) {
        body.url   = targetUrl;
        body.title = targetUrl;
        setPreviewUrl(targetUrl);
        setUrlInput(targetUrl);
      } else if (uploadedImages.length > 0) {
        body.screenshots      = uploadedImages.map(img => img.dataUrl);
        body.screenshotLabels = uploadedImages.map((img, i) => img.label || `Screen ${i + 1}`);
        body.title            = uploadedImages.length === 1 ? uploadedImages[0].label : `${uploadedImages.length} screenshots`;
      }

      setAuditSrc(src);
      // Freeze the workspace this audit belongs to at submit time — not
      // read live from the store later, which could have moved on by the
      // time the user clicks "Approve & Add to Insights".
      const capturedProjectId = projectId;
      setAuditProjectId(capturedProjectId);

      const res  = await fetch(`${API_URL}/pmx/analysis/ui-audit`, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Audit failed");

      setResult(json.data);
      persistToHistory(json.data, src, isUrl ? targetUrl : undefined, capturedProjectId);
    } catch (err: any) {
      if (!isUrl) setAuditError(err.message || "Audit failed. Please try again.");
      toast({ variant: "destructive", title: "Audit failed", description: err.message });
    } finally {
      inFlightRef.current = false;
      setRunning(false);
    }
  };

  const handleUrlSubmit = () => {
    if (activeTab !== "url") {
      runAudit();
      return;
    }

    const validated = validateAndNormalizeUrl(urlInput);
    if (!validated) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid website URL (e.g. https://yourproduct.com).",
      });
      return;
    }

    setUrlInput(validated);
    setPreviewUrl(validated);
    setAuditSrc("url");
    setResult(null);
    setAuditError(null);
    setRightTab("analysis");
    setRunning(true);

    // Queue auto-audit for this URL
    pendingAuditUrlRef.current = validated;

    // Safety fallback timer: if the iframe onReady does not fire within 2.5s
    // (e.g. due to third-party sandbox / network quirks), automatically proceed with the audit
    if (previewReadyTimeoutRef.current) {
      clearTimeout(previewReadyTimeoutRef.current);
    }
    previewReadyTimeoutRef.current = setTimeout(() => {
      if (pendingAuditUrlRef.current === validated && !inFlightRef.current) {
        runAudit(validated);
      }
    }, 2500);
  };

  const handlePreviewReady = () => {
    const pendingUrl = pendingAuditUrlRef.current;
    if (pendingUrl && pendingUrl === previewUrl && !inFlightRef.current) {
      if (previewReadyTimeoutRef.current) {
        clearTimeout(previewReadyTimeoutRef.current);
        previewReadyTimeoutRef.current = null;
      }
      runAudit(pendingUrl);
    }
  };

  const handlePreviewError = () => {
    const pendingUrl = pendingAuditUrlRef.current;
    if (pendingUrl && pendingUrl === previewUrl && !inFlightRef.current) {
      if (previewReadyTimeoutRef.current) {
        clearTimeout(previewReadyTimeoutRef.current);
        previewReadyTimeoutRef.current = null;
      }
      runAudit(pendingUrl);
    }
  };

  const handleNewAudit = () => {
    if (previewReadyTimeoutRef.current) {
      clearTimeout(previewReadyTimeoutRef.current);
      previewReadyTimeoutRef.current = null;
    }
    pendingAuditUrlRef.current = null;
    inFlightRef.current = false;
    setRunning(false);
    setResult(null);
    setPreviewUrl("");
    setUploadedImages([]);
    setAuditError(null);
    setUrlInput("");
    setEnhanceScreens([]);
    setShowEnhancePanel(false);
    setAuditProjectId(null);
    setAddedToInsights(false);
    setInsightsFailures(null);
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
      setAddedToInsights(false);
      setInsightsFailures(null);
      setEnhanceScreens([]);
      setShowEnhancePanel(false);
      // Enhancement continues the same audit — keep its already-frozen
      // projectId rather than re-reading whatever's live now.
      persistToHistory(json.data, auditSrc ?? "url", previewUrl || undefined, auditProjectId ?? projectId);
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

  const slugify = (s: string) =>
    s.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "audit";

  // Full PDF report — issueGroups/previewImages are the exact same grouping
  // and screenshot data already rendering on screen, passed straight through
  // so the PDF can't drift from what's displayed.
  const handleDownloadReport = async () => {
    if (!result) return;
    setDownloadingReport(true);
    try {
      const blob = await generateAuditPdfBlob(result.pageTitle, result.summary, result.overallScore, issueGroups, previewImages);
      const namePart = slugify(previewUrl || result.pageTitle || workspaceName(auditProjectId ?? projectId));
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${namePart}-audit-${dateStr}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "Couldn't generate the PDF report", description: "Please try again." });
    } finally {
      setDownloadingReport(false);
    }
  };

  const deleteHistoryEntry = (id: string) => {
    const updated = loadHistory().filter(e => e.id !== id);
    saveHistory(updated);
    setHistory(updated);
  };

  const clearHistory = () => { saveHistory([]); setHistory([]); };

  const restoreFromHistory = (entry: HistoryEntry) => {
    if (previewReadyTimeoutRef.current) {
      clearTimeout(previewReadyTimeoutRef.current);
      previewReadyTimeoutRef.current = null;
    }
    pendingAuditUrlRef.current = null;
    inFlightRef.current = false;
    setRunning(false);
    setResult(entry.result);
    setAddedToInsights(false);
    setInsightsFailures(null);
    setAuditSrc(entry.auditSrc);
    // Entries saved before this field existed have no projectId — treated
    // as unknown (null), not guessed.
    setAuditProjectId(entry.projectId ?? null);
    if (entry.url) { setUrlInput(entry.url); setPreviewUrl(entry.url); setActiveTab("url"); }
    setEnhanceScreens([]);
    setShowEnhancePanel(false);
    setRightTab("analysis");
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  // Whatever screenshots are actually available to show, regardless of mode:
  // client-uploaded (screenshot mode) or server-captured (URL mode, once a
  // real screenshot exists on the result — see backend uiAuditAi.ts). Used
  // by both the left-panel preview and (via IssueGroupSection) each group's
  // thumbnail, so there's one source of truth instead of a per-mode branch.
  const previewImages: UploadedScreen[] = uploadedImages.length > 0 ? uploadedImages : (result?.screenshots ?? []);

  const allCategories  = result ? [...new Set(result.issues.map(i => i.category))].sort() : [];
  const filteredIssues = result ? result.issues.filter(i =>
    (severityFilter === "all" || i.severity === severityFilter) &&
    (categoryFilter === "all" || i.category === categoryFilter)
  ) : [];
  const severityCounts = result
    ? Object.fromEntries((["critical","high","medium","low"] as const).map(s => [s, result.issues.filter(i => i.severity === s).length]))
    : null;

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topPriorityIssues = result
    ? [...result.issues].sort((a, b) => (priorityOrder[a.severity] ?? 9) - (priorityOrder[b.severity] ?? 9)).slice(0, 4)
    : [];

  // One group per screenshotIndex (ascending), plus a "General / Cross-screen"
  // group for screenshotIndex: null pinned first — never guessed into a
  // per-screenshot group. Built from filteredIssues, so the severity/category
  // filters are scoped within each group: a group with nothing left after
  // filtering just doesn't render.
  const issueGroups: IssueGroup[] = (() => {
    const bySrc = new Map<number | null, UIIssue[]>();
    for (const issue of filteredIssues) {
      const key = issue.screenshotIndex;
      if (!bySrc.has(key)) bySrc.set(key, []);
      bySrc.get(key)!.push(issue);
    }
    const groups: IssueGroup[] = [];
    if (bySrc.has(null)) groups.push({ key: "general", screenshotIndex: null, issues: bySrc.get(null)! });
    const numericKeys = [...bySrc.keys()].filter((k): k is number => k !== null).sort((a, b) => a - b);
    for (const idx of numericKeys) groups.push({ key: `screenshot-${idx}`, screenshotIndex: idx, issues: bySrc.get(idx)! });
    return groups;
  })();

  const leftWidth  = panelState === "left-collapsed"  ? "w-0 opacity-0 pointer-events-none"
                   : panelState === "right-collapsed" ? "flex-1" : "w-1/2";
  const rightWidth = panelState === "right-collapsed" ? "w-0 opacity-0 pointer-events-none"
                   : panelState === "left-collapsed"  ? "flex-1" : "w-1/2";

  // `result` alone also counts: restoring a screenshot-sourced history entry
  // from the hero page has a result but no stored image (history only keeps
  // the audit result, not the original screenshot) — it should still land in
  // the split workspace rather than silently doing nothing.
  //
  // Screenshot mode deliberately does NOT include `uploadedImages.length > 0`
  // here — unlike URL mode (where `previewUrl` is set as soon as you commit
  // a URL), queuing screenshots is a multi-step process (add up to
  // MAX_SCREENSHOTS, remove, add more) that should stay on the hero card's
  // thumbnail strip until the audit actually starts. `running` and
  // `auditError` cover that: they flip true the moment the screenshot-mode
  // submit button is actually clicked (and `auditError` keeps a failed
  // screenshot attempt in the split view showing its inline error, instead
  // of bouncing back to the hero card).
  const showSplit = !!(previewUrl || running || result || auditError);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" onPaste={handlePaste}>

      {/* ── Workspace-mismatch confirmation ──────────────────────────────── */}
      <AnimatePresence>
        {showProjectMismatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Different workspace active</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    This audit was run under <span className="font-semibold text-foreground">{workspaceName(auditProjectId)}</span> but
                    you're currently viewing <span className="font-semibold text-foreground">{workspaceName(projectId)}</span> — save
                    to {workspaceName(auditProjectId)} anyway?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowProjectMismatch(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={() => { setShowProjectMismatch(false); performAddToInsights(); }}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-semibold transition-colors">
                  Save to {workspaceName(auditProjectId)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COMPACT TOP BAR (shown only when in workspace) ─────────────────── */}
      {showSplit && (
        <div className="shrink-0 px-4 py-2 flex items-center gap-2 border-b border-border/50 bg-background">
          <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          <input type="url" placeholder="https://yourproduct.com"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUrlSubmit()}
            className="flex-1 bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleNewAudit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> New Audit
          </button>
          <button onClick={() => runAudit()} disabled={running || (activeTab === "url" ? !urlInput.trim() : uploadedImages.length === 0)}
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
          <div className={`relative flex flex-col border-r border-border/50 bg-card overflow-hidden transition-all duration-300 ease-in-out ${leftWidth}`}>
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-sky-400" /> {previewUrl ? "Live Preview" : previewImages.length > 1 ? "Screenshots" : "Screenshot"}
              </span>
              <div className="flex items-center gap-1">
                {panelState === "right-collapsed" && (
                  <button onClick={expandBoth}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <PanelRightOpen className="h-3 w-3" /> Expand Analysis
                  </button>
                )}
                {panelState === "both" && (
                  <button onClick={collapseLeft}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <PanelLeftClose className="h-3 w-3" /> Collapse
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {previewUrl
                ? <WebsiteViewer url={previewUrl} onReady={handlePreviewReady} onError={handlePreviewError} />
                : previewImages.length > 0
                  ? (
                    <div className="h-full overflow-y-auto p-4 space-y-3">
                      {previewImages.map((img, i) => (
                        <div key={i}>
                          <img src={img.dataUrl} alt={img.label} className="w-full rounded-lg border border-border" />
                          <p className="text-[10px] text-muted-foreground mt-1 text-center truncate">{img.label}</p>
                        </div>
                      ))}
                    </div>
                  )
                  : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
                      <ImagePlus className="h-6 w-6 text-border" />
                      <p className="text-[11px] text-muted-foreground">No preview stored for this audit</p>
                    </div>
                  )}
            </div>
          </div>

          {panelState === "both" && <div className="shrink-0 w-px bg-border/50" />}

          {/* RIGHT: AI analysis + history */}
          <div className={`relative flex flex-col bg-background overflow-hidden transition-all duration-300 ease-in-out ${rightWidth}`}>

            {/* Panel header with tab switcher */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card">
              {/* Left: tabs */}
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
                <button onClick={() => setRightTab("analysis")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    rightTab === "analysis" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-sky-400" /> Analysis
                  {result && <span className={`ml-1 font-mono ${scoreColor(result.overallScore)}`}>{result.overallScore}</span>}
                </button>
                <button onClick={() => setRightTab("history")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    rightTab === "history" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
                  }`}
                >
                  <History className="h-3 w-3" /> History
                  {history.length > 0 && (
                    <span className="ml-1 text-[9px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{history.length}</span>
                  )}
                </button>
              </div>

              {/* Right: panel controls */}
              <div className="flex items-center gap-1">
                {panelState === "left-collapsed" && (
                  <button onClick={expandBoth}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <PanelLeftOpen className="h-3 w-3" /> Expand Website
                  </button>
                )}
                {panelState === "both" && (
                  <button onClick={collapseRight}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <PanelRightClose className="h-3 w-3" /> Collapse
                  </button>
                )}
                {result && rightTab === "analysis" && (
                  <button onClick={() => handleExport()}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Export Markdown">
                    <Download className="h-3 w-3" />
                  </button>
                )}
                {result && rightTab === "analysis" && (
                  <button onClick={handleDownloadReport} disabled={downloadingReport}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" title="Download Report (PDF)">
                    {downloadingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
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
                    <p className="text-xs text-muted-foreground">
                      {auditSrc === "screenshot"
                        ? `Analyzing ${uploadedImages.length} screenshot${uploadedImages.length !== 1 ? "s" : ""}...`
                        : "Running UI intelligence scan..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 max-w-xs leading-relaxed">
                      {auditSrc === "screenshot"
                        ? "Analyzing screenshot structure and labels, not full visual detail — for full visual analysis, use a live URL instead."
                        : "Detecting visual hierarchy, spacing, contrast, CTA, and usability issues."}
                    </p>
                  </div>
                )}

                {/* Error (screenshot mode only — URL mode still relies on its toast) */}
                {!running && !result && auditError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-xs text-red-400 font-semibold">Audit failed</p>
                    <p className="text-[11px] text-muted-foreground/70 max-w-xs leading-relaxed">{auditError}</p>
                    <button onClick={runAudit} disabled={uploadedImages.length === 0}
                      className="mt-1 flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-black transition-all"
                    >
                      <RefreshCw className="h-3 w-3" /> Try Again
                    </button>
                  </div>
                )}

                {/* Empty */}
                {!running && !result && !auditError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                    <Sparkles className="h-8 w-8 text-border" />
                    <p className="text-xs text-muted-foreground font-semibold">No analysis yet</p>
                    <p className="text-[11px] text-muted-foreground/70 max-w-xs leading-relaxed">Click Audit UI to begin.</p>
                  </div>
                )}

                {/* Results */}
                {result && !running && (
                  <div className="p-5 sm:p-6 space-y-6 max-w-3xl">

                    {/* ── 1. REPORT HEADER & SCORE ─────────────────────────── */}
                    <div className="space-y-4 pb-6 border-b border-border/40">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <Sparkles className="h-3 w-3 text-sky-400" />
                          <span>UX Audit Report</span>
                          <span>·</span>
                          <span className="text-foreground font-mono lowercase truncate max-w-[200px] sm:max-w-sm">
                            {previewUrl || result.pageTitle}
                          </span>
                        </div>
                        {auditSrc === "screenshot" && (
                          <span className="text-[10px] font-semibold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded shrink-0">
                            Multi-screen
                          </span>
                        )}
                      </div>

                      {/* Score & Verdict */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                            {result.overallScore}
                          </span>
                          <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border border-border/60 ${scoreColor(result.overallScore)}`}>
                            {scoreLabel(result.overallScore)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                          {result.overallScore >= 80
                            ? "The interface demonstrates a strong user experience foundation with high consistency and minimal friction."
                            : result.overallScore >= 60
                            ? "The interface is functional but contains noticeable UX friction, hierarchy gaps, and inconsistent patterns."
                            : "Significant usability barriers, unclear visual hierarchy, and friction points require immediate remediation."}
                        </p>
                      </div>

                      {/* Severity breakdown inline */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                        <span className="font-semibold text-foreground">{result.issues.length} findings</span>
                        <span>·</span>
                        {(["critical", "high", "medium", "low"] as const).map(s => {
                          const count = severityCounts?.[s] || 0;
                          if (!count) return null;
                          const meta = SEVERITY_META[s];
                          return (
                            <span key={s} className="flex items-center gap-1.5 text-[11px]">
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              <span className="font-medium text-foreground">{count}</span>
                              <span className="capitalize">{s}</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Action CTA */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={addToInsights}
                          disabled={addingToInsights || addedToInsights}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-black transition-all shadow-sm"
                        >
                          {addingToInsights ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding to Insights…</>
                          ) : addedToInsights ? (
                            insightsFailures?.length ? (
                              <><AlertCircle className="h-3.5 w-3.5" /> Partially Added ({insightsFailures.length} failed)</>
                            ) : (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Added to Insights</>
                            )
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5" /> Approve & Add to Insights</>
                          )}
                        </button>
                      </div>

                      {/* Per-issue save failures banner */}
                      {insightsFailures && insightsFailures.length > 0 && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2 mt-2">
                          <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" /> {insightsFailures.length} issue{insightsFailures.length !== 1 ? "s" : ""} couldn't be saved
                          </p>
                          <ul className="space-y-1">
                            {insightsFailures.map(f => {
                              const failedIssue = result.issues.find(i => i.id === f.issueId);
                              return (
                                <li key={f.issueId} className="text-[10px] text-muted-foreground leading-relaxed">
                                  <span className="text-foreground font-medium">{failedIssue?.title || f.issueId}</span> — {f.error}
                                </li>
                              );
                            })}
                          </ul>
                          <button onClick={retryFailedInsights} disabled={addingToInsights}
                            className="flex items-center gap-1.5 rounded-md bg-red-500 hover:bg-red-400 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-white transition-all"
                          >
                            {addingToInsights ? <><Loader2 className="h-3 w-3 animate-spin" /> Retrying…</> : <><RefreshCw className="h-3 w-3" /> Retry Failed Only</>}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── 2. EXECUTIVE SUMMARY ──────────────────────────────── */}
                    <section className="space-y-2 pb-6 border-b border-border/40">
                      <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Executive Summary
                      </h2>
                      <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                        {result.summary}
                      </p>
                    </section>

                    {/* ── 3. WHAT TO FIX FIRST ──────────────────────────────── */}
                    {topPriorityIssues.length > 0 && (
                      <section className="space-y-3 pb-6 border-b border-border/40">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          What to Fix First
                        </h2>
                        <ol className="space-y-2">
                          {topPriorityIssues.map((issue, i) => (
                            <li key={issue.id} className="flex items-start gap-2.5 text-xs leading-relaxed">
                              <span className="font-mono text-[11px] font-bold text-muted-foreground/70 shrink-0 mt-0.5">
                                {i + 1}.
                              </span>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground">{issue.title}</span>
                                <span className="text-muted-foreground ml-1.5 text-[11px]">
                                  — {issue.change}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {/* ── 4. DETAILED FINDINGS ──────────────────────────────── */}
                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-3 pb-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Findings ({filteredIssues.length})
                          </h2>
                          <button
                            onClick={toggleAllIssues}
                            className="text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
                          >
                            {expandedIssueIds.size === filteredIssues.length ? "Collapse all" : "Expand all"}
                          </button>
                        </div>

                        {/* Filter controls */}
                        <div className="flex items-center gap-2">
                          <select
                            value={severityFilter}
                            onChange={e => setSeverityFilter(e.target.value)}
                            className="bg-muted/30 border border-border/50 rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none hover:bg-muted/50 transition-colors"
                          >
                            <option value="all">All Severities</option>
                            {(["critical","high","medium","low"] as const).map(s => (
                              <option key={s} value={s}>{SEVERITY_META[s].label}</option>
                            ))}
                          </select>
                          <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="bg-muted/30 border border-border/50 rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none hover:bg-muted/50 transition-colors"
                          >
                            <option value="all">All Categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Findings list */}
                      <div className="space-y-4">
                        {issueGroups.map(group => {
                          const isGeneral = group.screenshotIndex === null;
                          const thumbnail = group.screenshotIndex !== null ? previewImages[group.screenshotIndex] : undefined;
                          const heading = isGeneral
                            ? "General / Cross-screen"
                            : thumbnail?.label || group.issues[0]?.screen || `Screenshot ${group.screenshotIndex! + 1}`;

                          return (
                            <div key={group.key} className="space-y-1">
                              {issueGroups.length > 1 && (
                                <div className="flex items-center gap-2 pt-3 pb-1.5 border-b border-border/40">
                                  {thumbnail && (
                                    <img src={thumbnail.dataUrl} alt={heading} className="h-6 w-8 object-cover rounded border border-border shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-foreground truncate">{heading}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">({group.issues.length})</span>
                                </div>
                              )}
                              <div className="divide-y divide-border/20">
                                {group.issues.map((issue, i) => {
                                  const globalIdx = result.issues.findIndex(item => item.id === issue.id);
                                  const displayIdx = globalIdx >= 0 ? globalIdx : i;
                                  return (
                                    <FindingItem
                                      key={issue.id}
                                      issue={issue}
                                      index={displayIdx}
                                      open={expandedIssueIds.has(issue.id)}
                                      onToggle={() => toggleIssue(issue.id)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {filteredIssues.length === 0 && (
                          <p className="text-center py-8 text-muted-foreground italic text-xs">No findings match the selected filters.</p>
                        )}
                      </div>
                    </section>

                    {/* ── 5. DEEPER REVIEW (SCREENSHOTS ENHANCEMENT) ─────────── */}
                    <section className="pt-6 border-t border-border/40 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xs font-semibold text-foreground">Want a deeper multi-screen review?</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            Upload screenshots of key user flows (e.g. Dashboard, Settings, Checkout) to extend this review across multiple views.
                          </p>
                        </div>
                        {!showEnhancePanel && (
                          <button
                            onClick={() => setShowEnhancePanel(true)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-foreground/30 hover:bg-muted/40 text-xs font-semibold text-foreground transition-all"
                          >
                            <Plus className="h-3.5 w-3.5 text-sky-400" />
                            Add Screenshots
                          </button>
                        )}
                      </div>

                      {showEnhancePanel && (
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3 mt-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <ImagePlus className="h-3.5 w-3.5 text-sky-400" /> Add Screenshots
                            </p>
                            <button onClick={() => setShowEnhancePanel(false)} className="text-muted-foreground hover:text-foreground/70 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {enhanceScreens.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {enhanceScreens.map((s, i) => (
                                <div key={i} className="relative group">
                                  <img src={s.dataUrl} alt={s.label} className="h-14 w-20 object-cover rounded-lg border border-border" />
                                  <button onClick={() => setEnhanceScreens(prev => prev.filter((_,idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted hover:bg-red-500 text-muted-foreground hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 text-center truncate max-w-[80px]">{s.label}</p>
                                </div>
                              ))}
                              <button onClick={() => enhanceFileRef.current?.click()}
                                className="h-14 w-20 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground/70 transition-colors">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div onClick={() => enhanceFileRef.current?.click()}
                              className="border-2 border-dashed border-border hover:border-foreground/30 rounded-xl p-5 text-center cursor-pointer transition-all">
                              <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                              <p className="text-[11px] text-muted-foreground font-semibold">Click to add or paste (Ctrl+V)</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Dashboard, Settings, Checkout, Profile, etc.</p>
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
                    </section>

                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ───────────────────────────────────────────── */}
            {rightTab === "history" && (
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-4 space-y-3">

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {history.length} saved audit{history.length !== 1 ? "s" : ""}
                  </p>
                  {history.length > 0 && (
                    <button onClick={clearHistory}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>

                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <History className="h-8 w-8 text-border" />
                    <p className="text-xs text-muted-foreground font-semibold">No history yet</p>
                    <p className="text-[10px] text-muted-foreground/70 max-w-xs">Completed audits are saved here automatically.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id}
                      className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <span className={`shrink-0 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 ${scoreColor(entry.overallScore)}`}>
                          {entry.overallScore}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate">{entry.pageTitle}</p>
                          <p className="text-[9px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-2.5 w-2.5" /> {fmtDate(entry.createdAt)}
                            <span>·</span> {entry.issueCount} issues
                            <span>·</span> {entry.auditSrc === "url" ? "URL" : "Screenshot"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => restoreFromHistory(entry)}
                            className="px-2 py-1 rounded-lg bg-muted hover:bg-sky-500 hover:text-black text-[10px] text-muted-foreground font-semibold transition-all"
                          >
                            Load
                          </button>
                          <button onClick={() => handleExport(entry.result)}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Export">
                            <Download className="h-3 w-3" />
                          </button>
                          <button onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
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
                  onKeyDown={e => e.key === "Enter" && handleUrlSubmit()}
                  className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              ) : (
                <div className="px-5 pt-4 pb-2">
                  {uploadedImages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img.dataUrl} alt={img.label} className="h-14 w-20 object-cover rounded-lg border border-border" />
                          <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted hover:bg-red-500 text-muted-foreground hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <X className="h-2.5 w-2.5" />
                          </button>
                          <p className="text-[8px] text-muted-foreground mt-0.5 text-center truncate max-w-[80px]">{img.label}</p>
                        </div>
                      ))}
                      {uploadedImages.length < MAX_SCREENSHOTS && (
                        <button onClick={() => fileRef.current?.click()}
                          className="h-14 w-20 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground/70 transition-colors">
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Click to upload screenshots — PNG, JPG, WEBP
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleInitialFileSelect} className="hidden" />
                  <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground/70 leading-relaxed">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />
                    {uploadedImages.length > 0
                      ? `${uploadedImages.length}/${MAX_SCREENSHOTS} screenshots. Analyzes structure and labels, not full visual detail — for full visual analysis, use a live URL instead.`
                      : "Currently analyzes screenshot structure and labels, not full visual detail — for full visual analysis, use a live URL instead."}
                  </p>
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
                  onClick={handleUrlSubmit}
                  disabled={running || (activeTab === "url" ? !urlInput.trim() : uploadedImages.length === 0)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {running
                    ? <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    : <ArrowRight className="h-4 w-4 text-black" />}
                </button>
              </div>
            </motion.div>

            {/* Recent audits — jump back into a past result without re-entering a URL */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="w-full mt-6 text-left"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recent Audits</p>
                  <span className="text-[10px] text-muted-foreground">{history.length} saved</span>
                </div>
                <div className="space-y-1.5">
                  {history.slice(0, 4).map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => restoreFromHistory(entry)}
                      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-muted/40 p-3 text-left transition-all"
                    >
                      <span className={`shrink-0 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 ${scoreColor(entry.overallScore)}`}>
                        {entry.overallScore}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{entry.pageTitle}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-2.5 w-2.5" /> {fmtDate(entry.createdAt)}
                          <span>·</span> {entry.issueCount} issues
                          <span>·</span> {entry.auditSrc === "url" ? "URL" : "Screenshot"}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Standalone route (`/pmx/analysis`) — just the workspace above, full height.
export default function PmxAnalysis() {
  return <UiAuditWorkspace />;
}
