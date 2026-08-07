import { motion } from "framer-motion";
import {
  HelpCircle,
  Sparkles,
  Database,
  Fingerprint,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Award,
  Clock,
  Command,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertOctagon
} from "lucide-react";

export default function PmxDocs() {
  const steps = [
    {
      title: "1. Import Source Nodes",
      icon: <Database className="h-5 w-5 text-sky-400" />,
      desc: "Add target data points in the Sources page. PMX can crawl live website maps, GitHub repositories, customer support transcript feeds, or raw document notes."
    },
    {
      title: "2. Trigger AI PM Agent Scan",
      icon: <Sparkles className="h-5 w-5 text-purple-400" />,
      desc: "Click 'Run AI Agent' in the sidebar. The strategist crawls all active sources, synthesizes target personas, and extracts evidence quotes into the Signals ledger."
    },
    {
      title: "3. Assess Risks & Opportunities",
      icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
      desc: "Review Critical Product Risks to identify tech debt or friction points. Adjust estratégica parameters on the Opportunities page to automatically re-calculate RICE scoring priority ranks."
    },
    {
      title: "4. Formulate Recommendations",
      icon: <CheckSquare className="h-5 w-5 text-yellow-400" />,
      desc: "AI lists strategic actions (Build, Improve, Optimize) in the Decisions center. Once you approve a decision, a background task automatically drafts full technical specifications."
    },
    {
      title: "5. Blueprint Spec Blueprints",
      icon: <BookOpen className="h-5 w-5 text-green-400" />,
      desc: "Go to Solution Studio (Solutions) to find detailed specifications including PRDs, user stories, acceptance criteria, database schema tables, API contracts, and security audits."
    },
    {
      title: "6. Map Sprint Kanban Tickets",
      icon: <Award className="h-5 w-5 text-teal-400" />,
      desc: "Click 'Auto-Generate Sprint Tickets' on any solution blueprint. PMX splits the PRD details into modular developer tasks (Frontend UI, API endpoint, Database migration) on the Execution Board."
    },
    {
      title: "7. Compile Artifact Bundles",
      icon: <Clock className="h-5 w-5 text-zinc-400" />,
      desc: "Select completed specs or backlogs in the Artifacts tab to export and download standard Markdown plans to copy directly into GitHub issues or Jira boards."
    }
  ];

  const shortcuts = [
    { keys: "g then o", action: "Go to Overview" },
    { keys: "g then s", action: "Go to Sources" },
    { keys: "g then a", action: "Go to Analysis" },
    { keys: "g then i", action: "Go to Insights" },
    { keys: "g then p", action: "Go to PRD" },
    { keys: "g then x", action: "Go to Execution" },
    { keys: "g then r", action: "Go to Artifacts" },
    { keys: "g then h", action: "Go to History" },
    { keys: "g then ,", action: "Go to Settings" },
    { keys: "Cmd + K / Ctrl + K", action: "Open Command Palette search" }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12 pb-24 font-sans select-text">
      
      {/* Page Header */}
      <div className="border-b border-border/50 pb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
          <HelpCircle className="h-6 w-6 text-sky-400" /> PMX Workspace Documentation
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Welcome to the Flagship Intelligence Platform of STAROX. PMX operates as your co-pilot AI Product Manager, bridging the gap between product strategy, user signals, and development execution.
        </p>
      </div>

      {/* Intro Overview Card */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_65%_at_0%_0%,rgba(56,189,248,0.04)_0%,transparent_50%)]" />
        <div className="relative z-10 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
            <ShieldCheck className="h-4.5 w-4.5 text-sky-400" /> Executive Philosophy
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Unlike static CRUD dashboards that simply log inputs, PMX maintains a **dynamic cascading dependency loop**. Adding evidence automatically surfaces risks, which map to priority opportunity ICE ranks, which generate actionable decisions. Approving a decision authors functional specs (PRDs) that split directly into Kanban sprint tickets. The goal is to reduce cognitive load and move ideas to code in seconds.
          </p>
        </div>
      </div>

      {/* Sequential Guide */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-border/30 pb-2">
          Core AI Strategy Pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className="glass-card p-5 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted border border-border">
                    {step.icon}
                  </div>
                  <h3 className="text-xs font-bold text-white font-mono">{step.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Shortcut Commands */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-border/30 pb-2">
            Keyboard Shortcuts (Linear Style)
          </h2>
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden divide-y divide-border">
            {shortcuts.map((sc, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5 text-[11px] font-mono">
                <span className="text-muted-foreground">{sc.action}</span>
                <kbd className="px-2 py-0.5 rounded-lg bg-muted border border-border text-foreground text-[10px] font-mono shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  {sc.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Warnings */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-border/30 pb-2">
            Troubleshooting & API Status
          </h2>
          <div className="glass-card p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="h-5 w-5 text-red-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans">API Key Credit Exhaustion (402/401/429 Errors)</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  DeepSeek will throw a rate-limit error (429) or invalid key error (401) if misconfigured. PMX implements **automatic exponential backoff retries** and recovery systems inside your <code className="text-red-400 font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded">backend/.env</code> file. Make sure your DeepSeek key is funded at <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300">platform.deepseek.com</a> to restore background sweeps.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2.5 border-t border-border pt-4">
              <Command className="h-5 w-5 text-sky-400 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans">Search Palette Integration</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  You can invoke the command search console at any time by pressing <kbd className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-mono border border-border">Cmd+K</kbd> or <kbd className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-mono border border-border">Ctrl+K</kbd> to jump between sections in the strategy suite.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
