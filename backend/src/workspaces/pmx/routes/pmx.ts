import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import {
  PmxInputModel,
  PmxUnderstandingModel,
  PmxEvidenceModel,
  PmxAnalysisModel,
  PmxProblemModel,
  PmxOpportunityModel,
  PmxDecisionModel,
  PmxSolutionModel,
  PmxExecutionTaskModel,
  PmxExecutionPlanModel,
  PmxArtifactModel,
  PmxAuditLogModel,
  PmxScreenshotProjectModel,
  PmxSessionModel,
  PmxIdeaPrdModel,
  PmxTokenUsageModel,
  PmxWorkspaceMemberModel,
  PmxWorkspaceInviteModel,
  PmxWorkspaceInviteCodeModel,
  PmxWorkspaceEmailInviteModel,
  PMX_INVITE_ROLES,
  PMX_ROLE_LABELS,
  PmxWorkspaceRole,
  PMX_DEPARTMENTS
} from "../../../models/Pmx";
import {
  generateProductUnderstanding,
  generateEvidenceSignals,
  detectProductProblems,
  scoreOpportunities,
  generateDecisionRecommendations,
  generateSolutionDetails,
  combineSolutions,
  compileArtifact,
  generateExecutionTasks,
  generateExecutionScaffold,
  generateCustomExecutionScaffold,
  generateDepartmentTasks,
  generateExecutionDiff,
  refineSolutionPrd
} from "../../../services/pmxAi";
import { generateIdeaPrd, refineIdeaPrd } from "../../../services/pmxIdeaPrd";
import { analyzeScreenshotUI } from "../../../services/screenshotAi";
import { runUIAudit } from "../../../services/uiAuditAi";
import { AI_MODEL } from "../../../services/ai/models";
import { UsageCapExceededError, HARD_DAILY_CAP_USD } from "../../../services/ai/deepseek";
import {
  TokenLimitExceededError,
  TrialExpiredError,
  USER_TOKEN_LIMIT,
  getUserUsage,
  getWorkspacePlanStatus,
  getWorkspaceMemberUsage,
} from "../../../services/pmxUsage";
import { screenshotRouter, captureScreenshot } from "./screenshot";
import { getMemberRole, requireWorkspaceAccess, WorkspaceScopedRequest, canWrite } from "../middleware/workspaceAccess";
import UserModel from "../../../models/User";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { sendWorkspaceInviteEmail } from "../../../services/mail";
import { env } from "../../../config/env";

export const pmxRouter = Router();

// Apply auth middleware to all PMX routes
pmxRouter.use(authMiddleware);
pmxRouter.use(screenshotRouter);

// ==========================================
// HELPERS
// ==========================================

// Invite code alphabet — excludes the visually-ambiguous pairs called out
// in the spec (O/0, I/1, S/5), 30 symbols. Generated with crypto.randomInt
// (Node's CSPRNG, unbiased over an arbitrary range — never Math.random()),
// matching this codebase's existing convention of node:crypto for every
// other opaque id/token (crypto.randomUUID, crypto.randomBytes).
const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRTUVWXYZ";

