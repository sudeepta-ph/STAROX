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
  },
  { timestamps: true }
);

export const PmxUnderstandingModel = mongoose.model<IPmxUnderstanding>("PmxUnderstanding", PmxUnderstandingSchema);

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
  }>;
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
    isDeleted: { type: Boolean, default: false },
    history: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        prd: { type: String },
        techSpecs: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const PmxSolutionModel = mongoose.model<IPmxSolution>("PmxSolution", PmxSolutionSchema);

// ==========================================
// 9. EXECUTION TICKET MODEL (Stage 9)
// ==========================================
export interface IPmxExecutionTask extends Document {
  projectId: string;
  userId: string;
  solutionId?: string;
  title: string;
  description: string;
  type: "frontend" | "backend" | "infra" | "testing" | "deployment" | "ux";
  sprintPlan: string; // e.g. Sprint 1
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "done";
  timeEstimate: string; // e.g. "2h", "1d", "3d"
  assignee?: string;
  dependencies: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PmxExecutionTaskSchema = new Schema<IPmxExecutionTask>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    solutionId: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["frontend", "backend", "infra", "testing", "deployment", "ux"],
      required: true,
      index: true,
    },
    sprintPlan: { type: String, default: "Backlog" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "review", "done"], default: "todo" },
    timeEstimate: { type: String, default: "1d" },
    assignee: { type: String },
    dependencies: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PmxExecutionTaskModel = mongoose.model<IPmxExecutionTask>("PmxExecutionTask", PmxExecutionTaskSchema);

// ==========================================
// 10. ARTIFACTS STORAGE MODEL (Stage 10)
// ==========================================
export interface IPmxArtifact extends Document {
  projectId: string;
  userId: string;
  title: string;
  type: "prd" | "roadmap" | "technical_spec" | "sprint_plan" | "product_strategy" | "ux_audit" | "engineering_plan";
  content: string; // raw content or markdown
  format: "markdown" | "pdf" | "json";
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
      enum: ["prd", "roadmap", "technical_spec", "sprint_plan", "product_strategy", "ux_audit", "engineering_plan"],
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    format: { type: String, enum: ["markdown", "pdf", "json"], default: "markdown" },
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
