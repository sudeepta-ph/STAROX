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
  PmxArtifactModel,
  PmxAuditLogModel,
  PmxScreenshotProjectModel,
  PmxSessionModel,
  PmxIdeaPrdModel,
  PmxTokenUsageModel
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
  refineSolutionPrd
} from "../../../services/pmxAi";
import { generateIdeaPrd, refineIdeaPrd } from "../../../services/pmxIdeaPrd";
import { analyzeScreenshotUI } from "../../../services/screenshotAi";
import { runUIAudit } from "../../../services/uiAuditAi";
import { AI_MODEL } from "../../../services/ai/models";
import { UsageCapExceededError, HARD_DAILY_CAP_USD } from "../../../services/ai/deepseek";
import { screenshotRouter, captureScreenshot } from "./screenshot";
import crypto from "node:crypto";

export const pmxRouter = Router();

// Apply auth middleware to all PMX routes
pmxRouter.use(authMiddleware);
pmxRouter.use(screenshotRouter);

// ==========================================
// HELPERS
// ==========================================
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
async function ensureWorkspace(projectId: string, userId: string, name: string) {
  try {
    await PmxUnderstandingModel.findOneAndUpdate(
      { projectId, userId, isDeleted: false },
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

  // Fetch active inputs, optionally filtering by selectedSourceIds
  const query: any = { projectId, userId, isDeleted: false };
  if (selectedSourceIds && selectedSourceIds.length > 0) {
    query._id = { $in: selectedSourceIds };
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
  
  let understanding = await PmxUnderstandingModel.findOne({ projectId, userId, isDeleted: false });
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
  await PmxEvidenceModel.deleteMany({ projectId, userId, source: { $ne: "User Uploaded" } });
  
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
  const allEvidence = await PmxEvidenceModel.find({ projectId, userId, isDeleted: false });

  // 3. Detect Problems
  console.log("[PMX Pipeline] Step 3: Detecting Problems...");
  const detectedProblems = await detectProductProblems(allEvidence, textContents, undefined, userId, projectId);
  await PmxProblemModel.deleteMany({ projectId, userId });
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
  await PmxOpportunityModel.deleteMany({ projectId, userId });
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
  await PmxDecisionModel.deleteMany({ projectId, userId });
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
// authenticated user's workspace. Everything here is a real Mongo
// count/aggregate against the same models every other PMX page reads —
// no cached or precomputed rollups, so it's always current.
pmxRouter.get("/analytics/overview", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const projectId = (req.query.projectId as string) || "default";
    const filter = { projectId, userId, isDeleted: false };

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
      PmxSessionModel.countDocuments({ projectId, userId }),
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
        { $match: { projectId, userId } },
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
      { $match: { projectId, userId, createdAt: { $gte: since } } },
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
      PmxSessionModel.find({ projectId, userId }).sort({ createdAt: -1 }).limit(5),
      PmxAuditLogModel.find({ projectId, userId }).sort({ createdAt: -1 }).limit(8),
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

// List every PMX workspace the user has. `PmxUnderstandingModel` doubles as
// the workspace registry — a row here is what makes a projectId a "real"
// workspace. Rows are created explicitly (POST /projects) or implicitly the
// moment a projectId gets real content (see ensureWorkspace, called from
// idea generation and source creation) — never as a side effect of a GET.
pmxRouter.get("/projects", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const workspaces = await PmxUnderstandingModel.find({ userId, isDeleted: false });
    const projectIds = workspaces.map((w) => w.projectId);

    const inputAgg = await PmxInputModel.aggregate([
      { $match: { userId, projectId: { $in: projectIds }, isDeleted: false } },
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

    res.json({ success: true, data: { projectId, name } });
  } catch (err) {
    next(err);
  }
});

// Rename a workspace — a targeted update of just productSummary.name so it
// can be called from the Products list without loading (and risking
// clobbering) the rest of that workspace's understanding doc.
pmxRouter.put("/projects/:projectId/rename", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    const name = (req.body?.name as string | undefined)?.trim();
    if (!name) return res.status(400).json({ success: false, error: "A name is required" });

    const understanding = await PmxUnderstandingModel.findOneAndUpdate(
      { projectId, userId: req.userId, isDeleted: false },
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
pmxRouter.delete("/projects/:projectId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = req.params.projectId as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const filter = { projectId, userId: req.userId };
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
pmxRouter.get("/inputs", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const inputs = await PmxInputModel.find({
      projectId,
      userId: req.userId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: inputs });
  } catch (err) {
    next(err);
  }
});

// Create new input source
pmxRouter.post("/inputs", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", name, type, url, content, metadata = {} } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, error: "Name and Type are required fields" });
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

    res.json({ success: true, data: inputNode });
  } catch (err) {
    next(err);
  }
});

// Trigger full intelligence processing manually
pmxRouter.post("/inputs/process", async (req: AuthenticatedRequest, res, next) => {
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
    const input = await PmxInputModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: false },
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

// Reprocess individual input source
pmxRouter.post("/inputs/:id/reprocess", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = await PmxInputModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!input) return res.status(404).json({ success: false, error: "Source not found" });

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
pmxRouter.get("/history/sessions", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const sessions = await PmxSessionModel.find({ projectId, userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// Rerun a previous pipeline session
pmxRouter.post("/history/sessions/:id/rerun", async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await PmxSessionModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });

    const newSession = await runDownstreamPipeline(session.projectId, req.userId!, session.selectedSourceIds, req);
    res.json({ success: true, data: newSession });
  } catch (err) {
    next(err);
  }
});

// Soft delete input source
pmxRouter.delete("/inputs/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = await PmxInputModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.get("/understanding", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const understanding = await PmxUnderstandingModel.findOne({ projectId, userId: req.userId, isDeleted: false });
    res.json({ success: true, data: understanding || null });
  } catch (err) {
    next(err);
  }
});

// Save updated product understanding
pmxRouter.put("/understanding", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", productSummary, businessModel, coreFeatures, targetAudience, personas, customerSegments, businessGoals, valueProposition, customerJourney } = req.body;
    let understanding = await PmxUnderstandingModel.findOne({ projectId, userId: req.userId, isDeleted: false });

    if (!understanding) {
      understanding = new PmxUnderstandingModel({ projectId, userId: req.userId, version: 1 });
    } else {
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
pmxRouter.get("/evidence", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const category = req.query.category as string;
    const query = req.query.search as string;

    const filter: Record<string, any> = { projectId, userId: req.userId, isDeleted: false };
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
pmxRouter.post("/evidence", async (req: AuthenticatedRequest, res, next) => {
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
    const evidence = await PmxEvidenceModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.post("/analysis/ui-audit/save-to-insights", async (req: AuthenticatedRequest, res, next) => {
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
pmxRouter.get("/problems", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const problems = await PmxProblemModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ severity: 1 });
    res.json({ success: true, data: problems });
  } catch (err) {
    next(err);
  }
});

// Create custom/manual problem
pmxRouter.post("/problems", async (req: AuthenticatedRequest, res, next) => {
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
    const problem = await PmxProblemModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.get("/opportunities", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const opportunities = await PmxOpportunityModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ riceScore: -1 });
    res.json({ success: true, data: opportunities });
  } catch (err) {
    next(err);
  }
});

// Create/edit opportunity
pmxRouter.post("/opportunities", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", id, title, description, userImpact, revenueImpact, retentionImpact, strategicAlignment, confidence, effort, risk } = req.body;
    
    let opportunity;
    if (id) {
      opportunity = await PmxOpportunityModel.findOne({ _id: id, userId: req.userId });
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
    const opportunity = await PmxOpportunityModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.get("/decisions", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const status = req.query.status as string;
    const filter: Record<string, any> = { projectId, userId: req.userId, isDeleted: false };
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

    const decision = await PmxDecisionModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: false },
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
    const decision = await PmxDecisionModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.get("/solutions", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const solutions = await PmxSolutionModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ updatedAt: -1 });
    res.json({ success: true, data: solutions });
  } catch (err) {
    next(err);
  }
});

// Get specific solution details
pmxRouter.get("/solutions/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution specification not found" });
    res.json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
});

