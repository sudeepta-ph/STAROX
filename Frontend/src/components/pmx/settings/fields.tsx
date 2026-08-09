import React from "react";
import { Switch } from "@/components/ui/switch";

// ── Shared settings primitives ──────────────────────────────────────────────
// One consistent visual language for every /pmx/settings page: restrained
// surfaces, ~40-44px controls, non-uppercase field labels (uppercase is
// reserved for genuinely-metadata micro-labels), compact rows instead of
// oversized cards.

// Page-level section header — title + one short description line. Used once
// per settings page, at the top.
export function SettingsSection({ title, description, children }: {
  title: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="border-b border-border pb-4">
        <h2 className="text-[22px] font-semibold text-foreground tracking-tight">{title}</h2>
        {description && <p className="text-[13px] text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// Smaller in-page group heading — e.g. "Workspace access", "Invite people"
// within a page that already has its own SettingsSection title above.
export function SettingsGroupHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

// Compact label/description + control row — powers Notifications' toggle
// rows and any other "Label / description ... control" line.
export function SettingsRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Field label + control, non-uppercase.
export function SettingsField({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground/90">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground transition-colors"
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground transition-colors resize-none"
    />
  );
}

// Always w-full internally — for a narrower select, wrap the call site in a
// width-constrained container (e.g. <div className="w-40">) rather than
// passing a conflicting width utility (e.g. "w-auto") via `className`; two
// width utilities in the same class string is an unreliable override and
// can cause the select to size off its longest <option> instead, overflowing
// its row (this bit the Team page's role picker once already).
export function SelectField({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none transition-colors ${className}`}
    >
      {children}
    </select>
  );
}

export function ToggleRow({ value, onChange, label, description, disabled }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description}>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </SettingsRow>
  );
}

// Card container for a related group of fields/rows — subtle border, no glow.
export function SettingsCard({ children, className = "", dashed = false }: {
  children: React.ReactNode; className?: string; dashed?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${dashed ? "border-dashed border-border" : "border-border"} bg-card/30 p-4 ${className}`}>
      {children}
    </div>
  );
}
