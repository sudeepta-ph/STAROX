import React from "react";
import { Check, Minimize2, Sparkles } from "lucide-react";

interface FeatureRow {
  name: string;
  category: "core" | "agents" | "collaboration" | "enterprise";
  free: string | boolean;
  pro: string | boolean;
  max: string | boolean;
  team: string | boolean;
  enterprise: string | boolean;
}

const COMPARISON_DATA: FeatureRow[] = [
  // Core Features
  { name: "AI Chat", category: "core", free: "Basic", pro: "Unlimited", max: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { name: "AI Agents", category: "core", free: "3 Agents", pro: "10+ Agents", max: "All Agents", team: "All Agents", enterprise: "Custom" },
  { name: "Projects", category: "core", free: "Basic", pro: "Unlimited", max: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { name: "Agent Runs", category: "core", free: "50/day", pro: "1,000/day", max: "Unlimited*", team: "Unlimited", enterprise: "Custom" },
  { name: "GitHub Integration", category: "core", free: false, pro: true, max: true, team: "Team Support", enterprise: "Custom Settings" },
  { name: "API Access", category: "core", free: false, pro: false, max: true, team: true, enterprise: "Custom Rate Limit" },

  // Specialized Agents
  { name: "Research Agent", category: "agents", free: false, pro: false, max: true, team: true, enterprise: true },
  { name: "Design Agent", category: "agents", free: false, pro: false, max: true, team: true, enterprise: true },
  { name: "Business Agent", category: "agents", free: false, pro: false, max: true, team: true, enterprise: true },
  { name: "Browser Agent", category: "agents", free: false, pro: false, max: true, team: true, enterprise: true },

  // Team & Collaboration
  { name: "Team Workspace", category: "collaboration", free: false, pro: false, max: false, team: "Shared Workspaces", enterprise: "Multiple Workspaces" },
  { name: "Analytics", category: "collaboration", free: false, pro: false, max: false, team: "Usage Analytics", enterprise: "Detailed Reports" },
  { name: "Priority Support", category: "collaboration", free: false, pro: "Priority", max: "Priority", team: "24/7 Dedicated", enterprise: "Dedicated Manager" },

  // Security & Enterprise
  { name: "SSO", category: "enterprise", free: false, pro: false, max: false, team: false, enterprise: true },
  { name: "Private Deployment", category: "enterprise", free: false, pro: false, max: false, team: false, enterprise: "On-Prem / Hybrid" },
  { name: "Audit Logs", category: "enterprise", free: false, pro: false, max: false, team: false, enterprise: true },
];

function RenderValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Check className="h-3 w-3 text-primary" />
        </div>
      </div>
    );
  }
  if (value === false) {
    return <span className="text-muted-foreground/30">—</span>;
  }
  return <span className="text-foreground/90 font-medium">{value}</span>;
}

export default function ComparisonTable() {
  const categories = [
    { id: "core", label: "Core Capabilities" },
    { id: "agents", label: "Specialized AI Agents" },
    { id: "collaboration", label: "Team & Collaboration" },
    { id: "enterprise", label: "Security & Scale" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold font-display text-foreground sm:text-3xl">
          Compare plans and features
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Review all capabilities of each tier side-by-side to make your choice.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/45 backdrop-blur-xl">
        <table className="w-full min-w-[768px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="py-4 px-6 font-bold text-foreground w-[28%]">Features</th>
              <th className="py-4 px-4 font-bold text-center text-foreground w-[14%]">Free</th>
              <th className="py-4 px-4 font-bold text-center text-foreground w-[14%] bg-primary/4 border-x border-primary/15 relative">
                Pro
                <span className="absolute top-1 right-2 rounded-full bg-primary/12 border border-primary/20 px-1.5 py-0.2 text-[8px] font-bold text-primary">
                  POPULAR
                </span>
              </th>
              <th className="py-4 px-4 font-bold text-center text-foreground w-[14%]">Max</th>
              <th className="py-4 px-4 font-bold text-center text-foreground w-[14%]">Team</th>
              <th className="py-4 px-4 font-bold text-center text-foreground w-[16%]">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <React.Fragment key={cat.id}>
                {/* Category Header */}
                <tr className="border-b border-border/20 bg-muted/5">
                  <td colSpan={6} className="py-3 px-6 font-bold tracking-wider text-primary text-[10px] uppercase">
                    {cat.label}
                  </td>
                </tr>
                {/* Rows under Category */}
                {COMPARISON_DATA.filter((row) => row.category === cat.id).map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/20 hover:bg-surface-hover/30 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-medium text-foreground/80">{row.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      <RenderValue value={row.free} />
                    </td>
                    <td className="py-3.5 px-4 text-center bg-primary/3 border-x border-primary/10">
                      <RenderValue value={row.pro} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RenderValue value={row.max} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RenderValue value={row.team} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RenderValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[10px] text-muted-foreground/60 text-right italic">
        * Max plan: Agent Runs are unlimited under fair use terms.
      </p>
    </div>
  );
}
