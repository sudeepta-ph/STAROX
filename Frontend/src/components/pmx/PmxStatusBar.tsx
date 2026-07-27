import { usePmxStore } from "@/lib/pmxStore";
import { Link } from "react-router-dom";
import {
  Activity, Database, AlertTriangle, Lightbulb, Cpu, Clock, Zap, RefreshCw
} from "lucide-react";

export default function PmxStatusBar() {
  const { inputs, problems, opportunities, evidence, loading } = usePmxStore();

  const criticalCount = problems.filter(p => p.severity === "critical").length;
  const avgConfidence = opportunities.length > 0
    ? Math.round(opportunities.reduce((a, b) => a + b.confidence, 0) / opportunities.length)
    : 0;

  const isActive = loading.pipeline;

  return (
    <div className="h-8 border-b border-border/40 bg-card/20 backdrop-blur-sm flex items-center px-4 gap-0 text-[10px] text-muted-foreground shrink-0 overflow-x-auto scrollbar-none">
      {/* AI Status */}
      <div className={`flex items-center gap-1.5 pr-3 border-r border-border/40 mr-3 ${isActive ? "text-primary" : ""}`}>
        <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary animate-ping" : "bg-muted-foreground/40"}`} />
        <span>{isActive ? "AI analyzing..." : "PMX ready"}</span>
      </div>

      {/* Connectors */}
      <Link to="/pmx/sources" className="flex items-center gap-1 pr-3 border-r border-border/40 mr-3 hover:text-foreground transition-colors">
        <Database className="h-3 w-3" />
        <span>{inputs.length} connectors</span>
      </Link>

      {/* Evidence */}
      <Link to="/pmx/evidence" className="flex items-center gap-1 pr-3 border-r border-border/40 mr-3 hover:text-foreground transition-colors">
        <Activity className="h-3 w-3" />
        <span>{evidence.length} signals</span>
      </Link>

      {/* Problems */}
      <Link to="/pmx/insights" className={`flex items-center gap-1 pr-3 border-r border-border/40 mr-3 hover:text-foreground transition-colors ${criticalCount > 0 ? "text-red-400/70" : ""}`}>
        <AlertTriangle className="h-3 w-3" />
        <span>{problems.length} issues {criticalCount > 0 ? `(${criticalCount} critical)` : ""}</span>
      </Link>

      {/* Opportunities */}
      <Link to="/pmx/insights" className="flex items-center gap-1 pr-3 border-r border-border/40 mr-3 hover:text-foreground transition-colors">
        <Lightbulb className="h-3 w-3" />
        <span>{opportunities.length} opportunities</span>
      </Link>

      {/* AI Confidence */}
      {avgConfidence > 0 && (
        <div className="flex items-center gap-1 pr-3 border-r border-border/40 mr-3">
          <Cpu className="h-3 w-3" />
          <span>AI confidence: {avgConfidence}%</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Last sync */}
      <div className="flex items-center gap-1 text-muted-foreground/50">
        <Clock className="h-3 w-3" />
        <span>Auto-sync enabled</span>
      </div>
    </div>
  );
}
