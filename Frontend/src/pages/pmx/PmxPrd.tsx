import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, Save, Database, Shield, BookOpen, GitFork,
  Cpu, CheckSquare, AlertCircle, Map, List, Code2, Github,
  ArrowRight, CheckCircle2, Loader2, ExternalLink, Zap, Circle, Lock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const TABS = [
  { id: "summary",   label: "Executive Summary",      icon: BookOpen   },
  { id: "prd",       label: "PRD",                    icon: FileText   },
  { id: "stories",   label: "User Stories",           icon: List       },
  { id: "tech",      label: "Technical Architecture", icon: Cpu        },
  { id: "api",       label: "API Contracts",          icon: Code2      },
  { id: "db",        label: "Database Design",        icon: Database   },
  { id: "edge",      label: "Edge Cases",             icon: AlertCircle},
  { id: "security",  label: "Security",               icon: Shield     },
  { id: "milestones",label: "Milestones & Sprint",    icon: Map        },
  { id: "checklist", label: "Launch Checklist",       icon: CheckSquare},
] as const;
type TabId = typeof TABS[number]["id"];

// Go to Develop progress steps
const DEVELOP_STEPS = [
  { id: "connect",   label: "Repository Connected" },
  { id: "read",      label: "Reading Codebase" },
  { id: "arch",      label: "Understanding Architecture" },
  { id: "plan",      label: "Generating Implementation Plan" },
  { id: "tasks",     label: "Creating Tasks" },
  { id: "code",      label: "Writing Code" },
  { id: "pr",        label: "Creating Pull Requests" },
  { id: "review",    label: "Ready for Review" },
];

type DevelopStage = "idle" | "connect" | "running" | "done";

