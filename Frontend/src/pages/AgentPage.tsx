import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import WebsiteViewer from "@/components/WebsiteViewer";
import Starox1Panel from "@/components/Starox1Panel";
import AuthModal from "@/components/AuthModal";
import UsageBar from "@/components/UsageBar";
import { useAnalysisStore } from "@/lib/store";
import { useAuthStore } from "@/lib/authStore";
import type { Starox2Target } from "@/lib/store";

export default function AgentPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const url = searchParams.get("url") || searchParams.get("runtimeUrl") || "";
  const mode = (searchParams.get("mode") as "url" | "github") || "url";

  let starox2Target: Starox2Target | null = null;
  if (agentId === "starox2") {
    if (mode === "github") {
      starox2Target = {
        mode: "github",
        runtimeUrl: searchParams.get("runtimeUrl") || undefined,
        repo: {
          url: searchParams.get("repoUrl") || undefined,
          fullName: searchParams.get("repoName") || undefined,
          description: searchParams.get("repoDescription") || undefined,
          language: searchParams.get("repoLanguage") || undefined,
          defaultBranch: searchParams.get("repoBranch") || undefined,
          visibility: (searchParams.get("repoVisibility") as "public" | "private") || undefined,
          stars: searchParams.get("repoStars") ? Number(searchParams.get("repoStars")) : undefined,
          forks: searchParams.get("repoForks") ? Number(searchParams.get("repoForks")) : undefined,
          updatedAt: searchParams.get("repoUpdatedAt") || undefined,
        },
      };
    } else {
      starox2Target = { mode: "url", url: url || undefined };
    }
  }

  const agentMode = agentId === "starox2" ? "starox2" : agentId === "starox1" ? "starox1" : "split";
  const isStarox1Only = agentMode === "starox1";
  const isStarox2Only = agentMode === "starox2";

  const handleBack = () => navigate("/pmx");
  const viewerUrl = url || searchParams.get("runtimeUrl") || searchParams.get("repoUrl") || "";

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, loading: authLoading } = useAuthStore();

  const {
    isAnalyzing, isAnalyzingS2,
    setCurrentUrl,
    startWebsiteAnalysis, startStarox2Analysis, resetForNewUrl,
  } = useAnalysisStore();

  const lastAnalyzedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (isStarox1Only) return;
    if (isStarox2Only) return;
  }, [isStarox1Only, isStarox2Only]);

  useEffect(() => {
    if (!viewerUrl) return;

    const isNewUrl = lastAnalyzedUrl.current !== null && lastAnalyzedUrl.current !== viewerUrl;
    if (isNewUrl) resetForNewUrl();

    setCurrentUrl(viewerUrl);

    if (!authLoading && user) {
      if (isStarox1Only) { lastAnalyzedUrl.current = viewerUrl; return; }
      if (isStarox2Only) {
        lastAnalyzedUrl.current = viewerUrl;
        startStarox2Analysis(starox2Target ?? viewerUrl);
      } else {
        lastAnalyzedUrl.current = viewerUrl;
        startWebsiteAnalysis(viewerUrl);
      }
    } else if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [viewerUrl, authLoading, user, isStarox1Only, isStarox2Only, setCurrentUrl, startWebsiteAnalysis, startStarox2Analysis, starox2Target, resetForNewUrl]);

  const handleRefresh = () => {
    resetForNewUrl();
    lastAnalyzedUrl.current = null;
    if (!user) { setAuthModalOpen(true); return; }
    if (isStarox2Only) { startStarox2Analysis(starox2Target ?? viewerUrl); return; }
    startWebsiteAnalysis(viewerUrl);
  };

  const busy = isAnalyzing || isAnalyzingS2;

  return (
    <div className="split-intel-root h-screen flex flex-col bg-background">
      <UsageBar />
      <div className="split-intel-topbar flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-surface/30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to PMX
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={busy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50" title="Re-run analysis">
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isStarox1Only ? (
        <div className="flex-1 overflow-hidden">
          <Starox1Panel />
        </div>
      ) : (
        <>
          {isStarox2Only && (
            <div className="px-4 py-2 border-b border-border/30 bg-surface/20 text-[11px] text-muted-foreground">
              STAROX PMX: review live experience or repository intelligence side-by-side with implementation-ready recommendations.
            </div>
          )}
          <div className="split-intel-main split-mode-vertical flex-1 flex overflow-hidden">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="split-intel-left shrink-0 w-[55%] border-r border-border/50">
              <WebsiteViewer url={viewerUrl} />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="split-intel-right flex-1 flex flex-col overflow-hidden">
              <Starox1Panel />
            </motion.div>
          </div>
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
