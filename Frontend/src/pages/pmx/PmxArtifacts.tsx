import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Award,
  Database,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generatePdfBlob } from "@/lib/pdf/PmxDocumentPdf";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxArtifacts() {
  const { artifacts, fetchArtifacts, inputs, loading, projectId } = usePmxStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("prd");
  const [format, setFormat] = useState("markdown");
  const [compiling, setCompiling] = useState(false);

  // Compilation is server-side and AI-driven: the backend pulls the PRD,
  // evidence, problems, opportunities, decisions, connected sources, UI
  // analysis, and sprint tasks for this workspace and synthesizes one
  // cohesive document — rather than the client stitching together whatever
  // fields happened to already be loaded in the store.
  const handleCreateArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCompiling(true);
    toast({ title: "Compiling artifact…", description: "Pulling in the PRD, analysis, and sources — this can take up to a minute." });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/artifacts/compile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId, title, type, format }),
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
      } else {
        toast({ variant: "destructive", title: "Couldn't compile artifact", description: json.error });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't compile artifact — check your connection" });
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = async (doc: any) => {
    if (doc.format === "markdown") {
      try {
        const blob = await generatePdfBlob(doc.title, doc.content);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${doc.title.replace(/\s+/g, "_").toLowerCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "File downloaded", description: `Saved "${doc.title}" locally.` });
      } catch {
        toast({ variant: "destructive", title: "PDF export failed" });
      }
      return;
    }

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

  // Compiled artifacts pull from the analysis pipeline (understanding,
  // solutions, tasks) — an idea-only workspace has none of that, so route
  // people to connect a source first instead of a compile form with nothing
  // to compile from.
  if (!loading.inputs && inputs.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-center px-6 bg-background">
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-bold text-foreground">No sources yet</h2>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Connect a source and run analysis so there's product intelligence to compile into an artifact.
        </p>
        <button
          onClick={() => navigate("/pmx/sources")}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-medium text-primary-foreground transition-all"
        >
          Connect a source <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">

      {/* Listing left pane */}
      <div className="w-72 border-r border-border/50 bg-card/10 overflow-y-auto p-4 space-y-3 shrink-0 scrollbar-thin">
        <div className="flex justify-between items-center pl-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Compiled Artifacts</h3>
          <button
            onClick={() => setIsAdding(true)}
            className="p-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
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
                    ? "bg-primary/10 border-primary/20 text-foreground font-medium"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{doc.title}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase font-mono">{doc.format}</span>
              </button>
            );
          })}

          {artifacts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-xs">
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
            <div className="h-14 border-b border-border/50 px-6 flex items-center justify-between bg-card/20 shrink-0">
              <div>
                <h2 className="text-xs font-bold text-foreground">{selectedDoc.title}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Type: <span className="text-foreground/70 capitalize">{selectedDoc.type.replace(/_/g, ' ')}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedDoc.content)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors"
                >
                  {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Source"}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Document display */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              <div className="max-w-4xl rounded-xl border border-border/40 bg-card/30 p-6 font-mono text-foreground/80 text-xs whitespace-pre-wrap leading-relaxed">
                {selectedDoc.content}
              </div>
            </div>
          </div>
        ) : isAdding ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Compile Strategic Document
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateArtifact} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STAROX PMX MVP roadmap v1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Doc Template</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="prd">PRD Document</option>
                      <option value="technical_spec">Technical Architecture Spec</option>
                      <option value="sprint_plan">Sprint Task Sheets</option>
                      <option value="roadmap">Strategic Product Roadmap</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Download Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="markdown">Markdown (.md)</option>
                      <option value="json">JSON format</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={compiling}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-2 text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {compiling ? (
                    <>
                      <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs">
            <FileText className="h-8 w-8 text-border mb-3" />
            Select an artifact from sidebar or compile a new one.
          </div>
        )}
      </div>

    </div>
  );
}
