import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, Save, Database, Shield, BookOpen, GitFork, Cpu,
  CheckSquare, AlertCircle, Map, Clock, List, Code2, Layers, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const TABS = [
  { id: "prd",          label: "Executive Summary / PRD",    icon: BookOpen,    field: "prd" },
  { id: "userStories",  label: "User Stories",               icon: List,        field: "userStories" },
  { id: "techSpecs",    label: "Technical Architecture",     icon: Cpu,         field: "techSpecs" },
  { id: "api",          label: "API Contracts",              icon: Code2,       field: "apiContracts" },
  { id: "db",           label: "Database Design",            icon: Database,    field: "databaseChanges" },
  { id: "edgeCases",    label: "Edge Cases",                 icon: AlertCircle, field: "edgeCases" },
  { id: "security",     label: "Security & Risks",           icon: Shield,      field: "securityNotes" },
  { id: "timeline",     label: "Timeline & Roadmap",         icon: Map,         field: "uxImprovements" },
  { id: "checklist",    label: "Engineering Checklist",      icon: CheckSquare, field: null },
] as const;

type TabId = typeof TABS[number]["id"];

export default function PmxSolutions() {
  const { solutions, fetchSolutions, fetchTasks } = usePmxStore();
  const { toast } = useToast();

  const [activeSolutionId, setActiveSolutionId] = useState<string | null>(null);
  const [activeTab, setActiveTab]               = useState<TabId>("prd");
  const [isEditing, setIsEditing]               = useState(false);
  const [generatingTickets, setGeneratingTickets] = useState(false);
  const [regenerating, setRegenerating]         = useState<string | null>(null);

  const [editorState, setEditorState] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const selectedSolution = solutions.find(s => s._id === (activeSolutionId || solutions[0]?._id));

  const handleSelectSolution = (sol: any) => {
    setActiveSolutionId(sol._id);
    setEditorState({ prd: sol.prd || "", techSpecs: sol.techSpecs || "", apiContracts: sol.apiContracts || "", databaseChanges: sol.databaseChanges || "", edgeCases: sol.edgeCases || "", securityNotes: sol.securityNotes || "", uxImprovements: sol.uxImprovements || "" });
    setIsEditing(false);
  };

  const getTabContent = () => {
    if (!selectedSolution) return "";
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab || !tab.field) return "";
    if (isEditing) return editorState[tab.field] || "";
    return (selectedSolution as any)[tab.field] || "";
  };

  const handleTabEdit = (val: string) => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab?.field) return;
    setEditorState(s => ({ ...s, [tab.field!]: val }));
  };

  const handleSave = async () => {
    if (!selectedSolution) return;
    setSaving(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/solutions/${selectedSolution._id}`, { method: "PUT", headers, body: JSON.stringify({ ...editorState, epic: selectedSolution.epic, userStories: selectedSolution.userStories }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Saved", description: `Blueprint v${json.data.version} updated.` }); setIsEditing(false); fetchSolutions(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSaving(false); }
  };

  const handleGenerateTickets = async () => {
    if (!selectedSolution) return;
    setGeneratingTickets(true);
    toast({ title: "Generating sprint tickets...", description: "AI is parsing specs." });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks/generate`, { method: "POST", headers, body: JSON.stringify({ solutionId: selectedSolution._id }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Sprint tickets created" }); fetchTasks(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setGeneratingTickets(false); }
  };

  // Set initial editor state when solution is loaded
  if (selectedSolution && !editorState.prd && !isEditing) {
    setEditorState({ prd: selectedSolution.prd || "", techSpecs: selectedSolution.techSpecs || "", apiContracts: selectedSolution.apiContracts || "", databaseChanges: selectedSolution.databaseChanges || "", edgeCases: (selectedSolution as any).edgeCases || "", securityNotes: (selectedSolution as any).securityNotes || "", uxImprovements: (selectedSolution as any).uxImprovements || "" });
  }

  const renderUserStories = () => {
    if (!selectedSolution?.userStories?.length) return <p className="text-muted-foreground text-xs py-8 text-center">No user stories generated yet.</p>;
    return (
      <div className="space-y-3">
        {selectedSolution.userStories.map((us, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-2">
            <p className="text-xs font-medium text-foreground">{us.story}</p>
            {us.acceptanceCriteria && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-[9px] text-primary uppercase tracking-wider font-bold mb-1">Acceptance Criteria</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{us.acceptanceCriteria}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderChecklist = () => (
    <div className="space-y-2">
      {["PRD written and reviewed","Technical architecture approved","API contracts defined","Database schema reviewed","Security checklist completed","Edge cases documented","Sprint tickets generated","QA acceptance criteria set","Deployment plan ready","Stakeholder sign-off"].map((item, i) => (
        <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-card/40 cursor-pointer transition-all">
          <input type="checkbox" className="rounded border-border accent-sky-500" />
          <span className="text-xs text-foreground/80">{item}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Left solution list */}
      <div className="w-64 border-r border-border/50 bg-card/10 overflow-y-auto p-4 space-y-3 shrink-0 scrollbar-thin">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Solution Blueprints</h3>
        {solutions.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-xs leading-relaxed">
            <BookOpen className="h-7 w-7 text-border mx-auto mb-2" />
            Approve a decision to generate solution blueprints.
          </div>
        )}
        <div className="space-y-1">
          {solutions.map(sol => {
            const active = selectedSolution?._id === sol._id;
            return (
              <button key={sol._id} onClick={() => handleSelectSolution(sol)}
                className={`w-full text-left p-3 rounded-lg border text-xs flex justify-between items-center transition-all ${active ? "bg-card border-primary/20 text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-card/40"}`}>
                <div className="flex items-center gap-2 truncate">
                  <FileText className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{sol.title}</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono shrink-0">v{sol.version}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main studio */}
      {selectedSolution ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Studio header */}
          <div className="h-14 border-b border-border/50 px-6 flex items-center justify-between bg-card/20 shrink-0">
            <div>
              <h2 className="text-xs font-bold text-foreground">{selectedSolution.title}</h2>
              <p className="text-[10px] text-muted-foreground">Blueprint <span className="font-mono text-primary">v{selectedSolution.version}</span> · AI-generated</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleGenerateTickets} disabled={generatingTickets}
                className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all disabled:opacity-50">
                {generatingTickets ? <div className="h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : <GitFork className="h-3.5 w-3.5" />}
                Generate Sprint Tickets
              </button>
              {isEditing ? (
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all">
                  <Save className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save Blueprint"}
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all">
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex border-b border-border/40 px-4 bg-card/10 overflow-x-auto scrollbar-none shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3 text-[11px] font-medium border-b-2 flex items-center gap-1.5 transition-all shrink-0 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <AnimatePresence mode="wait">
              {activeTab === "userStories" ? (
                <motion.div key="userStories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderUserStories()}</motion.div>
              ) : activeTab === "checklist" ? (
                <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderChecklist()}</motion.div>
              ) : isEditing ? (
                <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <textarea value={getTabContent()} onChange={e => handleTabEdit(e.target.value)} placeholder={`Enter ${TABS.find(t => t.id === activeTab)?.label} content...`}
                    className="w-full min-h-[500px] bg-card border border-border focus:border-ring rounded-xl p-4 text-xs font-mono text-foreground focus:outline-none resize-none leading-relaxed" />
                </motion.div>
              ) : (
                <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {getTabContent() ? (
                    <div className="max-w-4xl bg-card/30 border border-border/40 rounded-xl p-5 text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
                      {getTabContent()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <Sparkles className="h-7 w-7 text-border" />
                      <p className="text-xs">No content yet. Click Edit to add or regenerate.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <BookOpen className="h-8 w-8 text-border" />
          <p className="text-xs">No solutions yet. Approve a decision to create blueprints.</p>
        </div>
      )}
    </div>
  );
}