function generateInviteCodePlaintext(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += INVITE_CODE_ALPHABET[crypto.randomInt(0, INVITE_CODE_ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// Accepts either "X7K9MP42" or "X7K9-MP42" and normalizes to the latter,
// uppercased, before hashing — so both forms of the same code validate.
function normalizeInviteCode(input: string): string {
  const stripped = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return stripped.length === 8 ? `${stripped.slice(0, 4)}-${stripped.slice(4)}` : stripped;
}

function hashInviteCode(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// Explicit constant-time comparison of the two hash buffers, on top of the
// DB's own equality lookup — belt-and-suspenders against any timing signal
// leaking whether a near-miss hash was close to a real one.
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Rate limiter for the two public-to-any-authenticated-user invite-code
// endpoints — the whole point of an 8-character code is that it's short
// enough for a human to type, which also makes it short enough to try to
// brute-force without this. Same express-rate-limit pattern already used
// for the public contact-form endpoint (api/routes/contact.ts).
const inviteCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: "Too many attempts. Please try again later." },
});

async function logAudit(req: AuthenticatedRequest, projectId: string, action: string, details: string, entityType: string, entityId?: string) {
  try {
    await PmxAuditLogModel.create({
      projectId,
      userId: req.userId,
      action,
      details,
      entityType,
      entityId
    });
  } catch (err) {
    console.error("[PMX Audit Log] Failed to log audit:", err);
  }
}

// Materializes a workspace the moment it gets real content — the frontend no
// longer eagerly creates a blank "Untitled N" workspace up front; instead a
// fresh projectId is only promoted to an actual workspace (and shows up in
// GET /projects) here, the first time an idea is generated or a source is
// added under it. $setOnInsert means this is a no-op for a projectId that
// already has a workspace — an existing name is never overwritten.
//
// Looked up by projectId alone (not projectId+userId) since the workspace
// doc is shared once a workspace has members — callers MUST verify the
// caller already has access before calling this for an EXISTING workspace
// (see the inline genesis gates on POST /inputs and POST /idea/generate);
// this function itself only decides what happens for a brand-new projectId,
// where the caller becomes the owner.
async function ensureWorkspace(projectId: string, userId: string, name: string) {
  try {
    // Checked before the upsert (not derived from its result) so ownership
    // is only granted the one time this projectId truly had no workspace
    // yet — a plain upsert result doesn't cleanly distinguish "just created"
    // from "already existed" across mongoose versions/typings.
    const existedBefore = await PmxUnderstandingModel.exists({ projectId, isDeleted: false });

    await PmxUnderstandingModel.findOneAndUpdate(
      { projectId, isDeleted: false },
      {
        $setOnInsert: {
          projectId,
          userId,
          productSummary: { name: name?.trim() || "Untitled", oneLiner: "", category: "SaaS", stage: "idea" },
          businessModel: "",
          coreFeatures: [],
          targetAudience: "",
          personas: [],
          customerSegments: [],
          businessGoals: [],
          valueProposition: "",
          customerJourney: [],
        },
      },
      { upsert: true }
    );

    if (!existedBefore) {
      await PmxWorkspaceMemberModel.findOneAndUpdate(
        { projectId, userId },
        { $setOnInsert: { projectId, userId, role: "owner", joinedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("[PMX] Failed to materialize workspace:", err);
  }
}

// Helper to run full downstream intelligence pipeline
export async function runDownstreamPipeline(
  projectId: string,
  userId: string,
  selectedSourceIds: string[] | undefined,
  req: any
) {
  const startTime = Date.now();

  // Fetch active inputs, optionally filtering by selectedSourceIds. When no
  // explicit selection is given, archived sources are excluded — this is
  // what makes the Knowledge Sources "include in analysis" toggle real.
  const query: any = { projectId, isDeleted: false };
  if (selectedSourceIds && selectedSourceIds.length > 0) {
    query._id = { $in: selectedSourceIds };
  } else {
    query.isArchived = { $ne: true };
  }

  const inputs = await PmxInputModel.find(query);
  if (inputs.length === 0) {
    throw new Error("None of the selected sources could be found for this workspace — try reselecting them.");
  }

  const actualSelectedIds = inputs.map(i => i._id.toString());
  const textContents = inputs.map(i => `[Source: ${i.name} (${i.type})]\n${i.content || ""}\n${i.summary || ""}`);

  // 1. Regenerate Understanding
  console.log("[PMX Pipeline] Step 1: Synthesizing Product Understanding...");
  const understandingData = await generateProductUnderstanding(textContents, undefined, userId, projectId);
  
  let understanding = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });
  if (!understanding) {
    understanding = new PmxUnderstandingModel({ projectId, userId, version: 1 });
  } else {
    understanding.version += 1;
    understanding.history.push({
      updatedAt: new Date(),
      updatedBy: userId,
      understandingData: {
        productSummary: understanding.productSummary,
        businessModel: understanding.businessModel,
        coreFeatures: understanding.coreFeatures,
        targetAudience: understanding.targetAudience,
        personas: understanding.personas,
        customerSegments: understanding.customerSegments,
        businessGoals: understanding.businessGoals,
        valueProposition: understanding.valueProposition,
        customerJourney: understanding.customerJourney
      }
    });
  }
  Object.assign(understanding, understandingData);
  await understanding.save();

  // 2. Extract Evidence Signals
  console.log("[PMX Pipeline] Step 2: Extracting Evidence Signals...");
  const evidenceSignals = await generateEvidenceSignals(textContents, undefined, userId, projectId);
  // Remove old auto-extracted evidence for clean sweep, but keep manual ones (manual source is e.g. "User Uploaded")
  await PmxEvidenceModel.deleteMany({ projectId, source: { $ne: "User Uploaded" } });
  
  const evidenceDocs = evidenceSignals.map((ev: any) => ({
    projectId,
    userId,
    ...ev,
    sourceInputIds: actualSelectedIds,
    isDeleted: false
  }));
  if (evidenceDocs.length > 0) {
    await PmxEvidenceModel.insertMany(evidenceDocs);
  }

  // Fetch updated list of evidence
  const allEvidence = await PmxEvidenceModel.find({ projectId, isDeleted: false });

  // 3. Detect Problems
  console.log("[PMX Pipeline] Step 3: Detecting Problems...");
  const detectedProblems = await detectProductProblems(allEvidence, textContents, undefined, userId, projectId);
  await PmxProblemModel.deleteMany({ projectId });
  const problemDocs = detectedProblems.map((prob: any) => ({
    projectId,
    userId,
    ...prob,
    sourceInputIds: actualSelectedIds,
    isDeleted: false
  }));
  if (problemDocs.length > 0) {
    await PmxProblemModel.insertMany(problemDocs);
  }

  // 4. Score Opportunities
  console.log("[PMX Pipeline] Step 4: Scoring Opportunities...");
  const scopedOpportunities = await scoreOpportunities(detectedProblems, understandingData, undefined, userId, projectId);
  await PmxOpportunityModel.deleteMany({ projectId });
  const opportunityDocs = scopedOpportunities.map((opp: any) => {
    const userImpact = opp.userImpact ?? 5;
    const confidence = opp.confidence ?? 80;
    const effort = opp.effort ?? 5;
    
    // ICE = Impact * Confidence * Ease (Ease = 11 - Effort)
    const ease = 11 - effort;
    const iceScore = Math.round((userImpact * (confidence / 100) * ease) * 10) / 10;
    
    // RICE = (Reach * Impact * Confidence) / Effort (Reach = User Impact * 10)
    const reach = userImpact * 10;
    const riceScore = Math.round(((reach * userImpact * (confidence / 100)) / effort) * 10) / 10;

    return {
      projectId,
      userId,
      ...opp,
      iceScore,
      riceScore,
      sourceInputIds: actualSelectedIds,
      isDeleted: false
    };
  });
  if (opportunityDocs.length > 0) {
    await PmxOpportunityModel.insertMany(opportunityDocs);
  }

  // 5. Generate Decisions
  console.log("[PMX Pipeline] Step 5: Formulating Decisions...");
  const recommendations = await generateDecisionRecommendations(detectedProblems, scopedOpportunities, undefined, userId, projectId);
  await PmxDecisionModel.deleteMany({ projectId });
  const decisionDocs = recommendations.map((dec: any) => ({
    projectId,
    userId,
    ...dec,
    sourceInputIds: actualSelectedIds,
    isDeleted: false
  }));
  if (decisionDocs.length > 0) {
    await PmxDecisionModel.insertMany(decisionDocs);
  }

  // Save Pipeline Session History
  const durationMs = Date.now() - startTime;
  const session = await PmxSessionModel.create({
    projectId,
    userId,
    selectedSourceIds: actualSelectedIds,
    resultsSummary: {
      evidenceCount: evidenceDocs.length,
      problemCount: problemDocs.length,
      opportunityCount: opportunityDocs.length,
      decisionCount: decisionDocs.length,
      solutionCount: 0,
      taskCount: 0
    },
    aiModel: AI_MODEL,
    durationMs
  });

  console.log("[PMX Pipeline] Done. Downstream intelligence updated successfully.");
  await logAudit(
    req,
    projectId,
    "pipeline_run",
    `Successfully executed the automated AI PM product intelligence pipeline (Session: ${session._id.toString()}).`,
    "PmxSession",
    session._id.toString()
  );

  return session;
}

// ==========================================
// ANALYTICS OVERVIEW — powers the /analytics page
// ==========================================

// Aggregate counts, breakdowns, and a 30-day session trend for the
// workspace. Everything here is a real Mongo count/aggregate against the
// same models every other PMX page reads — no cached or precomputed
// rollups, so it's always current. Workspace-scoped (not per-user) like
// every other in-scope route, since it aggregates the same shared models.
pmxRouter.get("/analytics/overview", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const filter = { projectId, isDeleted: false };

    const [
      sources, evidence, problems, opportunities,
      decisions, solutions, tasks, artifacts, sessions,
    ] = await Promise.all([
      PmxInputModel.countDocuments(filter),
      PmxEvidenceModel.countDocuments(filter),
      PmxProblemModel.countDocuments(filter),
      PmxOpportunityModel.countDocuments(filter),
      PmxDecisionModel.countDocuments(filter),
      PmxSolutionModel.countDocuments(filter),
      PmxExecutionTaskModel.countDocuments(filter),
      PmxArtifactModel.countDocuments(filter),
      PmxSessionModel.countDocuments({ projectId }),
    ]);

    const [tasksByStatusAgg, problemsBySeverityAgg, decisionsByStatusAgg, avgDurationAgg] = await Promise.all([
      PmxExecutionTaskModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      PmxProblemModel.aggregate([
        { $match: filter },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      PmxDecisionModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      PmxSessionModel.aggregate([
        { $match: { projectId } },
        { $group: { _id: null, avg: { $avg: "$durationMs" } } },
      ]),
    ]);

    const tasksByStatus = { todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const r of tasksByStatusAgg) if (r._id in tasksByStatus) tasksByStatus[r._id as keyof typeof tasksByStatus] = r.count;

    const problemsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const r of problemsBySeverityAgg) if (r._id in problemsBySeverity) problemsBySeverity[r._id as keyof typeof problemsBySeverity] = r.count;

    const decisionsByStatus = { pending: 0, approved: 0, rejected: 0, implemented: 0 };
    for (const r of decisionsByStatusAgg) if (r._id in decisionsByStatus) decisionsByStatus[r._id as keyof typeof decisionsByStatus] = r.count;

    // 30-day session trend, zero-filled so the chart has a continuous axis
    // rather than gaps on days with no runs.
    const DAYS = 30;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);

    const timelineAgg = await PmxSessionModel.aggregate([
      { $match: { projectId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]);
    const countByDate = new Map(timelineAgg.map((r) => [r._id as string, r.count as number]));

    const sessionsTimeline: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      sessionsTimeline.push({ date: key, count: countByDate.get(key) ?? 0 });
    }

    const [recentSessions, recentActivity] = await Promise.all([
      PmxSessionModel.find({ projectId }).sort({ createdAt: -1 }).limit(5),
      PmxAuditLogModel.find({ projectId }).sort({ createdAt: -1 }).limit(8),
    ]);

    res.json({
      success: true,
      data: {
        totals: { sources, evidence, problems, opportunities, decisions, solutions, tasks, artifacts, sessions },
        tasksByStatus,
        problemsBySeverity,
        decisionsByStatus,
        sessionsTimeline,
        avgSessionDurationMs: avgDurationAgg[0]?.avg ?? 0,
        recentSessions,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 0. PROJECT / PRODUCT LIFECYCLE
// ==========================================

// List every PMX workspace the caller is a MEMBER of (owner, admin, or
// member — not just the ones they created). `PmxUnderstandingModel` doubles
// as the workspace registry — a row here is what makes a projectId a "real"
// workspace. Rows are created explicitly (POST /projects) or implicitly the
// moment a projectId gets real content (see ensureWorkspace, called from
// idea generation and source creation) — never as a side effect of a GET.
pmxRouter.get("/projects", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const memberships = await PmxWorkspaceMemberModel.find({ userId }, { projectId: 1, role: 1, joinedAt: 1 });
    const roleByProject = new Map(memberships.map((m) => [m.projectId, m.role]));
    const joinedAtByProject = new Map(memberships.map((m) => [m.projectId, m.joinedAt]));
    const projectIds = [...roleByProject.keys()];

    const workspaces = await PmxUnderstandingModel.find({ projectId: { $in: projectIds }, isDeleted: false });

    const inputAgg = await PmxInputModel.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: false } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$projectId",
          count: { $sum: 1 },
          first: { $first: "$$ROOT" },
          lastCreatedAt: { $last: "$createdAt" },
        },
      },
    ]);
    const inputsByProject = new Map(inputAgg.map((r) => [r._id as string, r]));

    // Total member count per workspace — shown on the Workspaces page card
    // so a joined user can see how many teammates are already there.
    const memberAgg = await PmxWorkspaceMemberModel.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);
    const memberCountByProject = new Map(memberAgg.map((r) => [r._id as string, r.count as number]));

    const data = workspaces
      .map((w) => {
        const agg = inputsByProject.get(w.projectId);
        const sourceCount = agg?.count ?? 0;
        const primarySource = agg?.first
          ? { _id: agg.first._id, name: agg.first.name, url: agg.first.url, type: agg.first.type }
          : null;
        const updatedAt = agg?.lastCreatedAt && agg.lastCreatedAt > w.updatedAt ? agg.lastCreatedAt : w.updatedAt;
        return {
          projectId: w.projectId,
          name: w.productSummary?.name || "Untitled Project",
          sourceCount,
          isProject: sourceCount >= 2,
          primarySource,
          updatedAt,
          role: roleByProject.get(w.projectId) || "member",
          memberCount: memberCountByProject.get(w.projectId) ?? 1,
          joinedAt: joinedAtByProject.get(w.projectId) || w.createdAt,
        };
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Create a new PMX workspace. Just materializes a fresh `projectId` and its
// placeholder understanding doc — every other endpoint already works with
// any projectId string, so nothing else needs to know about it up front.
pmxRouter.post("/projects", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    let name = (req.body?.name as string | undefined)?.trim();
    if (!name) {
      // Number untitled workspaces like browser tabs: Untitled 1, Untitled 2…
      const untitled = await PmxUnderstandingModel.find(
        { userId, isDeleted: false, "productSummary.name": { $regex: /^Untitled \d+$/ } },
        { "productSummary.name": 1 }
      );
      const nextNumber = untitled.reduce((max, w) => {
        const n = parseInt(w.productSummary?.name?.replace("Untitled ", "") || "0", 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;
      name = `Untitled ${nextNumber}`;
    }
    const projectId = crypto.randomUUID();

    await PmxUnderstandingModel.create({
      projectId,
      userId,
      productSummary: { name, oneLiner: "", category: "SaaS", stage: "idea" },
      businessModel: "",
      coreFeatures: [],
      targetAudience: "",
      personas: [],
      customerSegments: [],
      businessGoals: [],
      valueProposition: "",
      customerJourney: [],
    });
    await PmxWorkspaceMemberModel.create({ projectId, userId, role: "owner", joinedAt: new Date() });

    res.json({ success: true, data: { projectId, name } });
  } catch (err) {
    next(err);
  }
});

// Rename a workspace — a targeted update of just productSummary.name so it
// can be called from the Products list without loading (and risking
// clobbering) the rest of that workspace's understanding doc.
pmxRouter.put("/projects/:projectId/rename", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const name = (req.body?.name as string | undefined)?.trim();
    if (!name) return res.status(400).json({ success: false, error: "A name is required" });

    const understanding = await PmxUnderstandingModel.findOneAndUpdate(
      { projectId, isDeleted: false },
      { $set: { "productSummary.name": name } },
      { new: true }
    );
    if (!understanding) return res.status(404).json({ success: false, error: "Workspace not found" });

    await logAudit(req, projectId, "project_renamed", `Renamed workspace to "${name}"`, "PmxUnderstanding", understanding._id.toString());
    res.json({ success: true, data: { projectId, name } });
  } catch (err) {
    next(err);
  }
});

// Permanently delete a product and cascade the delete across every
// stage of data scoped to it — sources, understanding, evidence,
// analysis, problems, opportunities, decisions, solutions, tasks,
// artifacts, and screenshot workspaces. Audit logs are preserved.
// Owner-only: this also destroys every other member's access.
pmxRouter.delete("/projects/:projectId", requireWorkspaceAccess("owner"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const filter = { projectId };
    const softDelete = { isDeleted: true };

    const [
      inputs, understanding, evidence, analysis, problems,
      opportunities, decisions, solutions, tasks, artifacts,
      screenshots, sessions
    ] = await Promise.all([
      PmxInputModel.updateMany(filter, softDelete),
      PmxUnderstandingModel.updateMany(filter, softDelete),
      PmxEvidenceModel.updateMany(filter, softDelete),
      PmxAnalysisModel.updateMany(filter, softDelete),
      PmxProblemModel.updateMany(filter, softDelete),
      PmxOpportunityModel.updateMany(filter, softDelete),
      PmxDecisionModel.updateMany(filter, softDelete),
      PmxSolutionModel.updateMany(filter, softDelete),
      PmxExecutionTaskModel.updateMany(filter, softDelete),
      PmxArtifactModel.updateMany(filter, softDelete),
      PmxScreenshotProjectModel.updateMany(filter, softDelete),
      PmxSessionModel.deleteMany(filter),
    ]);
    await Promise.all([
      PmxWorkspaceMemberModel.deleteMany(filter),
      PmxWorkspaceInviteModel.deleteMany(filter),
      PmxWorkspaceInviteCodeModel.deleteMany(filter),
    ]);

    await logAudit(
      req,
      projectId,
      "project_deleted",
      `Deleted product "${projectId}" and all related sources, insights, and execution data.`,
      "PmxProject",
      projectId
    );

    res.json({
      success: true,
      message: "Product and all related data deleted successfully.",
      data: {
        inputsRemoved: inputs.modifiedCount,
        understandingRemoved: understanding.modifiedCount,
        evidenceRemoved: evidence.modifiedCount,
        analysisRemoved: analysis.modifiedCount,
        problemsRemoved: problems.modifiedCount,
        opportunitiesRemoved: opportunities.modifiedCount,
        decisionsRemoved: decisions.modifiedCount,
        solutionsRemoved: solutions.modifiedCount,
        tasksRemoved: tasks.modifiedCount,
        artifactsRemoved: artifacts.modifiedCount,
        screenshotsRemoved: screenshots.modifiedCount,
        sessionsRemoved: sessions.deletedCount,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 1. INPUT SOURCES ENDPOINTS (Stage 1)
// ==========================================

// Get all inputs
pmxRouter.get("/inputs", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const inputs = await PmxInputModel.find({
      projectId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: inputs });
  } catch (err) {
    next(err);
  }
});

// Create new input source. This is a "genesis" route — projectId may not
// have a workspace yet (see ensureWorkspace) — so it can't use the standard
// requireWorkspaceAccess() middleware, which would 403 the very first
// source in a brand-new workspace. Gate inline: only enforce membership if
// the workspace already exists; a truly new projectId has no gate, since
// the caller is about to become its owner via ensureWorkspace.
pmxRouter.post("/inputs", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", name, type, url, content, metadata = {} } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, error: "Name and Type are required fields" });
    }

    const existingWorkspace = await PmxUnderstandingModel.exists({ projectId, isDeleted: false });
    if (existingWorkspace) {
      const role = await getMemberRole(projectId, req.userId!);
      if (!role) return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    // Auto-create summary from DeepSeek (simple 1-sentence prompt)
    let aiSummary = "Processing AI Summary...";
    try {
      const summaryResponse = await generateProductUnderstanding([
        `Source Content to summarize:\n${content || url || ""}`
      ], undefined, req.userId, projectId);
      aiSummary = summaryResponse?.productSummary?.oneLiner || "Source processed by AI.";
    } catch {
      aiSummary = "Source uploaded. Pending deep intelligence summary.";
    }

    const inputNode = await PmxInputModel.create({
      projectId,
      userId: req.userId,
      name,
      type,
      url,
      content,
      metadata,
      status: "completed",
      summary: aiSummary,
      history: [{ status: "completed", note: "Source successfully uploaded and parsed." }]
    });

    // Connecting a source materializes the workspace, same as generating an
    // idea PRD does — a no-op if this projectId already has one.
    await ensureWorkspace(projectId, req.userId!, name);

    await logAudit(req, projectId, "input_created", `Imported new source: "${name}" (${type})`, "PmxInput", inputNode._id.toString());

    // If this workspace has auto-run-analysis enabled, kick off the
    // pipeline in the background rather than requiring an explicit "Process".
    PmxUnderstandingModel.findOne({ projectId, isDeleted: false }, { "aiSettings.autoAnalysis": 1 })
      .then((u) => {
        if (u?.aiSettings?.autoAnalysis) {
          runDownstreamPipeline(projectId, req.userId!, undefined, req).catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error(err));

    res.json({ success: true, data: inputNode });
  } catch (err) {
    next(err);
  }
});

// Trigger full intelligence processing manually
pmxRouter.post("/inputs/process", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", selectedSourceIds } = req.body;
    if (!selectedSourceIds || selectedSourceIds.length === 0) {
      return res.status(400).json({ success: false, error: "No sources selected. Select one or more sources to begin analysis." });
    }

    const session = await runDownstreamPipeline(projectId, req.userId!, selectedSourceIds, req);
    res.json({ success: true, data: session, message: "Product intelligence pipeline successfully executed." });
  } catch (err) {
    next(err);
  }
});

// Update input source details
pmxRouter.put("/inputs/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, content, url } = req.body;
    const existing = await PmxInputModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!existing) return res.status(404).json({ success: false, error: "Source not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const input = await PmxInputModel.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { name, content, url },
      { new: true }
    );
    if (!input) return res.status(404).json({ success: false, error: "Source not found" });

    await logAudit(req, input.projectId, "input_updated", `Modified source: "${input.name}"`, "PmxInput", input._id.toString());
    res.json({ success: true, data: input });
  } catch (err) {
    next(err);
  }
});

// Archive/unarchive a source — archived sources are excluded from the
// pipeline's default input selection (see runDownstreamPipeline).
pmxRouter.patch("/inputs/:id/archive", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { isArchived } = req.body;
    const existing = await PmxInputModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!existing) return res.status(404).json({ success: false, error: "Source not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    existing.isArchived = !!isArchived;
    await existing.save();

    await logAudit(
      req,
      existing.projectId,
      isArchived ? "input_archived" : "input_unarchived",
      `${isArchived ? "Archived" : "Unarchived"} source: "${existing.name}"`,
      "PmxInput",
      existing._id.toString()
    );
    res.json({ success: true, data: existing });
  } catch (err) {
    next(err);
  }
});

// Reprocess individual input source
pmxRouter.post("/inputs/:id/reprocess", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = await PmxInputModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!input) return res.status(404).json({ success: false, error: "Source not found" });
    if (!canWrite(await getMemberRole(input.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    input.status = "processing";
    await input.save();

    let aiSummary = "Processed by AI PM.";
    try {
      const summaryResponse = await generateProductUnderstanding([
        `Source Content:\n${input.content || input.url || ""}`
      ], undefined, req.userId, input.projectId);
      aiSummary = summaryResponse?.productSummary?.oneLiner || "Parsed source details.";
    } catch (err) {
      console.error(err);
    }

    input.status = "completed";
    input.summary = aiSummary;
    input.history.push({ status: "completed", updatedAt: new Date(), note: "Reprocessed manually." });
    await input.save();

    await logAudit(req, input.projectId, "input_reprocessed", `Reprocessed source: "${input.name}"`, "PmxInput", input._id.toString());

    // Trigger downstream cascade on this single input
    runDownstreamPipeline(input.projectId, req.userId!, [input._id.toString()], req).catch(err => console.error(err));

    res.json({ success: true, data: input });
  } catch (err) {
    next(err);
  }
});

// Get pipeline sessions history
pmxRouter.get("/history/sessions", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const sessions = await PmxSessionModel.find({ projectId }).sort({ createdAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// Rerun a previous pipeline session
pmxRouter.post("/history/sessions/:id/rerun", async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await PmxSessionModel.findOne({ _id: req.params.id });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });
    if (!canWrite(await getMemberRole(session.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const newSession = await runDownstreamPipeline(session.projectId, req.userId!, session.selectedSourceIds, req);
    res.json({ success: true, data: newSession });
  } catch (err) {
    next(err);
  }
});

// Soft delete input source
pmxRouter.delete("/inputs/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxInputModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Source not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const input = await PmxInputModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!input) return res.status(404).json({ success: false, error: "Source not found" });

    await logAudit(req, input.projectId, "input_deleted", `Deleted source node: "${input.name}"`, "PmxInput", input._id.toString());
    res.json({ success: true, message: "Source deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. PRODUCT UNDERSTANDING ENDPOINTS (Stage 2)
// ==========================================

// Get current product understanding. Deliberately does NOT auto-create a
// placeholder anymore — this used to fire on every page load/tab switch
// (via fetchAll), which meant just looking at a brand-new projectId
// silently materialized it as a real "My Product Workspace" workspace.
// Workspaces now only become real via ensureWorkspace (idea generated or
// a source connected) — this route just reports what's there, or null.
//
// Not gated with requireWorkspaceAccess() — fetchAll() polls this for a
// projectId that may have no workspace (and so no membership) yet, and
// should just get null back; membership is enforced once a workspace
// actually exists.
pmxRouter.get("/understanding", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const understanding = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });
    if (understanding && !(await getMemberRole(projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    res.json({ success: true, data: understanding || null });
  } catch (err) {
    next(err);
  }
});

// Save updated product understanding — also the save path for the
// Workspace settings section (workspaceName/workspaceDescription/
// inviteLinksEnabled) and the AI Engine section (aiSettings.autoAnalysis),
// so those settings reuse this same endpoint rather than getting dedicated
// routes of their own.
//
// Genesis route, same reasoning as POST /inputs: Settings is reachable for
// a projectId that hasn't materialized a workspace yet (no NAV_GATES entry
// blocks it), and this is the one existing path that creates the
// PmxUnderstandingModel doc directly rather than via ensureWorkspace — so it
// can't use the blanket requireWorkspaceAccess() middleware either.
pmxRouter.put("/understanding", async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      projectId = "default", productSummary, businessModel, coreFeatures, targetAudience, personas,
      customerSegments, businessGoals, valueProposition, customerJourney,
      workspaceName, workspaceDescription, inviteLinksEnabled, aiSettings,
    } = req.body;
    let understanding = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });

    if (!understanding) {
      understanding = new PmxUnderstandingModel({ projectId, userId: req.userId, version: 1 });
      await PmxWorkspaceMemberModel.findOneAndUpdate(
        { projectId, userId: req.userId! },
        { $setOnInsert: { projectId, userId: req.userId!, role: "owner", joinedAt: new Date() } },
        { upsert: true }
      );
    } else {
      if (!canWrite(await getMemberRole(projectId, req.userId!))) {
        return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
      }
      understanding.version += 1;
      // Push history
      understanding.history.push({
        updatedAt: new Date(),
        updatedBy: req.userId!,
        understandingData: {
          productSummary: understanding.productSummary,
          businessModel: understanding.businessModel,
          coreFeatures: understanding.coreFeatures,
          targetAudience: understanding.targetAudience,
          personas: understanding.personas,
          customerSegments: understanding.customerSegments,
          businessGoals: understanding.businessGoals,
          valueProposition: understanding.valueProposition,
          customerJourney: understanding.customerJourney
        }
      });
    }

    Object.assign(understanding, {
      productSummary,
      businessModel,
      coreFeatures,
      targetAudience,
      personas,
      customerSegments,
      businessGoals,
      valueProposition,
      customerJourney
    });
    if (workspaceName !== undefined) understanding.workspaceName = workspaceName;
    if (workspaceDescription !== undefined) understanding.workspaceDescription = workspaceDescription;
    if (inviteLinksEnabled !== undefined) understanding.inviteLinksEnabled = !!inviteLinksEnabled;
    if (aiSettings?.autoAnalysis !== undefined) understanding.aiSettings = { autoAnalysis: !!aiSettings.autoAnalysis };

    await understanding.save();
    await logAudit(req, projectId, "understanding_updated", "Updated Product Understanding workspace parameters.", "PmxUnderstanding", understanding._id.toString());

    res.json({ success: true, data: understanding });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. EVIDENCE SIGNALS ENDPOINTS (Stage 3)
// ==========================================

// Get list of evidence
pmxRouter.get("/evidence", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const category = req.query.category as string;
    const query = req.query.search as string;

    const filter: Record<string, any> = { projectId, isDeleted: false };
    if (category) {
      filter.category = category;
    }
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { quote: { $regex: query, $options: "i" } }
      ];
    }

    const evidence = await PmxEvidenceModel.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: evidence });
  } catch (err) {
    next(err);
  }
});

