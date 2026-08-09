import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Type, Send, Loader2, ChevronDown, History,
  FileDown, FileJson, FileText, ClipboardCopy, AlertCircle,
  RotateCcw, Circle, CheckCircle2, GitMerge,
  PanelLeftClose, PanelLeftOpen, List, Plus,
  Edit3, Save, Award, RefreshCw
} from "lucide-react";
import { getPmxHeaders, pmxFetch, usePmxStore } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { generatePdfBlob } from "@/lib/pdf/PmxDocumentPdf";
import MermaidDiagram from "./MermaidDiagram";
import ContactModal from "@/components/ContactModal";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const EXTRA_SECTIONS = [
  { key: "techSpecs",       label: "Technical Architecture" },
  { key: "apiContracts",    label: "API Contracts" },
  { key: "databaseChanges", label: "Database Design" },
  { key: "securityNotes",   label: "Security" },
  { key: "uxImprovements",  label: "UX Improvements" },
  { key: "edgeCases",       label: "Edge Cases" },
] as const;

interface PlanStepDef { id: string; label: string; detail: string }

const IDEA_GENERATE_STEPS: PlanStepDef[] = [
  { id: "understand", label: "Understanding the idea", detail: "Parsing problem, target users, and goals" },
  { id: "research",   label: "Researching problem & target users", detail: "Mapping personas and pain points" },
  { id: "features",   label: "Drafting core features & user stories", detail: "Breaking MVP into concrete stories" },
  { id: "stack",      label: "Picking a tech stack", detail: "Matching stack to scope and constraints" },
  { id: "write",      label: "Writing the PRD", detail: "Compiling everything into the final document" },
];

const REFINE_STEPS: PlanStepDef[] = [
  { id: "read",    label: "Reading current PRD", detail: "Loading latest version and context" },
  { id: "analyze", label: "Analyzing requested change", detail: "Mapping instruction to affected sections" },
  { id: "update",  label: "Updating document", detail: "Rewriting affected sections" },
  { id: "verify",  label: "Verifying consistency", detail: "Checking coherence with the rest of the PRD" },
];

