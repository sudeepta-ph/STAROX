import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Type, Send, Loader2, ChevronDown, History,
  FileDown, FileJson, FileText, ClipboardCopy, AlertCircle, Sparkles,
  RotateCcw, Layers, Circle, CheckCircle2,
  ListChecks, GitMerge,
} from "lucide-react";
import { getPmxHeaders, pmxFetch, usePmxStore } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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

// Cosmetic staged plan shown while the single idea→PRD generation call is in
// flight (that call has no real sub-steps to report — this just gives the
// wait a Bolt/Cursor-style "here's what I'm doing" plan instead of a bare
// spinner). Advances on a timer, capped at the last step until the real
// response actually lands.
interface PlanStepDef { id: string; label: string; detail: string }

const IDEA_GENERATE_STEPS: PlanStepDef[] = [
  { id: "understand", label: "Understanding the idea", detail: "Parsing the problem, target users, and goals" },
  { id: "research",   label: "Researching problem & target users", detail: "Mapping personas and pain points" },
  { id: "features",   label: "Drafting core features & user stories", detail: "Breaking the MVP into concrete stories" },
  { id: "stack",      label: "Picking a tech stack", detail: "Matching the stack to scope and constraints" },
  { id: "write",      label: "Writing the PRD", detail: "Compiling everything into the final document" },
];

const REFINE_STEPS: PlanStepDef[] = [
  { id: "read",    label: "Reading the current PRD", detail: "Loading the latest version and history" },
  { id: "analyze", label: "Understanding the requested change", detail: "Mapping your instruction to affected sections" },
  { id: "update",  label: "Updating the document", detail: "Rewriting affected sections" },
  { id: "verify",  label: "Verifying consistency", detail: "Checking the change fits the rest of the PRD" },
];

