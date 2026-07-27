import { useState } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import {
  Settings, Save, Sparkles, User, Bell, Plug, Cpu, Shield, Users,
  ToggleLeft, ToggleRight, ChevronRight, Lock, Zap, Clock, Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const SECTIONS = [
  { id: "product",      label: "Product",       icon: Sparkles },
  { id: "workspace",    label: "Workspace",      icon: Settings },
  { id: "ai",           label: "AI Engine",      icon: Cpu },
  { id: "automation",   label: "Automation",     icon: Zap },
  { id: "notifications",label: "Notifications",  icon: Bell },
  { id: "team",         label: "Team & Users",   icon: Users },
  { id: "permissions",  label: "Permissions",    icon: Lock },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border/50 pb-4 mb-5">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function Toggle({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)} className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

export default function PmxSettings() {
  const { understanding, fetchUnderstanding } = usePmxStore();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState("product");
  const [saving, setSaving] = useState(false);

  // Product
  const [name, setName]                   = useState(understanding?.productSummary?.name || "");
  const [oneLiner, setOneLiner]           = useState(understanding?.productSummary?.oneLiner || "");
  const [category, setCategory]           = useState(understanding?.productSummary?.category || "SaaS");
  const [stage, setStage]                 = useState(understanding?.productSummary?.stage || "idea");
  const [businessModel, setBusinessModel] = useState(understanding?.businessModel || "");
  const [targetAudience, setTargetAudience] = useState(understanding?.targetAudience || "");
  const [valueProposition, setValueProposition] = useState(understanding?.valueProposition || "");

  // AI
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [deepReasoning, setDeepReasoning] = useState(false);

  // Automation
  const [schedule, setSchedule]       = useState("daily");
  const [runOnPush, setRunOnPush]     = useState(false);
  const [runOnReview, setRunOnReview] = useState(true);
  const [runOnError, setRunOnError]   = useState(true);

  // Notifications
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyPrd, setMonthlyPrd]   = useState(false);

  if (understanding && !name) {
    setName(understanding.productSummary?.name || "");
    setOneLiner(understanding.productSummary?.oneLiner || "");
    setCategory(understanding.productSummary?.category || "SaaS");
    setStage(understanding.productSummary?.stage || "idea");
    setBusinessModel(understanding.businessModel || "");
    setTargetAudience(understanding.targetAudience || "");
    setValueProposition(understanding.valueProposition || "");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/understanding`, { method: "PUT", headers, body: JSON.stringify({ productSummary: { name, oneLiner, category, stage }, businessModel, targetAudience, valueProposition, coreFeatures: understanding?.coreFeatures || [], personas: understanding?.personas || [], customerSegments: understanding?.customerSegments || [], businessGoals: understanding?.businessGoals || [], customerJourney: understanding?.customerJourney || [] }) });
      const json = await res.json();
      if (json.success) { toast({ title: "Settings saved" }); fetchUnderstanding(); }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSaving(false); }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "product": return (
        <div>
          <SectionHeader title="Product Profile" description="Core product information used by PMX to generate accurate analysis." />
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Product Name" value={name} onChange={setName} placeholder="My Product" />
              <Input label="Category" value={category} onChange={setCategory} placeholder="SaaS, Marketplace..." />
            </div>
            <Input label="One-liner Elevator Pitch" value={oneLiner} onChange={setOneLiner} placeholder="The AI product manager for..." />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Product Stage</label>
                <select value={stage} onChange={e => setStage(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-2 text-xs focus:outline-none">
                  <option value="idea">Idea Stage</option><option value="mvp">MVP</option><option value="growth">Growth</option><option value="scale">Enterprise Scale</option>
                </select>
              </div>
              <Input label="Business Model" value={businessModel} onChange={setBusinessModel} placeholder="SaaS, freemium, B2B..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Target Audience</label>
              <textarea rows={2} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Who are your users..." className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Value Proposition</label>
              <textarea rows={2} value={valueProposition} onChange={e => setValueProposition(e.target.value)} placeholder="Why customers choose you..." className="w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none" />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-primary-foreground transition-all disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save Product Settings"}
              </button>
            </div>
          </form>
        </div>
      );
      case "ai": return (
        <div>
          <SectionHeader title="AI Engine Configuration" description="Control how PMX reasons, which models it uses, and its analysis depth." />
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active LLM Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-2 text-xs focus:outline-none">
                <option value="openai/gpt-4o-mini">GPT-4o Mini — Fast & Efficient</option>
                <option value="openai/gpt-4o">GPT-4o — Deep Strategy</option>
                <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet — Best PRD Output</option>
                <option value="deepseek/deepseek-r1">DeepSeek R1 — Engineering Reasoning</option>
              </select>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/20 px-4 divide-y divide-border/30">
              <Toggle value={autoAnalysis} onChange={setAutoAnalysis} label="Auto-run Analysis" description="PMX automatically re-analyzes when sources change" />
              <Toggle value={deepReasoning} onChange={setDeepReasoning} label="Deep Reasoning Mode" description="Uses more tokens for higher quality recommendations (slower)" />
            </div>
          </div>
        </div>
      );
      case "automation": return (
        <div>
          <SectionHeader title="Automation Center" description="Configure when PMX automatically runs analysis and generates reports." />
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Analysis Schedule</label>
              <select value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2.5 py-2 text-xs focus:outline-none">
                <option value="1h">Every hour</option><option value="2h">Every 2 hours</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="manual">Manual only</option>
              </select>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/20 px-4 divide-y divide-border/30">
              <Toggle value={runOnPush} onChange={setRunOnPush} label="Run after GitHub Push" description="Trigger analysis on new commits" />
              <Toggle value={runOnReview} onChange={setRunOnReview} label="Run after New Reviews" description="Analyze when new user feedback arrives" />
              <Toggle value={runOnError} onChange={setRunOnError} label="Run after Production Errors" description="Analyze when Sentry/Crashlytics detects errors" />
            </div>
          </div>
        </div>
      );
      case "notifications": return (
        <div>
          <SectionHeader title="Notifications" description="Control when and how PMX alerts your team." />
          <div className="rounded-xl border border-border/40 bg-card/20 px-4 divide-y divide-border/30">
            <Toggle value={slackNotifs} onChange={setSlackNotifs} label="Slack Notifications" description="Send PMX insights to a Slack channel" />
            <Toggle value={emailNotifs} onChange={setEmailNotifs} label="Email Notifications" description="Receive email summaries" />
            <Toggle value={weeklyReport} onChange={setWeeklyReport} label="Weekly Product Report" description="Automatic weekly product health email every Monday" />
            <Toggle value={monthlyPrd} onChange={setMonthlyPrd} label="Monthly PRD Generation" description="Auto-generate a PRD summary each month" />
          </div>
        </div>
      );
      case "team": return (
        <div>
          <SectionHeader title="Team & Users" description="Manage who has access to this PMX workspace." />
          <div className="py-8 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
            <Users className="h-8 w-8 text-border" />
            <p>Team management coming soon. Your workspace is currently single-user.</p>
          </div>
        </div>
      );
      case "permissions": return (
        <div>
          <SectionHeader title="Permissions" description="Configure access levels and data visibility." />
          <div className="py-8 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
            <Lock className="h-8 w-8 text-border" />
            <p>Permissions management available on Team plan.</p>
          </div>
        </div>
      );
      default: return (
        <div>
          <SectionHeader title="Workspace" description="General workspace configuration." />
          <div className="py-8 text-center text-muted-foreground text-xs">Coming soon.</div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Sidebar */}
      <div className="w-52 border-r border-border/50 bg-card/10 p-4 space-y-1 shrink-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-2 pb-2">Settings</p>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${active ? "bg-card border border-border text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card/40"}`}>
              <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {renderSection()}
      </div>
    </div>
  );
}
