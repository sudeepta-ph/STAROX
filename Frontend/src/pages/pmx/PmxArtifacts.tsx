import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Copy,
  Plus,
  X,
  FileCode,
  Sparkles,
  ClipboardCheck,
  Award
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxArtifacts() {
  const { artifacts, fetchArtifacts, solutions, tasks, understanding } = usePmxStore();
  const { toast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("prd");
  const [format, setFormat] = useState("markdown");
  const [compiling, setCompiling] = useState(false);

  const handleCreateArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCompiling(true);
    try {
      // Build content dynamically depending on type selection
      let content = "";
      if (type === "prd") {
        content = `# Product Requirement Document: ${title}\n\n`;
        content += `## 1. Executive Summary\n${understanding?.productSummary?.oneLiner || "Product outline plan."}\n\n`;
        content += `## 2. Target Audience\n${understanding?.targetAudience || "Ideal customer profile details."}\n\n`;
        content += `## 3. Core Features\n`;
        understanding?.coreFeatures.forEach((f: any) => {
          content += `- **${f.name}**: ${f.description} (Priority: ${f.priority})\n`;
        });
        content += `\n## 4. Approved Blueprints\n`;
        solutions.forEach((s) => {
          content += `### ${s.title}\n${s.prd}\n\n`;
        });
      } else if (type === "technical_spec") {
        content = `# Technical Architecture Specification: ${title}\n\n`;
        content += `## 1. System Design Summary\nBased on approved STAROX PMX solution Studio models.\n\n`;
        solutions.forEach((s) => {
          content += `### ${s.title} Specs\n${s.techSpecs}\n\n`;
          if (s.apiContracts) content += `#### API Structure\n${s.apiContracts}\n\n`;
          if (s.databaseChanges) content += `#### Database adjustments\n${s.databaseChanges}\n\n`;
        });
      } else if (type === "sprint_plan") {
        content = `# Sprint Execution Plan: ${title}\n\n`;
        content += `| Task | Category | Estimate | Assignee | Status |\n`;
        content += `| :--- | :--- | :--- | :--- | :--- |\n`;
        tasks.forEach((t) => {
          content += `| ${t.title} | ${t.type} | ${t.timeEstimate} | ${t.assignee || "Dev"} | ${t.status} |\n`;
        });
      } else {
        content = `# Product Strategy Roadmap: ${title}\n\n`;
        content += `## Value Proposition\n${understanding?.valueProposition || "Key offering description."}\n\n`;
        content += `## Personas Mapping\n`;
        understanding?.personas.forEach((p: any) => {
          content += `- **${p.name}** (${p.role}): Pain point: ${p.painPoints.join(", ")}; Goals: ${p.goals.join(", ")}\n`;
        });
      }

      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/artifacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          type,
          content,
          format
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Artifact compiled",
          description: `"${title}" is ready inside the artifacts repository.`
        });
        setTitle("");
        setIsAdding(false);
        fetchArtifacts();
        setSelectedDoc(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = (doc: any) => {
    const blob = new Blob([doc.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, "_").toLowerCase()}.${doc.format === "json" ? "json" : "md"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "File downloaded",
      description: `Saved "${doc.title}" locally.`
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Document contents successfully copied."
    });
  };

  const getDocTypeLabel = (docType: string) => {
    switch (docType) {
      case "prd":
        return "Product Requirements";
      case "technical_spec":
        return "Technical Specifications";
      case "sprint_plan":
        return "Sprint Tasks Details";
      default:
        return "Product Roadmap Strategy";
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      
      {/* Listing left pane */}
      <div className="w-72 border-r border-zinc-900 bg-zinc-950/20 overflow-y-auto p-4 space-y-3 shrink-0 scrollbar-thin">
        <div className="flex justify-between items-center pl-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Compiled Artifacts</h3>
          <button
            onClick={() => setIsAdding(true)}
            className="p-1 rounded bg-sky-500 hover:bg-sky-400 text-black transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {artifacts.map((doc) => {
            const active = selectedDoc?._id === doc._id;
            return (
              <button
                key={doc._id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsAdding(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition-colors ${
                  active
                    ? "bg-[#18181b] border-sky-500/20 text-white font-medium"
                    : "bg-transparent border-transparent text-zinc-400 hover:bg-[#18181b]/30"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className={`h-4 w-4 shrink-0 ${active ? "text-sky-400" : "text-zinc-500"}`} />
                  <span className="truncate">{doc.title}</span>
                </div>
                <span className="text-[9px] text-zinc-500 uppercase font-mono">{doc.format}</span>
              </button>
            );
          })}

          {artifacts.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-xs">
              No artifacts compiled yet. Click compile button.
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace display */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDoc && !isAdding ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40 shrink-0">
              <div>
                <h2 className="text-xs font-bold text-white">{selectedDoc.title}</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Type: <span className="text-zinc-400 capitalize">{selectedDoc.type.replace(/_/g, ' ')}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedDoc.content)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Source"}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-1.5 text-xs font-semibold text-black transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Document display */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              <div className="max-w-4xl rounded-xl border border-zinc-900 bg-zinc-950/50 p-6 font-mono text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed">
                {selectedDoc.content}
              </div>
            </div>
          </div>
        ) : isAdding ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950/10">
            <div className="w-full max-w-md rounded-xl border border-zinc-900 bg-zinc-950 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-sky-400" /> Compile Strategic Document
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateArtifact} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STAROX PMX MVP roadmap v1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Doc Template</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="prd">PRD Document</option>
                      <option value="technical_spec">Technical Architecture Spec</option>
                      <option value="sprint_plan">Sprint Task Sheets</option>
                      <option value="roadmap">Strategic Product Roadmap</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Download Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="markdown">Markdown (.md)</option>
                      <option value="json">JSON format</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={compiling}
                  className="w-full bg-sky-500 text-black font-semibold rounded-lg px-4 py-2 text-xs hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {compiling ? (
                    <>
                      <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Compiling...</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="h-3.5 w-3.5" />
                      <span>Compile Artifact</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs">
            <FileText className="h-8 w-8 text-zinc-800 mb-3" />
            Select an artifact from sidebar or compile a new one.
          </div>
        )}
      </div>

    </div>
  );
}
