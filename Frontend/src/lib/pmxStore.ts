import { create } from "zustand";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export async function getPmxHeaders() {
  const token = await (window as any).Clerk?.session?.getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
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

export interface PmxAnalysis {
  _id: string;
  title: string;
  score: number;
  report: {
    websiteUrl: string;
    navigation: string;
    accessibility: string;
    performance: string;
    flows: Array<{ flowName: string; stepCount: number; dropOffRate: number; isDuplicate: boolean }>;
    issues: Array<{ issue: string; severity: "critical" | "high" | "medium" | "low"; recommendation: string }>;
  };
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

interface PmxStore {
  projectId: string;
  inputs: PmxInput[];
  understanding: PmxUnderstanding | null;
  evidence: PmxEvidence[];
  analysis: PmxAnalysis[];
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
    analysis: boolean;
    problems: boolean;
    opportunities: boolean;
    decisions: boolean;
    solutions: boolean;
    tasks: boolean;
    artifacts: boolean;
    history: boolean;
    pipeline: boolean;
  };

  setProjectId: (id: string) => void;
  fetchInputs: () => Promise<void>;
  fetchUnderstanding: () => Promise<void>;
  fetchEvidence: () => Promise<void>;
  fetchAnalysis: () => Promise<void>;
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
}

export const usePmxStore = create<PmxStore>((set, get) => ({
  projectId: "default",
  inputs: [],
  understanding: null,
  evidence: [],
  analysis: [],
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
    analysis: false,
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
    set({ projectId: id });
    get().fetchAll();
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

  fetchAnalysis: async () => {
    set((state) => ({ loading: { ...state.loading, analysis: true } }));
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/analysis?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ analysis: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set((state) => ({ loading: { ...state.loading, analysis: false } }));
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
      get().fetchEvidence(),
      get().fetchAnalysis(),
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
  }
}));
