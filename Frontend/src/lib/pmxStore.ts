import { create } from "zustand";
import { toast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export async function getPmxHeaders() {
  const token = await (window as any).Clerk?.session?.getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

const DAILY_CAP_MESSAGE = "You've hit today's AI usage limit, resets at midnight.";

// Shared fetch wrapper for PMX endpoints — adds auth headers and gives the
// backend's 402 "daily AI usage cap" response (see backend pmx.ts /
// deepseek.ts UsageCapExceededError) a clear toast instead of it reading as
// a generic/unexplained failure at each call site.
export async function pmxFetch(url: string, options: RequestInit = {}) {
  const headers = await getPmxHeaders();
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
  const json = await res.json().catch(() => ({ success: false, error: "Request failed" }));
  if (res.status === 402) {
    json.error = DAILY_CAP_MESSAGE;
    toast({ variant: "destructive", title: "Daily AI usage limit reached", description: DAILY_CAP_MESSAGE });
  }
  return json;
}

export interface PmxInput {
  _id: string;
  name: string;
  type: string;
  url?: string;
  content?: string;
  summary?: string;
  status: string;
  createdAt: string;
}

export interface PmxUnderstanding {
  productSummary: {
    name: string;
    oneLiner: string;
    category: string;
    stage: string;
  };
  businessModel: string;
  coreFeatures: Array<{ name: string; description: string; priority: string }>;
  targetAudience: string;
  personas: Array<{ name: string; role: string; painPoints: string[]; goals: string[] }>;
  customerSegments: string[];
  businessGoals: Array<{ goal: string; successMetric: string }>;
  valueProposition: string;
  customerJourney: Array<{ stage: string; actions: string[]; painPoints: string[] }>;
  version: number;
}

export interface PmxEvidence {
  _id: string;
  title: string;
  description: string;
  category: "customer" | "behavior" | "business" | "engineering" | "market";
  source: string;
  quote?: string;
  confidence: number;
  importance: number;
  relatedFeatures: string[];
  relatedProblems: string[];
  createdAt: string;
}

export interface PmxProblem {
  _id: string;
  title: string;
  description: string;
  type: "ux" | "growth" | "retention" | "tech_debt" | "feature_gap" | "business_risk";
  evidence: string[];
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  businessImpact: string;
  userImpact: string;
  suggestedFix: string;
  affectedFeatures: string[];
}

export interface PmxOpportunity {
  _id: string;
  title: string;
  description: string;
  userImpact: number;
  revenueImpact: number;
  retentionImpact: number;
  strategicAlignment: number;
  confidence: number;
  effort: number;
  iceScore: number;
  riceScore: number;
  risk: string;
}

export interface PmxDecision {
  _id: string;
  title: string;
  category: "build" | "improve" | "optimize" | "remove" | "experiment" | "delay";
  reasoning: string;
  evidence: string;
  tradeoffs: string;
  expectedOutcome: string;
  confidence: number;
  estimatedROI: string;
  alternativeSolutions: string[];
  status: "pending" | "approved" | "rejected" | "implemented";
}

export interface PmxSolution {
  _id: string;
  decisionId?: string;
  title: string;
  prd: string;
  epic: string;
  userStories: Array<{ story: string; acceptanceCriteria: string }>;
  techSpecs: string;
  apiContracts?: string;
  databaseChanges?: string;
  securityNotes?: string;
  uxImprovements?: string;
  edgeCases?: string;
  version: number;
  combinedFromSolutionIds?: string[];
}

export interface PmxExecutionTask {
  _id: string;
  solutionId?: string;
  title: string;
  description: string;
  type: "frontend" | "backend" | "infra" | "testing" | "deployment" | "ux";
  sprintPlan: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "done";
  timeEstimate: string;
  assignee?: string;
  dependencies: string[];
}

export interface PmxArtifact {
  _id: string;
  title: string;
  type: string;
  content: string;
  format: string;
  createdAt: string;
}

export interface PmxAuditLog {
  _id: string;
  action: string;
  details: string;
  entityType: string;
  createdAt: string;
}

export interface PmxWorkspaceSummary {
  projectId: string;
  name: string;
  sourceCount: number;
  isProject: boolean;
  primarySource: { _id: string; name: string; url?: string; type: string } | null;
  updatedAt: string;
}

const ACTIVE_PROJECT_KEY = "pmx_active_project_id";
const OPEN_TABS_KEY = "pmx_open_tabs";

// Deliberately does NOT force the currently-active projectId into the
// returned list. Doing so used to mean an ephemeral, never-promoted "Home"
// workspace (see startFreshWorkspace) got treated as a real open tab the
// moment the page reloaded — since ACTIVE_PROJECT_KEY persists across
// reloads but a fresh workspace is intentionally never added to
// pmx_open_tabs until promoteToTab actually promotes it. Only the
// genuinely-persisted tab list should ever count as "open."
function loadOpenTabs(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveOpenTabs(ids: string[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(ids));
}

interface PmxStore {
  projectId: string;
  openTabIds: string[];
  closeWorkspaceTab: (id: string) => void;
  inputs: PmxInput[];
  understanding: PmxUnderstanding | null;
  // Latest Idea→PRD doc for the active workspace, if the idea-input path was
  // used. Kept in the global store (rather than fetched locally by each
  // page) so nav-gating logic (e.g. the sidebar) can read it too.
  ideaPrd: any | null;
  evidence: PmxEvidence[];
  problems: PmxProblem[];
  opportunities: PmxOpportunity[];
  decisions: PmxDecision[];
  solutions: PmxSolution[];
  tasks: PmxExecutionTask[];
  artifacts: PmxArtifact[];
  history: PmxAuditLog[];
  
  loading: {
    inputs: boolean;
    understanding: boolean;
    evidence: boolean;
    problems: boolean;
    opportunities: boolean;
    decisions: boolean;
    solutions: boolean;
    tasks: boolean;
    artifacts: boolean;
    history: boolean;
    pipeline: boolean;
  };

  workspaces: PmxWorkspaceSummary[];
  workspacesLoading: boolean;

  setProjectId: (id: string) => void;
  // Switches to a brand-new, not-yet-real workspace context — no backend
  // call, and deliberately not added to openTabIds. It only becomes a real
  // workspace (and gets a tab) the moment an idea is generated or a source
  // is connected under it — see promoteToTab.
  startFreshWorkspace: () => void;
  // Adds a projectId to the open tabs and refreshes the workspace list —
  // called once a fresh workspace materializes server-side (idea generated
  // or first source connected) so its real name shows up immediately.
  promoteToTab: (id: string) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name?: string) => Promise<string>;
  renameWorkspace: (projectId: string, name: string) => Promise<boolean>;
  fetchInputs: () => Promise<void>;
  fetchUnderstanding: () => Promise<void>;
  fetchIdeaPrd: () => Promise<void>;
  fetchEvidence: () => Promise<void>;
  fetchProblems: () => Promise<void>;
  fetchOpportunities: () => Promise<void>;
  fetchDecisions: () => Promise<void>;
  fetchSolutions: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchArtifacts: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchAll: () => Promise<void>;
  runPipeline: (selectedSourceIds?: string[]) => Promise<void>;
  selectedSourceIds: string[];
  setSelectedSourceIds: (ids: string[]) => void;
  deleteProject: (projectId?: string) => Promise<boolean>;
}

const initialProjectId = (typeof localStorage !== "undefined" && localStorage.getItem(ACTIVE_PROJECT_KEY)) || "default";

export const usePmxStore = create<PmxStore>((set, get) => ({
  projectId: initialProjectId,
  openTabIds: loadOpenTabs(),
  closeWorkspaceTab: (id) => {
    const tabs = get().openTabIds;
    const next = tabs.filter((t) => t !== id);
    saveOpenTabs(next);
    set({ openTabIds: next });
    if (get().projectId === id) {
      // Closing the active tab: fall back to another open tab, or — if that
      // was the last one — the same fresh, un-materialized workspace state
      // the "Home" button puts you in.
      if (next.length > 0) get().setProjectId(next[next.length - 1]);
      else get().startFreshWorkspace();
    }
  },
  workspaces: [],
  workspacesLoading: false,
  inputs: [],
  understanding: null,
  ideaPrd: null,
  evidence: [],
  problems: [],
  opportunities: [],
  decisions: [],
  solutions: [],
  tasks: [],
  artifacts: [],
  history: [],
  selectedSourceIds: [],
  setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),

  loading: {
    inputs: false,
    understanding: false,
    evidence: false,
    problems: false,
    opportunities: false,
    decisions: false,
    solutions: false,
    tasks: false,
    artifacts: false,
    history: false,
    pipeline: false
  },

  setProjectId: (id) => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    const tabs = get().openTabIds;
    if (!tabs.includes(id)) {
      const next = [...tabs, id];
      saveOpenTabs(next);
      set({ projectId: id, openTabIds: next });
    } else {
      set({ projectId: id });
    }
    get().fetchAll();
  },

  startFreshWorkspace: () => {
    const id = crypto.randomUUID();
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    set({ projectId: id });
    get().fetchAll();
  },

  promoteToTab: (id) => {
    const tabs = get().openTabIds;
    if (!tabs.includes(id)) {
      const next = [...tabs, id];
      saveOpenTabs(next);
      set({ openTabIds: next });
    }
    get().fetchWorkspaces();
  },

  fetchWorkspaces: async () => {
    set({ workspacesLoading: true });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects`, { headers });
      const json = await res.json();
      if (json.success) {
        set({ workspaces: json.data });
        // Drop any open tabs pointing at workspaces that no longer exist
        // (e.g. deleted from another session), but never drop the last one.
        const liveIds = new Set((json.data as PmxWorkspaceSummary[]).map((w) => w.projectId));
        const tabs = get().openTabIds;
        const pruned = tabs.filter((id) => liveIds.has(id) || id === get().projectId);
        if (pruned.length && pruned.length !== tabs.length) {
          saveOpenTabs(pruned);
          set({ openTabIds: pruned });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ workspacesLoading: false });
    }
  },

  createWorkspace: async (name) => {
    const headers = await getPmxHeaders();
    const res = await fetch(`${API_URL}/pmx/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to create workspace");
    await get().fetchWorkspaces();
    return json.data.projectId as string;
  },

  renameWorkspace: async (projectId, name) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(projectId)}/rename`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) return false;
      await get().fetchWorkspaces();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchInputs: async () => {
    set((state) => ({ loading: { ...state.loading, inputs: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ inputs: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, inputs: false } }));
    }
  },

  fetchUnderstanding: async () => {
    set((state) => ({ loading: { ...state.loading, understanding: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/understanding?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ understanding: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, understanding: false } }));
    }
  },

  fetchIdeaPrd: async () => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/idea/prd/latest?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      set({ ideaPrd: json.success ? json.data : null });
    } catch (err) {
      console.error(err);
    }
  },

  fetchEvidence: async () => {
    set((state) => ({ loading: { ...state.loading, evidence: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/evidence?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ evidence: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, evidence: false } }));
    }
  },

  fetchProblems: async () => {
    set((state) => ({ loading: { ...state.loading, problems: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/problems?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ problems: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, problems: false } }));
    }
  },

  fetchOpportunities: async () => {
    set((state) => ({ loading: { ...state.loading, opportunities: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/opportunities?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ opportunities: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, opportunities: false } }));
    }
  },

  fetchDecisions: async () => {
    set((state) => ({ loading: { ...state.loading, decisions: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/decisions?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ decisions: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, decisions: false } }));
    }
  },

  fetchSolutions: async () => {
    set((state) => ({ loading: { ...state.loading, solutions: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/solutions?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ solutions: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, solutions: false } }));
    }
  },

  fetchTasks: async () => {
    set((state) => ({ loading: { ...state.loading, tasks: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/tasks?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ tasks: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, tasks: false } }));
    }
  },

  fetchArtifacts: async () => {
    set((state) => ({ loading: { ...state.loading, artifacts: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/artifacts?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ artifacts: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, artifacts: false } }));
    }
  },

  fetchHistory: async () => {
    set((state) => ({ loading: { ...state.loading, history: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/history?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ history: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, history: false } }));
    }
  },

  fetchAll: async () => {
    await Promise.all([
      get().fetchInputs(),
      get().fetchUnderstanding(),
      get().fetchIdeaPrd(),
      get().fetchEvidence(),
      get().fetchProblems(),
      get().fetchOpportunities(),
      get().fetchDecisions(),
      get().fetchSolutions(),
      get().fetchTasks(),
      get().fetchArtifacts(),
      get().fetchHistory()
    ]);
  },

  runPipeline: async (selectedSourceIds) => {
    set((state) => ({ loading: { ...state.loading, pipeline: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: get().projectId,
          selectedSourceIds: selectedSourceIds || get().selectedSourceIds
        })
      });
      if (res.ok) {
        await get().fetchAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, pipeline: false } }));
    }
  },

  deleteProject: async (projectId) => {
    const id = projectId || get().projectId;
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        set({
          inputs: [],
          understanding: null,
          ideaPrd: null,
          evidence: [],
          problems: [],
          opportunities: [],
          decisions: [],
          solutions: [],
          tasks: [],
          artifacts: [],
          history: []
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}));
