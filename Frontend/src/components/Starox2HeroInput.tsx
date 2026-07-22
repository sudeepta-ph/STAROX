import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Github, ArrowRight, ChevronDown } from "lucide-react";
import type { Starox2Target } from "@/lib/store";

interface Starox2HeroInputProps {
  onSubmit: (target: Starox2Target) => void;
}

type Mode = "url" | "github";

export default function Starox2HeroInput({ onSubmit }: Starox2HeroInputProps) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const smoothEase = [0.22, 1, 0.36, 1] as const;

  const handleSubmit = () => {
    setError(null);

    if (mode === "url") {
      if (!url.trim()) { setError("Enter a website URL to continue."); return; }
      const withScheme = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      try { new URL(withScheme); }
      catch { setError("Enter a valid URL."); return; }
      onSubmit({ mode: "url", url: withScheme, runtimeUrl: runtimeUrl.trim() || undefined });
    } else {
      if (!repoUrl.trim()) { setError("Enter a GitHub repository URL."); return; }
      const withScheme = /^https?:\/\//i.test(repoUrl.trim()) ? repoUrl.trim() : `https://github.com/${repoUrl.trim()}`;
      const match = withScheme.match(/github\.com\/([^/]+\/[^/]+)/);
      const fullName = match ? match[1].replace(/\.git$/, "") : undefined;
      onSubmit({
        mode: "github",
        runtimeUrl: runtimeUrl.trim() || undefined,
        repo: { url: withScheme, fullName },
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: smoothEase }}
        className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        {/* Mode toggle */}
        <div className="flex gap-1 mb-4 rounded-xl bg-muted/30 p-1">
          {([["url", "Live URL", Globe], ["github", "GitHub Repo", Github]] as const).map(([m, label, Icon]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Main input */}
        {mode === "url" ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://yourproduct.com"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <button
              onClick={handleSubmit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Github className="h-4 w-4 text-primary" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="github.com/owner/repo"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <button
              onClick={handleSubmit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

        {/* Optional runtime URL */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          {mode === "github" ? "Add live runtime URL (optional)" : "Add optional context"}
        </button>
        {showAdvanced && (
          <input
            type="url"
            value={runtimeUrl}
            onChange={(e) => setRuntimeUrl(e.target.value)}
            placeholder={mode === "github" ? "https://yourapp.vercel.app (optional)" : "Runtime URL override (optional)"}
            className="mt-2 w-full rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
          />
        )}
      </motion.div>
    </div>
  );
}