function PlanChecklist({ steps, currentStep, open, onToggle }: {
  steps: PlanStepDef[];
  currentStep: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden text-xs">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 font-medium text-foreground/80 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-sky-400 shrink-0" />
          {Math.min(currentStep + 1, steps.length)} of {steps.length} steps
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/40 overflow-hidden">
            <div className="px-3 py-2.5 space-y-2">
              {steps.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={step.id}>
                    <div className="flex items-center gap-2">
                      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        : active ? <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-border shrink-0" />}
                      <span className={`text-[11px] leading-relaxed ${
                        done ? "text-foreground/70" : active ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {active && (
                      <div className="flex items-center gap-1.5 mt-0.5 ml-[7px] pl-3 border-l border-border/40">
                        <span className="h-1 w-1 rounded-full bg-sky-400 animate-pulse shrink-0" />
                        <span className="text-[10px] text-muted-foreground/70 italic">{step.detail}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Section { title: string; raw: string; id: string }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
}

function splitSections(markdown: string): Section[] {
  if (!markdown) return [];
  const chunks = markdown.split(/\n(?=##\s)/g).map(s => s.trim()).filter(Boolean);
  return chunks.map(raw => {
    const m = raw.match(/^##\s+(.+)/);
    const title = m ? m[1].trim() : "Section";
    return { title, raw, id: slugify(title) };
  });
}

function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/^-\s*\[.\]\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function CodeRenderer({ inline, className, children }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match?.[1] || "";
  const codeText = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  if (lang === "mermaid") return <MermaidDiagram code={codeText} />;

  if (inline) {
    return <code className="bg-muted/40 px-1.5 py-0.5 rounded font-mono text-[11px] text-sky-400 border border-border/30">{children}</code>;
  }

  return (
    <div className="relative rounded-lg overflow-hidden my-4 bg-[#0d1117] border border-border/40 font-mono group/code">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-white/[0.02]">
        <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">{lang || "code"}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(codeText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed"><code className={className}>{children}</code></pre>
    </div>
  );
}

const mdComponents: any = {
  code: CodeRenderer,
  h1: ({ children, ...props }: any) => <h1 className="text-xl sm:text-2xl font-extrabold text-foreground mt-4 mb-4 pb-2 border-b border-border/40" {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 className="text-base sm:text-lg font-bold text-foreground mt-6 mb-3 pb-1.5 border-b border-border/30 scroll-mt-20" {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-4 mb-2 scroll-mt-20" {...props}>{children}</h3>,
  p: ({ children }: any) => <p className="text-xs sm:text-[13px] text-foreground/85 leading-relaxed mb-3.5 font-normal">{children}</p>,
  ul: ({ children }: any) => <ul className="space-y-1.5 mb-3.5 list-disc list-outside pl-5 text-xs sm:text-[13px] text-foreground/85">{children}</ul>,
  ol: ({ children }: any) => <ol className="space-y-1.5 mb-3.5 list-decimal list-outside pl-5 text-xs sm:text-[13px] text-foreground/85">{children}</ol>,
  li: ({ children, className }: any) => <li className={`leading-relaxed ${className || ""}`}>{children}</li>,
  input: ({ type, checked }: any) =>
    type === "checkbox"
      ? <input type="checkbox" checked={!!checked} readOnly className="rounded border-border accent-sky-500 h-3.5 w-3.5 mr-2" />
      : null,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-sky-500/50 bg-sky-500/5 rounded-r-lg pl-3 pr-3 py-2 my-3 text-xs text-foreground/85 [&_p]:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => <div className="overflow-x-auto my-4 rounded-lg border border-border/40"><table className="w-full text-xs">{children}</table></div>,
  thead: ({ children }: any) => <thead className="bg-muted/40 text-muted-foreground">{children}</thead>,
  th: ({ children }: any) => <th className="text-left font-semibold px-3 py-2 border-b border-border/30">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 border-b border-border/10 text-foreground/80 align-top">{children}</td>,
  details: ({ children }: any) => <details className="rounded-lg border border-border/40 bg-card/20 p-3 my-3 text-xs [&_summary]:cursor-pointer">{children}</details>,
  summary: ({ children }: any) => <summary className="text-xs font-semibold text-foreground">{children}</summary>,
  hr: () => <hr className="border-border/30 my-6" />,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
};

function SectionBlock({ section }: { section: Section }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const copyMd = () => { navigator.clipboard.writeText(section.raw); setCopiedMd(true); setTimeout(() => setCopiedMd(false), 1500); };
  const copyTxt = () => { navigator.clipboard.writeText(toPlainText(section.raw)); setCopiedTxt(true); setTimeout(() => setCopiedTxt(false), 1500); };

  return (
    <section id={section.id} className="group/section relative scroll-mt-20">
      <div className="absolute right-0 top-0 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1 z-10">
        <button onClick={copyMd} title="Copy section as Markdown" className="flex items-center gap-1 rounded border border-border/50 bg-card px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-all">
          {copiedMd ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />} MD
        </button>
        <button onClick={copyTxt} title="Copy section as text" className="flex items-center gap-1 rounded border border-border/50 bg-card px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-all">
          {copiedTxt ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Type className="h-2.5 w-2.5" />} Text
        </button>
      </div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight]} components={mdComponents}>
        {section.raw}
      </ReactMarkdown>
    </section>
  );
}

type DocKind = "idea" | "solution";
type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  rollbackTo?: string;
  resultVersion?: number;
};

export interface PrdWorkspaceProps {
  doc: any | null;
  kind: DocKind;
  initialIdea?: string;
  autoGenerate?: boolean;
  allDocs?: any[];
  activeDocId?: string;
  onSelectDoc?: (id: string) => void;
  combineMode?: boolean;
  selectedForCombine?: string[];
  onToggleCombineSelect?: (id: string) => void;
  onToggleCombineMode?: () => void;
  onExecuteCombine?: () => void;
  combining?: boolean;
}

export default function PrdWorkspace({
  doc: initialDoc,
  kind,
  initialIdea,
  autoGenerate,
  allDocs = [],
  activeDocId,
  onSelectDoc,
  combineMode = false,
  selectedForCombine = [],
  onToggleCombineSelect,
  onToggleCombineMode,
  onExecuteCombine,
  combining = false,
}: PrdWorkspaceProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any | null>(initialDoc);
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [refineStep, setRefineStep] = useState(0);
  const [planOpen, setPlanOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [rewindingId, setRewindingId] = useState<string | null>(null);
  const [showBuildRequest, setShowBuildRequest] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const activeProjectId = usePmxStore(s => s.projectId);
  const promoteToTab = usePmxStore(s => s.promoteToTab);
  const hasStartedGenerateRef = useRef(false);
  const executionPlan = usePmxStore(s => s.executionPlan);
  const generatingExecution = usePmxStore(s => s.loading.executionGenerate);
  const generateExecution = usePmxStore(s => s.generateExecution);
  const regenerateExecution = usePmxStore(s => s.regenerateExecution);

  // Initialize chat/revision log
  const [chatLog, setChatLog] = useState<ChatEntry[]>(() => {
    if (initialDoc) {
      if (kind === "idea") {
        const history: ChatEntry[] = initialDoc.history || [];
        const versions: Array<{ version: number }> = initialDoc.versions || [];
        let assistantIndex = 0;
        return history.map((entry: ChatEntry) => {
          if (entry.role !== "assistant") return entry;
          const snapshot = versions[assistantIndex];
          assistantIndex++;
          return snapshot ? { ...entry, rollbackTo: String(snapshot.version), resultVersion: snapshot.version + 1 } : entry;
        });
      }
      const solHistory: Array<{ _id: string; updatedAt: string; instruction?: string; changeSummary?: string }> = initialDoc.history || [];
      const entries: ChatEntry[] = [];
      solHistory.forEach((entry, i) => {
        if (!entry.instruction) return;
        entries.push({ role: "user", content: entry.instruction, createdAt: entry.updatedAt });
        entries.push({
          role: "assistant",
          content: entry.changeSummary || "Updated the PRD.",
          createdAt: entry.updatedAt,
          rollbackTo: String(entry._id),
          resultVersion: i + 2,
        });
      });
      return entries;
    }
    if (autoGenerate && initialIdea) return [{ role: "user", content: initialIdea, createdAt: new Date().toISOString() }];
    return [];
  });

  // Handle idea-input auto-generation
  useEffect(() => {
    if (!autoGenerate || !initialIdea || doc || hasStartedGenerateRef.current) return;
    hasStartedGenerateRef.current = true;
    let cancelled = false;
    let stepTimer: ReturnType<typeof setTimeout> | undefined;

    const advanceStep = () => {
      setGenStep((s) => {
        const next = Math.min(s + 1, IDEA_GENERATE_STEPS.length - 1);
        if (next < IDEA_GENERATE_STEPS.length - 1) {
          stepTimer = setTimeout(advanceStep, 1300 + Math.random() * 900);
        }
        return next;
      });
    };
    stepTimer = setTimeout(advanceStep, 1100);

    (async () => {
      setCreating(true);
      setCreateError(null);
      try {
        const json = await pmxFetch(`${API_URL}/pmx/idea/generate`, {
          method: "POST", body: JSON.stringify({ idea: initialIdea, projectId: activeProjectId }),
        });
        if (cancelled) return;
        if (json.success) {
          setGenStep(IDEA_GENERATE_STEPS.length);
          setDoc(json.data);
          promoteToTab(activeProjectId);
        } else {
          setCreateError(json.error || "Failed to generate the PRD");
        }
      } catch {
        if (!cancelled) setCreateError("Failed to generate the PRD — check your connection");
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => { cancelled = true; if (stepTimer) clearTimeout(stepTimer); };
  }, []);

  const hasDoc = !!doc;
  const rawMarkdown = doc ? (kind === "idea" ? (doc.markdown || "") : (doc.prd || "")) : "";
  const title = doc ? (kind === "idea" ? (doc.productName || "Development PRD") : doc.title) : "Generating your PRD…";
  const subtitle = doc ? (kind === "idea" ? doc.idea : doc.epic) : initialIdea;
  const combinedFromCount: number = kind === "solution" ? (doc?.combinedFromSolutionIds?.length || 0) : 0;
  const isCombined = combinedFromCount > 0;

  const sections = useMemo(() => splitSections(rawMarkdown), [rawMarkdown]);
  const slug = (title || "prd").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "prd";

  const versionEntries = useMemo(() => {
    if (!doc) return [];
    const currentVer = doc.version || 1;

    if (kind === "idea") {
      const older = (doc.versions || []).map((v: any) => ({
        id: String(v.version),
        versionNum: v.version,
        label: `Version ${v.version}`,
        isCurrent: false,
        createdAt: v.createdAt,
      }));
      return [
        {
          id: String(currentVer),
          versionNum: currentVer,
          label: `Version ${currentVer}`,
          isCurrent: true,
          createdAt: doc.updatedAt || doc.createdAt,
        },
        ...older.reverse(),
      ];
    }

    const solHistory = doc.history || [];
    const older = solHistory.map((h: any, i: number) => ({
      id: h._id,
      versionNum: i + 1,
      label: `Version ${i + 1}`,
      isCurrent: false,
      summary: h.changeSummary || h.instruction,
      createdAt: h.updatedAt,
    }));

    return [
      {
        id: "current",
        versionNum: currentVer,
        label: `Version ${currentVer}`,
        isCurrent: true,
        createdAt: doc.updatedAt || doc.createdAt,
      },
      ...older.reverse(),
    ];
  }, [doc, kind]);

  const submitInstruction = async (instruction: string): Promise<boolean> => {
    const trimmed = instruction.trim();
    if (!trimmed || submitting || !doc) return false;
    setSubmitting(true);
    setRefineError(null);
    setRefineStep(0);

    let stepTimer: ReturnType<typeof setTimeout> | undefined;
    const advanceRefineStep = () => {
      setRefineStep((s) => {
        const next = Math.min(s + 1, REFINE_STEPS.length - 1);
        if (next < REFINE_STEPS.length - 1) {
          stepTimer = setTimeout(advanceRefineStep, 700 + Math.random() * 500);
        }
        return next;
      });
    };
    stepTimer = setTimeout(advanceRefineStep, 600);

    try {
      const url = kind === "idea" ? `${API_URL}/pmx/idea/prd/${doc._id}/refine` : `${API_URL}/pmx/solutions/${doc._id}/refine`;
      const json = await pmxFetch(url, { method: "POST", body: JSON.stringify({ instruction: trimmed }) });
      if (json.success) {
        setDoc(json.data);
        if (kind === "solution") {
          usePmxStore.getState().fetchSolutions();
        } else {
          usePmxStore.getState().fetchIdeaPrd();
        }
        setPromptText("");
        const now = new Date().toISOString();
        const rollbackTo = kind === "idea"
          ? String((json.data.version ?? 1) - 1)
          : json.data.history?.[json.data.history.length - 1]?._id;
        setChatLog(l => [
          ...l,
          { role: "user", content: trimmed, createdAt: now },
          { role: "assistant", content: json.changeSummary, createdAt: now, rollbackTo, resultVersion: json.data.version },
        ]);
        toast({ title: `PRD updated (v${json.data.version})`, description: json.changeSummary });
        return true;
      }
      setRefineError(json.error || "Failed to update the PRD");
      return false;
    } catch {
      setRefineError("Failed to update the PRD — check your connection");
      return false;
    } finally {
      if (stepTimer) clearTimeout(stepTimer);
      setSubmitting(false);
    }
  };

  const rewindTo = async (entry: { id: string; versionNum: number; isCurrent?: boolean }) => {
    if (entry.isCurrent || rewindingId) return;
    setRewindingId(entry.id);
    try {
      const headers = await getPmxHeaders();
      const url = kind === "idea" ? `${API_URL}/pmx/idea/prd/${doc._id}/rewind` : `${API_URL}/pmx/solutions/${doc._id}/rewind`;
      const body = kind === "idea"
        ? { version: entry.versionNum }
        : { historyId: entry.id, version: entry.versionNum };
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        setDoc(json.data);
        if (kind === "solution") {
          usePmxStore.getState().fetchSolutions();
        } else {
          usePmxStore.getState().fetchIdeaPrd();
        }
        setHistoryOpen(false);
        toast({
          title: `Rolled back to Version ${json.data.version}`,
          description: "All subsequent versions have been removed.",
        });
      } else {
        toast({ variant: "destructive", title: "Couldn't restore that version", description: json.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Couldn't restore that version" });
    } finally {
      setRewindingId(null);
    }
  };

  const startSectionEdit = (key: string) => {
    setEditingSection(key);
    setSectionDraft(doc[key] || "");
  };

  const saveSection = async (key: string) => {
    setSavingSection(true);
    try {
      const headers = await getPmxHeaders();
      const body = {
        prd: doc.prd, epic: doc.epic, userStories: doc.userStories, techSpecs: doc.techSpecs,
        apiContracts: doc.apiContracts, databaseChanges: doc.databaseChanges, securityNotes: doc.securityNotes,
        uxImprovements: doc.uxImprovements, edgeCases: doc.edgeCases, [key]: sectionDraft,
      };
      const res = await fetch(`${API_URL}/pmx/solutions/${doc._id}`, { method: "PUT", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        setDoc(json.data);
        setEditingSection(null);
        toast({ title: "Saved changes" });
      } else {
        toast({ variant: "destructive", title: "Couldn't save" });
      }
    } finally {
      setSavingSection(false);
    }
  };

  const copyEntirePrd = () => { navigator.clipboard.writeText(rawMarkdown); toast({ title: "Copied entire PRD" }); };
  const exportMarkdown = () => downloadBlob(rawMarkdown, `${slug}.md`, "text/markdown");
  const exportJson = () => downloadBlob(JSON.stringify({ title, subtitle, markdown: rawMarkdown, version: doc?.version }, null, 2), `${slug}.json`, "application/json");
  const exportPdf = async () => {
    if (!doc) return;
    setExportingPdf(true);
    try {
      const blob = await generatePdfBlob(title, rawMarkdown);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${slug}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "PDF export failed" });
    } finally {
      setExportingPdf(false);
    }
  };

  // Whether this doc already has a generated execution plan, and whether
  // that plan is out of date relative to the doc's current version — drives
  // the toolbar button switching between "Create Execution" and
  // "Regenerate Execution" (see PMX.md's Create Execution feature).
  const hasExecutionForDoc = !!(executionPlan && executionPlan.sourceId === doc?._id);
  const isExecutionStale = hasExecutionForDoc && executionPlan!.sourcePrdVersion !== doc?.version;

  const handleCreateExecution = async () => {
    if (!doc?._id) return;
    const source = kind === "idea" ? { ideaPrdId: doc._id } : { solutionId: doc._id };
    if (isExecutionStale) {
      const diff = await regenerateExecution(source);
      if (diff) {
        toast({
          title: "Execution plan regenerated",
          description: `${diff.added} added · ${diff.updated} updated · ${diff.removed} removed.`,
        });
        navigate("/pmx/execution");
      }
    } else {
      const ok = await generateExecution(source);
      if (ok) navigate("/pmx/execution");
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const busy = submitting || creating;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-background overflow-hidden">

      {/* ── 1. TOP DOCUMENT HEADER BAR ────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-border/40 bg-card/20 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Breadcrumb & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title={sidebarOpen ? "Hide PRD Navigator" : "Show PRD Navigator"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3 text-sky-400" />
                PRD
              </span>
              <span className="text-border">/</span>
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {title}
              </h1>
              {hasDoc && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                  v{doc.version || 1}
                </span>
              )}
              {isCombined && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded shrink-0">
                  <GitMerge className="h-2.5 w-2.5" /> Unified from {combinedFromCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {hasDoc && (
            <>
              {/* Version History Dropdown */}
              <DropdownMenu open={historyOpen} onOpenChange={setHistoryOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                      historyOpen
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-400"
                        : "border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">History</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-card border-border/60 text-foreground p-2 space-y-1">
                  <div className="px-2 py-1.5 border-b border-border/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Version History</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-thin py-1 space-y-1">
                    {versionEntries.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">Initial version (v1)</p>
                    ) : (
                      versionEntries.map((v: any, i: number) => {
                        const isCurrent = i === 0;
                        return (
                          <button
                            key={v.id}
                            onClick={() => rewindTo(v)}
                            disabled={isCurrent || rewindingId === v.id}
                            className={`w-full flex items-start justify-between gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                              isCurrent
                                ? "bg-sky-400/10 text-sky-400 font-semibold cursor-default"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-foreground">
                                {v.label} {isCurrent && <span className="text-[10px] text-sky-400 font-normal ml-1">Current</span>}
                              </p>
                              {v.summary && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{v.summary}</p>}
                              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {!isCurrent && (
                              <span className="shrink-0 text-muted-foreground/60 hover:text-foreground mt-1">
                                {rewindingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Outline Toggle */}
              <button
                onClick={() => setOutlineOpen(o => !o)}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                  outlineOpen
                    ? "border-border bg-muted/40 text-foreground"
                    : "border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title="Toggle Table of Contents"
              >
                <List className="h-3.5 w-3.5" />
                <span>Outline</span>
              </button>

              {/* Export Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 hover:bg-muted text-xs font-medium text-foreground transition-all">
                    <FileDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-card border-border/60 text-foreground">
                  <DropdownMenuItem onClick={copyEntirePrd} className="text-xs gap-2 cursor-pointer focus:bg-muted">
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy Entire PRD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportMarkdown} className="text-xs gap-2 cursor-pointer focus:bg-muted">
                    <FileText className="h-3.5 w-3.5" /> Export Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJson} className="text-xs gap-2 cursor-pointer focus:bg-muted">
                    <FileJson className="h-3.5 w-3.5" /> Export JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPdf} disabled={exportingPdf} className="text-xs gap-2 cursor-pointer focus:bg-muted">
                    {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Export PDF Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Create/Regenerate Execution — turns this PRD into a
                  department-aware sprint backlog on /pmx/execution. */}
              <button
                onClick={handleCreateExecution}
                disabled={generatingExecution}
                title={isExecutionStale ? "The PRD changed since the last execution plan — regenerate it" : "Generate a sprint-ready backlog from this PRD"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 hover:bg-muted text-xs font-medium text-foreground transition-all disabled:opacity-50"
              >
                {generatingExecution ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isExecutionStale ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : (
                  <Award className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {generatingExecution ? "Generating…" : isExecutionStale ? "Regenerate Execution" : "Create Execution"}
                </span>
              </button>

              {/* Request Build CTA */}
              <button
                onClick={() => setShowBuildRequest(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 text-xs font-bold text-black transition-all shadow-sm"
              >
                <img src="/assets/images/strx_black.png" alt="" className="h-4 w-4 object-contain" />
                Request Build →
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── 2. MAIN WORKSPACE BODY ─────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT PANE: PRD NAVIGATOR & WORKSPACE LIST ────────────── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="shrink-0 border-r border-border/40 bg-card/10 flex flex-col overflow-hidden"
            >
              {/* Navigator Header */}
              <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PRDs ({allDocs.length || (hasDoc ? 1 : 0)})
                </span>
                <button
                  onClick={() => navigate("/pmx/overview")}
                  className="flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:underline"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>

              {/* PRD List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                {allDocs.length === 0 && hasDoc && (
                  <button className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-400/10 border border-sky-400/20 text-left text-xs transition-colors">
                    <FileText className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">v{doc?.version || 1} · Current</p>
                    </div>
                  </button>
                )}

                {allDocs.map((item: any) => {
                  const isActive = item._id === activeDocId || item._id === doc?._id;
                  const isChecked = selectedForCombine.includes(item._id);
                  const isMerged = (item.combinedFromSolutionIds?.length || 0) > 0;

                  return (
                    <div
                      key={item._id}
                      onClick={() => {
                        if (combineMode) {
                          onToggleCombineSelect?.(item._id);
                        } else {
                          onSelectDoc?.(item._id);
                        }
                      }}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs cursor-pointer transition-all ${
                        isActive && !combineMode
                          ? "bg-muted text-foreground border border-border font-medium shadow-sm"
                          : combineMode && isChecked
                          ? "bg-sky-400/10 border border-sky-400/30 text-foreground"
                          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                    >
                      {combineMode ? (
                        <Checkbox checked={isChecked} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : isMerged ? (
                        <GitMerge className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                      ) : (
                        <FileText className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isActive ? "text-sky-400" : "text-muted-foreground/60"}`} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-foreground truncate">{item.title || item.productName || "PRD"}</p>
                          <span className="text-[9px] font-mono text-muted-foreground/70 shrink-0">
                            v{item.version || 1}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.epic || item.idea || "Product Blueprint"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combine PRDs Footer */}
              {allDocs.length > 1 && (
                <div className="p-3 border-t border-border/40 bg-card/20 space-y-2">
                  {!combineMode ? (
                    <button
                      onClick={onToggleCombineMode}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <GitMerge className="h-3.5 w-3.5" /> Combine PRDs
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground">
                        {selectedForCombine.length} selected for merge
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onToggleCombineMode}
                          className="flex-1 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={onExecuteCombine}
                          disabled={selectedForCombine.length < 2 || combining}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-[11px] font-semibold text-black disabled:opacity-40"
                        >
                          {combining ? <Loader2 className="h-3 w-3 animate-spin" /> : "Merge"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── CENTER + RIGHT: PRIMARY DOCUMENT CANVAS ────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">

          <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 md:px-12 py-8">
            <div className="max-w-4xl mx-auto flex gap-8 items-start">

              {/* Document Paper Area */}
              <div className="flex-1 min-w-0 space-y-6">

                {!hasDoc ? (
                  <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground py-28 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {creating ? IDEA_GENERATE_STEPS[Math.min(genStep, IDEA_GENERATE_STEPS.length - 1)].label + "…" : "Generating your PRD…"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Synthesizing problem framing, user stories, functional scope, and architecture.
                      </p>
                    </div>
                    {creating && (
                      <div className="w-72 mt-2">
                        <PlanChecklist steps={IDEA_GENERATE_STEPS} currentStep={genStep} open={planOpen} onToggle={() => setPlanOpen(o => !o)} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Document Header Box */}
                    <div className="pb-6 border-b border-border/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-sky-400">Recommendation</span>
                        <span>·</span>
                        <span className="truncate">{subtitle || "Product Blueprint"}</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                        {title}
                      </h1>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>Version {doc.version || 1}</span>
                        <span>·</span>
                        <span>Status: <strong className="text-foreground font-medium">Ready for Build</strong></span>
                        {kind === "idea" && doc.tokensUsed && (
                          <>
                            <span>·</span>
                            <span>{doc.tokensUsed.toLocaleString()} tokens</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Continuous PRD Markdown Sections */}
                    <div className="space-y-8">
                      {sections.map((s, i) => (
                        <SectionBlock key={`${s.title}-${i}`} section={s} />
                      ))}
                    </div>

                    {/* Inline Technical Sections (Architecture, API, Database, etc.) */}
                    {kind === "solution" && (
                      <div className="pt-8 border-t border-border/40 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Technical Specifications & Architecture
                          </h2>
                        </div>

                        {EXTRA_SECTIONS.map(({ key, label }) => {
                          const hasContent = Boolean(doc[key]);
                          const isEditing = editingSection === key;
                          const sectionId = slugify(label);

                          return (
                            <section key={key} id={sectionId} className="group/tech space-y-2 scroll-mt-20">
                              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                                <h3 className="text-base font-bold text-foreground">{label}</h3>
                                {!isEditing ? (
                                  <button
                                    onClick={() => startSectionEdit(key)}
                                    className="opacity-0 group-hover/tech:opacity-100 flex items-center gap-1 text-[11px] text-sky-400 hover:underline transition-opacity"
                                  >
                                    <Edit3 className="h-3 w-3" /> {hasContent ? "Edit" : "Add specification"}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setEditingSection(null)}
                                      className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveSection(key)}
                                      disabled={savingSection}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-black transition-all disabled:opacity-50"
                                    >
                                      {savingSection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                      Save
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditing ? (
                                <textarea
                                  value={sectionDraft}
                                  onChange={e => setSectionDraft(e.target.value)}
                                  className="w-full min-h-[140px] bg-card border border-border rounded-lg p-3 text-xs font-mono text-foreground focus:outline-none focus:border-ring resize-none leading-relaxed"
                                />
                              ) : hasContent ? (
                                <div className="text-xs text-foreground/80 leading-relaxed font-mono bg-muted/20 p-3 rounded-lg border border-border/30 whitespace-pre-wrap">
                                  {doc[key]}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 italic">No specifications added yet.</p>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── RIGHT RAIL: ON-THIS-PAGE OUTLINE ───────────────── */}
              {outlineOpen && hasDoc && sections.length > 0 && (
                <nav className="hidden lg:block w-48 shrink-0 sticky top-4 space-y-3 pl-4 border-l border-border/30 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    On This Page
                  </p>
                  <ul className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin">
                    {sections.map((s, i) => (
                      <li key={i}>
                        <button
                          onClick={() => scrollToSection(s.id)}
                          className="text-left text-muted-foreground hover:text-sky-400 text-[11px] truncate w-full transition-colors"
                          title={s.title}
                        >
                          {s.title}
                        </button>
                      </li>
                    ))}
                    {kind === "solution" && EXTRA_SECTIONS.map(({ key, label }) => (
                      <li key={key}>
                        <button
                          onClick={() => scrollToSection(slugify(label))}
                          className="text-left text-muted-foreground/70 hover:text-sky-400 text-[11px] truncate w-full transition-colors"
                        >
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </div>

          {/* ── 3. BOTTOM CONTEXTUAL ASSISTANT BAR ───────────────────── */}
          {hasDoc && (
            <div className="shrink-0 border-t border-border/40 bg-card/30 backdrop-blur-md p-3 md:px-8">
              <div className="max-w-3xl mx-auto space-y-2">
                {/* Assistant Error if any */}
                {(createError || refineError) && (
                  <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[10px] text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{createError || refineError}</span>
                  </div>
                )}

                {/* Submitting progress checklist */}
                {submitting && (
                  <PlanChecklist
                    steps={REFINE_STEPS}
                    currentStep={refineStep}
                    open={planOpen}
                    onToggle={() => setPlanOpen(o => !o)}
                  />
                )}

                {/* Input Bar */}
                <form
                  onSubmit={(e) => { e.preventDefault(); submitInstruction(promptText); }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      disabled={busy || !hasDoc}
                      placeholder="Ask PMX to modify this PRD… (e.g. 'Add authentication requirements', 'Reduce MVP scope')"
                      className="w-full bg-muted/40 border border-border/60 focus:border-ring rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/60 transition-colors disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!promptText.trim() || busy || !hasDoc}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black transition-all shrink-0"
                    title="Send change request"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── 4. REQUEST BUILD MODAL ─────────────────────────────────── */}
      <ContactModal
        isOpen={showBuildRequest}
        onClose={() => setShowBuildRequest(false)}
        context="Build Request"
        initialProblem={hasDoc ? `I'd like to move "${title}" from PRD into Build.` : undefined}
      />
    </div>
  );
}
