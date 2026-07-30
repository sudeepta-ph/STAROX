import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Link2, Github, FileText, MessageSquare, Upload, Search,
  RefreshCw, Trash2, ExternalLink, ChevronRight, Sparkles,
  Activity, BarChart3, Plug, FolderOpen, GitBranch, LayoutGrid, ArrowUp,
  Lock, LogOut, ArrowRight, AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

// Metadata for every source type this workspace has ever been able to
// create — including legacy third-party connector types (GitHub, GitLab,
// analytics/support tools) that used to be creatable from this page and
// now only live on the global /connectors page. Kept here so existing
// sources of those types still render with the right icon/label/color.
const CONNECTOR_TYPES = [
  { group: "Website & Code", items: [
    { id: "url",      label: "Website",   icon: Link2,      color: "text-sky-400",    bg: "bg-sky-500/10",     border: "border-sky-500/20" },
    { id: "repo",     label: "GitHub",    icon: Github,     color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { id: "gitlab",   label: "GitLab",    icon: GitBranch,  color: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  ]},
  { group: "Analytics", items: [
    { id: "analytics",label: "Google Analytics", icon: BarChart3, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { id: "mixpanel", label: "Mixpanel",  icon: Activity,   color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { id: "posthog",  label: "PostHog",  icon: Activity,   color: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  ]},
  { group: "Support & Feedback", items: [
    { id: "support",  label: "Intercom",  icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { id: "zendesk",  label: "Zendesk",   icon: MessageSquare, color: "text-teal-400",  bg: "bg-teal-500/10",  border: "border-teal-500/20" },
    { id: "interview",label: "Interview Notes", icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  ]},
  { group: "Documents & Data", items: [
    { id: "csv",      label: "CSV / Excel", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { id: "text",     label: "PDF / Doc",   icon: FolderOpen, color: "text-zinc-400",  bg: "bg-zinc-500/10",   border: "border-zinc-500/20" },
    { id: "report",   label: "Report",      icon: LayoutGrid, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  ]},
];

const HERO_QUICK_TYPES = [
  { id: "url",    label: "Website", icon: Link2 },
  { id: "csv",    label: "CSV",     icon: FileText },
  { id: "text",   label: "PDF",     icon: FolderOpen },
  { id: "report", label: "Report",  icon: LayoutGrid },
];

const URL_HINTS = [
  "Enter a website URL...",
  "https://yourproduct.com",
  "Paste a docs or blog URL...",
  "Or drop a CSV, PDF, or doc here...",
];

function getConnectorMeta(type: string) {
  for (const group of CONNECTOR_TYPES) {
    const found = group.items.find(i => i.id === type);
    if (found) return found;
  }
  return { id: type, label: type, icon: Upload, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };
}

function inferFileType(filename: string): "csv" | "text" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["csv", "xlsx", "xls"].includes(ext) ? "csv" : "text";
}

interface GithubRepo {
  id: number;
  fullName: string;
  name: string;
  url: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updatedAt: string;
}

export default function PmxSources() {
  const { inputs, fetchInputs, runPipeline, loading, selectedSourceIds, setSelectedSourceIds } = usePmxStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInput, setSelectedInput] = useState<any>(null);
  const [pipelinePhase, setPipelinePhase] = useState<"idle"|"queued"|"processing"|"analyzing"|"completed"|"failed">("idle");
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  // Add Connector panel (GitHub OAuth + link to full catalog)
  const [connectorPanelOpen, setConnectorPanelOpen] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; login?: string; avatarUrl?: string } | null>(null);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubSearch, setGithubSearch] = useState("");
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Hero quick-add bar (URL type / drag & drop)
  const [heroUrl, setHeroUrl] = useState("");
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const heroUrlInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Report quick-add (only remaining type without a native URL/file path)
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    let t1: any, t2: any;
    const onStart = () => { setPipelinePhase("queued"); t1 = setTimeout(() => setPipelinePhase("processing"), 2500); t2 = setTimeout(() => setPipelinePhase("analyzing"), 8000); };
    const onDone  = () => { clearTimeout(t1); clearTimeout(t2); setPipelinePhase("completed"); setTimeout(() => setPipelinePhase("idle"), 5000); };
    const onFail  = () => { clearTimeout(t1); clearTimeout(t2); setPipelinePhase("failed");    setTimeout(() => setPipelinePhase("idle"), 5000); };
    window.addEventListener("pmx-pipeline-started",   onStart);
    window.addEventListener("pmx-pipeline-completed", onDone);
    window.addEventListener("pmx-pipeline-failed",    onFail);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("pmx-pipeline-started",onStart); window.removeEventListener("pmx-pipeline-completed",onDone); window.removeEventListener("pmx-pipeline-failed",onFail); };
  }, []);

  // ── Hero URL bar: typewriter placeholder ─────────────────────────────
  const hasHeroInput = heroUrl.length > 0;
  useEffect(() => {
    if (hasHeroInput || dragActive) { setTypewriterText(""); return; }
    let phraseIndex = 0, charIndex = 0, deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const TYPE_MS = 45, DELETE_MS = 25, HOLD_MS = 1400, PAUSE_MS = 400;
    const tick = () => {
      const phrase = URL_HINTS[phraseIndex];
      if (!deleting) {
        charIndex++;
        setTypewriterText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) { deleting = true; timeoutId = setTimeout(tick, HOLD_MS); return; }
        timeoutId = setTimeout(tick, TYPE_MS);
      } else {
        charIndex--;
        setTypewriterText(phrase.slice(0, charIndex));
        if (charIndex === 0) { deleting = false; phraseIndex = (phraseIndex + 1) % URL_HINTS.length; timeoutId = setTimeout(tick, PAUSE_MS); return; }
        timeoutId = setTimeout(tick, DELETE_MS);
      }
    };
    timeoutId = setTimeout(tick, 300);
    return () => clearTimeout(timeoutId);
  }, [hasHeroInput, dragActive]);

  // ── Shared create-source call ─────────────────────────────────────────
  const createSource = async (payload: { name: string; type: string; url?: string; content?: string }) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs`, { method: "POST", headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Source added", description: `"${payload.name}" is now syncing.` });
        fetchInputs();
        return true;
      }
      toast({ variant: "destructive", title: "Error", description: json.error || "Failed to add source." });
      return false;
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to add source." });
      return false;
    }
  };

  // ── GitHub OAuth (Add Connector panel) ──────────────────────────────
  const fetchGithubStatus = async () => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/github/status`, { headers });
      const json = await res.json();
      if (json.success) setGithubStatus({ connected: json.connected, login: json.login, avatarUrl: json.avatarUrl });
    } catch { /* silent — surfaced via connect button retry */ }
  };

  const fetchGithubRepos = async (search = "") => {
    setGithubReposLoading(true);
    setGithubError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/github/repos?search=${encodeURIComponent(search)}`, { headers });
      const json = await res.json();
      if (json.success) setGithubRepos(json.data);
      else setGithubError(json.error || "Failed to load repositories");
    } catch { setGithubError("Failed to load repositories"); }
    finally { setGithubReposLoading(false); }
  };

  useEffect(() => {
    if (connectorPanelOpen && githubStatus === null) fetchGithubStatus();
  }, [connectorPanelOpen, githubStatus]);

  useEffect(() => {
    if (connectorPanelOpen && githubStatus?.connected) {
      const t = setTimeout(() => fetchGithubRepos(githubSearch), 300);
      return () => clearTimeout(t);
    }
  }, [connectorPanelOpen, githubStatus?.connected, githubSearch]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source !== "starox-github-oauth") return;
      setGithubConnecting(false);
      if (e.data.success) {
        toast({ title: "GitHub connected" });
        fetchGithubStatus();
      } else {
        setGithubError(e.data.error || "GitHub connection failed");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connectGithub = async () => {
    setGithubConnecting(true);
    setGithubError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/github/auth-url`, { headers });
      const json = await res.json();
      if (!json.success) { setGithubError(json.error || "GitHub OAuth is not configured"); setGithubConnecting(false); return; }
      const popup = window.open(json.url, "github-oauth", "width=600,height=720");
      if (!popup) { setGithubError("Popup blocked — allow popups and try again"); setGithubConnecting(false); }
    } catch { setGithubError("Failed to start GitHub sign-in"); setGithubConnecting(false); }
  };

  const disconnectGithub = async () => {
    try {
      const headers = await getPmxHeaders();
      await fetch(`${API_URL}/pmx/github/disconnect`, { method: "DELETE", headers });
      setGithubStatus({ connected: false });
      setGithubRepos([]);
    } catch { /* no-op */ }
  };

  const selectRepo = async (repo: GithubRepo) => {
    setConnectingRepoId(repo.id);
    const ok = await createSource({ name: repo.fullName, type: "repo", url: repo.url });
    setConnectingRepoId(null);
    if (ok) setConnectorPanelOpen(false);
  };

  const submitUrl = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let hostname = trimmed;
    try { hostname = new URL(fullUrl).hostname; } catch { /* keep raw input as name fallback */ }

    setHeroSubmitting(true);
    const ok = await createSource({ name: hostname, type: "url", url: fullUrl });
    setHeroSubmitting(false);
    if (ok) setHeroUrl("");
  };

  const handleFilePick = (file: File, forcedType?: "csv" | "text") => {
    const type = forcedType || inferFileType(file.name);
    setHeroSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = (ev.target?.result as string) || "";
      const name = file.name.replace(/\.[^.]+$/, "");
      await createSource({ name, type, content });
      setHeroSubmitting(false);
    };
    reader.onerror = () => setHeroSubmitting(false);
    reader.readAsText(file);
  };

  const handleQuickAddUrl = (e: React.FormEvent) => { e.preventDefault(); submitUrl(heroUrl); };

  const handleQuickIconClick = (id: string) => {
    if (id === "url")    { heroUrlInputRef.current?.focus(); return; }
    if (id === "csv")    { csvInputRef.current?.click(); return; }
    if (id === "text")   { docInputRef.current?.click(); return; }
    if (id === "report") { setReportFormOpen(true); return; }
  };

  const handleHeroDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleHeroDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const handleHeroDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) { handleFilePick(files[0]); return; }
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (text) submitUrl(text);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) return;
    setReportSubmitting(true);
    const ok = await createSource({ name: reportName, type: "report", content: reportContent });
    setReportSubmitting(false);
    if (ok) { setReportFormOpen(false); setReportName(""); setReportContent(""); }
  };

  const filteredInputs = inputs.filter(i => {
    const q = searchQuery.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.summary && i.summary.toLowerCase().includes(q));
  });

  const handleCheckboxClick = (index: number, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && lastCheckedIndex !== null) {
      const start = Math.min(lastCheckedIndex, index), end = Math.max(lastCheckedIndex, index);
      const rangeIds = filteredInputs.slice(start, end + 1).map(i => i._id);
      const checked = selectedSourceIds.includes(id);
      const next = checked ? selectedSourceIds.filter(x => !rangeIds.includes(x)) : [...new Set([...selectedSourceIds, ...rangeIds])];
      setSelectedSourceIds(next);
    } else {
      setSelectedSourceIds(selectedSourceIds.includes(id) ? selectedSourceIds.filter(x => x !== id) : [...selectedSourceIds, id]);
    }
    setLastCheckedIndex(index);
  };

  const handleDelete = async (id: string, inputName: string) => {
    if (!confirm(`Remove "${inputName}"?`)) return;
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/inputs/${id}`, { method: "DELETE", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Removed", description: `"${inputName}" disconnected.` }); setSelectedInput(null); fetchInputs(); }
  };

  const handleReprocess = async (id: string, inputName: string) => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/inputs/${id}/reprocess`, { method: "POST", headers });
    const json = await res.json();
    if (json.success) { toast({ title: "Reprocessed", description: `Signals updated for "${inputName}".` }); fetchInputs(); if (selectedInput?._id === id) setSelectedInput(json.data); }
  };

  const statusBadge = (input: any) => {
    if (pipelinePhase === "idle") return null;
    if (!selectedSourceIds.includes(input._id)) return <span className="text-[9px] font-semibold px-2 py-0.5 rounded border bg-card border-border text-muted-foreground">Skipped</span>;
    const map: Record<string, string> = { queued: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse", processing: "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse", analyzing: "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse", completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", failed: "bg-red-500/10 border-red-500/20 text-red-400" };
    const labels: Record<string, string> = { queued: "Queued", processing: "Processing", analyzing: "Analyzing", completed: "Done", failed: "Failed" };
    return <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${map[pipelinePhase]}`}>{labels[pipelinePhase]}</span>;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* LEFT: Source List */}
      <div className="flex-1 flex flex-col border-r border-border/50 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-card/20">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search sources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-ring rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setConnectorPanelOpen(o => !o)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${connectorPanelOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-muted text-foreground"}`}>
            <Plug className="h-3.5 w-3.5" /> Add Connector
          </button>
        </div>

        {/* Selection bar */}
        {inputs.length > 0 && (
          <div className="px-4 py-2 border-b border-border/40 bg-card/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{selectedSourceIds.length} of {filteredInputs.length} selected</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedSourceIds(filteredInputs.map(i => i._id))} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Select All</button>
              <span className="text-border text-xs">|</span>
              <button onClick={() => setSelectedSourceIds([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Clear</button>
            </div>
          </div>
        )}

        {/* Source cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">

          {/* Add Connector panel — GitHub OAuth + link to the full catalog */}
          {connectorPanelOpen && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 mb-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Github className="h-4 w-4 text-primary" /> Connect GitHub</h3>
                <button onClick={() => setConnectorPanelOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>

              {githubError && (
                <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-[10px] text-destructive mb-3">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{githubError}</span>
                </div>
              )}

              {!githubStatus?.connected ? (
                <button type="button" onClick={connectGithub} disabled={githubConnecting}
                  className="w-full max-w-sm flex items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2.5 text-xs font-semibold text-foreground transition-all disabled:opacity-60">
                  {githubConnecting
                    ? <div className="h-3.5 w-3.5 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin" />
                    : <Github className="h-3.5 w-3.5" />}
                  {githubConnecting ? "Waiting for GitHub sign-in…" : "Sign in with GitHub"}
                </button>
              ) : (
                <div className="max-w-sm space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-2.5 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {githubStatus.avatarUrl
                        ? <img src={githubStatus.avatarUrl} alt="" className="h-5 w-5 rounded-full shrink-0" />
                        : <Github className="h-4 w-4 shrink-0" />}
                      <span className="text-[11px] font-medium text-foreground truncate">{githubStatus.login}</span>
                    </div>
                    <button type="button" onClick={disconnectGithub}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <LogOut className="h-3 w-3" /> Disconnect
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="text" value={githubSearch} onChange={e => setGithubSearch(e.target.value)} placeholder="Search your repositories..."
                      className="w-full bg-background border border-border focus:border-ring rounded-lg pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none" />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-lg border border-border/40 p-1.5 bg-background/40">
                    {githubReposLoading && (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <div className="h-4 w-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                      </div>
                    )}
                    {!githubReposLoading && githubRepos.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-6">No repositories found.</p>
                    )}
                    {!githubReposLoading && githubRepos.map(repo => (
                      <button key={repo.id} type="button" onClick={() => selectRepo(repo)} disabled={connectingRepoId === repo.id}
                        className="w-full text-left rounded-lg border border-transparent px-2.5 py-2 hover:bg-muted transition-all disabled:opacity-60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-foreground truncate">{repo.fullName}</span>
                          {repo.private && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                          {connectingRepoId === repo.id && <div className="h-2.5 w-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
                        </div>
                        {repo.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Need something else?</span>
                <button onClick={() => navigate("/connectors")} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Browse all connectors <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Hero quick-add bar — persistent, doubles as a dropzone */}
          <div
            onDragOver={handleHeroDragOver}
            onDragEnter={handleHeroDragOver}
            onDragLeave={handleHeroDragLeave}
            onDrop={handleHeroDrop}
            className={`rounded-2xl border p-5 mb-3 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-card/40"}`}
          >
            {inputs.length === 0 && (
              <div className="space-y-1 mb-4 text-center">
                <h2 className="text-xl font-bold text-foreground">What powers your product intelligence?</h2>
                <p className="text-xs text-muted-foreground">Paste a URL, drop a file, or upload data to start analysis.</p>
              </div>
            )}

            <form onSubmit={handleQuickAddUrl}>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 focus-within:border-primary/50 transition-colors">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={heroUrlInputRef}
                  type="text"
                  value={heroUrl}
                  onChange={e => setHeroUrl(e.target.value)}
                  placeholder={dragActive ? "Drop a file or link to add it..." : typewriterText}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                />
                <button type="submit" disabled={!heroUrl.trim() || heroSubmitting}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-40 shrink-0">
                  {heroSubmitting
                    ? <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </form>

            <p className="text-center text-[10px] text-muted-foreground/60 mt-2">or drag & drop a CSV, PDF, or doc anywhere in this box</p>

            <div className="flex items-center justify-center gap-4 mt-4">
              {HERO_QUICK_TYPES.map(qt => {
                const Ico = qt.icon;
                return (
                  <button key={qt.id} type="button" onClick={() => handleQuickIconClick(qt.id)}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-card group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                      <Ico className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{qt.label}</span>
                  </button>
                );
              })}
            </div>

            <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f, "csv"); e.target.value = ""; }} />
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f, "text"); e.target.value = ""; }} />
          </div>

          {/* Report quick-add form */}
          {reportFormOpen && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 mb-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Add a report</h3>
                <button onClick={() => { setReportFormOpen(false); setReportName(""); setReportContent(""); }} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleReportSubmit} className="max-w-sm space-y-3">
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Name</label>
                  <input required type="text" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="e.g. Q3 Board Report"
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Paste Content</label>
                  <textarea rows={6} value={reportContent} onChange={e => setReportContent(e.target.value)} placeholder="Paste report text..."
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none font-mono" /></div>
                <button type="submit" disabled={reportSubmitting || !reportName.trim()} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {reportSubmitting ? <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><Sparkles className="h-3.5 w-3.5" /><span>Add Report</span></>}
                </button>
              </form>
            </div>
          )}

          {inputs.length > 0 && filteredInputs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Plug className="h-8 w-8 text-border" />
              <p className="text-xs">No sources match your search.</p>
            </div>
          )}
          {filteredInputs.map((input, index) => {
            const meta = getConnectorMeta(input.type);
            const Icon = meta.icon;
            const isChecked = selectedSourceIds.includes(input._id);
            const isSelected = selectedInput?._id === input._id;
            return (
              <motion.div key={input._id} layout onClick={() => setSelectedInput(input)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${isChecked ? "bg-card border-primary/30 shadow-[0_0_12px_rgba(56,189,248,0.07)]" : isSelected ? "bg-card/80 border-border" : "bg-card/30 border-border/50 hover:border-border"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isChecked} onClick={e => handleCheckboxClick(index, input._id, e)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg} border ${meta.border} shrink-0`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-foreground truncate">{input.name}</h4>
                      <span className={`text-[9px] uppercase font-mono ${meta.color} ${meta.bg} border ${meta.border} px-1.5 py-0.5 rounded shrink-0`}>{meta.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{input.summary || "Extracting signals..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(input)}
                  <span className="text-[9px] text-muted-foreground">{new Date(input.createdAt).toLocaleDateString([], { month:"short", day:"numeric" })}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(input._id, input.name); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete source"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <AnimatePresence mode="wait">
        {selectedInput && (
          <motion.div key="detail" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            className="w-96 border-l border-border/50 bg-card p-6 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
              <div className="flex items-center gap-2">
                {(() => { const m=getConnectorMeta(selectedInput.type); const Ico=m.icon; return <div className={`p-1.5 rounded-lg ${m.bg} border ${m.border}`}><Ico className={`h-4 w-4 ${m.color}`} /></div>; })()}
                <h3 className="text-sm font-bold text-foreground truncate">{selectedInput.name}</h3>
              </div>
              <button onClick={() => setSelectedInput(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-5 flex-1">
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-primary font-bold flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{selectedInput.summary || "Extracting signals..."}</p>
              </div>
              {selectedInput.url && (
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Source URL</span>
                  <a href={selectedInput.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline truncate">
                    <span className="truncate">{selectedInput.url}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Status", value: selectedInput.status, color: "text-green-400" },
                  { label: "Records", value: "—", color: "text-foreground" },
                  { label: "Signals", value: "—", color: "text-primary" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-card/60 border border-border/50 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground space-y-1 border-t border-border/40 pt-3">
                <p>ID: <span className="font-mono">{selectedInput._id}</span></p>
                <p>Added: {new Date(selectedInput.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4 mt-4 flex gap-2">
              <button onClick={() => handleReprocess(selectedInput._id, selectedInput.name)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground/80 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Now
              </button>
              <button onClick={() => handleDelete(selectedInput._id, selectedInput.name)} className="flex items-center justify-center rounded-lg border border-destructive/20 hover:bg-destructive/10 p-2 text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
