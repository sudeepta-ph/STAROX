import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import {
  Copy, Check, Type, Send, Loader2, ChevronDown, ChevronUp, History,
  FileDown, FileJson, FileText, ClipboardCopy, AlertCircle, Sparkles,
} from "lucide-react";
import { getPmxHeaders } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPrdPDF } from "@/lib/pdfExport";
import MermaidDiagram from "./MermaidDiagram";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const THEME_OPTIONS: Record<string, { label: string; options: string[] }> = {
  frontend:     { label: "Frontend",     options: ["React", "Next.js", "Vue", "Angular", "Svelte"] },
  backend:      { label: "Backend",      options: ["Node.js", "NestJS", "FastAPI", "Django", "Go", "Spring Boot"] },
  database:     { label: "Database",     options: ["PostgreSQL", "MySQL", "MongoDB", "Supabase", "Firebase"] },
  cloud:        { label: "Cloud",        options: ["Vercel", "AWS", "GCP", "Azure", "Railway"] },
  authProvider: { label: "Auth",         options: ["Clerk", "Auth0", "Supabase Auth", "Firebase Auth", "Custom JWT"] },
  aiProvider:   { label: "AI Model",     options: ["OpenAI", "Anthropic", "Google Gemini", "None"] },
  architecture: { label: "Architecture", options: ["Monolith", "Modular Monolith", "Microservices", "Serverless"] },
};

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

export default function PrdWorkspace({ doc: initialDoc }: { doc: any }) {
  const { toast } = useToast();
  const [doc, setDoc] = useState(initialDoc);
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => splitSections(doc.markdown), [doc.markdown]);
  const slug = (doc.productName || "prd").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "prd";

  const submitInstruction = async (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setRefineError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/idea/prd/${doc._id}/refine`, {
        method: "POST", headers, body: JSON.stringify({ instruction: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setDoc(json.data);
        setPromptText("");
        toast({ title: "PRD updated", description: json.changeSummary });
      } else {
        setRefineError(json.error || "Failed to update the PRD");
      }
    } catch {
      setRefineError("Failed to update the PRD — check your connection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleThemeChange = (field: string, value: string) => {
    submitInstruction(`Switch ${THEME_OPTIONS[field].label} to ${value}.`);
  };

  const copyEntirePrd = () => { navigator.clipboard.writeText(doc.markdown); toast({ title: "Copied entire PRD" }); };
  const exportMarkdown = () => downloadBlob(doc.markdown, `${slug}.md`, "text/markdown");
  const exportJson = () => downloadBlob(JSON.stringify({ idea: doc.idea, productName: doc.productName, stack: doc.stack, markdown: doc.markdown, history: doc.history, version: doc.version }, null, 2), `${slug}.json`, "application/json");
  const exportPdf = async () => {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try { await exportPrdPDF(contentRef.current, `${slug}.pdf`); }
    catch { toast({ variant: "destructive", title: "PDF export failed" }); }
    finally { setExportingPdf(false); }
  };

  const recentHistory = doc.history?.slice(-4) || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-14 border-b border-border/50 px-5 flex items-center justify-between bg-card/20 shrink-0 gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-foreground truncate">{doc.productName || "Development PRD"}</h2>
          <p className="text-[9px] text-muted-foreground truncate max-w-md">{doc.idea}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] text-muted-foreground font-mono">v{doc.version} · {(doc.tokensUsed || 0).toLocaleString()} tokens</span>
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
        </div>
      </div>

      {/* Theme controls strip */}
      <div className="border-b border-border/40 bg-card/10 px-5 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {Object.entries(THEME_OPTIONS).map(([key, cfg]) => (
          <select
            key={`${key}-${doc.stack?.[key] || ""}`}
            defaultValue=""
            disabled={submitting}
            onChange={(e) => { if (e.target.value) handleThemeChange(key, e.target.value); }}
            className="bg-card border border-border/50 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:border-border focus:outline-none focus:border-primary/40 transition-colors shrink-0 disabled:opacity-50"
          >
            <option value="" disabled>{cfg.label}: {doc.stack?.[key] || "—"}</option>
            {cfg.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Document canvas */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div ref={contentRef} className="max-w-3xl mx-auto px-6 py-8 space-y-7">
          {sections.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-16">This PRD has no content yet.</p>
          ) : (
            sections.map((s, i) => <SectionBlock key={`${s.title}-${i}`} section={s} />)
          )}
        </div>
      </div>

      {/* Bottom AI prompt bar */}
      <div className="border-t border-border/50 bg-card/40 backdrop-blur-sm shrink-0 px-5 py-3 space-y-2">
        {recentHistory.length > 0 && (
          <div>
            <button onClick={() => setHistoryOpen(o => !o)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mb-1.5">
              <History className="h-3 w-3" /> {recentHistory.filter((h: any) => h.role === "user").length} refinement{recentHistory.filter((h: any) => h.role === "user").length === 1 ? "" : "s"}
              {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {historyOpen && (
              <div className="max-h-32 overflow-y-auto space-y-1 mb-2 pr-1">
                {recentHistory.map((h: any, i: number) => (
                  <div key={i} className={`text-[10px] rounded-md px-2 py-1 ${h.role === "user" ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                    {h.role === "user" ? <Sparkles className="h-2.5 w-2.5 inline mr-1" /> : null}{h.content}
                  </div>
                ))}
              </div>
            )}
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
            disabled={submitting}
            placeholder="Refine this PRD — e.g. Use Next.js instead of React, Add Redis, Reduce MVP scope, Add audit logs..."
            className="flex-1 bg-background border border-border focus:border-primary/40 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!promptText.trim() || submitting}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground transition-all shrink-0"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
