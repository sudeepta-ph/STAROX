import { useAnalysisStore } from "@/lib/store";
import AgentLoadingState from "./AgentLoadingState";
import ProductIntelligenceDashboard from "./ProductIntelligenceDashboard";

export default function Starox1Panel() {
  const { isAnalyzing, analysisProgress, analysisStep, analysisError, starox1, currentUrl } = useAnalysisStore();

  if (analysisError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 px-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-xl">⚠</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Analysis failed</p>
          <p className="text-xs text-muted-foreground max-w-xs">{analysisError}</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <AgentLoadingState
        label={analysisStep || "Analyzing product…"}
        step={currentUrl ? `Analyzing ${currentUrl}` : undefined}
        progress={analysisProgress}
      />
    );
  }

  if (!starox1) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 px-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-2xl">✦</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">STAROX-1 ready</p>
          <p className="text-xs text-muted-foreground max-w-xs">Enter a product URL to generate intelligence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <ProductIntelligenceDashboard data={starox1} />
    </div>
  );
}
