import { useState, useRef, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Link2, Upload, X, FileText, Plug } from "lucide-react";
import { useAnalysisStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

interface ChatInterfaceProps {
  onWebsiteSubmit: (url: string) => void;
}

export default function ChatInterface({ onWebsiteSubmit }: ChatInterfaceProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addUploadedFile, uploadedFiles, setStarox1Inputs, starox1Inputs } = useAnalysisStore();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!url.trim()) {
      setError("Enter a website URL to continue.");
      return;
    }
    setError(null);
    onWebsiteSubmit(url.trim());
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      addUploadedFile({ name: file.name, type: file.type, data: ev.target?.result });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const smoothEase = [0.22, 1, 0.36, 1] as const;

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: smoothEase }}
        className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        {/* URL input row */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={handleKey}
            placeholder="https://yourproduct.com"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={handleSubmit}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mt-2 text-[11px] text-red-400">{error}</p>
        )}

        {/* Divider */}
        <div className="my-3 h-px bg-border/30" />

        {/* Context inputs */}
        <div className="grid gap-2 sm:grid-cols-2">
          <textarea
            value={starox1Inputs.goal}
            onChange={(e) => setStarox1Inputs({ goal: e.target.value })}
            placeholder="Product goal (optional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
          />
          <textarea
            value={starox1Inputs.context}
            onChange={(e) => setStarox1Inputs({ context: e.target.value })}
            placeholder="Business context (optional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
          />
        </div>

        {/* File upload + Connectors */}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Upload className="h-3 w-3" />
            Upload analytics / reviews
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,.json,.pdf" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => navigate("/connectors")}
            className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Plug className="h-3 w-3" />
            Connectors
          </button>
          {uploadedFiles.length > 0 && (
            <span className="ml-auto text-[11px] text-primary/80">{uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} attached</span>
          )}
        </div>

        {/* Attached files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] text-primary">
                <FileText className="h-3 w-3" />
                {f.name}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
