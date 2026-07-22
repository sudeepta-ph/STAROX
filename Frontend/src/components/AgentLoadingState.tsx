import { Loader2 } from "lucide-react";

interface AgentLoadingStateProps {
  label?: string;
  step?: string;
  progress?: number;
}

export default function AgentLoadingState({ label = "Analyzing…", step, progress }: AgentLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-6 px-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-20 w-20 rounded-full border border-primary/20 animate-ping opacity-20" />
        <div className="h-14 w-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {step && <p className="text-xs text-muted-foreground">{step}</p>}
      </div>
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground/60 mt-1">{Math.round(progress)}%</p>
        </div>
      )}
    </div>
  );
}
