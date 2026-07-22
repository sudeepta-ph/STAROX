import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import WebsiteViewer from "./WebsiteViewer";
import Starox1Panel from "./Starox1Panel";
import Starox2Panel from "./Starox2Panel";
import AuthModal from "./AuthModal";
import UsageBar from "./UsageBar";
import { useAnalysisStore } from "@/lib/store";
import { useAuthStore } from "@/lib/authStore";
import type { Starox2Target } from "@/lib/store";

interface SplitIntelligenceProps {
  url: string;
  onBack: () => void;
  initialTab?: Tab;
  agentMode?: "split" | "starox1" | "starox2";
  starox2Target?: Starox2Target | null;
}

type Tab = "starox1" | "starox2";

const SplitIntelligence = ({ url, onBack, initialTab = "starox1", agentMode = "split", starox2Target = null }: SplitIntelligenceProps) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [splitMode] = useState<"vertical" | "horizontal">("vertical");
  const { user, loading: authLoading } = useAuthStore();

  const isStarox1Only = agentMode === "starox1";
  const isStarox2Only = agentMode === "starox2";

  const {
    currentUrl, setCurrentUrl,
    isAnalyzing, isAnalyzingS2,
    startWebsiteAnalysis, startStarox2Analysis, resetForNewUrl,
  } = useAnalysisStore();

  const lastAnalyzedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (isStarox1Only) {
      setActiveTab("starox1");
      return;
    }
    if (isStarox2Only) {
      setActiveTab("starox2");
      return;
    }
    setActiveTab(initialTab);
  }, [initialTab, isStarox1Only, isStarox2Only]);

  useEffect(() => {
    if (!url) return;

    const isNewUrl = lastAnalyzedUrl.current !== null && lastAnalyzedUrl.current !== url;

    if (isNewUrl) {
      resetForNewUrl();
    }

    setCurrentUrl(url);

    if (!authLoading && user) {
      if (isStarox1Only) {
        lastAnalyzedUrl.current = url;
        return;
      }
      if (isStarox2Only) {
        lastAnalyzedUrl.current = url;
        startStarox2Analysis(starox2Target ?? url);
      } else {
        lastAnalyzedUrl.current = url;
        startWebsiteAnalysis(url);
      }
    } else if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [url, authLoading, user, isStarox1Only, isStarox2Only, setCurrentUrl, startWebsiteAnalysis, startStarox2Analysis, starox2Target, resetForNewUrl]);

  const handleRefresh = () => {
    resetForNewUrl();
    lastAnalyzedUrl.current = null;
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (isStarox2Only) {
      startStarox2Analysis(starox2Target ?? url);
      return;
    }
    startWebsiteAnalysis(url);
  };

  const busy = isAnalyzing || isAnalyzingS2;

  return (
    <div className="split-intel-root h-screen flex flex-col bg-background">
      <UsageBar />
      <div className="split-intel-topbar flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-surface/30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
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

          <div className={`split-intel-main ${splitMode === "vertical" ? "split-mode-vertical" : "split-mode-horizontal"} flex-1 flex overflow-hidden`}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className={`split-intel-left shrink-0 ${splitMode === "vertical" ? "w-[55%] border-r border-border/50" : "w-full h-[52%] border-b border-border/50"}`}>
              <WebsiteViewer url={url} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="split-intel-right flex-1 flex flex-col overflow-hidden">
              {activeTab === "starox1" ? <Starox1Panel /> : <Starox2Panel />}
            </motion.div>
          </div>
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default SplitIntelligence;