// Shared plan/checklist UI for both the initial idea→PRD generation and
// chat-instruction refinement — same visual language as generation (which
// already had it), now reused by refine instead of a plain spinner bubble.
function PlanChecklist({ steps, currentStep, open, onToggle }: {
  steps: PlanStepDef[];
  currentStep: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium text-foreground/80 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
          {Math.min(currentStep + 1, steps.length)} of {steps.length} steps
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/40 overflow-hidden">
            <div className="px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                <ListChecks className="h-3 w-3" /> Plan
              </p>
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.id}>
                      <div className="flex items-center gap-2">
                        {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          : active ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                          : <Circle className="h-3.5 w-3.5 text-border shrink-0" />}
                        <span className={`text-[11px] leading-relaxed ${
                          done ? "text-foreground/70" : active ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      <AnimatePresence>
                        {active && (
                          // Opacity/position only — never height. This div lives inside
                          // the outer plan-list container, which is itself animating
                          // height:"auto"; a nested height:"auto" animation here would
                          // corrupt the outer one's size measurement (it did — toggling
                          // the outer collapse while a step's detail line was still
                          // mounted made the whole panel vanish instead of collapsing).
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <div className="flex items-center gap-1.5 mt-1 ml-[7px] pl-3 border-l border-border/40">
                              <span className="h-1 w-1 rounded-full bg-primary/60 animate-pulse shrink-0" />
                              <span className="text-[10px] text-muted-foreground/70 italic">{step.detail}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Section { title: string; raw: string }

function splitSections(markdown: string): Section[] {
  if (!markdown) return [];
  const chunks = markdown.split(/\n(?=##\s)/g).map(s => s.trim()).filter(Boolean);
  return chunks.map(raw => {
    const m = raw.match(/^##\s+(.+)/);
    return { title: m ? m[1].trim() : "Section", raw };
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

function useNarrowSplit(breakpoint = 768) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [breakpoint]);
  return narrow;
}

function CodeRenderer({ inline, className, children }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match?.[1] || "";
  const codeText = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  if (lang === "mermaid") return <MermaidDiagram code={codeText} />;

  if (inline) {
    return <code className="bg-background px-1.5 py-0.5 rounded font-mono text-[12px] text-primary border border-border/30">{children}</code>;
  }

  return (
    <div className="relative rounded-xl overflow-hidden my-3 bg-[#0d1117] border border-border/40 font-mono group/code">
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
  h2: ({ children, ...props }: any) => <h2 className="text-base font-bold text-foreground mt-2 mb-3 pb-2 border-b border-border/40" {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-sm font-bold text-foreground mt-4 mb-2" {...props}>{children}</h3>,
  p: ({ children }: any) => <p className="text-xs text-foreground/80 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }: any) => <ul className="space-y-1 mb-3 list-disc list-outside pl-4 text-xs text-foreground/80">{children}</ul>,
  ol: ({ children }: any) => <ol className="space-y-1 mb-3 list-decimal list-outside pl-4 text-xs text-foreground/80">{children}</ol>,
  li: ({ children, className }: any) => <li className={`leading-relaxed ${className || ""}`}>{children}</li>,
  input: ({ type, checked }: any) =>
    type === "checkbox"
      ? <input type="checkbox" checked={!!checked} readOnly className="rounded border-border accent-primary h-3 w-3 mr-1.5" />
      : null,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-primary/50 bg-primary/5 rounded-r-lg pl-3 pr-3 py-2 my-3 text-xs text-foreground/80 [&_p]:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => <div className="overflow-x-auto my-3 rounded-lg border border-border/40"><table className="w-full text-[11px]">{children}</table></div>,
  thead: ({ children }: any) => <thead className="bg-card/60 text-muted-foreground">{children}</thead>,
  th: ({ children }: any) => <th className="text-left font-semibold px-3 py-2 border-b border-border/30">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 border-b border-border/10 text-foreground/80 align-top">{children}</td>,
  details: ({ children }: any) => <details className="rounded-lg border border-border/40 bg-card/20 p-3 my-3 text-xs [&_summary]:cursor-pointer">{children}</details>,
  summary: ({ children }: any) => <summary className="text-xs font-semibold text-foreground">{children}</summary>,
  hr: () => <hr className="border-border/30 my-4" />,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
};

function SectionBlock({ section }: { section: Section }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const copyMd = () => { navigator.clipboard.writeText(section.raw); setCopiedMd(true); setTimeout(() => setCopiedMd(false), 1500); };
  const copyTxt = () => { navigator.clipboard.writeText(toPlainText(section.raw)); setCopiedTxt(true); setTimeout(() => setCopiedTxt(false), 1500); };

  return (
    <section className="group/section relative">
      <div className="absolute right-0 -top-1 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1 z-10">
        <button onClick={copyMd} title="Copy section as Markdown" className="flex items-center gap-1 rounded-md border border-border/50 bg-card px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all">
          {copiedMd ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />} MD
        </button>
        <button onClick={copyTxt} title="Copy section as plain text" className="flex items-center gap-1 rounded-md border border-border/50 bg-card px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all">
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
  /** Version id to restore to undo this exact change — version number (idea) or history _id (solution). Assistant entries only. */
  rollbackTo?: string;
  /** The doc version this change produced, for a small "→ vN" tag next to the message. */
  resultVersion?: number;
};

export default function PrdWorkspace({ doc: initialDoc, kind, initialIdea, autoGenerate }: {
  doc: any | null;
  kind: DocKind;
  /** Idea text handed off from the Overview page's idea box (idea-input entry only). */
  initialIdea?: string;
  /** When true and `doc` is null, generates a brand-new idea PRD from `initialIdea` on mount. */
  autoGenerate?: boolean;
}) {
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
  const [chatLog, setChatLog] = useState<ChatEntry[]>(() => {
    if (initialDoc) {
      if (kind === "idea") {
        // Every refine/rewind pushes exactly one entry to `versions` and one
        // assistant-role entry to `history`, in the same order — so the Nth
        // assistant message maps 1:1 to versions[N], letting even messages
        // loaded from a past session get a working Rollback button.
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
      // Solutions don't store a chat transcript directly — each `history`
      // entry is a pre-change prd/techSpecs snapshot, plus (for entries
      // written after this was added) the instruction/changeSummary that
      // produced it. Rebuild the same user+assistant pair shape the live
      // refine flow appends below, so reopening a doc restores its chat and
      // every past change still has a working Rollback button. Entries from
      // before instruction/changeSummary were tracked are skipped — there's
      // no real message text left to show for them.
      const solHistory: Array<{ _id: string; updatedAt: string; instruction?: string; changeSummary?: string }> = initialDoc.history || [];
      const entries: ChatEntry[] = [];
      solHistory.forEach((entry, i) => {
        if (!entry.instruction) return;
        // Version starts at 1 and each refine increments it by 1 right after
        // pushing its history entry, so the i-th entry (0-indexed) produced
        // version i + 2.
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [rewindingId, setRewindingId] = useState<string | null>(null);
  const [showBuildRequest, setShowBuildRequest] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const narrowSplit = useNarrowSplit(768);
  const activeProjectId = usePmxStore(s => s.projectId);
  const promoteToTab = usePmxStore(s => s.promoteToTab);
  const hasStartedGenerateRef = useRef(false);

  // Keep the conversation pinned to the latest message/step as it grows.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatLog.length, creating, submitting, genStep, refineStep]);

  // Idea-input entry with no existing doc: create the PRD via the same
  // generation endpoint the Overview page used to call before navigating.
  // This is also the moment the current (until now, un-materialized)
  // projectId becomes a real workspace — the backend names it from the
  // AI's own productName, and promoteToTab makes it show up as a tab.
  //
  // hasStartedRef (not the `doc` check alone) guards against StrictMode's
  // dev-only double-invoke: `doc` is still null on the second pass because
  // the first pass's request hasn't resolved yet, so without this ref both
  // passes would fire their own POST /idea/generate — two AI calls, two
  // PmxIdeaPrd docs, for one submit.
  useEffect(() => {
    if (!autoGenerate || !initialIdea || doc || hasStartedGenerateRef.current) return;
    hasStartedGenerateRef.current = true;
    let cancelled = false;
    let stepTimer: ReturnType<typeof setTimeout> | undefined;

    const advanceStep = () => {
      setGenStep((s) => {
        const next = Math.min(s + 1, IDEA_GENERATE_STEPS.length - 1);
        // Holds on the last step — only the real response finishes it.
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
          const pages: Array<{ name: string; purpose: string }> = json.data.pages || [];
          if (pages.length > 0) {
            const pageList = pages.map(p => `• ${p.name} — ${p.purpose}`).join("\n");
            const layoutNote = json.data.layout ? `\n\nLayout: ${json.data.layout}` : "";
            setChatLog(l => [
              ...l,
              {
                role: "assistant",
                content: `Here's the page structure I'd build this MVP with:\n\n${pageList}${layoutNote}`,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasDoc = !!doc;
  const markdown = doc ? (kind === "idea" ? (doc.markdown || "") : (doc.prd || "")) : "";
  const title = doc ? (kind === "idea" ? (doc.productName || "Development PRD") : doc.title) : "Generating your PRD…";
  const subtitle = doc ? (kind === "idea" ? doc.idea : doc.epic) : initialIdea;
  const combinedFromCount: number = kind === "solution" ? (doc?.combinedFromSolutionIds?.length || 0) : 0;
  const isCombined = combinedFromCount > 0;

  const sections = useMemo(() => splitSections(markdown), [markdown]);
  const slug = (title || "prd").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "prd";

  const versionEntries = useMemo(() => {
    if (!doc) return [];
    if (kind === "idea") {
      return [...(doc.versions || [])].reverse().map((v: any) => ({
        id: String(v.version), label: `Version ${v.version}`, createdAt: v.createdAt,
      }));
    }
    return [...(doc.history || [])].reverse().map((h: any) => ({
      id: h._id, label: new Date(h.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), createdAt: h.updatedAt,
    }));
  }, [doc, kind]);

  const submitInstruction = async (instruction: string): Promise<boolean> => {
    const trimmed = instruction.trim();
    if (!trimmed || submitting || !doc) return false;
    setSubmitting(true);
    setRefineError(null);
    setRefineStep(0);

    // Same step-advancing pattern as the initial generation effect above —
    // an optimistic progress indicator, not a real per-step callback from
    // the single refine API call. Holds on the last step until the real
    // response lands.
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
        setPromptText("");
        const now = new Date().toISOString();
        // The refine call just archived the pre-change snapshot — for idea
        // docs that's the version number this doc had before the bump; for
        // solutions it's the history entry just pushed (always the last one).
        const rollbackTo = kind === "idea"
          ? String((json.data.version ?? 1) - 1)
          : json.data.history?.[json.data.history.length - 1]?._id;
        setChatLog(l => [
          ...l,
          { role: "user", content: trimmed, createdAt: now },
          { role: "assistant", content: json.changeSummary, createdAt: now, rollbackTo, resultVersion: json.data.version },
        ]);
        toast({ title: "PRD updated", description: json.changeSummary });
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

  const rewindTo = async (entryId: string) => {
    setRewindingId(entryId);
    try {
      const headers = await getPmxHeaders();
      const url = kind === "idea" ? `${API_URL}/pmx/idea/prd/${doc._id}/rewind` : `${API_URL}/pmx/solutions/${doc._id}/rewind`;
      const body = kind === "idea" ? { version: Number(entryId) } : { historyId: entryId };
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        setDoc(json.data);
        setHistoryOpen(false);
        toast({ title: "Restored", description: "The document was rolled back to that version." });
      } else {
        toast({ variant: "destructive", title: "Couldn't restore that version" });
      }
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
        toast({ title: "Saved" });
      } else {
        toast({ variant: "destructive", title: "Couldn't save" });
      }
    } finally {
      setSavingSection(false);
    }
  };

  const copyEntirePrd = () => { navigator.clipboard.writeText(markdown); toast({ title: "Copied entire PRD" }); };
  const exportMarkdown = () => downloadBlob(markdown, `${slug}.md`, "text/markdown");
  const exportJson = () => downloadBlob(JSON.stringify({ title, subtitle, markdown, version: doc.version }, null, 2), `${slug}.json`, "application/json");
  const exportPdf = async () => {
    if (!doc) return;
    setExportingPdf(true);
    try {
      const blob = await generatePdfBlob(title, markdown);
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

  const handleRequestBuild = () => setShowBuildRequest(true);

  const busy = submitting || creating;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-background">
      <ResizablePanelGroup direction={narrowSplit ? "vertical" : "horizontal"} className="flex-1 min-h-0">

      {/* ── LEFT PANE: breadcrumb + conversation + prompt bar (~35%) ─── */}
      <ResizablePanel defaultSize={35} minSize={narrowSplit ? 30 : 24} maxSize={narrowSplit ? 70 : 50}
        className={`flex flex-col border-border/50 bg-card/10 overflow-hidden ${narrowSplit ? "border-b" : "border-r"}`}>
        <div className="shrink-0 px-4 py-3 border-b border-border/40">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span>STAROX</span><span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium truncate">{title}</span>
          </p>
          {isCombined && (
            <span title={`Merged from ${combinedFromCount} blueprints`}
              className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold text-violet-500 dark:text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
              <GitMerge className="h-2.5 w-2.5" /> Unified from {combinedFromCount} blueprints
            </span>
          )}
          {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2">{subtitle}</p>}
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2.5">
          {chatLog.length === 0 && (
            <div className="text-center py-10 px-3 text-muted-foreground">
              <Sparkles className="h-6 w-6 text-border mx-auto mb-2" />
              <p className="text-[11px] leading-relaxed">Describe a change below — "Use Next.js instead of React", "Add audit logs", "Reduce MVP scope"…</p>
            </div>
          )}
          {chatLog.map((m, i) => (
            <div key={i} className={`group flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary/15 text-foreground" : "bg-muted/40 text-muted-foreground"
              }`}>
                {m.content}
              </div>
              {m.role === "assistant" && (
                <div className="flex items-center gap-2 mt-1 px-1 h-4">
                  {m.resultVersion !== undefined && (
                    <span className="text-[9px] font-mono text-muted-foreground/50">v{m.resultVersion}</span>
                  )}
                  <span className="text-[9px] text-muted-foreground/40">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.rollbackTo && (
                      <button
                        onClick={() => rewindTo(m.rollbackTo!)}
                        disabled={rewindingId === m.rollbackTo}
                        title="Rollback to before this change"
                        className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {rewindingId === m.rollbackTo ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
                        Rollback
                      </button>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(m.content)}
                      title="Copy message"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {creating && (
            <div className="space-y-2">
              <div className="max-w-[92%] rounded-xl px-3 py-2 text-[11px] leading-relaxed bg-muted/40 text-muted-foreground">
                I'll turn that idea into a full Development PRD — problem framing, target users, core features, user stories, and a tech stack recommendation.
              </div>
              <PlanChecklist steps={IDEA_GENERATE_STEPS} currentStep={genStep} open={planOpen} onToggle={() => setPlanOpen(o => !o)} />
            </div>
          )}
          {submitting && (
            <div className="space-y-2">
              <div className="max-w-[92%] rounded-xl px-3 py-2 text-[11px] leading-relaxed bg-muted/40 text-muted-foreground">
                Applying your requested change to the PRD.
              </div>
              <PlanChecklist steps={REFINE_STEPS} currentStep={refineStep} open={planOpen} onToggle={() => setPlanOpen(o => !o)} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/50 bg-card/40 backdrop-blur-sm px-3 py-3 space-y-2">
          {createError && (
            <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{createError}</span>
            </div>
          )}
          {refineError && (
            <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{refineError}</span>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); submitInstruction(promptText); }} className="flex items-center gap-2">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={busy || !hasDoc}
              placeholder={hasDoc ? "Write a message…" : "Waiting for the first draft…"}
              className="flex-1 bg-background border border-border focus:border-primary/40 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!promptText.trim() || busy || !hasDoc}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground transition-all shrink-0"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* ── RIGHT PANE: document canvas (~65%) ───────────────────────── */}
      <ResizablePanel defaultSize={65} minSize={narrowSplit ? 30 : 50} className="flex flex-col overflow-hidden">
        <div className="h-14 border-b border-border/50 px-5 flex items-center justify-between bg-card/20 shrink-0 gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
              {isCombined && <GitMerge className="h-3 w-3 text-violet-500 dark:text-violet-300 shrink-0" />}
              <span className="truncate">{title}</span>
            </h2>
            <p className="text-[9px] text-muted-foreground">
              {hasDoc ? `v${doc.version}${kind === "idea" ? ` · ${(doc.tokensUsed || 0).toLocaleString()} tokens` : ""}${isCombined ? ` · Unified from ${combinedFromCount} blueprints` : ""}` : "Waiting for first draft…"}
            </p>
          </div>
          {hasDoc && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button onClick={() => setHistoryOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all">
                <History className="h-3.5 w-3.5" /> History <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {historyOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto py-1">
                      {versionEntries.length === 0 && <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">No earlier versions yet.</p>}
                      {versionEntries.map((v: any) => (
                        <button key={v.id} onClick={() => rewindTo(v.id)} disabled={rewindingId === v.id}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">
                          <span className="truncate">{v.label}</span>
                          {rewindingId === v.id ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <RotateCcw className="h-3 w-3 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {kind === "solution" && (
              <button onClick={() => setSectionsOpen(o => !o)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${sectionsOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-muted text-muted-foreground"}`}>
                <Layers className="h-3.5 w-3.5" /> Sections
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-all">
                  <FileDown className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border/60 text-foreground">
                <DropdownMenuItem onClick={copyEntirePrd} className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground">
                  <ClipboardCopy className="h-3.5 w-3.5" /> Copy Entire PRD
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportMarkdown} className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground">
                  <FileText className="h-3.5 w-3.5" /> Export Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson} className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground">
                  <FileJson className="h-3.5 w-3.5" /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPdf} disabled={exportingPdf} className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground">
                  {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={handleRequestBuild}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-1.5 text-xs font-bold text-black transition-all shadow-[0_0_12px_rgba(14,165,233,0.25)]">
              <img src="/assets/images/strx_black.png" alt="" className="h-5 w-5 object-contain" /> Request Build
            </button>
          </div>
          )}
        </div>

        {/* Additional sections panel (solutions only) */}
        <AnimatePresence>
          {kind === "solution" && hasDoc && sectionsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b border-border/40 bg-card/10 overflow-hidden shrink-0">
              <div className="px-5 py-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {EXTRA_SECTIONS.map(({ key, label }) => {
                  const hasContent = Boolean(doc[key]);
                  const isEditing = editingSection === key;
                  return (
                    <div key={key} className="rounded-lg border border-border/40 bg-card/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-foreground">{label}</p>
                        {!isEditing ? (
                          <button onClick={() => startSectionEdit(key)} className="text-[10px] text-primary hover:text-primary/80">
                            {hasContent ? "Edit" : "Add"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingSection(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={() => saveSection(key)} disabled={savingSection} className="text-[10px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50">
                              {savingSection ? "Saving…" : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea value={sectionDraft} onChange={e => setSectionDraft(e.target.value)}
                          className="mt-2 w-full min-h-[120px] bg-background border border-border focus:border-ring rounded-lg p-2.5 text-[11px] font-mono text-foreground focus:outline-none resize-none leading-relaxed" />
                      ) : (
                        <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2 whitespace-pre-wrap">{doc[key] || "Empty."}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document canvas */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div ref={contentRef} className="max-w-3xl mx-auto px-6 py-8 space-y-7">
            {!hasDoc ? (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">{creating ? IDEA_GENERATE_STEPS[Math.min(genStep, IDEA_GENERATE_STEPS.length - 1)].label + "…" : "Generating your PRD from that idea…"}</p>
              </div>
            ) : sections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">This PRD has no content yet.</p>
            ) : (
              sections.map((s, i) => <SectionBlock key={`${s.title}-${i}`} section={s} />)
            )}
          </div>
        </div>
      </ResizablePanel>
      </ResizablePanelGroup>

      {/* ── REQUEST BUILD ──────────────────────────────────────────── */}
      <ContactModal
        isOpen={showBuildRequest}
        onClose={() => setShowBuildRequest(false)}
        context="Build Request"
        initialProblem={hasDoc ? `I'd like to move "${title}" from PRD into Build.` : undefined}
      />
    </div>
  );
}
