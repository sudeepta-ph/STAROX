import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { Settings, Save, Sparkles, User, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxSettings() {
  const { understanding, fetchUnderstanding } = usePmxStore();
  const { toast } = useToast();

  const [name, setName] = useState(understanding?.productSummary?.name || "STAROX Product");
  const [oneLiner, setOneLiner] = useState(understanding?.productSummary?.oneLiner || "");
  const [category, setCategory] = useState(understanding?.productSummary?.category || "SaaS");
  const [stage, setStage] = useState(understanding?.productSummary?.stage || "idea");
  const [businessModel, setBusinessModel] = useState(understanding?.businessModel || "");
  const [targetAudience, setTargetAudience] = useState(understanding?.targetAudience || "");
  const [valueProposition, setValueProposition] = useState(understanding?.valueProposition || "");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [saving, setSaving] = useState(false);

  // Set defaults if loaded
  if (understanding && !oneLiner && !saving) {
    setName(understanding.productSummary.name || "STAROX Product");
    setOneLiner(understanding.productSummary.oneLiner || "");
    setCategory(understanding.productSummary.category || "SaaS");
    setStage(understanding.productSummary.stage || "idea");
    setBusinessModel(understanding.businessModel || "");
    setTargetAudience(understanding.targetAudience || "");
    setValueProposition(understanding.valueProposition || "");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/understanding`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          productSummary: { name, oneLiner, category, stage },
          businessModel,
          targetAudience,
          valueProposition,
          coreFeatures: understanding?.coreFeatures || [],
          personas: understanding?.personas || [],
          customerSegments: understanding?.customerSegments || [],
          businessGoals: understanding?.businessGoals || [],
          customerJourney: understanding?.customerJourney || []
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Settings saved",
          description: "Workspace parameters updated successfully."
        });
        fetchUnderstanding();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-16">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-sky-400" /> PMX Workspace Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure product strategy parameters, targets, and default AI models.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Product Details Card */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white border-b border-zinc-900 pb-2">
            Product Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Product Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Elevator One-liner</label>
            <input
              type="text"
              required
              value={oneLiner}
              onChange={(e) => setOneLiner(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Product Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="idea">Idea Stage</option>
                <option value="mvp">MVP Stage</option>
                <option value="growth">Growth/Scale Stage</option>
                <option value="scale">Enterprise Scale</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Monetization / Business Model</label>
              <input
                type="text"
                required
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Strategy Details Card */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white border-b border-zinc-900 pb-2">
            Target Strategy & Audience
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Target Audience summary</label>
            <textarea
              rows={3}
              required
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Core Value Proposition</label>
            <textarea
              rows={3}
              required
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Model Overrides Card */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white border-b border-zinc-900 pb-2">
            AI Engine Configurations
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active LLM Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="openai/gpt-4o-mini">GPT 4o Mini (Default - Optimized Speed)</option>
              <option value="openai/gpt-4o">GPT 4o (Thorough Strategy)</option>
              <option value="anthropic/claude-3-haiku">Claude 3.5 Sonnet (Elite PRD Output)</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-5 py-2 text-xs font-semibold text-black transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving Workspace..." : "Save Configuration"}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
