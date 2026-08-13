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
const TOKEN_LIMIT_MESSAGE = "You've used your 100,000-token allowance for this period. Upgrade the workspace to continue.";
const TRIAL_EXPIRED_MESSAGE = "Your free trial has ended. Upgrade the workspace to continue.";

// Shared fetch wrapper for PMX endpoints — adds auth headers and gives every
// backend 402 (daily $ cap / per-user token limit / expired workspace
// trial — see deepseek.ts and pmx.ts's router-level error handler) a clear
// toast instead of it reading as a generic/unexplained failure at each call
// site. The Usage & Plan settings page renders its own full "Usage limit
// reached"/"Trial expired" cards from the same `code` field directly (see
// UsagePlan.tsx) rather than relying on this toast.
export async function pmxFetch(url: string, options: RequestInit = {}) {
  const headers = await getPmxHeaders();
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
  const json = await res.json().catch(() => ({ success: false, error: "Request failed" }));
  if (res.status === 402) {
    if (json.code === "TOKEN_LIMIT_REACHED") {
      json.error = TOKEN_LIMIT_MESSAGE;
      toast({ variant: "destructive", title: "Usage limit reached", description: TOKEN_LIMIT_MESSAGE });
    } else if (json.code === "TRIAL_EXPIRED") {
      json.error = TRIAL_EXPIRED_MESSAGE;
      toast({ variant: "destructive", title: "Trial expired", description: TRIAL_EXPIRED_MESSAGE });
    } else {
      json.error = DAILY_CAP_MESSAGE;
      toast({ variant: "destructive", title: "Daily AI usage limit reached", description: DAILY_CAP_MESSAGE });
    }
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
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  workspaceName?: string;
  workspaceDescription?: string;
  inviteLinksEnabled?: boolean;
  aiSettings?: { autoAnalysis: boolean };
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

export const PMX_DEPARTMENTS = [
  "Product", "Design", "Engineering", "QA", "DevOps", "Security",
  "Marketing", "Sales", "Customer Success", "Support", "Leadership",
] as const;
export type PmxDepartment = typeof PMX_DEPARTMENTS[number];

export interface PmxExecutionTask {
  _id: string;
  solutionId?: string;
  ideaPrdId?: string;
  planId?: string;
  title: string;
  description: string;
  type: "frontend" | "backend" | "infra" | "testing" | "deployment" | "ux" | "other";
  department: PmxDepartment;
  sprintPlan: string;
  sprintNumber?: number;
  milestone?: string;
  milestoneOrder?: number;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "done";
  timeEstimate: string;
  assignee?: string; // doubles as "suggested owner role"
  dueWeek?: number;
  dueDate?: string;
  prdSectionLink?: string;
  acceptanceCriteria: string[];
  implementationNotes?: string;
  dependencies: string[];
  dependencyTaskIds: string[];
  diffStatus?: "added" | "updated";
  diffSummary?: string;
}

export interface PmxArtifact {
  _id: string;
  title: string;
  type: string;
  department?: string;
  planId?: string;
  content: string;
  format: string;
  createdAt: string;
}

export interface PmxExecutionPlan {
  _id: string;
  projectId: string;
  type: "prd" | "custom";
  sourceType?: "solution" | "ideaPrd";
  sourceId?: string;
  sourcePrdVersion?: number;
  name?: string;
  goal?: string;
  description?: string;
  departments: string[];
  milestones: Array<{ name: string; order: number; goal: string }>;
  sprints: Array<{ number: number; label: string; departments: string[]; focus: string }>;
  startDate: string;
  status: "generating" | "completed" | "failed";
  artifactsStatus: "pending" | "generating" | "completed" | "partial_failed";
  artifactJobs: Array<{ type: string; department: string; title: string; status: "pending" | "done" | "failed" }>;
  version: number;
}

export interface PmxAuditLog {
  _id: string;
  action: string;
  details: string;
  entityType: string;
  createdAt: string;
}

export const PMX_WORKSPACE_ROLES = [
  "owner", "admin", "member",
  "product_manager", "engineering", "designer", "qa", "marketing", "sales", "support", "viewer",
] as const;
export type PmxWorkspaceRole = typeof PMX_WORKSPACE_ROLES[number];

// Roles an invite code may grant — everything except "owner" (never
// invite-granted) and the legacy generic "member" (new codes always pick a
// named role).
export const PMX_INVITE_ROLES = [
  "admin", "member", "product_manager", "engineering", "designer", "qa", "marketing", "sales", "support", "viewer",
] as const;
export type PmxInviteRole = typeof PMX_INVITE_ROLES[number];

export const PMX_ROLE_LABELS: Record<PmxWorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  product_manager: "Product Manager",
  engineering: "Engineering",
  designer: "Designer",
  qa: "QA",
  marketing: "Marketing",
  sales: "Sales",
  support: "Support",
  viewer: "Viewer",
};

export interface PmxWorkspaceSummary {
  projectId: string;
  name: string;
  sourceCount: number;
  isProject: boolean;
  primarySource: { _id: string; name: string; url?: string; type: string } | null;
  updatedAt: string;
  role: PmxWorkspaceRole;
  memberCount: number;
  joinedAt: string;
}

export interface PmxInviteCode {
  _id: string;
  label: string;
  role: PmxInviteRole;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  usageCount: number;
}

export type PmxInviteResolveStatus = "valid" | "already_member" | "invalid" | "expired" | "revoked" | "limit_reached";

export interface PmxInviteResolveResult {
  status: PmxInviteResolveStatus;
  message?: string;
  workspaceName?: string;
  projectId?: string;
  memberCount?: number;
  sourceCount?: number;
  role?: PmxInviteRole;
  roleLabel?: string;
}

// ── Invite by email — second, complementary way to add people. Bound to a
// specific email address, unlike the anonymous, shareable invite codes above.
export interface PmxEmailInvite {
  _id: string;
  email: string;
  role: PmxInviteRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

export interface PmxEmailInviteSendResult {
  email: string;
  status: "sent" | "already_member" | "already_pending" | "invalid";
  emailSent?: boolean;
}

export type PmxEmailInviteResolveStatus = "valid" | "accepted" | "already_member" | "invalid" | "expired" | "revoked" | "email_mismatch";

export interface PmxEmailInviteResolveResult {
  status: PmxEmailInviteResolveStatus;
  workspaceName?: string;
  projectId?: string;
  role?: PmxInviteRole;
  roleLabel?: string;
  invitedByName?: string;
  invitedEmail?: string;
}

export interface PmxPendingInviteForMe {
  token: string;
  workspaceName: string;
  role: PmxInviteRole;
  roleLabel: string;
  invitedByName: string;
}

export interface PmxWorkspaceMember {
  _id: string;
  userId: string;
  role: PmxWorkspaceRole;
  joinedAt: string;
  invitedBy?: string;
  name: string;
  email: string;
  avatar: string;
}

// ── Usage & Plan — workspace trial (shared across the whole workspace) and
// per-user token allowance (independent per member). See backend
// GET /billing/summary for the exact response this mirrors.
export interface PmxUserUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limit: number;
  remaining: number;
}

export interface PmxMemberUsage extends PmxUserUsage {
  userId: string;
  name: string;
  role: PmxWorkspaceRole;
  status: "active" | "limit_reached";
}

export interface PmxBillingSummary {
  plan: "trial" | "active";
  trial: {
    startedAt: string;
    endsAt: string;
    daysRemaining: number;
    status: "trial_active" | "trial_expired" | "active";
  } | null;
  memberCount: number;
  currentUser: PmxUserUsage;
  limit: number;
  upgradeRequestedAt: string | null;
  // Present only when the signed-in user is an owner/admin — omitted
  // (not just empty) for plain members, matching what the backend sends.
  members?: PmxMemberUsage[];
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
  executionPlan: PmxExecutionPlan | null;

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
    executionGenerate: boolean;
  };

  workspaces: PmxWorkspaceSummary[];
  workspacesLoading: boolean;
  // The active workspace's role for the signed-in user — derived from
  // `workspaces` each time it's refetched (see fetchWorkspaces), mirroring
  // how `understanding` tracks `projectId`. Null until workspaces load, or
  // if the active projectId isn't a real/joined workspace yet.
  role: PmxWorkspaceRole | null;

  members: PmxWorkspaceMember[];
  membersLoading: boolean;
  fetchMembers: () => Promise<void>;
  changeMemberRole: (memberId: string, role: PmxWorkspaceRole) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;

  billingSummary: PmxBillingSummary | null;
  billingSummaryLoading: boolean;
  fetchBillingSummary: () => Promise<void>;
  requestUpgrade: () => Promise<boolean>;

  // Legacy link-based invite accept — kept only so an already-distributed
  // /pmx/join/<uuid> link still works (see PmxJoin.tsx). Nothing generates
  // new links anymore; use the invite-code actions below for that.
  acceptInvite: (token: string) => Promise<{ projectId: string; workspaceName: string } | null>;

  // Current invite-code mechanism — multiple simultaneous, named,
  // role-specific codes per workspace (an "Engineering Invite", a
  // "Marketing Invite", etc. can coexist). Plaintext is only ever present
  // right after createInviteCode() returns it — the server never re-exposes
  // it, so a fresh page load shows codes without their plaintext.
  inviteCodes: PmxInviteCode[];
  inviteCodesLoading: boolean;
  lastCreatedCode: { codeId: string; plaintext: string } | null;
  fetchInviteCodes: () => Promise<void>;
  createInviteCode: (opts: { role: PmxInviteRole; label?: string; expiresAt?: string; maxUses?: number }) => Promise<string | null>;
  revokeInviteCodeById: (codeId: string) => Promise<void>;
  resolveInviteCode: (code: string) => Promise<PmxInviteResolveResult | null>;
  acceptInviteCode: (code: string) => Promise<{ alreadyMember?: boolean; projectId: string; workspaceName: string; role?: PmxInviteRole } | null>;

  // Invite by email — workspace-scoped list (Settings → Team) plus three
  // actions that aren't tied to the active projectId (the accept page and
  // JoinWorkspaceModal's "Accept an invitation" tab operate purely off a
  // token, same shape as the invite-code resolve/accept pair above).
  emailInvites: PmxEmailInvite[];
  emailInvitesLoading: boolean;
  fetchEmailInvites: () => Promise<void>;
  sendEmailInvites: (opts: { emails: string[]; role: PmxInviteRole }) => Promise<PmxEmailInviteSendResult[] | null>;
  resendEmailInvite: (inviteId: string) => Promise<boolean>;
  revokeEmailInviteById: (inviteId: string) => Promise<void>;
  resolveEmailInvite: (token: string) => Promise<PmxEmailInviteResolveResult | null>;
  acceptEmailInvite: (token: string) => Promise<{ alreadyMember?: boolean; projectId: string; workspaceName: string; role?: PmxInviteRole } | null>;
  fetchPendingInvitesForMe: () => Promise<PmxPendingInviteForMe[]>;

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
  fetchExecutionPlan: () => Promise<void>;
  generateExecution: (source: { solutionId?: string; ideaPrdId?: string }) => Promise<boolean>;
  generateCustomExecution: (input: { name: string; goal: string; description?: string; departments: string[] }) => Promise<boolean>;
  regenerateExecution: (source: { solutionId?: string; ideaPrdId?: string }) => Promise<{ added: number; updated: number; removed: number } | null>;
  dismissExecutionDiff: () => Promise<void>;
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
  role: null,
  members: [],
  membersLoading: false,
  billingSummary: null,
  billingSummaryLoading: false,
  inviteCodes: [],
  inviteCodesLoading: false,
  lastCreatedCode: null,
  emailInvites: [],
  emailInvitesLoading: false,
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
  executionPlan: null,
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
    pipeline: false,
    executionGenerate: false
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
        const workspaces = json.data as PmxWorkspaceSummary[];
        const active = workspaces.find((w) => w.projectId === get().projectId);
        set({ workspaces, role: active?.role ?? null });
        // Drop any open tabs pointing at workspaces that no longer exist
        // (e.g. deleted from another session), but never drop the last one.
        const liveIds = new Set(workspaces.map((w) => w.projectId));
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

  fetchExecutionPlan: async () => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/execution/plan?projectId=${get().projectId}`, { headers });
      const json = await res.json();
      if (json.success) set({ executionPlan: json.data });
    } catch (err) {
      console.error(err);
    }
  },

  generateExecution: async (source) => {
    set((state) => ({ loading: { ...state.loading, executionGenerate: true } }));
    try {
      const json = await pmxFetch(`${API_URL}/pmx/execution/generate`, {
        method: "POST",
        body: JSON.stringify(source),
      });
      if (json.success) {
        // Refetch the full task list rather than trusting json.data.tasks
        // (just this call's newly-created batch) — a project can now have
        // more than one execution plan's tasks coexisting on the same
        // board, so replacing `tasks` wholesale with only the new batch
        // would silently drop every earlier execution's tasks from the UI.
        set({ executionPlan: json.data.plan });
        await get().fetchTasks();
        return true;
      }
      toast({ variant: "destructive", title: "Couldn't generate execution plan", description: json.error });
      return false;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't generate execution plan — check your connection" });
      return false;
    } finally {
      set((state) => ({ loading: { ...state.loading, executionGenerate: false } }));
    }
  },

  generateCustomExecution: async (input) => {
    set((state) => ({ loading: { ...state.loading, executionGenerate: true } }));
    try {
      const json = await pmxFetch(`${API_URL}/pmx/execution/generate-custom`, {
        method: "POST",
        body: JSON.stringify({ ...input, projectId: get().projectId }),
      });
      if (json.success) {
        // See the comment in generateExecution above — refetch the full
        // list rather than replacing it with just this batch.
        set({ executionPlan: json.data.plan });
        await get().fetchTasks();
        return true;
      }
      toast({ variant: "destructive", title: "Couldn't create execution", description: json.error });
      return false;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't create execution — check your connection" });
      return false;
    } finally {
      set((state) => ({ loading: { ...state.loading, executionGenerate: false } }));
    }
  },

  regenerateExecution: async (source) => {
    set((state) => ({ loading: { ...state.loading, executionGenerate: true } }));
    try {
      const json = await pmxFetch(`${API_URL}/pmx/execution/regenerate`, {
        method: "POST",
        body: JSON.stringify(source),
      });
      if (json.success) {
        set({ executionPlan: json.data.plan, tasks: json.data.tasks });
        return json.data.diff as { added: number; updated: number; removed: number };
      }
      toast({ variant: "destructive", title: "Couldn't regenerate execution plan", description: json.error });
      return null;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't regenerate execution plan — check your connection" });
      return null;
    } finally {
      set((state) => ({ loading: { ...state.loading, executionGenerate: false } }));
    }
  },

  dismissExecutionDiff: async () => {
    try {
      const headers = await getPmxHeaders();
      await fetch(`${API_URL}/pmx/execution/dismiss-diff`, {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId: get().projectId }),
      });
      await get().fetchTasks();
    } catch (err) {
      console.error(err);
    }
  },

  fetchAll: async () => {
    await Promise.all([
      get().fetchWorkspaces(),
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
      get().fetchHistory(),
      get().fetchExecutionPlan()
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
          history: [],
          executionPlan: null
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchMembers: async () => {
    set({ membersLoading: true });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/members`, { headers });
      const json = await res.json();
      if (json.success) set({ members: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ membersLoading: false });
    }
  },

  changeMemberRole: async (memberId, role) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/members/${memberId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!json.success) return false;
      await get().fetchMembers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  removeMember: async (memberId) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/members/${memberId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!json.success) return false;
      await get().fetchMembers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchBillingSummary: async () => {
    set({ billingSummaryLoading: true });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/billing/summary?projectId=${encodeURIComponent(get().projectId)}`, { headers });
      const json = await res.json();
      if (json.success) set({ billingSummary: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ billingSummaryLoading: false });
    }
  },

  requestUpgrade: async () => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/billing/upgrade-request`, {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId: get().projectId }),
      });
      const json = await res.json();
      if (!json.success) return false;
      await get().fetchBillingSummary();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchInviteCodes: async () => {
    set({ inviteCodesLoading: true });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invite-codes`, { headers });
      const json = await res.json();
      if (json.success) set({ inviteCodes: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ inviteCodesLoading: false });
    }
  },

  createInviteCode: async ({ role, label, expiresAt, maxUses }) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invite-codes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ role, label, expiresAt, maxUses }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "Couldn't create invite code", description: json.error });
        return null;
      }
      set({ lastCreatedCode: { codeId: json.data._id, plaintext: json.data.code } });
      await get().fetchInviteCodes();
      return json.data.code as string;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't create invite code — check your connection" });
      return null;
    }
  },

  revokeInviteCodeById: async (codeId) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invite-codes/${codeId}/revoke`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (json.success) {
        if (get().lastCreatedCode?.codeId === codeId) set({ lastCreatedCode: null });
        await get().fetchInviteCodes();
      }
    } catch (err) {
      console.error(err);
    }
  },

  resolveInviteCode: async (code) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invite-codes/resolve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      return json.success ? json.data : null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  acceptInviteCode: async (code) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invite-codes/accept`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!json.success) return null;
      get().setProjectId(json.data.projectId);
      return json.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  fetchEmailInvites: async () => {
    set({ emailInvitesLoading: true });
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invites/email`, { headers });
      const json = await res.json();
      if (json.success) set({ emailInvites: json.data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ emailInvitesLoading: false });
    }
  },

  sendEmailInvites: async ({ emails, role }) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invites/email`, {
        method: "POST",
        headers,
        body: JSON.stringify({ emails, role }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "Couldn't send invitations", description: json.error });
        return null;
      }
      await get().fetchEmailInvites();
      return json.data as PmxEmailInviteSendResult[];
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't send invitations — check your connection" });
      return null;
    }
  },

  resendEmailInvite: async (inviteId) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invites/email/${inviteId}/resend`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      return !!json.success;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  revokeEmailInviteById: async (inviteId) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/projects/${encodeURIComponent(get().projectId)}/invites/email/${inviteId}/revoke`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (json.success) await get().fetchEmailInvites();
    } catch (err) {
      console.error(err);
    }
  },

  resolveEmailInvite: async (token) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invites/email/resolve/${token}`, { headers });
      const json = await res.json();
      return json.success ? json.data : null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  acceptEmailInvite: async (token) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invites/email/accept/${token}`, { method: "POST", headers });
      const json = await res.json();
      if (!json.success) return null;
      get().setProjectId(json.data.projectId);
      return json.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  fetchPendingInvitesForMe: async () => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invites/email/pending-for-me`, { headers });
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  acceptInvite: async (token) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/invite/${token}/accept`, { method: "POST", headers });
      const json = await res.json();
      if (!json.success) return null;
      get().setProjectId(json.data.projectId);
      return json.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  },
}));
