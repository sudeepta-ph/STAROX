import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { usePmxStore } from "@/lib/pmxStore";
import { WorkstreamSelector } from "./WorkstreamSelector";

type Tab = "prd" | "custom";

interface PrdOption {
  id: string;
  title: string;
  kind: "idea" | "solution";
}

// Two first-class ways to populate the Sprint Execution Board — the request
// is explicit that both must be first-class executions in the same system,
// so both paths here end by calling the store actions that already write
// through the same PmxExecutionPlan/PmxExecutionTask models (generateExecution
// for PRD-based, generateCustomExecution for custom — see pmxStore.ts).
export function CreateExecutionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { solutions, ideaPrd, generateExecution, generateCustomExecution, loading } = usePmxStore();
  const generating = loading.executionGenerate;

  const [tab, setTab] = useState<Tab>("prd");
  const [selectedPrdId, setSelectedPrdId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);

  const prdOptions: PrdOption[] = [
    ...(ideaPrd ? [{ id: ideaPrd._id as string, title: (ideaPrd.productName as string) || "Development PRD", kind: "idea" as const }] : []),
    ...solutions.map(s => ({ id: s._id, title: s.title, kind: "solution" as const })),
  ];

  const reset = () => {
    setTab("prd");
    setSelectedPrdId(null);
    setName(""); setGoal(""); setDescription(""); setDepartments([]);
  };

  const handleClose = () => {
    if (generating) return;
    reset();
    onClose();
  };

  const handleCreateFromPrd = async () => {
    const picked = prdOptions.find(p => p.id === selectedPrdId);
    if (!picked) return;
    const ok = await generateExecution(picked.kind === "idea" ? { ideaPrdId: picked.id } : { solutionId: picked.id });
    if (ok) {
      handleClose();
      navigate("/pmx/execution");
    }
  };

  const handleCreateCustom = async () => {
    if (!name.trim() || !goal.trim() || departments.length === 0) return;
    const ok = await generateCustomExecution({
      name: name.trim(),
      goal: goal.trim(),
      description: description.trim() || undefined,
      departments,
    });
    if (ok) {
      handleClose();
      navigate("/pmx/execution");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Create execution</DialogTitle>
          <DialogDescription>
            Turn a product plan into coordinated work, or start a focused execution without a PRD.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setTab("prd")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              tab === "prd" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> From PRD
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              tab === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Custom execution
          </button>
        </div>

        {tab === "prd" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Use an existing PRD to generate execution work.</p>
            {prdOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No PRDs yet — create one from Overview or PRD first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {prdOptions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPrdId(p.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      selectedPrdId === p.id ? "border-primary/40 bg-primary/5 text-foreground font-medium" : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleCreateFromPrd}
              disabled={!selectedPrdId || generating}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold transition-colors"
            >
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Generate execution
            </button>
          </div>
        )}

        {tab === "custom" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Start with a specific outcome instead of a PRD.</p>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/90">Execution name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Improve onboarding conversion"
                className="w-full h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/90">Goal / outcome</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What needs to be accomplished?"
                rows={2}
                className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/90">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context"
                rows={2}
                className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/90">Workstreams</label>
              <WorkstreamSelector selected={departments} onChange={setDepartments} />
            </div>

            <button
              onClick={handleCreateCustom}
              disabled={!name.trim() || !goal.trim() || departments.length === 0 || generating}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold transition-colors"
            >
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create execution
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
