import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  Save,
  CheckCircle,
  Database,
  Shield,
  HelpCircle,
  ChevronRight,
  GitFork,
  BookOpen,
  ArrowRight,
  Cpu
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxSolutions() {
  const { solutions, fetchSolutions, fetchTasks } = usePmxStore();
  const { toast } = useToast();

  const [activeSolutionId, setActiveSolutionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"prd" | "techSpecs" | "api" | "db">("prd");
  const [isEditing, setIsEditing] = useState(false);
  const [generatingTickets, setGeneratingTickets] = useState(false);

  // Editor states
  const [prdText, setPrdText] = useState("");
  const [techSpecsText, setTechSpecsText] = useState("");
  const [apiContractsText, setApiContractsText] = useState("");
  const [databaseChangesText, setDatabaseChangesText] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSolution = solutions.find((s) => s._id === (activeSolutionId || (solutions.length > 0 ? solutions[0]._id : null)));

  const handleSelectSolution = (sol: any) => {
    setActiveSolutionId(sol._id);
    setPrdText(sol.prd || "");
    setTechSpecsText(sol.techSpecs || "");
    setApiContractsText(sol.apiContracts || "");
    setDatabaseChangesText(sol.databaseChanges || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedSolution) return;

    setSaving(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/solutions/${selectedSolution._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          prd: prdText,
          techSpecs: techSpecsText,
          apiContracts: apiContractsText,
          databaseChanges: databaseChangesText,
          epic: selectedSolution.epic,
          userStories: selectedSolution.userStories
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Blueprint saved",
          description: `Version updated to v${json.data.version}.`
        });
        setIsEditing(false);
        fetchSolutions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTickets = async () => {
    if (!selectedSolution) return;

    setGeneratingTickets(true);
    toast({
      title: "Generating engineering tickets...",
      description: "AI is parsing specs to map execution plan tickets."
    });

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ solutionId: selectedSolution._id })
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Sprint tickets compiled",
          description: `Logged new developer tasks on Execution Board.`
        });
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingTickets(false);
    }
  };

  // Set default values when solution is loaded
  if (selectedSolution && !prdText && !isEditing) {
    setPrdText(selectedSolution.prd || "");
    setTechSpecsText(selectedSolution.techSpecs || "");
    setApiContractsText(selectedSolution.apiContracts || "");
    setDatabaseChangesText(selectedSolution.databaseChanges || "");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      
      {/* Left List */}
      <div className="w-64 border-r border-zinc-900 bg-zinc-950/20 overflow-y-auto p-4 space-y-3 shrink-0 scrollbar-thin">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-2">Solutions blueprinted</h3>
        
        <div className="space-y-1">
          {solutions.map((sol) => {
            const active = selectedSolution?._id === sol._id;
            return (
              <button
                key={sol._id}
                onClick={() => handleSelectSolution(sol)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition-colors ${
                  active
                    ? "bg-[#18181b] border-sky-500/20 text-white font-medium"
                    : "bg-transparent border-transparent text-zinc-400 hover:bg-[#18181b]/30"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className={`h-4 w-4 shrink-0 ${active ? "text-sky-400" : "text-zinc-500"}`} />
                  <span className="truncate">{sol.title}</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono">v{sol.version}</span>
              </button>
            );
          })}

          {solutions.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-xs">
              Approve a decision to write solution blueprints.
            </div>
          )}
        </div>
      </div>

      {/* Main Studio View */}
      {selectedSolution ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Studio header bar */}
          <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40">
            <div>
              <h2 className="text-xs font-bold text-white">{selectedSolution.title} Blueprint</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Active editing version: <span className="text-zinc-400 font-mono">v{selectedSolution.version}</span></p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateTickets}
                disabled={generatingTickets}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors disabled:opacity-50"
              >
                {generatingTickets ? (
                  <>
                    <div className="h-3 w-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                    <span>Mapping Sprint...</span>
                  </>
                ) : (
                  <>
                    <GitFork className="h-3.5 w-3.5" />
                    <span>Auto-Generate Sprint Tickets</span>
                  </>
                )}
              </button>

              {isEditing ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-1.5 text-xs font-semibold text-black transition-all"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Blueprint</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-zinc-300 transition-all"
                >
                  <span>Edit Blueprint</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs selectors */}
          <div className="flex border-b border-zinc-900/60 px-6 bg-zinc-950/10 gap-2">
            {[
              { id: "prd", label: "Product Requirement Doc (PRD)", icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: "techSpecs", label: "Technical Architecture Specs", icon: <Cpu className="h-3.5 w-3.5" /> },
              { id: "api", label: "API Contracts Schema", icon: <Database className="h-3.5 w-3.5" /> },
              { id: "db", label: "Database changes plan", icon: <Database className="h-3.5 w-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? "border-sky-500 text-sky-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Markdown Content Display / Editor Box */}
          <div className="flex-1 overflow-y-auto p-6 bg-background relative">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {activeTab === "prd" && (
                    <textarea
                      value={prdText}
                      onChange={(e) => setPrdText(e.target.value)}
                      className="w-full h-full min-h-[400px] bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                  {activeTab === "techSpecs" && (
                    <textarea
                      value={techSpecsText}
                      onChange={(e) => setTechSpecsText(e.target.value)}
                      className="w-full h-full min-h-[400px] bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                  {activeTab === "api" && (
                    <textarea
                      value={apiContractsText}
                      onChange={(e) => setApiContractsText(e.target.value)}
                      placeholder="Define request and response payloads..."
                      className="w-full h-full min-h-[400px] bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                  {activeTab === "db" && (
                    <textarea
                      value={databaseChangesText}
                      onChange={(e) => setDatabaseChangesText(e.target.value)}
                      placeholder="Outline collection structure adjustments..."
                      className="w-full h-full min-h-[400px] bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none resize-none leading-relaxed"
                    />
                  )}

                </motion.div>
              ) : (
                <motion.div
                  key="viewer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-4xl space-y-4 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-950/40 p-5 rounded-xl border border-zinc-900"
                >
                  {activeTab === "prd" && (prdText || "Empty Document.")}
                  {activeTab === "techSpecs" && (techSpecsText || "Empty Document.")}
                  {activeTab === "api" && (apiContractsText || "Define API schemas here.")}
                  {activeTab === "db" && (databaseChangesText || "Define Database plans here.")}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs">
          <BookOpen className="h-8 w-8 text-zinc-800 mb-3" />
          No solutions configured yet. Approve a recommendation to create blueprints.
        </div>
      )}

    </div>
  );
}