// Create manual evidence
pmxRouter.post("/evidence", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, description, category, quote, confidence = 3, importance = 3, relatedFeatures = [], relatedProblems = [] } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: "Title, Description, and Category are required" });
    }

    const evidence = await PmxEvidenceModel.create({
      projectId,
      userId: req.userId,
      title,
      description,
      category,
      source: "User Uploaded",
      quote,
      confidence,
      importance,
      relatedFeatures,
      relatedProblems
    });

    await logAudit(req, projectId, "evidence_created", `Added manual evidence signal: "${title}"`, "PmxEvidence", evidence._id.toString());
    res.json({ success: true, data: evidence });
  } catch (err) {
    next(err);
  }
});

// Soft delete evidence
pmxRouter.delete("/evidence/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxEvidenceModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Evidence not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const evidence = await PmxEvidenceModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!evidence) return res.status(404).json({ success: false, error: "Evidence not found" });

    await logAudit(req, evidence.projectId, "evidence_deleted", `Deleted evidence card: "${evidence.title}"`, "PmxEvidence", evidence._id.toString());
    res.json({ success: true, message: "Evidence deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. PRODUCT ANALYSIS UX AUDIT ENDPOINTS (Stage 4)
// ==========================================

// Get analysis audits
pmxRouter.get("/analysis", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const reports = await PmxAnalysisModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// UI INTELLIGENCE AGENT — focused UI/UX-only audit
// POST /api/pmx/analysis/ui-audit
// Body:
//   mode: "initial" | "enhance"          (default: "initial")
//   url?: string                          live website URL
//   title?: string                        page label
//   screenshots?: string[]               base64 dataUrls of uploaded screens
//   screenshotLabels?: string[]           labels matching each screenshot
// ──────────────────────────────────────────────────────────────
pmxRouter.post("/analysis/ui-audit", async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      mode = "initial",
      url,
      title,
      screenshots = [],       // array of base64 dataUrls
      screenshotLabels = [],  // optional labels per screenshot
    } = req.body;

    const hasUrl         = !!url;
    const hasScreenshots = Array.isArray(screenshots) && screenshots.length > 0;

    if (!hasUrl && !hasScreenshots) {
      return res.status(400).json({ success: false, error: "Provide a URL or at least one screenshot." });
    }

    // Build context string for the AI
    // (text models don't receive base64 images — we describe what was provided)
    const contextParts: string[] = [];

    if (hasUrl) {
      contextParts.push(`Live website URL: ${url}`);
      contextParts.push(`Base your findings on known UX patterns for this type of product at that URL.`);
    }

    if (title) {
      contextParts.push(`Page title: ${title}`);
    }

    if (hasScreenshots) {
      contextParts.push(`\nThe user has uploaded ${screenshots.length} screenshot(s) of the following screens:`);
      screenshots.forEach((_: string, i: number) => {
        const label = screenshotLabels[i] || `Screen ${i + 1}`;
        contextParts.push(`  - Screenshot ${i + 1}: "${label}"`);
      });
      contextParts.push(`Analyze each screen individually. Also identify visual inconsistencies across screens.`);
    }

    const context      = contextParts.join("\n");
    const auditMode    = (hasScreenshots ? "enhance" : "initial") as "initial" | "enhance";

    // Pure URL-mode only (not the "enhance" URL+screenshots case, which
    // already has real screenshots from the user) — capture a real full-page
    // screenshot server-side before auditing, so URL-mode results carry the
    // same { dataUrl, label } screenshot data screenshot-mode has always had
    // client-side, and get a real screenshotIndex instead of null. The AI
    // itself never sees the image (DeepSeek here is text-only) — this is
    // purely for the response's `screenshots` field.
    let capturedScreenshot: { dataUrl: string; label: string } | null = null;
    if (hasUrl && !hasScreenshots) {
      try {
        const captured = await captureScreenshot(url, { fullPage: true });
        capturedScreenshot = { dataUrl: captured.dataUrl, label: title || url };
      } catch (err: any) {
        // Degrade gracefully — a capture failure (site blocks headless
        // browsers, times out, etc.) shouldn't block the text-only audit
        // that worked fine before this feature existed.
        console.warn(`[UI Audit] Screenshot capture failed for ${url}: ${err?.message ?? err}`);
      }
    }
    const screenshotCountForAI = hasScreenshots ? screenshots.length : (capturedScreenshot ? 1 : 0);

    const result = await runUIAudit(context, auditMode, screenshotCountForAI, req.userId);
    if (capturedScreenshot) {
      result.screenshots = [capturedScreenshot];
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Turn an already-computed AI Experience Intelligence result into actionable
// Insights cards — split out from /analysis/ui-audit so approving a result
// the user already ran doesn't re-invoke the AI a second time.
pmxRouter.post("/analysis/ui-audit/save-to-insights", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", url, result } = req.body;
    const issues = result?.issues;
    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ success: false, error: "No audit result to add." });
    }

    const sourceLabel = url ? `AI Experience Intelligence audit of ${url}` : "AI Experience Intelligence screenshot audit";

    // Per-issue try/catch so one bad issue doesn't abort the whole batch —
    // and doesn't leave the client thinking nothing was saved when earlier
    // issues in the loop actually were. `created`/`failed` let the caller
    // retry only what actually failed instead of resubmitting everything.
    const created: Array<{ issueId: string; problemId: string; decisionId: string }> = [];
    const failed: Array<{ issueId: string; error: string }> = [];

    for (const issue of issues) {
      const issueId = issue?.id ?? "unknown";
      // Tracked outside the try so the catch can see whether the Problem
      // half of the pair made it in before the Decision half failed.
      let problem: any = null;
      try {
        // Per-issue, not the shared sourceLabel alone — a multi-screenshot
        // audit's approved problems should still say which screen they came
        // from instead of all pointing back to the same generic source.
        const evidenceParts = [sourceLabel];
        if (issue.screen) evidenceParts.push(issue.screen);
        if (typeof issue.screenshotIndex === "number") evidenceParts.push(`Screenshot ${issue.screenshotIndex + 1}`);
        const issueEvidence = evidenceParts.join(" — ");

        problem = await PmxProblemModel.create({
          projectId,
          userId: req.userId,
          title: issue.title,
          description: issue.problem,
          type: "ux",
          evidence: [issueEvidence],
          severity: issue.severity,
          businessImpact: issue.change,
          userImpact: issue.problem,
          suggestedFix: issue.improvement,
        });
        const decision = await PmxDecisionModel.create({
          projectId,
          userId: req.userId,
          title: `Fix: ${issue.title}`,
          category: "improve",
          reasoning: issue.improvement,
          evidence: issueEvidence,
          tradeoffs: "N/A — direct UX fix identified by AI Experience Intelligence.",
          expectedOutcome: issue.change,
          confidence: 65,
          estimatedROI: "TBD",
        });
        created.push({ issueId, problemId: problem._id.toString(), decisionId: decision._id.toString() });
      } catch (err: any) {
        // Don't leave a half-created Problem with no matching Decision
        // behind — a retry of this issueId should start from "nothing
        // exists for it yet", not create a second, duplicate Decision.
        if (problem) await PmxProblemModel.findByIdAndDelete(problem._id).catch(() => {});
        failed.push({ issueId, error: err?.message || "Failed to save this issue." });
      }
    }

    if (created.length > 0) {
      await logAudit(
        req, projectId, "ai_experience_intelligence_run",
        `Added ${created.length} insight${created.length === 1 ? "" : "s"} from AI Experience Intelligence${url ? ` for ${url}` : ""}${failed.length ? ` (${failed.length} failed)` : ""}`,
        "PmxProblem"
      );
    }

    res.json({ success: true, addedToInsights: created.length, created, failed });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. PROBLEM DETECTION ENDPOINTS (Stage 5)
// ==========================================

// Get problems
pmxRouter.get("/problems", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const problems = await PmxProblemModel.find({ projectId, isDeleted: false }).sort({ severity: 1 });
    res.json({ success: true, data: problems });
  } catch (err) {
    next(err);
  }
});

// Create custom/manual problem
pmxRouter.post("/problems", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, description, type, evidence = [], confidence = 80, severity = "medium", businessImpact, userImpact, suggestedFix, affectedFeatures = [] } = req.body;
    if (!title || !description || !type) {
      return res.status(400).json({ success: false, error: "Title, Description, and Type are required" });
    }

    const problem = await PmxProblemModel.create({
      projectId,
      userId: req.userId,
      title,
      description,
      type,
      evidence,
      confidence,
      severity,
      businessImpact,
      userImpact,
      suggestedFix,
      affectedFeatures
    });

    await logAudit(req, projectId, "problem_created", `Added problem node: "${title}"`, "PmxProblem", problem._id.toString());
    res.json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
});

// Delete problem
pmxRouter.delete("/problems/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxProblemModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Problem not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const problem = await PmxProblemModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: "Problem not found" });

    await logAudit(req, problem.projectId, "problem_deleted", `Deleted problem node: "${problem.title}"`, "PmxProblem", problem._id.toString());
    res.json({ success: true, message: "Problem deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. OPPORTUNITY PRIORITY SCORING ENDPOINTS (Stage 6)
// ==========================================

// Get opportunities list
pmxRouter.get("/opportunities", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const opportunities = await PmxOpportunityModel.find({ projectId, isDeleted: false }).sort({ riceScore: -1 });
    res.json({ success: true, data: opportunities });
  } catch (err) {
    next(err);
  }
});

// Create/edit opportunity
pmxRouter.post("/opportunities", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", id, title, description, userImpact, revenueImpact, retentionImpact, strategicAlignment, confidence, effort, risk } = req.body;

    let opportunity;
    if (id) {
      opportunity = await PmxOpportunityModel.findOne({ _id: id, projectId });
      if (!opportunity) return res.status(404).json({ success: false, error: "Opportunity not found" });
      Object.assign(opportunity, { title, description, userImpact, revenueImpact, retentionImpact, strategicAlignment, confidence, effort, risk });
      await opportunity.save();
      await logAudit(req, projectId, "opportunity_updated", `Updated priority parameters for: "${title}"`, "PmxOpportunity", opportunity._id.toString());
    } else {
      opportunity = await PmxOpportunityModel.create({
        projectId,
        userId: req.userId,
        title,
        description,
        userImpact,
        revenueImpact,
        retentionImpact,
        strategicAlignment,
        confidence,
        effort,
        risk
      });
      await logAudit(req, projectId, "opportunity_created", `Logged new prioritizable opportunity: "${title}"`, "PmxOpportunity", opportunity._id.toString());
    }

    res.json({ success: true, data: opportunity });
  } catch (err) {
    next(err);
  }
});

// Delete opportunity
pmxRouter.delete("/opportunities/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxOpportunityModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Opportunity not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const opportunity = await PmxOpportunityModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!opportunity) return res.status(404).json({ success: false, error: "Opportunity not found" });

    await logAudit(req, opportunity.projectId, "opportunity_deleted", `Deleted priority card: "${opportunity.title}"`, "PmxOpportunity", opportunity._id.toString());
    res.json({ success: true, message: "Opportunity deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. DECISION CENTER RECOMMENDATIONS (Stage 7)
// ==========================================

// Get decisions
pmxRouter.get("/decisions", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const status = req.query.status as string;
    const filter: Record<string, any> = { projectId, isDeleted: false };
    if (status) {
      filter.status = status;
    }
    const decisions = await PmxDecisionModel.find(filter).sort({ confidence: -1 });
    res.json({ success: true, data: decisions });
  } catch (err) {
    next(err);
  }
});

// Change decision approval status
pmxRouter.put("/decisions/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.body; // approved, rejected, pending, implemented
    if (!status) return res.status(400).json({ success: false, error: "Status is required" });

    const existing = await PmxDecisionModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!existing) return res.status(404).json({ success: false, error: "Recommendation not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const decision = await PmxDecisionModel.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { status },
      { new: true }
    );
    if (!decision) return res.status(404).json({ success: false, error: "Recommendation not found" });

    await logAudit(req, decision.projectId, "decision_status_changed", `Decision status update on: "${decision.title}" -> ${status}`, "PmxDecision", decision._id.toString());

    // Auto-generate solution details (Stage 8 Solution Studio) synchronously if approved
    if (status === "approved") {
      try {
        const solData = await generateSolutionDetails(decision.title, decision.category, decision.reasoning, undefined, req.userId, decision.projectId);
        await PmxSolutionModel.create({
          projectId: decision.projectId,
          userId: req.userId,
          decisionId: decision._id.toString(),
          ...solData
        });
        console.log(`[Solution Studio] Automatically compiled blueprint for approved task: ${decision.title}`);
      } catch (err) {
        console.error("[Solution Studio] Generation fail:", err);
      }
    }

    res.json({ success: true, data: decision });
  } catch (err) {
    next(err);
  }
});

