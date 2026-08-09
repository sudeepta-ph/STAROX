import { AlertTriangle } from "lucide-react";

// Isolated, visually distinct destructive-action card — never placed next to
// normal fields. Kept compact (not oversized) per the settings design system.
export function DangerZone({ title = "Danger Zone", description, actionLabel, onAction, actionDisabled, actionBusy, note }: {
  title?: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  actionBusy?: boolean;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-4 space-y-2.5">
      <p className="text-[13px] font-semibold text-destructive flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" /> {title}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      {note ? (
        <p className="text-xs text-muted-foreground/70 italic">{note}</p>
      ) : (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="rounded-lg border border-destructive/30 bg-background hover:bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionBusy ? "Working…" : actionLabel}
        </button>
      )}
    </div>
  );
}
