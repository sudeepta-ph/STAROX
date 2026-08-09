import mongoose, { Schema, Document } from "mongoose";

// ==========================================
// 1. INPUT NODE MODEL (Stage 1)
// ==========================================
export interface IPmxInput extends Document {
  projectId: string;
  userId: string;
  name: string;
  type: string; // url, repo, text, file, support, interview, survey, analytics, report
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  processingState?: string;
  summary?: string;
  isArchived: boolean;
  isDeleted: boolean;
  history: Array<{
    status: string;
    updatedAt: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PmxInputSchema = new Schema<IPmxInput>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String },
    content: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
    processingState: { type: String },
    summary: { type: String },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    history: [
      {
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const PmxInputModel = mongoose.model<IPmxInput>("PmxInput", PmxInputSchema);

// ==========================================
// 2. PRODUCT UNDERSTANDING MODEL (Stage 2)
// ==========================================
export interface IPmxUnderstanding extends Document {
  projectId: string;
  userId: string;
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
  isDeleted: boolean;
  history: Array<{
    updatedAt: Date;
    updatedBy: string;
    understandingData: Record<string, any>;
  }>;
  // Workspace-level metadata — distinct from the product fields above.
  // "Product" is what's being built (productSummary etc.); "Workspace" is
  // the team/environment PMX is being used in. Both live on this doc since
  // projectId is the single shared container for both concepts today.
  workspaceName?: string;
  workspaceDescription?: string;
  inviteLinksEnabled: boolean;
  aiSettings: {
    autoAnalysis: boolean;
  };
  // Billing state — "trial" until an owner/admin's upgrade takes effect.
  // Trial start/end are NOT stored here; they're derived from createdAt
  // (see getWorkspacePlanStatus in services/pmxUsage.ts) so an old,
  // already-persisted workspace can never be granted a fresh trial window
  // just by being read after this field shipped.
  plan: "trial" | "active";
  upgradeRequestedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PmxUnderstandingSchema = new Schema<IPmxUnderstanding>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    productSummary: {
      name: { type: String, default: "" },
      oneLiner: { type: String, default: "" },
      category: { type: String, default: "" },
      stage: { type: String, default: "idea" },
    },
    businessModel: { type: String, default: "" },
    coreFeatures: [
      {
        name: { type: String },
        description: { type: String },
        priority: { type: String },
      },
    ],
    targetAudience: { type: String, default: "" },
    personas: [
      {
        name: { type: String },
        role: { type: String },
        painPoints: [{ type: String }],
        goals: [{ type: String }],
      },
    ],
    customerSegments: [{ type: String }],
    businessGoals: [
      {
        goal: { type: String },
        successMetric: { type: String },
      },
    ],
    valueProposition: { type: String, default: "" },
    customerJourney: [
      {
        stage: { type: String },
        actions: [{ type: String }],
        painPoints: [{ type: String }],
      },
    ],
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
    history: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        understandingData: { type: Schema.Types.Mixed },
      },
    ],
    workspaceName: { type: String },
    workspaceDescription: { type: String },
    inviteLinksEnabled: { type: Boolean, default: true },
    aiSettings: {
      autoAnalysis: { type: Boolean, default: false },
    },
    plan: { type: String, enum: ["trial", "active"], default: "trial" },
    upgradeRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PmxUnderstandingModel = mongoose.model<IPmxUnderstanding>("PmxUnderstanding", PmxUnderstandingSchema);

// ==========================================
// 2B. WORKSPACE MEMBERSHIP MODEL
// ==========================================
// Membership in a workspace (projectId) is what actually governs access to
// every PMX collection now — see requireWorkspaceAccess/getMemberRole in
// workspaces/pmx/middleware/workspaceAccess.ts. The `userId` field on other
// PMX documents remains creator/actor provenance only, not an access filter.
//
// "member" is kept for backward compatibility (existing rows, and the
// legacy /invite/:token/accept link) but new invite codes grant one of the
// named roles below instead — see PMX_INVITE_ROLES. Every non-owner/admin
// role (including plain "member") gets standard read-write access for now;
// "viewer" is the one role with a hard, centrally-enforced restriction (see
// assertCanWrite in workspaceAccess.ts) — read-only, everywhere. Per-section
// write scoping between the other named roles (e.g. Engineering vs PRD) is
// a deliberately separate, later pass.
export const PMX_WORKSPACE_ROLES = [
  "owner", "admin", "member",
  "product_manager", "engineering", "designer", "qa", "marketing", "sales", "support", "viewer",
] as const;
export type PmxWorkspaceRole = typeof PMX_WORKSPACE_ROLES[number];

// Roles an invite code may grant — everything except "owner" (never
// invite-granted) and the legacy generic "member" (new codes always pick a
// named role now; "member" only still exists on old rows/the legacy link).
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

export interface IPmxWorkspaceMember extends Document {
  projectId: string;
  userId: string; // Clerk id
  role: PmxWorkspaceRole;
  invitedBy?: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PmxWorkspaceMemberSchema = new Schema<IPmxWorkspaceMember>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: PMX_WORKSPACE_ROLES, required: true },
    invitedBy: { type: String },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PmxWorkspaceMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const PmxWorkspaceMemberModel = mongoose.model<IPmxWorkspaceMember>("PmxWorkspaceMember", PmxWorkspaceMemberSchema);

// ==========================================
// 2C. WORKSPACE INVITE MODEL (legacy — link-based)
// ==========================================
// DEPRECATED: superseded by PmxWorkspaceInviteCodeModel below. Kept
// unmodified, with its accept-by-token route still live, purely so any
// already-distributed /pmx/join/<uuid> link keeps resolving and joining —
// nothing in the app generates new rows here anymore. One standing,
// revocable link per workspace. `role` is hard-pinned to "member" — an
// invite link can never grant elevated access.
export interface IPmxWorkspaceInvite extends Document {
  projectId: string;
  token: string;
  role: "member";
  createdBy: string;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxWorkspaceInviteSchema = new Schema<IPmxWorkspaceInvite>(
  {
    projectId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["member"], default: "member" },
    createdBy: { type: String, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxWorkspaceInviteModel = mongoose.model<IPmxWorkspaceInvite>("PmxWorkspaceInvite", PmxWorkspaceInviteSchema);

// ==========================================
// 2D. WORKSPACE INVITE CODE MODEL
// ==========================================
// Current invite mechanism — a short human-enterable code (XXXX-XXXX)
// instead of a link. Only `codeHash` (sha256 of the normalized code) is
// stored, never the plaintext — the plaintext is generated, returned once
// in the generate response, and never persisted server-side.
// Multiple simultaneous, independently revocable codes per workspace are
// supported (e.g. an "Engineering Invite" and a "Marketing Invite" coexist)
// — `label` distinguishes them in the Settings UI, and `role` is whatever
// the creator picked from PMX_INVITE_ROLES, granted to whoever redeems it.
export interface IPmxWorkspaceInviteCode extends Document {
  projectId: string;
  codeHash: string;
  createdBy: string;
  label?: string;
  role: PmxInviteRole;
  expiresAt: Date | null;
  maxUses: number | null;
  usageCount: number;
  revoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PmxWorkspaceInviteCodeSchema = new Schema<IPmxWorkspaceInviteCode>(
  {
    projectId: { type: String, required: true, index: true },
    codeHash: { type: String, required: true, unique: true, index: true },
    createdBy: { type: String, required: true },
    label: { type: String },
    role: { type: String, enum: PMX_INVITE_ROLES, required: true },
    expiresAt: { type: Date, default: null },
    maxUses: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PmxWorkspaceInviteCodeModel = mongoose.model<IPmxWorkspaceInviteCode>("PmxWorkspaceInviteCode", PmxWorkspaceInviteCodeSchema);

// ==========================================
// 2E. WORKSPACE EMAIL INVITE MODEL
// ==========================================
// The second, complementary way to add people (alongside the anonymous,
// shareable PmxWorkspaceInviteCodeModel above): bound to one specific email
// address, so only that identity can accept it. `token` is a long,
// cryptographically random opaque string used in the accept link
// (/pmx/invite/<token>) — stored in plaintext like the legacy
// PmxWorkspaceInviteModel.token, not hashed like the short human-typed
// codes, since it isn't brute-forceable the way an 8-character code is.
export interface IPmxWorkspaceEmailInvite extends Document {
  projectId: string;
  email: string; // lowercased/trimmed
  role: PmxInviteRole;
  token: string;
  invitedBy: string; // Clerk id
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PmxWorkspaceEmailInviteSchema = new Schema<IPmxWorkspaceEmailInvite>(
  {
    projectId: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    role: { type: String, enum: PMX_INVITE_ROLES, required: true },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted", "revoked", "expired"], default: "pending", index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
// One active (pending) invitation per email per workspace — the DB-level
// half of "prevent duplicate active invitations for the same email/
// workspace combination" (the route also pre-checks and returns a friendlier
// message before ever hitting this constraint).
PmxWorkspaceEmailInviteSchema.index(
  { projectId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const PmxWorkspaceEmailInviteModel = mongoose.model<IPmxWorkspaceEmailInvite>("PmxWorkspaceEmailInvite", PmxWorkspaceEmailInviteSchema);

// ==========================================
// 3. EVIDENCE MODEL (Stage 3)
// ==========================================
export interface IPmxEvidence extends Document {
  projectId: string;
  userId: string;
  title: string;
  description: string;
  category: "customer" | "behavior" | "business" | "engineering" | "market";
  source: string; // URL, Input name, etc.
  quote?: string;
  confidence: number; // 1 to 5
  importance: number; // 1 to 5
  relatedFeatures: string[];
  relatedProblems: string[];
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxEvidenceSchema = new Schema<IPmxEvidence>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["customer", "behavior", "business", "engineering", "market"],
      required: true,
      index: true,
    },
    source: { type: String, required: true },
    quote: { type: String },
    confidence: { type: Number, min: 1, max: 5, default: 3 },
    importance: { type: Number, min: 1, max: 5, default: 3 },
    relatedFeatures: [{ type: String }],
    relatedProblems: [{ type: String }],
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxEvidenceModel = mongoose.model<IPmxEvidence>("PmxEvidence", PmxEvidenceSchema);

// ==========================================
// 4. PRODUCT ANALYSIS MODEL (Stage 4)
// ==========================================
export interface IPmxAnalysis extends Document {
  projectId: string;
  userId: string;
  title: string;
  score: number; // overall product UX score 0-100
  report: {
    websiteUrl: string;
    navigation: string;
    accessibility: string;
    performance: string;
    flows: Array<{ flowName: string; stepCount: number; dropOffRate: number; isDuplicate: boolean }>;
    issues: Array<{ issue: string; severity: "critical" | "high" | "medium" | "low"; recommendation: string }>;
  };
  visualReportUrl?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxAnalysisSchema = new Schema<IPmxAnalysis>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    score: { type: Number, default: 80 },
    report: {
      websiteUrl: { type: String },
      navigation: { type: String },
      accessibility: { type: String },
      performance: { type: String },
      flows: [
        {
          flowName: { type: String },
          stepCount: { type: Number },
          dropOffRate: { type: Number },
          isDuplicate: { type: Boolean, default: false },
        },
      ],
      issues: [
        {
          issue: { type: String },
          severity: { type: String, enum: ["critical", "high", "medium", "low"] },
          recommendation: { type: String },
        },
      ],
    },
    visualReportUrl: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxAnalysisModel = mongoose.model<IPmxAnalysis>("PmxAnalysis", PmxAnalysisSchema);

// ==========================================
// 5. PROBLEM DETECTION MODEL (Stage 5)
// ==========================================
export interface IPmxProblem extends Document {
  projectId: string;
  userId: string;
  title: string;
  description: string;
  type: "ux" | "growth" | "retention" | "tech_debt" | "feature_gap" | "business_risk";
  evidence: string[]; // references or descriptive context
  confidence: number; // 0-100 percentage
  severity: "critical" | "high" | "medium" | "low";
  businessImpact: string;
  userImpact: string;
  suggestedFix: string;
  affectedFeatures: string[];
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxProblemSchema = new Schema<IPmxProblem>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["ux", "growth", "retention", "tech_debt", "feature_gap", "business_risk"],
      required: true,
      index: true,
    },
    evidence: [{ type: String }],
    confidence: { type: Number, min: 0, max: 100, default: 80 },
    severity: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
    businessImpact: { type: String, required: true },
    userImpact: { type: String, required: true },
    suggestedFix: { type: String, required: true },
    affectedFeatures: [{ type: String }],
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxProblemModel = mongoose.model<IPmxProblem>("PmxProblem", PmxProblemSchema);

// ==========================================
// 6. OPPORTUNITY SCORING MODEL (Stage 6)
// ==========================================
export interface IPmxOpportunity extends Document {
  projectId: string;
  userId: string;
  title: string;
  description: string;
  userImpact: number; // 1-10
  revenueImpact: number; // 1-10
  retentionImpact: number; // 1-10
  strategicAlignment: number; // 1-10
  confidence: number; // 0-100 percentage
  effort: number; // 1-10 (complexity)
  iceScore: number;
  riceScore: number;
  risk: string; // low/medium/high
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxOpportunitySchema = new Schema<IPmxOpportunity>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    userImpact: { type: Number, min: 1, max: 10, default: 5 },
    revenueImpact: { type: Number, min: 1, max: 10, default: 5 },
    retentionImpact: { type: Number, min: 1, max: 10, default: 5 },
    strategicAlignment: { type: Number, min: 1, max: 10, default: 5 },
    confidence: { type: Number, min: 0, max: 100, default: 80 },
    effort: { type: Number, min: 1, max: 10, default: 5 },
    iceScore: { type: Number, default: 0 },
    riceScore: { type: Number, default: 0 },
    risk: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PmxOpportunitySchema.pre("save", function (next: any) {
  const self = this as any;
  // Calculate ICE and RICE scores dynamically if not provided
  // ICE = (Impact * Confidence * Ease) => Ease is 11 - Effort
  const ease = 11 - self.effort;
  self.iceScore = Math.round((self.userImpact * (self.confidence / 100) * ease) * 10) / 10;

  // RICE = (Reach * Impact * Confidence) / Effort
  // Let's assume Reach ~ User Impact * 10
  const reach = self.userImpact * 10;
  self.riceScore = Math.round(((reach * self.userImpact * (self.confidence / 100)) / self.effort) * 10) / 10;

  next();
});

export const PmxOpportunityModel = mongoose.model<IPmxOpportunity>("PmxOpportunity", PmxOpportunitySchema);

// ==========================================
// 7. DECISION CENTER MODEL (Stage 7)
// ==========================================
export interface IPmxDecision extends Document {
  projectId: string;
  userId: string;
  title: string;
  category: "build" | "improve" | "optimize" | "remove" | "experiment" | "delay";
  reasoning: string;
  evidence: string;
  tradeoffs: string;
  expectedOutcome: string;
  confidence: number; // 0-100 percentage
  estimatedROI: string;
  alternativeSolutions: string[];
  status: "pending" | "approved" | "rejected" | "implemented";
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxDecisionSchema = new Schema<IPmxDecision>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["build", "improve", "optimize", "remove", "experiment", "delay"],
      required: true,
      index: true,
    },
    reasoning: { type: String, required: true },
    evidence: { type: String, required: true },
    tradeoffs: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 100, default: 80 },
    estimatedROI: { type: String, required: true },
    alternativeSolutions: [{ type: String }],
    status: { type: String, enum: ["pending", "approved", "rejected", "implemented"], default: "pending" },
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxDecisionModel = mongoose.model<IPmxDecision>("PmxDecision", PmxDecisionSchema);

// ==========================================
// 8. SOLUTION STUDIO MODEL (Stage 8)
// ==========================================
export interface IPmxSolution extends Document {
  projectId: string;
  userId: string;
  decisionId?: string;
  title: string;
  prd: string; // Markdown formatted PRD
  epic: string;
  userStories: Array<{ story: string; acceptanceCriteria: string }>;
  techSpecs: string; // Markdown formatted Tech Spec
  apiContracts?: string;
  databaseChanges?: string;
  securityNotes?: string;
  uxImprovements?: string;
  edgeCases?: string;
  version: number;
  isDeleted: boolean;
  history: Array<{
    updatedAt: Date;
    updatedBy: string;
    prd: string;
    techSpecs: string;
    // The chat pair that produced this snapshot — absent on entries written
    // before this was tracked. Lets the frontend rebuild the refine chat
    // log on reopen instead of only keeping it for the live session.
    instruction?: string;
    changeSummary?: string;
  }>;
  sourceInputIds?: string[];
  combinedFromSolutionIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PmxSolutionSchema = new Schema<IPmxSolution>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    decisionId: { type: String },
    title: { type: String, required: true },
    prd: { type: String, default: "" },
    epic: { type: String, default: "" },
    userStories: [
      {
        story: { type: String },
        acceptanceCriteria: { type: String },
      },
    ],
    techSpecs: { type: String, default: "" },
    apiContracts: { type: String },
    databaseChanges: { type: String },
    securityNotes: { type: String },
    uxImprovements: { type: String },
    edgeCases: { type: String },
    version: { type: Number, default: 1 },
    sourceInputIds: [{ type: String }],
    combinedFromSolutionIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    history: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        prd: { type: String },
        techSpecs: { type: String },
        instruction: { type: String },
        changeSummary: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const PmxSolutionModel = mongoose.model<IPmxSolution>("PmxSolution", PmxSolutionSchema);

// ==========================================
// 9. EXECUTION TICKET MODEL (Stage 9)
// ==========================================
export const PMX_DEPARTMENTS = [
  "Product", "Design", "Engineering", "QA", "DevOps", "Security",
  "Marketing", "Sales", "Customer Success", "Support", "Leadership",
] as const;
export type PmxDepartment = typeof PMX_DEPARTMENTS[number];

export interface IPmxExecutionTask extends Document {
  projectId: string;
  userId: string;
  solutionId?: string;
  ideaPrdId?: string;
  planId?: string;
  title: string;
  description: string;
  type: "frontend" | "backend" | "infra" | "testing" | "deployment" | "ux" | "other";
  department: PmxDepartment;
  sprintPlan: string; // e.g. Sprint 1
  sprintNumber?: number;
  milestone?: string;
  milestoneOrder?: number;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "done";
  timeEstimate: string; // e.g. "2h", "1d", "3d"
  assignee?: string; // doubles as "suggested owner role", e.g. "Backend Engineer"
  dueWeek?: number;
  dueDate?: Date;
  prdSectionLink?: string;
  acceptanceCriteria: string[];
  implementationNotes?: string;
  dependencies: string[]; // human-readable dependency titles
  dependencyTaskIds: string[]; // resolved task _ids, for graph/Gantt use
  diffStatus?: "added" | "updated";
  diffSummary?: string;
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxExecutionTaskSchema = new Schema<IPmxExecutionTask>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    solutionId: { type: String },
    ideaPrdId: { type: String },
    planId: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["frontend", "backend", "infra", "testing", "deployment", "ux", "other"],
      required: true,
      index: true,
    },
    department: { type: String, enum: PMX_DEPARTMENTS, default: "Engineering", index: true },
    sprintPlan: { type: String, default: "Backlog" },
    sprintNumber: { type: Number },
    milestone: { type: String },
    milestoneOrder: { type: Number },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "review", "done"], default: "todo" },
    timeEstimate: { type: String, default: "1d" },
    assignee: { type: String },
    dueWeek: { type: Number },
    dueDate: { type: Date },
    prdSectionLink: { type: String },
    acceptanceCriteria: [{ type: String }],
    implementationNotes: { type: String },
    dependencies: [{ type: String }],
    dependencyTaskIds: [{ type: String }],
    diffStatus: { type: String, enum: ["added", "updated"] },
    diffSummary: { type: String },
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxExecutionTaskModel = mongoose.model<IPmxExecutionTask>("PmxExecutionTask", PmxExecutionTaskSchema);

// ==========================================
// 9B. EXECUTION PLAN MODEL
// ==========================================
// One evolving doc per projectId — the record of the latest "Create
// Execution"/"Regenerate Execution" run. Mirrors the versioned-doc-with-
// history pattern used by PmxUnderstanding/PmxSolution. Drives the
// Execution board's metrics/milestone/sprint grouping and the "PRD changed
// since last generation" staleness check (compare sourcePrdVersion to the
// live PmxSolution/PmxIdeaPrd .version).
export interface IPmxExecutionPlan extends Document {
  projectId: string;
  userId: string;
  // "prd" (default — see the schema field below) covers every plan created
  // before custom executions existed; "custom" plans have no PRD source and
  // instead carry name/goal/description directly.
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
  startDate: Date;
  status: "generating" | "completed" | "failed";
  artifactsStatus: "pending" | "generating" | "completed" | "partial_failed";
  artifactJobs: Array<{ type: string; department: string; title: string; status: "pending" | "done" | "failed" }>;
  version: number;
  history: Array<{
    version: number;
    departments: string[];
    milestones: Array<{ name: string; order: number; goal: string }>;
    sprints: Array<{ number: number; label: string; departments: string[]; focus: string }>;
    changedAt: Date;
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxExecutionPlanSchema = new Schema<IPmxExecutionPlan>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    // default: "prd" — applied by Mongoose to any already-persisted plan
    // document that predates this field (every plan before custom
    // executions existed always had a real sourceType), so existing data
    // reads back correctly with no migration write needed.
    type: { type: String, enum: ["prd", "custom"], default: "prd" },
    sourceType: { type: String, enum: ["solution", "ideaPrd"] },
    sourceId: { type: String },
    sourcePrdVersion: { type: Number },
    name: { type: String },
    goal: { type: String },
    description: { type: String },
    departments: [{ type: String }],
    milestones: [
      {
        name: { type: String },
        order: { type: Number },
        goal: { type: String },
      },
    ],
    sprints: [
      {
        number: { type: Number },
        label: { type: String },
        departments: [{ type: String }],
        focus: { type: String },
      },
    ],
    startDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["generating", "completed", "failed"], default: "generating" },
    artifactsStatus: { type: String, enum: ["pending", "generating", "completed", "partial_failed"], default: "pending" },
    artifactJobs: [
      {
        type: { type: String },
        department: { type: String },
        title: { type: String },
        status: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
      },
    ],
    version: { type: Number, default: 1 },
    history: [
      {
        version: { type: Number },
        departments: [{ type: String }],
        milestones: [
          {
            name: { type: String },
            order: { type: Number },
            goal: { type: String },
          },
        ],
        sprints: [
          {
            number: { type: Number },
            label: { type: String },
            departments: [{ type: String }],
            focus: { type: String },
          },
        ],
        changedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxExecutionPlanModel = mongoose.model<IPmxExecutionPlan>("PmxExecutionPlan", PmxExecutionPlanSchema);

// ==========================================
// 10. ARTIFACTS STORAGE MODEL (Stage 10)
// ==========================================
export const PMX_ARTIFACT_TYPES = [
  "prd", "roadmap", "technical_spec", "sprint_plan", "product_strategy", "ux_audit", "engineering_plan",
  // Execution-plan-generated artifact types (see routes/pmx.ts generateArtifactsForPlan):
  "architecture_summary", "api_contract", "database_schema",
  "ui_specification", "component_inventory",
  "test_plan", "release_checklist",
  "launch_plan", "newsletter_draft",
  "faq", "help_center_outline",
] as const;

export interface IPmxArtifact extends Document {
  projectId: string;
  userId: string;
  title: string;
  type: typeof PMX_ARTIFACT_TYPES[number];
  department?: string;
  planId?: string;
  content: string; // raw content or markdown
  format: "markdown" | "pdf" | "json";
  sourceInputIds?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxArtifactSchema = new Schema<IPmxArtifact>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: PMX_ARTIFACT_TYPES,
      required: true,
      index: true,
    },
    department: { type: String },
    planId: { type: String },
    content: { type: String, required: true },
    format: { type: String, enum: ["markdown", "pdf", "json"], default: "markdown" },
    sourceInputIds: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxArtifactModel = mongoose.model<IPmxArtifact>("PmxArtifact", PmxArtifactSchema);

// ==========================================
// 11. AUDIT LOG / ACTIVITY TIMELINE
// ==========================================
export interface IPmxAuditLog extends Document {
  projectId: string;
  userId: string;
  action: string; // input_created, understanding_updated, evidence_added, decision_made, task_updated, etc.
  details: string;
  entityType: string; // PmxInput, PmxUnderstanding, etc.
  entityId?: string;
  createdAt: Date;
}

const PmxAuditLogSchema = new Schema<IPmxAuditLog>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PmxAuditLogModel = mongoose.model<IPmxAuditLog>("PmxAuditLog", PmxAuditLogSchema);

// ==========================================
// 12. SCREENSHOT INTELLIGENCE MODELS
// ==========================================
export interface IFeedbackAnnotation {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low" | "suggestion" | "improvement";
  confidence: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  reasoning: string;
  recommendation: string;
  expectedImpact: string;
  affectedComponent?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isResolved: boolean;
  resolvedAt?: Date;
  comments: Array<{
    id: string;
    author: string;
    avatar?: string;
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
}

export interface IPmxScreenshotProject extends Document {
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  screenshots: Array<{
    id: string;
    title: string;
    dataUrl: string; // base64 payload
    annotations: IFeedbackAnnotation[];
    createdAt: Date;
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackAnnotationSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ["critical", "high", "medium", "low", "suggestion", "improvement"], required: true },
    confidence: { type: Number, min: 0, max: 100, default: 80 },
    severity: { type: String, enum: ["critical", "high", "medium", "low", "info"], default: "medium" },
    description: { type: String, required: true },
    reasoning: { type: String },
    recommendation: { type: String },
    expectedImpact: { type: String },
    affectedComponent: { type: String },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    comments: [
      {
        id: { type: String, required: true },
        author: { type: String, required: true },
        avatar: { type: String },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ScreenshotItemSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    dataUrl: { type: String, required: true },
    annotations: [FeedbackAnnotationSchema]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const PmxScreenshotProjectSchema = new Schema<IPmxScreenshotProject>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    screenshots: [ScreenshotItemSchema],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const PmxScreenshotProjectModel = mongoose.model<IPmxScreenshotProject>("PmxScreenshotProject", PmxScreenshotProjectSchema);

// ==========================================
// 13. PIPELINE RUN SESSIONS MODEL
// ==========================================
export interface IPmxSession extends Document {
  projectId: string;
  userId: string;
  selectedSourceIds: string[];
  resultsSummary: {
    evidenceCount: number;
    problemCount: number;
    opportunityCount: number;
    decisionCount: number;
    solutionCount: number;
    taskCount: number;
  };
  aiModel: string;
  durationMs: number;
  createdAt: Date;
}

const PmxSessionSchema = new Schema<IPmxSession>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    selectedSourceIds: [{ type: String }],
    resultsSummary: {
      evidenceCount: { type: Number, default: 0 },
      problemCount: { type: Number, default: 0 },
      opportunityCount: { type: Number, default: 0 },
      decisionCount: { type: Number, default: 0 },
      solutionCount: { type: Number, default: 0 },
      taskCount: { type: Number, default: 0 }
    },
    aiModel: { type: String, required: true },
    durationMs: { type: Number, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PmxSessionModel = mongoose.model<IPmxSession>("PmxSession", PmxSessionSchema);

// ==========================================
// 14. GITHUB OAUTH CONNECTION MODEL
// ==========================================
export interface IPmxGithubConnection extends Document {
  userId: string;
  accessToken: string;
  githubId: number;
  githubLogin: string;
  avatarUrl?: string;
  scope?: string;
  connectedAt: Date;
}

const PmxGithubConnectionSchema = new Schema<IPmxGithubConnection>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    githubId: { type: Number, required: true },
    githubLogin: { type: String, required: true },
    avatarUrl: { type: String },
    scope: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PmxGithubConnectionModel = mongoose.model<IPmxGithubConnection>("PmxGithubConnection", PmxGithubConnectionSchema);

// ==========================================
// 15. GENERIC CONNECTOR CREDENTIALS (API-key/token based integrations)
// ==========================================
export interface IPmxConnectorCredential extends Document {
  userId: string;
  connectorId: string;
  credentials: Record<string, string>;
  label?: string;
  connectedAt: Date;
}

const PmxConnectorCredentialSchema = new Schema<IPmxConnectorCredential>(
  {
    userId: { type: String, required: true, index: true },
    connectorId: { type: String, required: true, index: true },
    credentials: { type: Schema.Types.Mixed, required: true },
    label: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PmxConnectorCredentialSchema.index({ userId: 1, connectorId: 1 }, { unique: true });

export const PmxConnectorCredentialModel = mongoose.model<IPmxConnectorCredential>("PmxConnectorCredential", PmxConnectorCredentialSchema);

// ==========================================
// 16. IDEA → PRD PIPELINE (Development PRD workspace)
// ==========================================
// `markdown` is the entire PRD as one document — headings, tables, code
// fences, mermaid diagrams, everything — rendered client-side in
// components/pmx/PrdWorkspace.tsx. `stack` mirrors the current Theme
// Controls selection so the UI can show them without re-parsing prose.
// Each AI prompt-bar refinement rewrites `markdown`/`stack` in place and
// appends to `history`; `version` increments per refinement.
export interface IPmxIdeaPrdStack {
  frontend?: string;
  backend?: string;
  database?: string;
  cloud?: string;
  authProvider?: string;
  aiProvider?: string;
  architecture?: string;
}

export interface IPmxIdeaPrd extends Document {
  projectId: string;
  userId: string;
  idea: string;
  productName?: string;
  status: "generating" | "completed" | "failed";
  error?: string;
  markdown: string;
  stack: IPmxIdeaPrdStack;
  assumptions: string[];
  pages: Array<{ name: string; purpose: string }>;
  layout?: string;
  history: Array<{ role: "user" | "assistant"; content: string; createdAt: Date }>;
  versions: Array<{ version: number; markdown: string; stack: IPmxIdeaPrdStack; createdAt: Date }>;
  version: number;
  tokensUsed: number;
  aiModel: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxIdeaPrdSchema = new Schema<IPmxIdeaPrd>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    idea: { type: String, required: true },
    productName: { type: String },
    status: { type: String, enum: ["generating", "completed", "failed"], default: "generating" },
    error: { type: String },
    markdown: { type: String, default: "" },
    stack: {
      frontend: { type: String },
      backend: { type: String },
      database: { type: String },
      cloud: { type: String },
      authProvider: { type: String },
      aiProvider: { type: String },
      architecture: { type: String },
    },
    assumptions: [{ type: String }],
    pages: [
      {
        name: { type: String },
        purpose: { type: String },
      },
    ],
    layout: { type: String },
    history: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    versions: [
      {
        version: { type: Number },
        markdown: { type: String },
        stack: {
          frontend: { type: String },
          backend: { type: String },
          database: { type: String },
          cloud: { type: String },
          authProvider: { type: String },
          aiProvider: { type: String },
          architecture: { type: String },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    version: { type: Number, default: 1 },
    tokensUsed: { type: Number, default: 0 },
    aiModel: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxIdeaPrdModel = mongoose.model<IPmxIdeaPrd>("PmxIdeaPrd", PmxIdeaPrdSchema);

// ==========================================
// 17. GOOGLE OAUTH CONNECTION (GA4 connector)
// ==========================================
export interface IPmxGoogleConnection extends Document {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email?: string;
  propertyId?: string;
  propertyName?: string;
  scope?: string;
  connectedAt: Date;
}

const PmxGoogleConnectionSchema = new Schema<IPmxGoogleConnection>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    email: { type: String },
    propertyId: { type: String },
    propertyName: { type: String },
    scope: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PmxGoogleConnectionModel = mongoose.model<IPmxGoogleConnection>("PmxGoogleConnection", PmxGoogleConnectionSchema);

// ==========================================
// 18. NOTION OAUTH CONNECTION
// ==========================================
export interface IPmxNotionConnection extends Document {
  userId: string;
  accessToken: string;
  botId: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceIcon?: string;
  ownerName?: string;
  connectedAt: Date;
}

const PmxNotionConnectionSchema = new Schema<IPmxNotionConnection>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    botId: { type: String, required: true },
    workspaceId: { type: String },
    workspaceName: { type: String },
    workspaceIcon: { type: String },
    ownerName: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PmxNotionConnectionModel = mongoose.model<IPmxNotionConnection>("PmxNotionConnection", PmxNotionConnectionSchema);

// ==========================================
// 19. SLACK OAUTH CONNECTION
// ==========================================
// accessToken/refreshToken are stored encrypted (see lib/tokenCrypto.ts) —
// callers must encrypt before save and decrypt after read; the schema
// intentionally has no knowledge of that, it just stores opaque strings.
export interface IPmxSlackConnection extends Document {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  teamId: string;
  teamName: string;
  teamIcon?: string;
  botUserId: string;
  appId: string;
  scope?: string;
  authedUserId?: string;
  connectedAt: Date;
}

const PmxSlackConnectionSchema = new Schema<IPmxSlackConnection>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamIcon: { type: String },
    botUserId: { type: String, required: true },
    appId: { type: String, required: true },
    scope: { type: String },
    authedUserId: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PmxSlackConnectionModel = mongoose.model<IPmxSlackConnection>("PmxSlackConnection", PmxSlackConnectionSchema);

// ==========================================
// 20. AI TOKEN USAGE TRACKING
// ==========================================
export interface IPmxTokenUsage extends Document {
  userId: string;
  projectId: string;
  stage: string;
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  // Breakdown only — DeepSeek's own completionTokens/totalTokens already
  // include reasoning tokens (verified against a live API response: a
  // reasoning-model call reported completion_tokens=9 for a 2-token visible
  // reply, with completion_tokens_details.reasoning_tokens=7 accounting for
  // the rest). This field exists so reasoning spend is visible as its own
  // line item, not to be added on top of completionTokens/totalTokens —
  // doing so would double-count it.
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  createdAt: Date;
}

const PmxTokenUsageSchema = new Schema<IPmxTokenUsage>(
  {
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    stage: { type: String, required: true },
    aiModel: { type: String, required: true },
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    reasoningTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true },
    costUsd: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PmxTokenUsageModel = mongoose.model<IPmxTokenUsage>("PmxTokenUsage", PmxTokenUsageSchema);

// ==========================================
// 21. PER-USER USAGE ALLOWANCE (running counter)
// ==========================================
// PmxTokenUsage above is an append-only historical event log (one row per
// AI call) — it can't itself provide race-safe "check the limit, then
// consume it" semantics (aggregating it on every check is a read-then-write
// race). This is a small, separate running-total document per (userId,
// projectId) used purely for atomic enforcement — see reserveUsage/
// reconcileUsage/releaseReservation in services/pmxUsage.ts. inputTokens/
// outputTokens/totalTokens here are the confirmed, committed totals (source
// for the Usage & Plan page's numbers); reservedTokens is a short-lived
// in-flight estimate that should sit at/near 0 outside of an actual request
// in progress.
export interface IPmxUserUsage extends Document {
  userId: string;
  projectId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reservedTokens: number;
  limit: number;
  // Unused today — no billing cycle/reset exists yet. Kept nullable so a
  // future paid plan's monthly reset can slot in without a schema change or
  // a conflicting parallel system; nothing currently reads these.
  periodStart?: Date | null;
  periodEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PmxUserUsageSchema = new Schema<IPmxUserUsage>(
  {
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    reservedTokens: { type: Number, default: 0 },
    limit: { type: Number, default: 100_000 },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);
PmxUserUsageSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export const PmxUserUsageModel = mongoose.model<IPmxUserUsage>("PmxUserUsage", PmxUserUsageSchema);