// Delete recommendation
pmxRouter.delete("/decisions/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxDecisionModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Recommendation not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const decision = await PmxDecisionModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!decision) return res.status(404).json({ success: false, error: "Recommendation not found" });

    await logAudit(req, decision.projectId, "decision_deleted", `Deleted recommended decision: "${decision.title}"`, "PmxDecision", decision._id.toString());
    res.json({ success: true, message: "Recommendation deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. SOLUTION STUDIO (Stage 8)
// ==========================================

// Get solutions list
pmxRouter.get("/solutions", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const solutions = await PmxSolutionModel.find({ projectId, isDeleted: false }).sort({ updatedAt: -1 });
    res.json({ success: true, data: solutions });
  } catch (err) {
    next(err);
  }
});

// Get specific solution details
pmxRouter.get("/solutions/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution specification not found" });
    if (!canWrite(await getMemberRole(solution.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    res.json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
});

// Update specific solution details (PRD, Specs)
pmxRouter.put("/solutions/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { prd, epic, userStories, techSpecs, apiContracts, databaseChanges, securityNotes, uxImprovements, edgeCases } = req.body;
    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });
    if (!canWrite(await getMemberRole(solution.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    // Store version history
    solution.version += 1;
    solution.history.push({
      updatedAt: new Date(),
      updatedBy: req.userId!,
      prd: solution.prd,
      techSpecs: solution.techSpecs
    });

    Object.assign(solution, { prd, epic, userStories, techSpecs, apiContracts, databaseChanges, securityNotes, uxImprovements, edgeCases });
    await solution.save();

    await logAudit(req, solution.projectId, "solution_updated", `Updated Solution blueprint version: "${solution.title}" (v${solution.version})`, "PmxSolution", solution._id.toString());
    res.json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
});

// AI prompt bar for the Solution Studio PRD — same "edit in place" contract
// as /idea/prd/:id/refine, scoped to the solution's `prd` field.
pmxRouter.post("/solutions/:id/refine", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { instruction } = req.body;
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ success: false, error: "An instruction is required" });
    }

    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });
    if (!canWrite(await getMemberRole(solution.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const result = await refineSolutionPrd(solution.prd, instruction, undefined, req.userId, solution.projectId);

    solution.history.push({
      updatedAt: new Date(),
      updatedBy: req.userId!,
      prd: solution.prd,
      techSpecs: solution.techSpecs,
      instruction,
      changeSummary: result.changeSummary,
    });
    solution.prd = result.markdown;
    solution.version += 1;
    await solution.save();

    await logAudit(req, solution.projectId, "solution_refined", `Refined PRD (v${solution.version}): "${instruction.slice(0, 80)}"`, "PmxSolution", solution._id.toString());

    res.json({ success: true, data: solution, changeSummary: result.changeSummary });
  } catch (err) {
    next(err);
  }
});