export default function PmxPrd() {
  const { solutions, fetchSolutions, fetchTasks } = usePmxStore();
  const { toast } = useToast();

  const [activeSolutionId, setActiveSolutionId] = useState<string | null>(null);
  const [activeTab, setActiveTab]               = useState<TabId>("summary");
  const [isEditing, setIsEditing]               = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [generatingTickets, setGeneratingTickets] = useState(false);
  const [developStage, setDevelopStage]         = useState<DevelopStage>("idle");
  const [developStep, setDevelopStep]           = useState(0);
  const [repoUrl, setRepoUrl]                   = useState("");
  const [editorState, setEditorState]           = useState<Record<string, string>>({});

  const selectedSolution = solutions.find(s => s._id === (activeSolutionId || solutions[0]?._id));

  const loadSolution = (sol: any) => {
    setActiveSolutionId(sol._id);
    setEditorState({
      prd:              sol.prd              || "",
      techSpecs:        sol.techSpecs        || "",
      apiContracts:     sol.apiContracts     || "",
      databaseChanges:  sol.databaseChanges  || "",
      edgeCases:        (sol as any).edgeCases        || "",
      securityNotes:    (sol as any).securityNotes    || "",
      uxImprovements:   (sol as any).uxImprovements   || "",
    });
    setIsEditing(false);
    setDevelopStage("idle");
  };

  if (selectedSolution && !editorState.prd && !isEditing) {
    loadSolution(selectedSolution);
  }

  const fieldForTab: Record<TabId, string | null> = {
    summary:    "prd",
    prd:        "prd",
    stories:    null,
    tech:       "techSpecs",
    api:        "apiContracts",
    db:         "databaseChanges",
    edge:       "edgeCases",
    security:   "securityNotes",
    milestones: "uxImprovements",
    checklist:  null,
  };

  const getContent = () => {
    const field = fieldForTab[activeTab];
    if (!field || !selectedSolution) return "";
    return isEditing ? (editorState[field] || "") : ((selectedSolution as any)[field] || "");
  };

  const setContent = (val: string) => {
    const field = fieldForTab[activeTab];
    if (field) setEditorState(s => ({ ...s, [field]: val }));
  };

  const handleSave = async () => {
    if (!selectedSolution) return;
    setSaving(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/solutions/${selectedSolution._id}`, {
        method: "PUT", headers,
        body: JSON.stringify({ ...editorState, epic: selectedSolution.epic, userStories: selectedSolution.userStories }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Saved", description: `Blueprint v${json.data.version} updated.` });
        setIsEditing(false); fetchSolutions();
      }
    } catch { toast({ variant: "destructive", title: "Error saving." }); }
    finally { setSaving(false); }
  };

  const handleGenerateTickets = async () => {
    if (!selectedSolution) return;
    setGeneratingTickets(true);
    toast({ title: "Generating sprint tickets…" });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks/generate`, {
        method: "POST", headers,
        body: JSON.stringify({ solutionId: selectedSolution._id }),
      });
      const json = await res.json();
      if (json.success) { toast({ title: "Sprint tickets created" }); fetchTasks(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setGeneratingTickets(false); }
  };

  // Simulate "Go to Develop" progress
  const handleGoToDevelop = () => {
    if (!repoUrl.trim()) { setDevelopStage("connect"); return; }
    startDevelopFlow();
  };

  const startDevelopFlow = () => {
    setDevelopStage("running");
    setDevelopStep(0);
    const total = DEVELOP_STEPS.length;
    let step = 0;
    const advance = () => {
      step++;
      setDevelopStep(step);
      if (step < total) setTimeout(advance, 900);
      else setDevelopStage("done");
    };
    setTimeout(advance, 900);
  };

  // ── Render user stories ─────────────────────────────────────────
  const renderStories = () => {
    if (!selectedSolution?.userStories?.length)
      return <EmptyTab label="No user stories yet." />;
    return (
      <div className="space-y-3 max-w-3xl">
        {selectedSolution.userStories.map((us, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded shrink-0">US-{String(i + 1).padStart(2, "0")}</span>
              <p className="text-xs font-medium text-foreground">{us.story}</p>
            </div>
            {us.acceptanceCriteria && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 ml-7">
                <p className="text-[9px] text-primary uppercase tracking-wider font-bold mb-1">Acceptance Criteria</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{us.acceptanceCriteria}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Render launch checklist ─────────────────────────────────────
  const renderChecklist = () => (
    <div className="space-y-2 max-w-xl">
      {[
        "PRD written and stakeholder-reviewed",
        "Technical architecture approved",
        "API contracts defined",
        "Database schema reviewed",
        "Security checklist completed",
        "Edge cases documented",
        "Sprint tickets generated",
        "Acceptance criteria set",
        "Deployment plan ready",
        "Monitoring & alerts configured",
        "Stakeholder sign-off obtained",
        "Go to Develop initiated",
      ].map((item, i) => (
        <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30 hover:bg-card/60 cursor-pointer transition-all">
          <input type="checkbox" className="rounded border-border accent-sky-500 h-3.5 w-3.5" />
          <span className="text-xs text-foreground/80">{item}</span>
        </label>
      ))}
    </div>
  );

  // ── Summary tab content ─────────────────────────────────────────
  const renderSummary = () => {
    if (!selectedSolution) return <EmptyTab label="No blueprint selected." />;
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{selectedSolution.title}</h2>
              <p className="text-[10px] text-primary/70 mt-0.5">Blueprint v{selectedSolution.version} · AI-generated</p>
            </div>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{selectedSolution.epic || "Click the PRD tab to view full product requirements."}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "User Stories",     value: selectedSolution.userStories?.length || 0, color: "text-blue-400" },
            { label: "Version",          value: `v${selectedSolution.version}`,             color: "text-purple-400" },
            { label: "Sections Ready",   value: Object.values(editorState).filter(Boolean).length, color: "text-green-400" },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border/40 bg-card/40 p-4 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Sections</p>
          {TABS.filter(t => t.id !== "summary" && t.id !== "checklist").map(tab => {
            const field = fieldForTab[tab.id];
            const hasContent = field ? Boolean((selectedSolution as any)[field]) : false;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card/20">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${hasContent ? "text-primary" : "text-muted-foreground/40"}`} />
                <span className="text-xs text-foreground/80 flex-1">{tab.label}</span>
                {hasContent
                  ? <span className="text-[9px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">Ready</span>
                  : <span className="text-[9px] text-muted-foreground">Empty</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">

      {/* ── LEFT: Solution list ───────────────────────────────── */}
      <div className="w-60 border-r border-border/50 bg-card/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product Blueprints</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {solutions.length === 0 && (
            <div className="text-center py-12 px-3 text-muted-foreground space-y-2">
              <BookOpen className="h-7 w-7 text-border mx-auto" />
              <p className="text-[10px] leading-relaxed">Approve an insight to auto-generate a PRD blueprint.</p>
            </div>
          )}
          {solutions.map(sol => {
            const active = selectedSolution?._id === sol._id;
            return (
              <button key={sol._id} onClick={() => loadSolution(sol)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${active ? "bg-card border-primary/20 text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-card/40 hover:text-foreground"}`}>
                <div className="flex items-start gap-2">
                  <FileText className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{sol.title}</p>
                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5">v{sol.version}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN STUDIO ──────────────────────────────────────── */}
      {selectedSolution ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Studio topbar */}
          <div className="h-14 border-b border-border/50 px-5 flex items-center justify-between bg-card/20 shrink-0 gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate">{selectedSolution.title}</h2>
              <p className="text-[9px] text-muted-foreground">Blueprint <span className="font-mono text-primary">v{selectedSolution.version}</span></p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleGenerateTickets} disabled={generatingTickets}
                className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all disabled:opacity-50">
                {generatingTickets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitFork className="h-3.5 w-3.5" />}
                Generate Tickets
              </button>
              {isEditing ? (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all">
                  <Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all">
                  Edit
                </button>
              )}
              {/* Go to Develop CTA */}
              <button onClick={handleGoToDevelop}
                className="flex items-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-400 px-4 py-1.5 text-xs font-bold text-black transition-all shadow-[0_0_12px_rgba(34,197,94,0.25)]">
                <Zap className="h-3.5 w-3.5" /> Go to Develop
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex border-b border-border/40 bg-card/10 overflow-x-auto scrollbar-none shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3.5 text-[11px] font-medium border-b-2 flex items-center gap-1.5 shrink-0 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 bg-background scrollbar-thin">
            <AnimatePresence mode="wait">
              {activeTab === "summary" ? (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {renderSummary()}
                </motion.div>
              ) : activeTab === "stories" ? (
                <motion.div key="stories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {renderStories()}
                </motion.div>
              ) : activeTab === "checklist" ? (
                <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {renderChecklist()}
                </motion.div>
              ) : isEditing ? (
                <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <textarea value={getContent()} onChange={e => setContent(e.target.value)}
                    placeholder={`Enter ${TABS.find(t => t.id === activeTab)?.label} content…`}
                    className="w-full min-h-[500px] bg-card border border-border focus:border-ring rounded-xl p-4 text-xs font-mono text-foreground focus:outline-none resize-none leading-relaxed" />
                </motion.div>
              ) : (
                <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {getContent()
                    ? <div className="max-w-3xl bg-card/30 border border-border/40 rounded-xl p-5 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{getContent()}</div>
                    : <EmptyTab label={`No ${TABS.find(t => t.id === activeTab)?.label} content yet.`} />
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No blueprints yet</p>
            <p className="text-xs text-muted-foreground mt-1">Approve an insight to auto-generate your first PRD.</p>
          </div>
        </div>
      )}

      {/* ── GO TO DEVELOP OVERLAY ────────────────────────────── */}
      <AnimatePresence>
        {(developStage === "connect" || developStage === "running" || developStage === "done") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (developStage !== "running") setDevelopStage("idle"); }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

            <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-5">

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Zap className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Go to Develop</h3>
                  <p className="text-[10px] text-muted-foreground">Send this PRD to STAROX Develop for autonomous implementation</p>
                </div>
              </div>

              {/* Connect repo step */}
              {developStage === "connect" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-foreground/60" />
                      <p className="text-xs font-semibold text-foreground">Connect GitHub Repository</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      PMX will push the approved PRD into your repository, generate implementation tasks, and start AI-assisted development automatically.
                    </p>
                    <input type="url" placeholder="https://github.com/org/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                      className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: Lock,         label: "Repository access",         desc: "Read & write permissions" },
                      { icon: Github,       label: "Validate permissions",      desc: "Confirm write access" },
                      { icon: Zap,          label: "Send PRD to Develop",       desc: "Inject blueprint into repo" },
                      { icon: CheckSquare,  label: "Generate implementation",   desc: "Tasks, tickets, code" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-card/40 border border-border/30">
                        <step.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">{step.label}</p>
                          <p className="text-[9px] text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setDevelopStage("idle")}
                      className="flex-1 rounded-lg border border-border hover:bg-muted py-2 text-xs font-medium text-muted-foreground transition-all">
                      Cancel
                    </button>
                    <button onClick={startDevelopFlow} disabled={!repoUrl.trim()}
                      className="flex-1 rounded-lg bg-green-500 hover:bg-green-400 py-2 text-xs font-bold text-black transition-all disabled:opacity-40">
                      Connect & Deploy
                    </button>
                  </div>
                </div>
              )}

              {/* Running progress */}
              {developStage === "running" && (
                <div className="space-y-3">
                  {DEVELOP_STEPS.map((step, i) => {
                    const done    = i < developStep;
                    const active  = i === developStep;
                    const pending = i > developStep;
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                          {done   && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                          {active && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                          {pending && <Circle className="h-5 w-5 text-border" />}
                        </div>
                        <span className={`text-xs transition-colors ${done ? "text-green-400 font-medium" : active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                        {done && <span className="ml-auto text-[9px] text-green-400">✓</span>}
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-green-500" animate={{ width: `${(developStep / DEVELOP_STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Done */}
              {developStage === "done" && (
                <div className="space-y-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Ready for Review</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PRD injected · Tasks created · Pull requests opened · Code generation in progress
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {DEVELOP_STEPS.map(step => (
                      <div key={step.id} className="flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{step.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setDevelopStage("idle")}
                      className="flex-1 rounded-lg border border-border hover:bg-muted py-2 text-xs font-medium text-muted-foreground transition-all">
                      Close
                    </button>
                    <a href={repoUrl || "#"} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-400 py-2 text-xs font-bold text-black transition-all">
                      <Github className="h-3.5 w-3.5" /> Open Repository
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────
function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
      <Sparkles className="h-6 w-6 text-border" />
      <p className="text-xs">{label}</p>
    </div>
  );
}
