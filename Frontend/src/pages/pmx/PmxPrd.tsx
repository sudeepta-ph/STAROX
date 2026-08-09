import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { useSidebarStore } from "@/lib/sidebarStore";
import { BookOpen, FileText, Layers, GitMerge, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import PrdWorkspace from "@/components/pmx/PrdWorkspace";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxPrd() {
  const { solutions, projectId, fetchSolutions } = usePmxStore();
  const setHiddenNavPaths = useSidebarStore(s => s.setHiddenNavPaths);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Idea-input entry: the Overview page's idea box hands off the idea text
  // via router state instead of generating server-side before navigating.
  // Captured once (not re-derived from location.state every render) so it
  // survives the state-clearing replace-navigate right below.
  const [ideaInput] = useState<string | null>(() => {
    const st = location.state as any;
    return st?.source === "idea-input" && st?.initialIdea ? String(st.initialIdea) : null;
  });
  const isIdeaInputEntry = ideaInput !== null;

  // Drop the handoff state from history immediately so a refresh, or
  // navigating back to this entry later, doesn't re-trigger generation.
  useEffect(() => {
    if (isIdeaInputEntry) navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only for the idea-input entry path: hide Sources / AI Experience
  // Intelligence / Insights from the shared sidebar nav for this session,
  // restoring them the moment this page is left. Every other entry into
  // /pmx/prd (direct nav, sidebar link, etc.) leaves hiddenNavPaths empty,
  // so the sidebar behaves exactly as it always has.
  useEffect(() => {
    if (!isIdeaInputEntry) return;
    setHiddenNavPaths(["/pmx/sources", "/pmx/analysis", "/pmx/insights"]);
    return () => setHiddenNavPaths([]);
  }, [isIdeaInputEntry, setHiddenNavPaths]);

  // Idea → PRD pipeline output takes priority over Solution Studio
  // blueprints when one exists for this workspace.
  const [ideaPrd, setIdeaPrd] = useState<any>(null);
  const [ideaPrdChecked, setIdeaPrdChecked] = useState(isIdeaInputEntry);
  const [activeSolutionId, setActiveSolutionId] = useState<string | null>(null);
  const [combineMode, setCombineMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<string[]>([]);
  const [combining, setCombining] = useState(false);

  // Switching workspaces via the topbar tab bar doesn't change the route
  // (still /pmx/prd), so this has to re-run on projectId change too —
  // otherwise the page keeps showing the previous workspace's PRD. Skipped
  // on the idea-input entry path: that flow generates its own fresh doc.
  useEffect(() => {
    if (isIdeaInputEntry) return;
    setIdeaPrdChecked(false);
    setIdeaPrd(null);
    setActiveSolutionId(null);
    (async () => {
      try {
        const headers = await getPmxHeaders();
        const res = await fetch(`${API_URL}/pmx/idea/prd/latest?projectId=${encodeURIComponent(projectId)}`, { headers });
        const json = await res.json();
        if (json.success && json.data) setIdeaPrd(json.data);
      } catch { /* fall through to Solution Studio blueprints */ }
      finally { setIdeaPrdChecked(true); }
    })();
  }, [projectId, isIdeaInputEntry]);

  const selectedSolution = solutions.find(s => s._id === (activeSolutionId || solutions[0]?._id));

  const toggleCombineSelect = (id: string) => {
    setSelectedForCombine(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCombine = async () => {
    if (selectedForCombine.length < 2) return;
    setCombining(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/solutions/combine`, {
        method: "POST", headers, body: JSON.stringify({ solutionIds: selectedForCombine }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSolutions();
        setActiveSolutionId(json.data._id);
        setCombineMode(false);
        setSelectedForCombine([]);
        toast({ title: "Unified PRD created", description: `Combined ${selectedForCombine.length} blueprints into "${json.data.title}".` });
      } else {
        toast({ variant: "destructive", title: "Couldn't combine blueprints", description: json.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Couldn't combine blueprints — check your connection" });
    } finally {
      setCombining(false);
    }
  };

  if (isIdeaInputEntry) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
        <PrdWorkspace kind="idea" doc={null} initialIdea={ideaInput!} autoGenerate />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {!ideaPrdChecked ? null : ideaPrd ? (
        <PrdWorkspace
          key={ideaPrd._id}
          doc={ideaPrd}
          kind="idea"
          allDocs={solutions.length > 0 ? [ideaPrd, ...solutions] : [ideaPrd]}
          activeDocId={ideaPrd._id}
          onSelectDoc={(id) => {
            if (id === ideaPrd._id) return;
            setIdeaPrd(null);
            setActiveSolutionId(id);
          }}
        />
      ) : !selectedSolution ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-sky-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No blueprints yet</p>
            <p className="text-xs text-muted-foreground mt-1">Approve an insight, or describe an idea on Overview, to generate your first PRD.</p>
          </div>
          <button
            onClick={() => navigate("/pmx/overview")}
            className="mt-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-black transition-colors"
          >
            Create First PRD →
          </button>
        </div>
      ) : (
        <PrdWorkspace
          key={selectedSolution._id}
          doc={selectedSolution}
          kind="solution"
          allDocs={solutions}
          activeDocId={selectedSolution._id}
          onSelectDoc={(id) => setActiveSolutionId(id)}
          combineMode={combineMode}
          selectedForCombine={selectedForCombine}
          onToggleCombineSelect={toggleCombineSelect}
          onToggleCombineMode={() => { setCombineMode(m => !m); setSelectedForCombine([]); }}
          onExecuteCombine={handleCombine}
          combining={combining}
        />
      )}
    </div>
  );
}