// Update specific solution details (PRD, Specs)
pmxRouter.put("/solutions/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { prd, epic, userStories, techSpecs, apiContracts, databaseChanges, securityNotes, uxImprovements, edgeCases } = req.body;
    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });

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

    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });

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
    const { historyId } = req.body;
    if (!historyId) return res.status(400).json({ success: false, error: "A historyId is required" });

    const solution = await PmxSolutionModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });

    const snapshot = (solution.history as any).id(historyId);
    if (!snapshot) return res.status(404).json({ success: false, error: "That version no longer exists" });

    solution.history.push({
      updatedAt: new Date(),
      updatedBy: req.userId!,
      prd: solution.prd,
      techSpecs: solution.techSpecs
    });
    solution.prd = snapshot.prd;
    solution.techSpecs = snapshot.techSpecs;
    solution.version += 1;
    await solution.save();

    await logAudit(req, solution.projectId, "solution_rewound", `Restored PRD to an earlier version (now v${solution.version})`, "PmxSolution", solution._id.toString());

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

    const sources = await PmxSolutionModel.find({ _id: { $in: solutionIds }, userId: req.userId, isDeleted: false });
    if (sources.length < 2) {
      return res.status(404).json({ success: false, error: "Couldn't find the selected blueprints" });
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
pmxRouter.post("/solutions/generate", async (req: AuthenticatedRequest, res, next) => {
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
pmxRouter.get("/tasks", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const tasks = await PmxExecutionTaskModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ priority: 1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

// Create task manually
pmxRouter.post("/tasks", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, description, type, sprintPlan = "Backlog", priority = "medium", timeEstimate = "1d", assignee, dependencies = [] } = req.body;
    if (!title || !description || !type) {
      return res.status(400).json({ success: false, error: "Title, Description, and Type are required" });
    }

    const task = await PmxExecutionTaskModel.create({
      projectId,
      userId: req.userId,
      title,
      description,
      type,
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
    const { status, title, description, type, sprintPlan, priority, timeEstimate, assignee, dependencies } = req.body;
    const task = await PmxExecutionTaskModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!task) return res.status(404).json({ success: false, error: "Task ticket not found" });

    const oldStatus = task.status;
    // Only touch fields the caller actually sent — a status-only PUT (the
    // Kanban Move/Back buttons) must not blank out title/description/type,
    // which are required and would otherwise fail validation on save.
    const updates: Record<string, any> = { status, title, description, type, sprintPlan, priority, timeEstimate, assignee, dependencies };
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
      const doc = await PmxIdeaPrdModel.findOne({ _id: ideaPrdId, userId: req.userId, isDeleted: false });
      if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
      projectId = doc.projectId;
      title = doc.productName || "Development PRD";
      prd = doc.markdown;
      techSpecs = "";
      logEntityType = "PmxIdeaPrd";
      logEntityId = doc._id.toString();
    } else {
      const solution = await PmxSolutionModel.findOne({ _id: solutionId, userId: req.userId, isDeleted: false });
      if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });
      projectId = solution.projectId;
      title = solution.title;
      prd = solution.prd;
      techSpecs = solution.techSpecs;
      logEntityType = "PmxSolution";
      logEntityId = solution._id.toString();
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

// Delete task
pmxRouter.delete("/tasks/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const task = await PmxExecutionTaskModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
pmxRouter.get("/artifacts", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const docs = await PmxArtifactModel.find({ projectId, userId: req.userId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// Compile an exportable document via AI synthesis across the whole
// workspace — PRD/blueprints, evidence, problems, opportunities, decisions,
// connected sources, UI analysis, and sprint tasks — rather than the caller
// assembling `content` itself from whatever it happens to have loaded.
pmxRouter.post("/artifacts/compile", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, type = "prd", format = "markdown" } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: "A title is required" });

    const filter = { projectId, userId: req.userId, isDeleted: false };
    const [ideaPrd, solutions, evidence, problems, opportunities, decisions, inputs, analysis, tasks] = await Promise.all([
      PmxIdeaPrdModel.findOne({ projectId, userId: req.userId, isDeleted: false, status: "completed" }).sort({ createdAt: -1 }),
      PmxSolutionModel.find(filter).sort({ updatedAt: -1 }).limit(5),
      PmxEvidenceModel.find(filter).sort({ importance: -1, confidence: -1 }).limit(10),
      PmxProblemModel.find(filter).sort({ confidence: -1 }).limit(10),
      PmxOpportunityModel.find(filter).sort({ riceScore: -1 }).limit(10),
      PmxDecisionModel.find(filter).sort({ confidence: -1 }).limit(10),
      PmxInputModel.find(filter).limit(15),
      PmxAnalysisModel.find(filter).sort({ createdAt: -1 }).limit(3),
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
pmxRouter.post("/artifacts", async (req: AuthenticatedRequest, res, next) => {
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
    const doc = await PmxArtifactModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "Artifact not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 11. AUDIT TIMELINE LOGS (History)
// ==========================================

// Get audit timeline logs
pmxRouter.get("/history", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    const history = await PmxAuditLogModel.find({ projectId, userId: req.userId }).sort({ createdAt: -1 });
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

// Run the pipeline and persist the result
pmxRouter.post("/idea/generate", async (req: AuthenticatedRequest, res, next) => {
  const { projectId = "default", idea } = req.body;
  if (!idea || !idea.trim()) {
    return res.status(400).json({ success: false, error: "An idea description is required" });
  }

  let doc;
  try {
    doc = await PmxIdeaPrdModel.create({ projectId, userId: req.userId, idea, status: "generating" });

    const result = await generateIdeaPrd(idea);

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
    const doc = await PmxIdeaPrdModel.findOne({ projectId, userId: req.userId, status: "completed", isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Fetch a specific generated PRD by id
pmxRouter.get("/idea/prd/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
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

    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });
    if (doc.status !== "completed") {
      return res.status(409).json({ success: false, error: "This PRD isn't ready to edit yet" });
    }

    const result = await refineIdeaPrd(doc.markdown, doc.stack, instruction);

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

    const doc = await PmxIdeaPrdModel.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, error: "PRD not found" });

    const snapshot = doc.versions.find((v) => v.version === version);
    if (!snapshot) return res.status(404).json({ success: false, error: "That version no longer exists" });

    doc.versions.push({ version: doc.version, markdown: doc.markdown, stack: doc.stack, createdAt: new Date() });
    doc.markdown = snapshot.markdown;
    doc.stack = snapshot.stack;
    doc.version += 1;
    doc.history.push({ role: "assistant", content: `Restored to version ${version}.`, createdAt: new Date() });
    await doc.save();

    await logAudit(req, doc.projectId, "idea_prd_rewound", `Restored PRD to v${version} (now v${doc.version})`, "PmxIdeaPrd", doc._id.toString());

    res.json({ success: true, data: doc });
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
    return res.status(402).json({ success: false, error: "Daily AI usage limit reached", cap: HARD_DAILY_CAP_USD });
  }
  next(err);
});