// Restore a previous version of a solution's PRD/tech specs from its history
pmxRouter.post("/solutions/:id/rewind", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { historyId, version } = req.body;
    if (!historyId && (version === undefined || version === null)) {
      return res.status(400).json({ success: false, error: "A historyId or version is required" });
    }

    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });
    if (!canWrite(await getMemberRole(solution.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    let idx = -1;
    if (historyId && historyId !== "current") {
      idx = (solution.history as any[]).findIndex((h: any) => h._id.toString() === historyId.toString());
    } else if (typeof version === "number") {
      idx = version - 1;
    }

    if (idx < 0 || idx >= solution.history.length) {
      return res.status(404).json({ success: false, error: "That version no longer exists" });
    }

    const snapshot = solution.history[idx];
    const targetVersion = idx + 1;

    // Restore exact content from snapshot
    solution.prd = snapshot.prd;
    solution.techSpecs = snapshot.techSpecs;
    solution.version = targetVersion;

    // Destructive rollback: permanently truncate history removing all versions from idx onwards
    solution.history = solution.history.slice(0, idx);
    await solution.save();

    await logAudit(req, solution.projectId, "solution_rewound", `Rolled back PRD to v${targetVersion}`, "PmxSolution", solution._id.toString());

    res.json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
});

// Merge N existing blueprints into one new, cohesive Solution Studio doc —
// leaves the source blueprints untouched and adds the merged result as a new
// tab, rather than overwriting any of the inputs.
pmxRouter.post("/solutions/combine", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { solutionIds, title } = req.body;
    if (!Array.isArray(solutionIds) || solutionIds.length < 2) {
      return res.status(400).json({ success: false, error: "Select at least 2 blueprints to combine" });
    }

    const sources = await PmxSolutionModel.find({ _id: { $in: solutionIds }, isDeleted: false });
    if (sources.length < 2) {
      return res.status(404).json({ success: false, error: "Couldn't find the selected blueprints" });
    }
    // All selected blueprints must belong to one workspace the caller has
    // access to — prevents combining/leaking content across workspaces via
    // an id list that spans more than one projectId.
    const distinctProjectIds = [...new Set(sources.map((s) => s.projectId))];
    if (distinctProjectIds.length !== 1) {
      return res.status(400).json({ success: false, error: "Selected blueprints must belong to the same workspace" });
    }
    if (!canWrite(await getMemberRole(distinctProjectIds[0], req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    // Preserve the order the caller selected them in, not Mongo's return order.
    const ordered = solutionIds.map((id: string) => sources.find(s => s._id.toString() === id)).filter(Boolean) as typeof sources;

    const merged = await combineSolutions(ordered.map(s => ({ title: s.title, prd: s.prd, techSpecs: s.techSpecs })), undefined, req.userId, ordered[0].projectId);

    const combined = await PmxSolutionModel.create({
      projectId: ordered[0].projectId,
      userId: req.userId,
      title: title || merged.title || `${ordered.map(s => s.title).join(" + ")}`,
      prd: merged.prd,
      epic: merged.epic || "",
      userStories: merged.userStories || [],
      techSpecs: merged.techSpecs || "",
      apiContracts: merged.apiContracts,
      databaseChanges: merged.databaseChanges,
      securityNotes: merged.securityNotes,
      uxImprovements: merged.uxImprovements,
      edgeCases: merged.edgeCases,
      combinedFromSolutionIds: solutionIds,
    });

    await logAudit(req, combined.projectId, "solutions_combined", `Combined ${ordered.length} blueprints into: "${combined.title}"`, "PmxSolution", combined._id.toString());

    res.json({ success: true, data: combined });
  } catch (err) {
    next(err);
  }
});

// Trigger manual solution synthesis
pmxRouter.post("/solutions/generate", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, category = "build", reasoning = "Manually generated solution blueprint." } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const solData = await generateSolutionDetails(title, category, reasoning, undefined, req.userId, projectId);
    const solution = await PmxSolutionModel.create({
      projectId,
      userId: req.userId,
      ...solData
    });

    await logAudit(req, projectId, "solution_created", `Generated new implementation plan: "${title}"`, "PmxSolution", solution._id.toString());
    res.json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9. EXECUTION TICKET SCHEDULER (Stage 9)
// ==========================================

// Get all execution tickets
pmxRouter.get("/tasks", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const tasks = await PmxExecutionTaskModel.find({ projectId, isDeleted: false }).sort({ priority: 1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

// Create task manually
pmxRouter.post("/tasks", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, description, type, department = "Engineering", milestone, sprintPlan = "Backlog", priority = "medium", timeEstimate = "1d", assignee, dependencies = [] } = req.body;
    if (!title || !description || !type) {
      return res.status(400).json({ success: false, error: "Title, Description, and Type are required" });
    }

    const task = await PmxExecutionTaskModel.create({
      projectId,
      userId: req.userId,
      title,
      description,
      type,
      department,
      milestone,
      sprintPlan,
      priority,
      timeEstimate,
      assignee,
      dependencies
    });

    await logAudit(req, projectId, "task_created", `Created sprint ticket: "${title}"`, "PmxExecutionTask", task._id.toString());
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Update task details / status / Kanban columns
pmxRouter.put("/tasks/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, title, description, type, department, milestone, sprintPlan, priority, timeEstimate, assignee, dependencies } = req.body;
    const task = await PmxExecutionTaskModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!task) return res.status(404).json({ success: false, error: "Task ticket not found" });
    if (!canWrite(await getMemberRole(task.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const oldStatus = task.status;
    // Only touch fields the caller actually sent — a status-only PUT (the
    // Kanban Move/Back buttons) must not blank out title/description/type,
    // which are required and would otherwise fail validation on save.
    const updates: Record<string, any> = { status, title, description, type, department, milestone, sprintPlan, priority, timeEstimate, assignee, dependencies };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) (task as any)[key] = value;
    }
    await task.save();

    if (status !== undefined && status !== oldStatus) {
      await logAudit(req, task.projectId, "task_status_changed", `Changed ticket state: "${task.title}" -> ${status}`, "PmxExecutionTask", task._id.toString());
    } else {
      await logAudit(req, task.projectId, "task_updated", `Modified sprint ticket attributes: "${task.title}"`, "PmxExecutionTask", task._id.toString());
    }

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Auto-generate tickets from PRD (Solution)
pmxRouter.post("/tasks/generate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { solutionId, ideaPrdId } = req.body;

    let projectId: string;
    let title: string;
    let prd: string;
    let techSpecs: string;
    let logEntityType: string;
    let logEntityId: string;

    if (ideaPrdId) {
      const doc = await PmxIdeaPrdModel.findOne({ _id: ideaPrdId, isDeleted: false });
      if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
      projectId = doc.projectId;
      title = doc.productName || "Development PRD";
      prd = doc.markdown;
      techSpecs = "";
      logEntityType = "PmxIdeaPrd";
      logEntityId = doc._id.toString();
    } else {
      const solution = await PmxSolutionModel.findOne({ _id: solutionId, isDeleted: false });
      if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });
      projectId = solution.projectId;
      title = solution.title;
      prd = solution.prd;
      techSpecs = solution.techSpecs;
      logEntityType = "PmxSolution";
      logEntityId = solution._id.toString();
    }
    if (!canWrite(await getMemberRole(projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const newTasks = await generateExecutionTasks(prd, techSpecs, undefined, req.userId, projectId);

    const taskDocs = newTasks.map((t: any) => ({
      projectId,
      userId: req.userId,
      solutionId: solutionId || undefined,
      ideaPrdId: ideaPrdId || undefined,
      title: t.title,
      description: t.description,
      type: t.type,
      sprintPlan: t.sprintPlan || "Sprint 1",
      priority: t.priority || "medium",
      timeEstimate: t.timeEstimate || "1d",
      assignee: t.assignee || "Developer",
      dependencies: t.dependencies || [],
      isDeleted: false
    }));

    const inserted = await PmxExecutionTaskModel.insertMany(taskDocs);
    await logAudit(req, projectId, "tasks_generated", `Compiled ${inserted.length} sprint tickets from spec: "${title}"`, logEntityType, logEntityId);

    res.json({ success: true, data: inserted });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9B. EXECUTION PLAN GENERATION
// ==========================================
// Builds a full department-aware, milestone-grouped sprint backlog from a
// PRD in one action — what PmxPrd.tsx's "Create Execution"/"Regenerate
// Execution" buttons call. Distinct from the flat /tasks/generate above
// (single call, no departments/milestones/sprints), which stays in place
// unused/legacy rather than being removed.

async function resolveExecutionSource(solutionId?: string, ideaPrdId?: string) {
  if (ideaPrdId) {
    const doc = await PmxIdeaPrdModel.findOne({ _id: ideaPrdId, isDeleted: false });
    if (!doc) return null;
    return {
      projectId: doc.projectId,
      title: doc.productName || "Development PRD",
      prd: doc.markdown,
      techSpecs: "",
      sourceType: "ideaPrd" as const,
      sourceId: doc._id.toString(),
      sourcePrdVersion: doc.version,
      logEntityType: "PmxIdeaPrd",
      logEntityId: doc._id.toString(),
    };
  }
  const solution = await PmxSolutionModel.findOne({ _id: solutionId, isDeleted: false });
  if (!solution) return null;
  return {
    projectId: solution.projectId,
    title: solution.title,
    prd: solution.prd,
    techSpecs: solution.techSpecs,
    sourceType: "solution" as const,
    sourceId: solution._id.toString(),
    sourcePrdVersion: solution.version,
    logEntityType: "PmxSolution",
    logEntityId: solution._id.toString(),
  };
}

// Shared by both /execution/generate (PRD-based) and /execution/generate-custom:
// flattens each department's generated tasks into task documents, inserts
// them, then resolves each task's dependency titles into real dependencyTaskIds
// within the same generated batch (case-insensitive exact match — titles that
// don't match a real task, e.g. a milestone-gate label, are left unresolved,
// which is expected, not an error). `plan.milestones` must already be set
// before calling this (used for milestoneOrder lookup).
async function insertGeneratedTasksForPlan(
  perDept: Array<{ department: string; tasks: any[] }>,
  plan: any,
  projectId: string,
  userId: string,
  extra: { solutionId?: string; ideaPrdId?: string }
) {
  const milestoneOrderByName = new Map(plan.milestones.map((m: any) => [m.name, m.order]));
  const flatTasks = perDept.flatMap(({ department, tasks }) =>
    tasks.map((t: any) => ({
      projectId,
      userId,
      solutionId: extra.solutionId,
      ideaPrdId: extra.ideaPrdId,
      planId: (plan._id as any).toString(),
      title: t.title,
      description: t.description || "",
      type: t.type || "other",
      department,
      milestone: t.milestone,
      milestoneOrder: milestoneOrderByName.get(t.milestone),
      sprintPlan: `Sprint ${t.sprintNumber || 1}`,
      sprintNumber: t.sprintNumber,
      priority: t.priority || "medium",
      status: "todo",
      timeEstimate: t.timeEstimate || "1d",
      assignee: t.assignee || "",
      dueWeek: t.dueWeek,
      dueDate: t.dueWeek ? new Date(plan.startDate.getTime() + (t.dueWeek - 1) * 7 * 24 * 60 * 60 * 1000) : undefined,
      prdSectionLink: t.prdSectionLink,
      acceptanceCriteria: t.acceptanceCriteria || [],
      implementationNotes: t.implementationNotes,
      dependencies: t.dependencies || [],
      dependencyTaskIds: [] as string[],
      isDeleted: false,
    }))
  );

  if (flatTasks.length === 0) return [];

  const inserted = await PmxExecutionTaskModel.insertMany(flatTasks);

  const idByTitle = new Map(inserted.map((doc) => [doc.title.trim().toLowerCase(), (doc._id as any).toString()]));
  await Promise.all(
    inserted.map(async (doc) => {
      const ids = doc.dependencies
        .map((depTitle: string) => idByTitle.get(depTitle.trim().toLowerCase()))
        .filter((id: string | undefined): id is string => !!id && id !== (doc._id as any).toString());
      if (ids.length) {
        doc.dependencyTaskIds = ids;
        await doc.save();
      }
    })
  );

  return inserted;
}

const DEPARTMENT_ARTIFACT_MENU: Record<string, Array<{ type: string; title: string }>> = {
  Engineering: [
    { type: "architecture_summary", title: "Architecture Summary" },
    { type: "api_contract", title: "API Contract" },
    { type: "database_schema", title: "Database Schema" },
  ],
  Design: [
    { type: "ui_specification", title: "UI Specification" },
    { type: "component_inventory", title: "Component Inventory" },
  ],
  QA: [
    { type: "test_plan", title: "Test Plan" },
    { type: "release_checklist", title: "Release Checklist" },
  ],
  Marketing: [
    { type: "launch_plan", title: "Launch Plan" },
    { type: "newsletter_draft", title: "Newsletter Draft" },
  ],
  Support: [
    { type: "faq", title: "FAQ" },
    { type: "help_center_outline", title: "Help Center Outline" },
  ],
};

// Background job — deliberately not awaited by its callers (POST
// /execution/generate and /execution/regenerate) so the HTTP response
// returns as soon as the board itself is populated; artifacts trickle onto
// /pmx/artifacts over the following minute or so (see PmxArtifacts.tsx's
// progress indicator, sourced from plan.artifactJobs/artifactsStatus).
// Every mutation is an atomic updateOne against the plan doc — never a
// read-modify-save of the whole document — so concurrent worker completions
// can't race each other.
async function generateArtifactsForPlan(planId: string, projectId: string, departments: string[], prd: string, userId: string) {
  const jobs = departments.flatMap((department) =>
    (DEPARTMENT_ARTIFACT_MENU[department] || []).map((item) => ({ ...item, department, status: "pending" as const }))
  );
  if (jobs.length === 0) return;

  await PmxExecutionPlanModel.updateOne(
    { _id: planId },
    { $push: { artifactJobs: { $each: jobs } }, $set: { artifactsStatus: "generating" } }
  );

  const CONCURRENCY = 3;
  let anyFailed = false;
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const content = await compileArtifact(job.type, job.title, prd, undefined, userId, projectId);
        await PmxArtifactModel.create({
          projectId, userId, title: job.title, type: job.type as any,
          department: job.department, planId, content, format: "markdown",
        });
        await PmxExecutionPlanModel.updateOne(
          { _id: planId, artifactJobs: { $elemMatch: { type: job.type, department: job.department } } },
          { $set: { "artifactJobs.$.status": "done" } }
        );
      } catch (err) {
        anyFailed = true;
        console.error(`[Execution Artifacts] ${job.department}/${job.type} failed:`, err);
        await PmxExecutionPlanModel.updateOne(
          { _id: planId, artifactJobs: { $elemMatch: { type: job.type, department: job.department } } },
          { $set: { "artifactJobs.$.status": "failed" } }
        );
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()));
  await PmxExecutionPlanModel.updateOne({ _id: planId }, { $set: { artifactsStatus: anyFailed ? "partial_failed" : "completed" } });
}

// Generate a full execution plan from a PRD — department detection,
// milestones, sprints, and per-department tasks. Not wrapped in
// requireWorkspaceAccess() since projectId isn't known until after the
// solution/ideaPrd lookup below (same reason /tasks/generate above doesn't
// use it either) — access is checked manually once projectId is resolved.
pmxRouter.post("/execution/generate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const src = await resolveExecutionSource(req.body.solutionId, req.body.ideaPrdId);
    if (!src) return res.status(404).json({ success: false, error: "PRD not found" });
    if (!canWrite(await getMemberRole(src.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const plan = await PmxExecutionPlanModel.create({
      projectId: src.projectId,
      userId: req.userId,
      type: "prd",
      sourceType: src.sourceType,
      sourceId: src.sourceId,
      sourcePrdVersion: src.sourcePrdVersion,
      name: src.title,
      startDate: new Date(),
      status: "generating",
    });

    const scaffold = await generateExecutionScaffold(src.prd, src.techSpecs, undefined, req.userId, src.projectId);

    const perDept = await Promise.all(
      scaffold.departments.map((department) =>
        generateDepartmentTasks(department, src.prd, src.techSpecs, scaffold.milestones, scaffold.sprints, scaffold.scopeSummary, undefined, req.userId, src.projectId)
          .then((tasks) => ({ department, tasks }))
          .catch((err) => {
            console.error(`[Execution Generate] ${department} task generation failed:`, err);
            return { department, tasks: [] as any[] };
          })
      )
    );

    plan.departments = scaffold.departments;
    plan.milestones = scaffold.milestones;
    plan.sprints = scaffold.sprints;

    const inserted = await insertGeneratedTasksForPlan(perDept, plan, src.projectId, req.userId!, {
      solutionId: src.sourceType === "solution" ? src.sourceId : undefined,
      ideaPrdId: src.sourceType === "ideaPrd" ? src.sourceId : undefined,
    });

    if (inserted.length === 0) {
      plan.status = "failed";
      await plan.save();
      return res.status(500).json({ success: false, error: "Couldn't generate any tasks from this PRD — try again." });
    }

    plan.status = "completed";
    await plan.save();

    await logAudit(req, src.projectId, "execution_generated", `Generated execution plan from "${src.title}": ${inserted.length} tasks across ${scaffold.departments.length} department(s)`, src.logEntityType, src.logEntityId);

    res.json({ success: true, data: { plan, tasks: inserted } });

    generateArtifactsForPlan((plan._id as any).toString(), src.projectId, scaffold.departments, src.prd, req.userId!)
      .catch((err) => console.error("[Execution Generate] artifact generation failed:", err));
  } catch (err) {
    next(err);
  }
});

// Generate a focused execution plan with no PRD — the user picks a name,
// goal, optional description, and exactly which departments/workstreams are
// involved. Unlike /execution/generate, projectId is known directly from
// the request body (no solution/ideaPrd lookup needed first), so the
// standard requireWorkspaceAccess() middleware applies directly.
pmxRouter.post("/execution/generate-custom", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.body.projectId as string;
    const name = (req.body.name as string || "").trim();
    const goal = (req.body.goal as string || "").trim();
    const description = (req.body.description as string || "").trim();
    const departments = Array.isArray(req.body.departments) ? (req.body.departments as string[]) : [];

    if (!name) return res.status(400).json({ success: false, error: "An execution name is required" });
    if (!goal) return res.status(400).json({ success: false, error: "A goal is required" });
    const validDepartments = departments.filter((d) => (PMX_DEPARTMENTS as readonly string[]).includes(d));
    if (validDepartments.length === 0) {
      return res.status(400).json({ success: false, error: "Select at least one workstream" });
    }

    const plan = await PmxExecutionPlanModel.create({
      projectId,
      userId: req.userId,
      type: "custom",
      name,
      goal,
      description: description || undefined,
      startDate: new Date(),
      status: "generating",
    });

    const scaffold = await generateCustomExecutionScaffold(name, goal, description, validDepartments, undefined, req.userId, projectId);

    const contextText = `Execution: ${name}\nGoal: ${goal}${description ? `\nContext: ${description}` : ""}`;
    const perDept = await Promise.all(
      validDepartments.map((department) =>
        generateDepartmentTasks(department, contextText, "", scaffold.milestones, scaffold.sprints, scaffold.scopeSummary, undefined, req.userId, projectId)
          .then((tasks) => ({ department, tasks }))
          .catch((err) => {
            console.error(`[Execution Generate Custom] ${department} task generation failed:`, err);
            return { department, tasks: [] as any[] };
          })
      )
    );

    plan.departments = validDepartments;
    plan.milestones = scaffold.milestones;
    plan.sprints = scaffold.sprints;

    const inserted = await insertGeneratedTasksForPlan(perDept, plan, projectId, req.userId!, {});

    if (inserted.length === 0) {
      plan.status = "failed";
      await plan.save();
      return res.status(500).json({ success: false, error: "Couldn't generate any tasks for this execution — try again." });
    }

    plan.status = "completed";
    await plan.save();

    await logAudit(req, projectId, "execution_generated", `Generated custom execution "${name}": ${inserted.length} tasks across ${validDepartments.length} workstream(s)`, "PmxExecutionPlan", (plan._id as any).toString());

    res.json({ success: true, data: { plan, tasks: inserted } });

    generateArtifactsForPlan((plan._id as any).toString(), projectId, validDepartments, contextText, req.userId!)
      .catch((err) => console.error("[Execution Generate Custom] artifact generation failed:", err));
  } catch (err) {
    next(err);
  }
});

// Reconcile the execution plan against an updated PRD: preserve completed
// tasks, update/remove/add the rest, and record a diff summary for the
// frontend's banner. Same reason as /execution/generate for skipping
// requireWorkspaceAccess() — projectId isn't known until after resolution.
pmxRouter.post("/execution/regenerate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const src = await resolveExecutionSource(req.body.solutionId, req.body.ideaPrdId);
    if (!src) return res.status(404).json({ success: false, error: "PRD not found" });
    if (!canWrite(await getMemberRole(src.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    // type: "prd" — a custom-execution plan has no PRD to diff against, so
    // regenerate must never accidentally target one.
    const plan = await PmxExecutionPlanModel.findOne({ projectId: src.projectId, type: "prd", isDeleted: false }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, error: "No PRD-based execution plan exists yet for this workspace — use Create Execution first." });

    const existingTasks = await PmxExecutionTaskModel.find({ projectId: src.projectId, isDeleted: false });
    const existingTasksJson = JSON.stringify(
      existingTasks.map((t) => ({
        _id: (t._id as any).toString(),
        title: t.title,
        description: t.description,
        department: t.department,
        status: t.status,
        milestone: t.milestone,
        sprintNumber: t.sprintNumber,
        priority: t.priority,
      })),
      null,
      2
    );

    const diffResult = await generateExecutionDiff(
      src.prd,
      src.techSpecs,
      plan.departments,
      plan.milestones.map((m) => ({ name: m.name, goal: m.goal })),
      plan.sprints,
      existingTasksJson,
      undefined,
      req.userId,
      src.projectId
    );

    const doneIds = new Set(existingTasks.filter((t) => t.status === "done").map((t) => (t._id as any).toString()));
    const existingById = new Map(existingTasks.map((t) => [(t._id as any).toString(), t]));
    const priorDepartments = new Set(plan.departments);

    plan.history.push({
      version: plan.version,
      departments: plan.departments,
      milestones: plan.milestones,
      sprints: plan.sprints,
      changedAt: new Date(),
    });
    plan.version += 1;
    if (diffResult.departments?.length) plan.departments = diffResult.departments;
    if (diffResult.milestones?.length) plan.milestones = diffResult.milestones;
    if (diffResult.sprints?.length) plan.sprints = diffResult.sprints;

    const milestoneOrderByName = new Map(plan.milestones.map((m) => [m.name, m.order]));

    let addedCount = 0;
    if (diffResult.diff.add?.length) {
      const newDocs = diffResult.diff.add.map((t: any) => ({
        projectId: src.projectId,
        userId: req.userId,
        solutionId: src.sourceType === "solution" ? src.sourceId : undefined,
        ideaPrdId: src.sourceType === "ideaPrd" ? src.sourceId : undefined,
        planId: (plan._id as any).toString(),
        title: t.title,
        description: t.description || "",
        type: t.type || "other",
        department: t.department || "Engineering",
        milestone: t.milestone,
        milestoneOrder: milestoneOrderByName.get(t.milestone),
        sprintPlan: `Sprint ${t.sprintNumber || 1}`,
        sprintNumber: t.sprintNumber,
        priority: t.priority || "medium",
        status: "todo",
        timeEstimate: t.timeEstimate || "1d",
        assignee: t.assignee || "",
        dueWeek: t.dueWeek,
        dueDate: t.dueWeek ? new Date(plan.startDate.getTime() + (t.dueWeek - 1) * 7 * 24 * 60 * 60 * 1000) : undefined,
        prdSectionLink: t.prdSectionLink,
        acceptanceCriteria: t.acceptanceCriteria || [],
        implementationNotes: t.implementationNotes,
        dependencies: t.dependencies || [],
        dependencyTaskIds: [] as string[],
        diffStatus: "added" as const,
        isDeleted: false,
      }));
      const inserted = await PmxExecutionTaskModel.insertMany(newDocs);
      addedCount = inserted.length;
    }

    let updatedCount = 0;
    for (const upd of diffResult.diff.update || []) {
      if (!upd.matchId || doneIds.has(upd.matchId)) continue;
      const task = existingById.get(upd.matchId);
      if (!task) continue;
      for (const [key, value] of Object.entries(upd.changes || {})) {
        if (value === undefined) continue;
        (task as any)[key] = value;
      }
      task.diffStatus = "updated";
      task.diffSummary = upd.reason || "Updated by PRD regeneration.";
      await task.save();
      updatedCount++;
    }

    const removeIds = (diffResult.diff.remove || []).filter((id: string) => !doneIds.has(id));
    let removedCount = 0;
    if (removeIds.length) {
      const result = await PmxExecutionTaskModel.updateMany(
        { _id: { $in: removeIds }, projectId: src.projectId },
        { isDeleted: true }
      );
      removedCount = result.modifiedCount || removeIds.length;
    }

    plan.sourcePrdVersion = src.sourcePrdVersion;
    plan.status = "completed";
    await plan.save();

    await logAudit(
      req,
      src.projectId,
      "execution_regenerated",
      `Regenerated execution plan from "${src.title}": +${addedCount} added / ~${updatedCount} updated / -${removedCount} removed`,
      src.logEntityType,
      src.logEntityId
    );

    const tasks = await PmxExecutionTaskModel.find({ projectId: src.projectId, isDeleted: false });
    res.json({ success: true, data: { plan, tasks, diff: { added: addedCount, updated: updatedCount, removed: removedCount } } });

    const newDepartments = plan.departments.filter((d) => !priorDepartments.has(d));
    if (newDepartments.length) {
      generateArtifactsForPlan((plan._id as any).toString(), src.projectId, newDepartments, src.prd, req.userId!)
        .catch((err) => console.error("[Execution Regenerate] artifact generation failed:", err));
    }
  } catch (err) {
    next(err);
  }
});

// Latest execution plan for a workspace — metrics bar, Sprint Health inputs,
// and the "PRD changed since last generation" staleness check (frontend
// compares plan.sourcePrdVersion to the live PmxSolution/PmxIdeaPrd .version).
pmxRouter.get("/execution/plan", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const plan = await PmxExecutionPlanModel.findOne({ projectId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// Clears the diff highlight once the user acknowledges a regenerate's
// added/updated/removed summary banner.
pmxRouter.post("/execution/dismiss-diff", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.body.projectId as string) || "default";
    await PmxExecutionTaskModel.updateMany({ projectId, isDeleted: false }, { $unset: { diffStatus: "", diffSummary: "" } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Delete task
pmxRouter.delete("/tasks/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await PmxExecutionTaskModel.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: "Task not found" });
    if (!canWrite(await getMemberRole(existing.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    const task = await PmxExecutionTaskModel.findOneAndUpdate(
      { _id: req.params.id },
      { isDeleted: true },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    await logAudit(req, task.projectId, "task_deleted", `Deleted sprint ticket: "${task.title}"`, "PmxExecutionTask", task._id.toString());
    res.json({ success: true, message: "Task deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 10. ARTIFACTS SYSTEM (Stage 10)
// ==========================================

// Get all artifacts
pmxRouter.get("/artifacts", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const docs = await PmxArtifactModel.find({ projectId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// Compile an exportable document via AI synthesis across the whole
// workspace — PRD/blueprints, evidence, problems, opportunities, decisions,
// connected sources, UI analysis, and sprint tasks — rather than the caller
// assembling `content` itself from whatever it happens to have loaded.
pmxRouter.post("/artifacts/compile", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, type = "prd", format = "markdown" } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: "A title is required" });

    const filter = { projectId, isDeleted: false };
    // PmxAnalysisModel (UI audit reports) is intentionally still filtered by
    // the caller's own userId — it's out of scope for workspace sharing.
    const [ideaPrd, solutions, evidence, problems, opportunities, decisions, inputs, analysis, tasks] = await Promise.all([
      PmxIdeaPrdModel.findOne({ projectId, isDeleted: false, status: "completed" }).sort({ createdAt: -1 }),
      PmxSolutionModel.find(filter).sort({ updatedAt: -1 }).limit(5),
      PmxEvidenceModel.find(filter).sort({ importance: -1, confidence: -1 }).limit(10),
      PmxProblemModel.find(filter).sort({ confidence: -1 }).limit(10),
      PmxOpportunityModel.find(filter).sort({ riceScore: -1 }).limit(10),
      PmxDecisionModel.find(filter).sort({ confidence: -1 }).limit(10),
      PmxInputModel.find(filter).limit(15),
      PmxAnalysisModel.find({ ...filter, userId: req.userId }).sort({ createdAt: -1 }).limit(3),
      PmxExecutionTaskModel.find(filter).limit(30),
    ]);

    const sections: string[] = [];
    if (ideaPrd) sections.push(`### Development PRD\n${ideaPrd.markdown}`);
    if (solutions.length) sections.push(`### Approved Blueprints\n${solutions.map(s => `#### ${s.title}\n${s.prd}`).join("\n\n")}`);
    if (inputs.length) sections.push(`### Connected Sources\n${inputs.map(i => `- ${i.name} (${i.type})${i.summary ? `: ${i.summary}` : ""}`).join("\n")}`);
    if (evidence.length) sections.push(`### Evidence Signals\n${evidence.map(e => `- [${e.category}] ${e.title}: ${e.description}`).join("\n")}`);
    if (problems.length) sections.push(`### Detected Problems\n${problems.map(p => `- [${p.severity}] ${p.title}: ${p.description}`).join("\n")}`);
    if (opportunities.length) sections.push(`### Opportunities\n${opportunities.map(o => `- ${o.title} (RICE ${o.riceScore}): ${o.description}`).join("\n")}`);
    if (decisions.length) sections.push(`### Decisions\n${decisions.map(d => `- [${d.category}/${d.status}] ${d.title}: ${d.reasoning}`).join("\n")}`);
    if (analysis.length) sections.push(`### UI Analysis\n${analysis.map(a => `- ${a.title} (score ${a.score}): ${(a.report?.issues || []).slice(0, 5).map((i: any) => i.issue).join("; ")}`).join("\n")}`);
    if (tasks.length) sections.push(`### Sprint Tasks\n${tasks.map(t => `- [${t.status}] ${t.title} (${t.type}, ${t.priority}, ${t.timeEstimate})`).join("\n")}`);

    if (sections.length === 0) {
      return res.status(400).json({ success: false, error: "Nothing to compile yet — connect sources or generate a PRD first." });
    }

    const context = sections.join("\n\n---\n\n");
    const content = await compileArtifact(type, title, context, undefined, req.userId, projectId);

    const doc = await PmxArtifactModel.create({ projectId, userId: req.userId, title, type, content, format });
    await logAudit(req, projectId, "artifact_created", `Compiled artifact from workspace data: "${title}" (${format})`, "PmxArtifact", doc._id.toString());
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Create exportable document (manual/direct content, no AI compilation)
pmxRouter.post("/artifacts", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, type, content, format = "markdown" } = req.body;
    if (!title || !type || !content) {
      return res.status(400).json({ success: false, error: "Title, Type, and Content are required" });
    }

    const doc = await PmxArtifactModel.create({
      projectId,
      userId: req.userId,
      title,
      type,
      content,
      format
    });

    await logAudit(req, projectId, "artifact_created", `Exported new artifact document: "${title}" (${format})`, "PmxArtifact", doc._id.toString());
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Get specific artifact content
pmxRouter.get("/artifacts/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const doc = await PmxArtifactModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "Artifact not found" });
    if (!canWrite(await getMemberRole(doc.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 11. AUDIT TIMELINE LOGS (History)
// ==========================================

// Get audit timeline logs
pmxRouter.get("/history", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const history = await PmxAuditLogModel.find({ projectId }).sort({ createdAt: -1 });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// Rolling window start for the requested range, anchored to "now" so a
// dashboard poll always reflects a moving trailing window rather than a
// fixed calendar bucket — matches how the other history/session queries in
// this router are just "everything so far", no calendar-boundary semantics.
function usageRangeStart(range: string): Date {
  const start = new Date();
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }
  return start;
}

// Read-only AI token usage / cost summary for the authenticated user.
pmxRouter.get("/usage", async (req: AuthenticatedRequest, res, next) => {
  try {
    const range = ["today", "week", "month"].includes(req.query.range as string) ? (req.query.range as string) : "week";
    const match = { userId: req.userId, createdAt: { $gte: usageRangeStart(range) } };

    const [totals] = await PmxTokenUsageModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          // Breakdown only — already included in totalTokens, not added to it.
          reasoningTokens: { $sum: "$reasoningTokens" },
          totalCostUsd: { $sum: "$costUsd" },
        },
      },
    ]);

    const byStage = await PmxTokenUsageModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$stage",
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
          reasoningTokens: { $sum: "$reasoningTokens" },
          totalTokens: { $sum: "$totalTokens" },
          costUsd: { $sum: "$costUsd" },
        },
      },
      { $project: { _id: 0, stage: "$_id", promptTokens: 1, completionTokens: 1, reasoningTokens: 1, totalTokens: 1, costUsd: 1 } },
      { $sort: { totalTokens: -1 } },
    ]);

    const byModel = await PmxTokenUsageModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$aiModel",
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
          reasoningTokens: { $sum: "$reasoningTokens" },
          totalTokens: { $sum: "$totalTokens" },
          costUsd: { $sum: "$costUsd" },
        },
      },
      { $project: { _id: 0, aiModel: "$_id", promptTokens: 1, completionTokens: 1, reasoningTokens: 1, totalTokens: 1, costUsd: 1 } },
      { $sort: { totalTokens: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        range,
        totalTokens: totals?.totalTokens ?? 0,
        reasoningTokens: totals?.reasoningTokens ?? 0,
        totalCostUsd: totals?.totalCostUsd ?? 0,
        byStage,
        byModel,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 11B. USAGE & PLAN (workspace trial + per-user token allowance)
// ==========================================

// Everything the Usage & Plan settings page needs in one call. `members`
// (per-member usage) is only populated for owner/admin — a plain member
// gets it omitted, enforced here server-side, not just hidden client-side.
pmxRouter.get("/billing/summary", requireWorkspaceAccess(), async (req: WorkspaceScopedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body?.projectId as string);
    const planStatus = await getWorkspacePlanStatus(projectId);
    const currentUser = await getUserUsage(req.userId!, projectId);

    const memberRows = await PmxWorkspaceMemberModel.find({ projectId }).sort({ joinedAt: 1 });
    const memberCount = memberRows.length;

    let members: Awaited<ReturnType<typeof getWorkspaceMemberUsage>> | undefined;
    if (req.workspaceRole === "owner" || req.workspaceRole === "admin") {
      const users = await UserModel.find(
        { clerkId: { $in: memberRows.map((m) => m.userId) } },
        { clerkId: 1, email: 1, username: 1, firstName: 1, lastName: 1 }
      );
      const userByClerkId = new Map(users.map((u) => [u.clerkId, u]));
      const enriched = memberRows.map((m) => {
        const u = userByClerkId.get(m.userId);
        return {
          userId: m.userId,
          role: m.role,
          name: (u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username : "") || "Unknown user",
        };
      });
      members = await getWorkspaceMemberUsage(projectId, enriched);
    }

    res.json({
      success: true,
      data: {
        plan: planStatus?.plan ?? "trial",
        trial: planStatus
          ? {
              startedAt: planStatus.trialStartedAt,
              endsAt: planStatus.trialEndsAt,
              daysRemaining: planStatus.daysRemaining,
              status: planStatus.status,
            }
          : null,
        memberCount,
        currentUser,
        limit: USER_TOKEN_LIMIT,
        upgradeRequestedAt: planStatus?.upgradeRequestedAt ?? null,
        members,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Honest upgrade placeholder — no billing/payment infrastructure exists to
// connect to yet, and the UI must never claim a fake upgrade succeeded. This
// records real, server-persisted intent (owner/admin only) that a future
// real billing integration can act on; it never changes `plan` itself.
pmxRouter.post("/billing/upgrade-request", requireWorkspaceAccess("admin"), async (req: WorkspaceScopedRequest, res, next) => {
  try {
    const projectId = (req.body?.projectId as string) || (req.query.projectId as string);
    const doc = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "Workspace not found" });

    if (!doc.upgradeRequestedAt) {
      doc.upgradeRequestedAt = new Date();
      await doc.save();
      await logAudit(req, projectId, "workspace_upgrade_requested", "Requested a workspace upgrade", "PmxUnderstanding", doc._id.toString());
    }

    res.json({ success: true, data: { upgradeRequestedAt: doc.upgradeRequestedAt } });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 12. SCREENSHOT INTELLIGENCE ENDPOINTS
// ==========================================

// Get all screenshot review projects
pmxRouter.get("/screenshot-intelligence", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const projects = await PmxScreenshotProjectModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// Get specific screenshot review project workspace
pmxRouter.get("/screenshot-intelligence/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const project = await PmxScreenshotProjectModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// Create visual review workspace and run AI design analysis
pmxRouter.post("/screenshot-intelligence", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title = "Screenshot UX Audit", description = "", screenshots = [] } = req.body;
    if (!screenshots || screenshots.length === 0) {
      return res.status(400).json({ success: false, error: "At least one screenshot is required" });
    }

    const analyzedScreenshots = [];
    for (const s of screenshots) {
      const annotations = await analyzeScreenshotUI(s.title, req.userId, projectId);
      analyzedScreenshots.push({
        id: crypto.randomUUID(),
        title: s.title || "Screenshot UI",
        dataUrl: s.dataUrl,
        annotations,
        createdAt: new Date()
      });
    }

    const project = await PmxScreenshotProjectModel.create({
      projectId,
      userId: req.userId,
      title,
      description,
      screenshots: analyzedScreenshots,
      isDeleted: false
    });

    await logAudit(req, projectId, "screenshot_audit_started", `Initiated AI visual review workspace: "${title}"`, "PmxScreenshotProject", project._id.toString());
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// Delete visual review workspace
pmxRouter.delete("/screenshot-intelligence/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const project = await PmxScreenshotProjectModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isDeleted: true },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });
    await logAudit(req, project.projectId, "screenshot_audit_deleted", `Deleted AI visual workspace: "${project.title}"`, "PmxScreenshotProject", project._id.toString());
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// Add manual review annotation
pmxRouter.post("/screenshot-intelligence/:id/annotations", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { screenshotId, title, category, priority, description, x, y } = req.body;
    const project = await PmxScreenshotProjectModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });

    const screenshot = project.screenshots.find(s => s.id === screenshotId);
    if (!screenshot) return res.status(404).json({ success: false, error: "Screenshot not found in workspace" });

    const newAnnotation = {
      id: crypto.randomUUID(),
      title,
      category: category || "UX",
      priority: (priority || "medium") as any,
      confidence: 100,
      severity: (priority === "critical" || priority === "high" ? "high" : "medium") as any,
      description,
      reasoning: "Manual team observation.",
      recommendation: "Manual fix requested.",
      expectedImpact: "User experience improvement.",
      affectedComponent: "Selected element context",
      x: Number(x),
      y: Number(y),
      isResolved: false,
      comments: [],
      createdAt: new Date()
    };

    screenshot.annotations.push(newAnnotation);
    project.markModified("screenshots");
    await project.save();

    res.json({ success: true, data: newAnnotation });
  } catch (err) {
    next(err);
  }
});

// Update annotation coordinates/fields or resolve status
pmxRouter.put("/screenshot-intelligence/:id/annotations/:annId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { isResolved, category, priority, description, title, x, y } = req.body;
    const project = await PmxScreenshotProjectModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });

    let annotation: any = null;
    for (const s of project.screenshots) {
      const found = s.annotations.find(a => a.id === req.params.annId);
      if (found) {
        annotation = found;
        break;
      }
    }

    if (!annotation) return res.status(404).json({ success: false, error: "Annotation not found in workspace" });

    if (isResolved !== undefined) {
      annotation.isResolved = isResolved;
      if (isResolved) annotation.resolvedAt = new Date();
    }
    if (category !== undefined) annotation.category = category;
    if (priority !== undefined) annotation.priority = priority;
    if (description !== undefined) annotation.description = description;
    if (title !== undefined) annotation.title = title;
    if (x !== undefined) annotation.x = Number(x);
    if (y !== undefined) annotation.y = Number(y);

    project.markModified("screenshots");
    await project.save();

    res.json({ success: true, data: annotation });
  } catch (err) {
    next(err);
  }
});

// Add reply comment to feedback annotation thread
pmxRouter.post("/screenshot-intelligence/:id/annotations/:annId/comments", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { author, content } = req.body;
    if (!content) return res.status(400).json({ success: false, error: "Comment content is required" });

    const project = await PmxScreenshotProjectModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });

    let annotation: any = null;
    for (const s of project.screenshots) {
      const found = s.annotations.find(a => a.id === req.params.annId);
      if (found) {
        annotation = found;
        break;
      }
    }

    if (!annotation) return res.status(404).json({ success: false, error: "Annotation not found in workspace" });

    const newComment = {
      id: crypto.randomUUID(),
      author: author || "Team Member",
      content,
      createdAt: new Date()
    };

    annotation.comments.push(newComment);
    project.markModified("screenshots");
    await project.save();

    res.json({ success: true, data: newComment });
  } catch (err) {
    next(err);
  }
});

// Delete sticky note annotation
pmxRouter.delete("/screenshot-intelligence/:id/annotations/:annId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const project = await PmxScreenshotProjectModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ success: false, error: "Project workspace not found" });

    let deleted = false;
    for (const s of project.screenshots) {
      const idx = s.annotations.findIndex(a => a.id === req.params.annId);
      if (idx !== -1) {
        s.annotations.splice(idx, 1);
        deleted = true;
        break;
      }
    }

    if (!deleted) return res.status(404).json({ success: false, error: "Annotation not found in workspace" });

    project.markModified("screenshots");
    await project.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 14. IDEA → PRD PIPELINE
// ==========================================
// Entirely backend-driven: submit an idea, run the full research → PRD
// pipeline synchronously, persist it, and let the frontend redirect to
// /pmx/prd to render the stored result. See services/pmxIdeaPrd.ts.

// Run the pipeline and persist the result. Genesis route, same reasoning as
// POST /inputs — projectId may not have a workspace yet, so it can't use
// the standard requireWorkspaceAccess() middleware. Gate inline: only
// enforce membership if the workspace already exists.
pmxRouter.post("/idea/generate", async (req: AuthenticatedRequest, res, next) => {
  const { projectId = "default", idea } = req.body;
  if (!idea || !idea.trim()) {
    return res.status(400).json({ success: false, error: "An idea description is required" });
  }

  const existingWorkspace = await PmxUnderstandingModel.exists({ projectId, isDeleted: false });
  if (existingWorkspace) {
    const role = await getMemberRole(projectId, req.userId!);
    if (!role) return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
  }

  let doc;
  try {
    doc = await PmxIdeaPrdModel.create({ projectId, userId: req.userId, idea, status: "generating" });

    const result = await generateIdeaPrd(idea, req.userId, projectId);

    doc.status = "completed";
    doc.markdown = result.markdown;
    doc.productName = result.productName;
    doc.stack = result.stack;
    doc.assumptions = result.assumptions;
    doc.pages = result.pages;
    doc.layout = result.layout;
    doc.tokensUsed = result.tokensUsed;
    doc.aiModel = result.model;
    doc.version = 1;
    await doc.save();

    // This idea just became a real workspace — materialize it (a no-op if
    // it already existed) so it shows up in the workspace switcher/tab bar
    // under the AI's own product name instead of a generic "Untitled N".
    await ensureWorkspace(projectId, req.userId!, result.productName);

    await logAudit(req, projectId, "idea_prd_generated", `Generated execution-ready PRD for idea: "${idea.slice(0, 80)}"`, "PmxIdeaPrd", doc._id.toString());

    res.json({ success: true, data: doc });
  } catch (err: any) {
    if (doc) {
      doc.status = "failed";
      doc.error = "PRD generation failed. Please try again.";
      await doc.save().catch(() => {});
    }
    next(err);
  }
});

// Most recent completed PRD for a project — this is what /pmx/prd loads by default
pmxRouter.get("/idea/prd/latest", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    // Not gated with requireWorkspaceAccess() — this route is polled by
    // /pmx/overview and /pmx/prd for a projectId that may not have a
    // workspace (or membership) yet, and should just report "no PRD" (null)
    // rather than 403 in that case; membership is enforced when one exists.
    if (!(await getMemberRole(projectId, req.userId!)) && (await PmxUnderstandingModel.exists({ projectId, isDeleted: false }))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    const doc = await PmxIdeaPrdModel.findOne({ projectId, status: "completed", isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Fetch a specific generated PRD by id
pmxRouter.get("/idea/prd/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
    if (!canWrite(await getMemberRole(doc.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// AI prompt bar / theme controls — edit the PRD in place rather than
// regenerating it. Powers both free-text refinements and Theme Control
// dropdown changes (the frontend synthesizes an instruction for those).
pmxRouter.post("/idea/prd/:id/refine", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { instruction } = req.body;
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ success: false, error: "An instruction is required" });
    }

    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
    if (!canWrite(await getMemberRole(doc.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }
    if (doc.status !== "completed") {
      return res.status(409).json({ success: false, error: "This PRD isn't ready to edit yet" });
    }

    const result = await refineIdeaPrd(doc.markdown, doc.stack, instruction, req.userId, doc.projectId);

    // Snapshot the pre-edit state so it can be restored later.
    doc.versions.push({ version: doc.version, markdown: doc.markdown, stack: doc.stack, createdAt: new Date() });

    doc.markdown = result.markdown;
    doc.stack = result.stack;
    doc.version += 1;
    doc.tokensUsed += result.tokensUsed;
    doc.history.push({ role: "user", content: instruction, createdAt: new Date() });
    doc.history.push({ role: "assistant", content: result.changeSummary, createdAt: new Date() });
    await doc.save();

    await logAudit(req, doc.projectId, "idea_prd_refined", `Refined PRD (v${doc.version}): "${instruction.slice(0, 80)}"`, "PmxIdeaPrd", doc._id.toString());

    res.json({ success: true, data: doc, changeSummary: result.changeSummary });
  } catch (err: any) {
    next(err);
  }
});

// Restore a previous version of an idea-flow PRD from its version snapshots
pmxRouter.post("/idea/prd/:id/rewind", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { version } = req.body;
    if (version === undefined || version === null) {
      return res.status(400).json({ success: false, error: "A version is required" });
    }

    const targetVersion = Number(version);
    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
    if (!canWrite(await getMemberRole(doc.projectId, req.userId!))) {
      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    }

    if (targetVersion >= doc.version || targetVersion < 1) {
      return res.status(400).json({ success: false, error: "Invalid target version for rollback" });
    }

    const snapshot = doc.versions.find((v) => v.version === targetVersion);
    if (!snapshot) return res.status(404).json({ success: false, error: "That version no longer exists" });

    // Restore exact state from snapshot
    doc.markdown = snapshot.markdown;
    doc.stack = snapshot.stack;
    doc.version = targetVersion;

    // Destructive rollback: permanently remove all version snapshots >= targetVersion
    doc.versions = doc.versions.filter((v) => v.version < targetVersion);

    // Truncate chat/change history to match remaining refines
    const maxHistoryEntries = Math.max(0, (targetVersion - 1) * 2);
    if (doc.history && doc.history.length > maxHistoryEntries) {
      doc.history = doc.history.slice(0, maxHistoryEntries);
    }

    await doc.save();

    await logAudit(req, doc.projectId, "idea_prd_rewound", `Rolled back PRD to v${targetVersion}`, "PmxIdeaPrd", doc._id.toString());

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 15. TEAM & MEMBERSHIP
// ==========================================

// List members of a workspace, enriched with display info from UserModel
// (PmxWorkspaceMember only stores the Clerk id).
pmxRouter.get("/projects/:projectId/members", requireWorkspaceAccess(), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const members = await PmxWorkspaceMemberModel.find({ projectId }).sort({ joinedAt: 1 });
    const users = await UserModel.find(
      { clerkId: { $in: members.map((m) => m.userId) } },
      { clerkId: 1, email: 1, username: 1, firstName: 1, lastName: 1, avatar: 1 }
    );
    const userByClerkId = new Map(users.map((u) => [u.clerkId, u]));

    const data = members.map((m) => {
      const u = userByClerkId.get(m.userId);
      return {
        _id: m._id.toString(),
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
        name: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username : "Unknown user",
        email: u?.email || "",
        avatar: u?.avatar || "",
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Change a member's role. Only the owner may promote a member to admin or
// change/remove an existing admin's role — an admin actor may only change
// plain-member rows. Nobody can set role to "owner" through this route, and
// the current owner's own row can never be targeted (no ownership transfer
// flow exists).
pmxRouter.patch("/projects/:projectId/members/:memberId", requireWorkspaceAccess("admin"), async (req: WorkspaceScopedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;
    const { role } = req.body;
    const assignableRoles: string[] = [...PMX_INVITE_ROLES];
    if (!assignableRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${assignableRoles.join(", ")}` });
    }

    const target = await PmxWorkspaceMemberModel.findOne({ _id: memberId, projectId });
    if (!target) return res.status(404).json({ success: false, error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ success: false, error: "The workspace owner's role cannot be changed." });
    }
    if (target.role === "admin" && req.workspaceRole !== "owner") {
      return res.status(403).json({ success: false, error: "Only the owner can change an admin's role." });
    }

    target.role = role;
    await target.save();

    await logAudit(req, projectId, "member_role_changed", `Changed a team member's role to "${role}"`, "PmxWorkspaceMember", target._id.toString());
    res.json({ success: true, data: target });
  } catch (err) {
    next(err);
  }
});

// Remove a member. An admin actor may remove plain members but not other
// admins or the owner; only the owner may remove an admin. The owner cannot
// remove themself (no ownership-transfer/leave-workspace flow exists).
pmxRouter.delete("/projects/:projectId/members/:memberId", requireWorkspaceAccess("admin"), async (req: WorkspaceScopedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;

    const target = await PmxWorkspaceMemberModel.findOne({ _id: memberId, projectId });
    if (!target) return res.status(404).json({ success: false, error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ success: false, error: "The workspace owner cannot be removed." });
    }
    if (target.role === "admin" && req.workspaceRole !== "owner") {
      return res.status(403).json({ success: false, error: "Only the owner can remove an admin." });
    }

    await target.deleteOne();
    await logAudit(req, projectId, "member_removed", `Removed a team member from the workspace`, "PmxWorkspaceMember", memberId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 15B. WORKSPACE INVITE CODES (current invite mechanism)
// ==========================================
// Multiple simultaneous, independently revocable, role-specific codes per
// workspace — an "Engineering Invite", a "Marketing Invite", a "Viewer
// Invite" can all be live at once. Supersedes the old single-active-code
// model (/invite-codes/generate|revoke|current below are no longer called
// by the frontend but are left in place, unused — same zero-risk-legacy
// convention as /tasks/generate elsewhere in this file).

// List every non-revoked code for a workspace — label, role, usage/expiry
// metadata. Never the plaintext code or its hash.
pmxRouter.get("/projects/:projectId/invite-codes", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const codes = await PmxWorkspaceInviteCodeModel.find({ projectId, revoked: false }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: codes.map((c) => ({
        _id: c._id.toString(),
        label: c.label || "",
        role: c.role,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        maxUses: c.maxUses,
        usageCount: c.usageCount,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create an additional invite code for a workspace — does not touch any
// existing codes. Only this response ever carries the plaintext code; it is
// never stored or returned again.
pmxRouter.post("/projects/:projectId/invite-codes", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const { role, label, expiresAt, maxUses } = req.body as { role?: string; label?: string; expiresAt?: string; maxUses?: number };
    if (!role || !(PMX_INVITE_ROLES as readonly string[]).includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${PMX_INVITE_ROLES.join(", ")}` });
    }

    let plaintext = "";
    let created;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      plaintext = generateInviteCodePlaintext();
      try {
        created = await PmxWorkspaceInviteCodeModel.create({
          projectId,
          codeHash: hashInviteCode(plaintext),
          role: role as typeof PMX_INVITE_ROLES[number],
          label: label?.trim() || undefined,
          createdBy: req.userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          maxUses: typeof maxUses === "number" && maxUses > 0 ? maxUses : null,
        });
      } catch (err: any) {
        // Duplicate codeHash — astronomically unlikely (30^8 combinations),
        // but retry with a freshly generated code rather than fail outright.
        if (err?.code !== 11000) throw err;
      }
    }
    if (!created) return res.status(500).json({ success: false, error: "Couldn't generate a unique invite code. Try again." });

    await logAudit(req, projectId, "invite_code_generated", `Generated a new "${PMX_ROLE_LABELS[role as PmxWorkspaceRole]}" invite code${label ? ` ("${label}")` : ""}`, "PmxWorkspaceInviteCode", created._id.toString());
    res.json({
      success: true,
      data: {
        _id: created._id.toString(),
        code: plaintext,
        label: created.label || "",
        role: created.role,
        createdAt: created.createdAt,
        maxUses: created.maxUses,
        expiresAt: created.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Revoke one specific code by id.
pmxRouter.post("/projects/:projectId/invite-codes/:codeId/revoke", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const codeId = req.params.codeId as string;
    const result = await PmxWorkspaceInviteCodeModel.updateOne({ _id: codeId, projectId, revoked: false }, { revoked: true, revokedAt: new Date() });
    if (result.modifiedCount > 0) {
      await logAudit(req, projectId, "invite_code_revoked", "Revoked a workspace invite code", "PmxWorkspaceInviteCode", codeId);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Legacy single-code routes (no longer called by the frontend) ──────────
pmxRouter.post("/projects/:projectId/invite-codes/generate", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    await PmxWorkspaceInviteCodeModel.updateMany({ projectId, revoked: false }, { revoked: true, revokedAt: new Date() });

    let plaintext = "";
    let created;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      plaintext = generateInviteCodePlaintext();
      try {
        created = await PmxWorkspaceInviteCodeModel.create({
          projectId,
          codeHash: hashInviteCode(plaintext),
          role: "viewer",
          createdBy: req.userId,
        });
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
      }
    }
    if (!created) return res.status(500).json({ success: false, error: "Couldn't generate a unique invite code. Try again." });

    await logAudit(req, projectId, "invite_code_generated", "Generated a new workspace invite code", "PmxWorkspaceInviteCode", created._id.toString());
    res.json({
      success: true,
      data: { code: plaintext, createdAt: created.createdAt, maxUses: created.maxUses, expiresAt: created.expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

pmxRouter.post("/projects/:projectId/invite-codes/revoke", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await PmxWorkspaceInviteCodeModel.updateMany({ projectId, revoked: false }, { revoked: true, revokedAt: new Date() });
    if (result.modifiedCount > 0) {
      await logAudit(req, projectId, "invite_code_revoked", "Revoked the active workspace invite code", "PmxWorkspaceInviteCode");
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

pmxRouter.get("/projects/:projectId/invite-codes/current", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const active = await PmxWorkspaceInviteCodeModel.findOne({ projectId, revoked: false }).sort({ createdAt: -1 });
    if (!active) return res.json({ success: true, data: { exists: false } });
    res.json({
      success: true,
      data: {
        exists: true,
        createdAt: active.createdAt,
        usageCount: active.usageCount,
        maxUses: active.maxUses,
        expiresAt: active.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

type InviteCodeStatus = "valid" | "already_member" | "invalid" | "expired" | "revoked" | "limit_reached";

// Shared validation for resolve/accept — deliberately re-run in full by
// accept() rather than trusting a prior resolve() call, since time passes
// (and the code's state can change) between the two requests.
async function checkInviteCode(rawCode: string, userId: string): Promise<
  | { status: "invalid" }
  | { status: "revoked" | "expired" | "limit_reached"; code: any }
  | { status: "already_member" | "valid"; code: any; workspace: any }
> {
  const normalized = normalizeInviteCode(rawCode || "");
  if (normalized.length !== 9) return { status: "invalid" }; // "XXXX-XXXX"

  const targetHash = hashInviteCode(normalized);
  const candidate = await PmxWorkspaceInviteCodeModel.findOne({ codeHash: targetHash });
  if (!candidate || !hashesMatch(candidate.codeHash, targetHash)) return { status: "invalid" };

  if (candidate.revoked) return { status: "revoked", code: candidate };
  if (candidate.expiresAt && candidate.expiresAt.getTime() < Date.now()) return { status: "expired", code: candidate };
  if (candidate.maxUses !== null && candidate.usageCount >= candidate.maxUses) return { status: "limit_reached", code: candidate };

  const workspace = await PmxUnderstandingModel.findOne({ projectId: candidate.projectId, isDeleted: false });
  if (!workspace) return { status: "invalid" };
  // Workspace-level "allow people to join via invite code" toggle (Settings
  // → Workspace) — from the joiner's side this reads the same as the code
  // itself being revoked, so it reuses that status/message rather than
  // needing a distinct one the spec doesn't otherwise call for.
  if (workspace.inviteLinksEnabled === false) return { status: "revoked", code: candidate };

  const existingRole = await getMemberRole(candidate.projectId, userId);
  if (existingRole) return { status: "already_member", code: candidate, workspace };

  return { status: "valid", code: candidate, workspace };
}

const INVITE_CODE_ERROR_MESSAGE: Record<string, string> = {
  invalid: "That invite code isn't valid.",
  expired: "This invite code has expired.",
  revoked: "This invite code has been revoked.",
  limit_reached: "This invite code is no longer available.",
};

// Failed-attempt visibility (security requirement): a code that resolves to
// a real, known workspace but fails validation gets logged against that
// workspace's own audit trail so an owner/admin can see join attempts
// against their revoked/expired/exhausted codes. "invalid" has no
// projectId to log against (the code doesn't match anything real), so it's
// a server-side warning only — still visible in logs, just not per-workspace.
async function logFailedInviteAttempt(req: AuthenticatedRequest, result: Awaited<ReturnType<typeof checkInviteCode>>) {
  if (result.status === "invalid") {
    console.warn(`[Invite Code] Invalid code attempt by user ${req.userId}`);
    return;
  }
  if (result.status === "already_member") return;
  await logAudit(req, result.code.projectId, "invite_join_failed", `A join attempt failed (${result.status})`, "PmxWorkspaceInviteCode", result.code._id.toString());
}

async function buildWorkspacePreview(workspace: any) {
  const workspaceName = workspace.workspaceName || workspace.productSummary?.name || "Workspace";
  const [memberCount, sourceCount] = await Promise.all([
    PmxWorkspaceMemberModel.countDocuments({ projectId: workspace.projectId }),
    PmxInputModel.countDocuments({ projectId: workspace.projectId, isDeleted: false }),
  ]);
  return { workspaceName, memberCount, sourceCount };
}

// Resolve a code without consuming it — powers the confirm-before-join
// preview screen. Any authenticated user (never a workspace member yet, by
// definition), rate-limited against brute-force guessing.
pmxRouter.post("/invite-codes/resolve", inviteCodeLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await checkInviteCode(req.body?.code, req.userId!);
    switch (result.status) {
      case "invalid":
      case "expired":
      case "revoked":
      case "limit_reached":
        await logFailedInviteAttempt(req, result);
        return res.json({ success: true, data: { status: result.status, message: INVITE_CODE_ERROR_MESSAGE[result.status] } });
      case "already_member": {
        const { workspaceName } = await buildWorkspacePreview(result.workspace);
        return res.json({ success: true, data: { status: "already_member", projectId: result.code.projectId, workspaceName } });
      }
      case "valid": {
        const { workspaceName, memberCount, sourceCount } = await buildWorkspacePreview(result.workspace);
        return res.json({
          success: true,
          data: {
            status: "valid",
            workspaceName,
            memberCount,
            sourceCount,
            role: result.code.role,
            roleLabel: PMX_ROLE_LABELS[result.code.role as PmxWorkspaceRole],
          },
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

// Actually join — re-validates from scratch, then atomically grants
// membership at the role the redeemed code was created with.
pmxRouter.post("/invite-codes/accept", inviteCodeLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await checkInviteCode(req.body?.code, req.userId!);
    switch (result.status) {
      case "invalid":
      case "expired":
      case "revoked":
      case "limit_reached":
        await logFailedInviteAttempt(req, result);
        return res.status(400).json({ success: false, error: INVITE_CODE_ERROR_MESSAGE[result.status] });
      case "already_member": {
        const { workspaceName } = await buildWorkspacePreview(result.workspace);
        return res.json({ success: true, data: { alreadyMember: true, projectId: result.code.projectId, workspaceName } });
      }
      case "valid": {
        const { workspaceName } = await buildWorkspacePreview(result.workspace);

        await PmxWorkspaceMemberModel.findOneAndUpdate(
          { projectId: result.code.projectId, userId: req.userId },
          { $setOnInsert: { projectId: result.code.projectId, userId: req.userId, role: result.code.role, invitedBy: result.code.createdBy, joinedAt: new Date() } },
          { upsert: true }
        );
        await PmxWorkspaceInviteCodeModel.updateOne({ _id: result.code._id }, { $inc: { usageCount: 1 } });

        await logAudit(req, result.code.projectId, "member_joined", `A new member joined the workspace as "${PMX_ROLE_LABELS[result.code.role as PmxWorkspaceRole]}" via invite code`, "PmxWorkspaceMember", req.userId);
        return res.json({ success: true, data: { projectId: result.code.projectId, workspaceName, role: result.code.role } });
      }
    }
  } catch (err) {
    next(err);
  }
});

// Accept an invite token (legacy) — any signed-in user, no workspace-membership
// check (that's the whole point). Always grants "member", never anything
// higher, and is idempotent if the caller is already a member.
pmxRouter.post("/invite/:token/accept", async (req: AuthenticatedRequest, res, next) => {
  try {
    const invite = await PmxWorkspaceInviteModel.findOne({ token: req.params.token, revoked: false });
    if (!invite) return res.status(404).json({ success: false, error: "This invite link is no longer active." });

    const workspace = await PmxUnderstandingModel.findOne({ projectId: invite.projectId, isDeleted: false });
    if (!workspace) return res.status(404).json({ success: false, error: "This workspace no longer exists." });
    if (workspace.inviteLinksEnabled === false) {
      return res.status(403).json({ success: false, error: "This workspace is not currently accepting new members." });
    }

    await PmxWorkspaceMemberModel.findOneAndUpdate(
      { projectId: invite.projectId, userId: req.userId },
      { $setOnInsert: { projectId: invite.projectId, userId: req.userId, role: "member", invitedBy: invite.createdBy, joinedAt: new Date() } },
      { upsert: true }
    );

    await logAudit(req, invite.projectId, "member_joined", "A new member joined via invite link", "PmxWorkspaceMember", req.userId);
    res.json({ success: true, data: { projectId: invite.projectId, workspaceName: workspace.workspaceName || workspace.productSummary?.name || "Workspace" } });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 15C. EMAIL INVITES
// ==========================================
// The second, complementary way to add people (alongside the anonymous,
// shareable invite codes above): bound to one specific email address, so
// only that identity can accept it. Public preview before sign-in lives at
// GET /api/pmx-invite-email/:token (api/routes/pmxEmailInvite.ts, mirrors
// pmxInvite.ts's role for the legacy token link) — everything below is
// authenticated (pmxRouter.use(authMiddleware) above).

function generateEmailInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

async function displayNameForClerkId(clerkId: string): Promise<string> {
  const u = await UserModel.findOne({ clerkId });
  if (!u) return "A workspace admin";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Invite one or more emails at once — per-email results so the UI can show
// a clear batch summary ("3 sent, 1 already a member, 1 already pending").
// Creating the invitation row never fails because the email itself failed
// to send (SMTP down/unconfigured) — same reasoning as the rest of this
// codebase's best-effort email sends; the UI falls back to "copy this link".
pmxRouter.post("/projects/:projectId/invites/email", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const { emails, role } = req.body as { emails?: string[]; role?: string };
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: "At least one email address is required" });
    }
    if (!role || !(PMX_INVITE_ROLES as readonly string[]).includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${PMX_INVITE_ROLES.join(", ")}` });
    }

    const inviterName = await displayNameForClerkId(req.userId!);
    const workspace = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });
    const workspaceName = workspace?.workspaceName || workspace?.productSummary?.name || "Workspace";
    const roleLabel = PMX_ROLE_LABELS[role as PmxWorkspaceRole];

    const results: Array<{ email: string; status: "sent" | "already_member" | "already_pending" | "invalid"; emailSent?: boolean }> = [];

    for (const raw of emails) {
      const email = String(raw || "").trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email)) {
        results.push({ email: String(raw || ""), status: "invalid" });
        continue;
      }

      const existingUser = await UserModel.findOne({ email });
      if (existingUser && (await getMemberRole(projectId, existingUser.clerkId))) {
        results.push({ email, status: "already_member" });
        continue;
      }

      const existingInvite = await PmxWorkspaceEmailInviteModel.findOne({ projectId, email, status: "pending" });
      if (existingInvite) {
        results.push({ email, status: "already_pending" });
        continue;
      }

      const token = generateEmailInviteToken();
      const created = await PmxWorkspaceEmailInviteModel.create({
        projectId,
        email,
        role: role as typeof PMX_INVITE_ROLES[number],
        token,
        invitedBy: req.userId,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      let emailSent = true;
      try {
        await sendWorkspaceInviteEmail({
          toEmail: email,
          workspaceName,
          inviterName,
          roleLabel,
          acceptUrl: `${env.FRONTEND_ORIGIN}/pmx/invite/${token}`,
        });
      } catch (err) {
        emailSent = false;
        console.error(`[Email Invite] Failed to send to ${email}:`, err);
      }

      await logAudit(req, projectId, "invite_email_sent", `Invited "${email}" as ${roleLabel}`, "PmxWorkspaceEmailInvite", created._id.toString());
      results.push({ email, status: "sent", emailSent });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// List pending invitations for the Settings → Team "Pending Invitations" section.
pmxRouter.get("/projects/:projectId/invites/email", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const invites = await PmxWorkspaceEmailInviteModel.find({ projectId, status: "pending" }).sort({ createdAt: -1 });
    const data = await Promise.all(
      invites.map(async (i) => ({
        _id: i._id.toString(),
        email: i.email,
        role: i.role,
        status: i.status,
        invitedByName: await displayNameForClerkId(i.invitedBy),
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }))
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Resend — extends the expiry and re-sends the same-token email.
pmxRouter.post("/projects/:projectId/invites/email/:inviteId/resend", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const invite = await PmxWorkspaceEmailInviteModel.findOne({ _id: req.params.inviteId, projectId, status: "pending" });
    if (!invite) return res.status(404).json({ success: false, error: "Invitation not found" });

    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invite.save();

    const inviterName = await displayNameForClerkId(req.userId!);
    const workspace = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false });
    const workspaceName = workspace?.workspaceName || workspace?.productSummary?.name || "Workspace";

    let emailSent = true;
    try {
      await sendWorkspaceInviteEmail({
        toEmail: invite.email,
        workspaceName,
        inviterName,
        roleLabel: PMX_ROLE_LABELS[invite.role as PmxWorkspaceRole],
        acceptUrl: `${env.FRONTEND_ORIGIN}/pmx/invite/${invite.token}`,
      });
    } catch (err) {
      emailSent = false;
      console.error(`[Email Invite] Resend failed for ${invite.email}:`, err);
    }

    await logAudit(req, projectId, "invite_email_resent", `Resent invitation to "${invite.email}"`, "PmxWorkspaceEmailInvite", invite._id.toString());
    res.json({ success: true, data: { emailSent } });
  } catch (err) {
    next(err);
  }
});

// Revoke a pending invitation.
pmxRouter.post("/projects/:projectId/invites/email/:inviteId/revoke", requireWorkspaceAccess("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await PmxWorkspaceEmailInviteModel.updateOne(
      { _id: req.params.inviteId, projectId, status: "pending" },
      { status: "revoked" }
    );
    if (result.modifiedCount > 0) {
      await logAudit(req, projectId, "invite_email_revoked", "Revoked a pending email invitation", "PmxWorkspaceEmailInvite", req.params.inviteId as string);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

type EmailInviteCheck =
  | { status: "invalid" }
  | { status: "revoked" | "expired"; invite: any }
  | { status: "already_member" | "valid" | "email_mismatch"; invite: any; workspace: any };

// Shared validation for the authenticated resolve/accept routes below —
// deliberately re-run in full by accept() rather than trusting a prior
// resolve() call, mirroring checkInviteCode's pattern for the code flow.
async function checkEmailInvite(token: string, userId: string, userEmail: string): Promise<EmailInviteCheck> {
  const invite = await PmxWorkspaceEmailInviteModel.findOne({ token });
  if (!invite) return { status: "invalid" };
  if (invite.status === "revoked") return { status: "revoked", invite };
  if (invite.status !== "accepted" && invite.expiresAt.getTime() < Date.now()) {
    return { status: "expired", invite };
  }

  const workspace = await PmxUnderstandingModel.findOne({ projectId: invite.projectId, isDeleted: false });
  if (!workspace) return { status: "invalid" };

  const normalizedUserEmail = (userEmail || "").trim().toLowerCase();

  if (invite.status === "accepted") {
    // Revisiting an already-consumed link — fine if it's the same person
    // (idempotent), otherwise this specific invitation is no longer usable.
    if (normalizedUserEmail === invite.email) return { status: "already_member", invite, workspace };
    return { status: "invalid" };
  }

  // Hard rule: an invitation can only ever be accepted by the identity it
  // was sent to — no exception, per the security requirement.
  if (normalizedUserEmail !== invite.email) return { status: "email_mismatch", invite, workspace };

  if (await getMemberRole(invite.projectId, userId)) return { status: "already_member", invite, workspace };

  return { status: "valid", invite, workspace };
}

// Authenticated resolve — adds the email-match/already-member checks the
// public preview (GET /api/pmx-invite-email/:token) can't do without
// knowing who's asking.
pmxRouter.get("/invites/email/resolve/:token", async (req: AuthenticatedRequest, res, next) => {
  try {
    const me = await UserModel.findOne({ clerkId: req.userId });
    const result = await checkEmailInvite(req.params.token as string, req.userId!, me?.email || "");
    switch (result.status) {
      case "invalid":
      case "revoked":
      case "expired":
        return res.json({ success: true, data: { status: result.status } });
      case "email_mismatch":
        return res.json({
          success: true,
          data: { status: "email_mismatch", workspaceName: result.workspace.workspaceName || result.workspace.productSummary?.name || "Workspace", invitedEmail: result.invite.email },
        });
      case "already_member":
        return res.json({
          success: true,
          data: { status: "already_member", projectId: result.invite.projectId, workspaceName: result.workspace.workspaceName || result.workspace.productSummary?.name || "Workspace" },
        });
      case "valid":
        return res.json({
          success: true,
          data: {
            status: "valid",
            workspaceName: result.workspace.workspaceName || result.workspace.productSummary?.name || "Workspace",
            invitedByName: await displayNameForClerkId(result.invite.invitedBy),
            role: result.invite.role,
            roleLabel: PMX_ROLE_LABELS[result.invite.role as PmxWorkspaceRole],
          },
        });
    }
  } catch (err) {
    next(err);
  }
});

// Accept — idempotent (upsert keyed on {projectId, userId}, exactly like
// the code-accept route), grants exactly invite.role (never anything from
// the request body), and hard-blocks on email mismatch.
pmxRouter.post("/invites/email/accept/:token", async (req: AuthenticatedRequest, res, next) => {
  try {
    const me = await UserModel.findOne({ clerkId: req.userId });
    const result = await checkEmailInvite(req.params.token as string, req.userId!, me?.email || "");
    switch (result.status) {
      case "invalid":
        return res.status(400).json({ success: false, error: "Invalid invitation" });
      case "revoked":
        return res.status(400).json({ success: false, error: "This invitation has been revoked" });
      case "expired":
        return res.status(400).json({ success: false, error: "This invitation has expired" });
      case "email_mismatch":
        return res.status(403).json({ success: false, error: `This invitation was sent to ${result.invite.email} — sign in with that email to accept it.` });
      case "already_member": {
        const workspaceName = result.workspace.workspaceName || result.workspace.productSummary?.name || "Workspace";
        return res.json({ success: true, data: { alreadyMember: true, projectId: result.invite.projectId, workspaceName } });
      }
      case "valid": {
        const workspaceName = result.workspace.workspaceName || result.workspace.productSummary?.name || "Workspace";

        await PmxWorkspaceMemberModel.findOneAndUpdate(
          { projectId: result.invite.projectId, userId: req.userId },
          { $setOnInsert: { projectId: result.invite.projectId, userId: req.userId, role: result.invite.role, invitedBy: result.invite.invitedBy, joinedAt: new Date() } },
          { upsert: true }
        );
        await PmxWorkspaceEmailInviteModel.updateOne({ _id: result.invite._id }, { status: "accepted", acceptedAt: new Date() });

        await logAudit(req, result.invite.projectId, "member_joined", `A new member joined the workspace as "${PMX_ROLE_LABELS[result.invite.role as PmxWorkspaceRole]}" via email invitation`, "PmxWorkspaceMember", req.userId);
        return res.json({ success: true, data: { projectId: result.invite.projectId, workspaceName, role: result.invite.role } });
      }
    }
  } catch (err) {
    next(err);
  }
});

// Pending invitations addressed to the signed-in user's own (synced) email,
// across every workspace — powers JoinWorkspaceModal's "Accept an
// invitation" tab so a signed-in user doesn't have to dig through email.
pmxRouter.get("/invites/email/pending-for-me", async (req: AuthenticatedRequest, res, next) => {
  try {
    const me = await UserModel.findOne({ clerkId: req.userId });
    if (!me?.email) return res.json({ success: true, data: [] });

    const invites = await PmxWorkspaceEmailInviteModel.find({
      email: me.email.toLowerCase(),
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    const workspaces = await PmxUnderstandingModel.find(
      { projectId: { $in: invites.map((i) => i.projectId) }, isDeleted: false },
      { projectId: 1, workspaceName: 1, productSummary: 1 }
    );
    const workspaceByProject = new Map(workspaces.map((w) => [w.projectId, w]));

    const data = await Promise.all(
      invites
        .filter((i) => workspaceByProject.has(i.projectId))
        .map(async (i) => {
          const w = workspaceByProject.get(i.projectId)!;
          return {
            token: i.token,
            workspaceName: w.workspaceName || w.productSummary?.name || "Workspace",
            role: i.role,
            roleLabel: PMX_ROLE_LABELS[i.role as PmxWorkspaceRole],
            invitedByName: await displayNameForClerkId(i.invitedBy),
          };
        })
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Router-level error handler: every route above funnels its catch block
// into next(err), so this runs before the generic app-level errorHandler
// and gives UsageCapExceededError its own 402 shape instead of falling
// through to that handler's generic { error: message } / 500.
pmxRouter.use((err: any, _req: AuthenticatedRequest, res: any, next: any) => {
  if (err instanceof UsageCapExceededError) {
    return res.status(402).json({ success: false, code: "DAILY_CAP_EXCEEDED", error: "Daily AI usage limit reached", cap: HARD_DAILY_CAP_USD });
  }
  if (err instanceof TokenLimitExceededError) {
    return res.status(402).json({
      success: false,
      code: "TOKEN_LIMIT_REACHED",
      error: "You've used your 100,000-token allowance for this period.",
      limit: err.limit,
    });
  }
  if (err instanceof TrialExpiredError) {
    return res.status(402).json({ success: false, code: "TRIAL_EXPIRED", error: "Your free trial has ended." });
  }
  next(err);
});
