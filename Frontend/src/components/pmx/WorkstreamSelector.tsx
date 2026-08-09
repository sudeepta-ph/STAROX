import { Check } from "lucide-react";
import { PMX_DEPARTMENTS, type PmxDepartment } from "@/lib/pmxStore";

// One short description per department — the request's own copy for the
// eight it calls out explicitly, written in the same voice for the three
// this app's taxonomy already has beyond that minimum (DevOps, Security,
// Customer Success — "allow additional relevant workstreams if the
// existing application has them").
const WORKSTREAM_DESCRIPTIONS: Record<PmxDepartment, string> = {
  Product: "Scope, prioritization, requirements, and product decisions.",
  Design: "UX/UI exploration, flows, and design deliverables.",
  Engineering: "Build, integrate, and ship the technical work.",
  QA: "Validation, regression testing, and release verification.",
  DevOps: "Infrastructure, deployment pipelines, and environment reliability.",
  Security: "Risk review, access controls, and vulnerability checks.",
  Marketing: "Launch, positioning, campaign, and communication work.",
  Sales: "Adoption, enablement, and customer rollout.",
  "Customer Success": "Onboarding, retention, and ongoing customer outcomes.",
  Support: "Operational readiness, documentation, and sustainment.",
  Leadership: "Alignment, decisions, dependencies, and executive checkpoints.",
};

// Multi-select workstream picker — a custom execution only generates tasks
// for whatever's selected here, nothing else.
export function WorkstreamSelector({ selected, onChange }: {
  selected: string[]; onChange: (departments: string[]) => void;
}) {
  const toggle = (d: string) => onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
      {PMX_DEPARTMENTS.map(d => {
        const active = selected.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={active}
            className={`w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
              active ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30"
            }`}
          >
            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
              active ? "bg-primary border-primary" : "border-border"
            }`}>
              {active && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">{d}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{WORKSTREAM_DESCRIPTIONS[d]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
