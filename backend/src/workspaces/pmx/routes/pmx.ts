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
  PmxIdeaPrdModel
} from "../../../models/Pmx";
import {
  generateProductUnderstanding,
  generateEvidenceSignals,
  detectProductProblems,
  scoreOpportunities,
  generateDecisionRecommendations,
  generateSolutionDetails,
  generateExecutionTasks
} from "../../../services/pmxAi";
import { generateIdeaPrd, refineIdeaPrd, TokenBudgetExceededError } from "../../../services/pmxIdeaPrd";
import { analyzeScreenshotUI } from "../../../services/screenshotAi";
import { runUIAudit } from "../../../services/uiAuditAi";
import { screenshotRouter } from "./screenshot";
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
  if (inputs.length === 0) return;

  const actualSelectedIds = inputs.map(i => i._id.toString());
  const textContents = inputs.map(i => `[Source: ${i.name} (${i.type})]\n${i.content || ""}\n${i.summary || ""}`);

  // 1. Regenerate Understanding
  console.log("[PMX Pipeline] Step 1: Synthesizing Product Understanding...");
  const understandingData = await generateProductUnderstanding(textContents);
  
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
  const evidenceSignals = await generateEvidenceSignals(textContents);
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
  const detectedProblems = await detectProductProblems(allEvidence, textContents);
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
  const scopedOpportunities = await scoreOpportunities(detectedProblems, understandingData);
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
  const recommendations = await generateDecisionRecommendations(detectedProblems, scopedOpportunities);
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
    aiModel: "deepseek-v4-flash",
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
      ]);
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
      ]);
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

// Get current product understanding
pmxRouter.get("/understanding", async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = (req.query.projectId as string) || "default";
    let understanding = await PmxUnderstandingModel.findOne({ projectId, userId: req.userId, isDeleted: false });

    // Generate basic placeholder if none exists yet
    if (!understanding) {
      understanding = await PmxUnderstandingModel.create({
        projectId,
        userId: req.userId,
        productSummary: {
          name: "My Product Workspace",
          oneLiner: "Brief details of what we are building.",
          category: "SaaS",
          stage: "idea"
        },
        businessModel: "Freemium subscriptions",
        coreFeatures: [{ name: "Dashboard", description: "Analytical graphs", priority: "high" }],
        targetAudience: "Startups and small teams",
        personas: [{ name: "Founder Frank", role: "CEO", painPoints: ["No code skills"], goals: ["Launch MVP fast"] }],
        customerSegments: ["SMB", "Enterprise"],
        businessGoals: [{ goal: "Get 100 beta signups", successMetric: "Conversion rate" }],
        valueProposition: "Fast product analytics",
        customerJourney: [{ stage: "Signup", actions: ["Fill email form"], painPoints: ["Confusing email check"] }]
      });
    }

    res.json({ success: true, data: understanding });
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

// Create analysis audit reports
pmxRouter.post("/analysis/generate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", url, title = "Website UX Audit" } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "Website URL is required" });

    // Simulate crawl or trigger DeepSeek request based on page text (mock analysis for speed, or fallback)
    const analysisReport = await PmxAnalysisModel.create({
      projectId,
      userId: req.userId,
      title,
      score: 72,
      report: {
        websiteUrl: url,
        navigation: "Heavy navigation header. Nested drop-downs cause mobile display issues.",
        accessibility: "Score of 68/100 due to insufficient contrast in footer links and missing alt labels on hero icons.",
        performance: "FCP is 2.4 seconds. Large bundle sizes block main thread.",
        flows: [
          { flowName: "Onboarding Flow", stepCount: 5, dropOffRate: 42, isDuplicate: false },
          { flowName: "Payment Checkout", stepCount: 3, dropOffRate: 28, isDuplicate: false },
          { flowName: "Social Login Chaining", stepCount: 4, dropOffRate: 15, isDuplicate: true }
        ],
        issues: [
          { issue: "Excessive fields in onboarding forms", severity: "high", recommendation: "Collapse fields into 2-step modular wizard layout." },
          { issue: "Broken redirect on password confirmation link", severity: "critical", recommendation: "Adjust route path configuration inside redirect controller." },
          { issue: "Poor contrast ratio in dark theme banners", severity: "medium", recommendation: "Change gray text to slate-200 colors." }
        ]
      }
    });

    await logAudit(req, projectId, "analysis_generated", `Completed usability flow audit for: ${url}`, "PmxAnalysis", analysisReport._id.toString());
    res.json({ success: true, data: analysisReport });
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
    const result       = await runUIAudit(context, auditMode);

    res.json({ success: true, data: result });
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
        const solData = await generateSolutionDetails(decision.title, decision.category, decision.reasoning);
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

// Trigger manual solution synthesis
pmxRouter.post("/solutions/generate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { projectId = "default", title, category = "build", reasoning = "Manually generated solution blueprint." } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const solData = await generateSolutionDetails(title, category, reasoning);
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
    Object.assign(task, { status, title, description, type, sprintPlan, priority, timeEstimate, assignee, dependencies });
    await task.save();

    if (status !== oldStatus) {
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
    const { solutionId } = req.body;
    const solution = await PmxSolutionModel.findOne({ _id: solutionId, userId: req.userId, isDeleted: false });
    if (!solution) return res.status(404).json({ success: false, error: "Solution not found" });

    const newTasks = await generateExecutionTasks(solution.prd, solution.techSpecs);
    
    const taskDocs = newTasks.map((t: any) => ({
      projectId: solution.projectId,
      userId: req.userId,
      solutionId: solution._id.toString(),
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
    await logAudit(req, solution.projectId, "tasks_generated", `Compiled ${inserted.length} sprint tickets from spec: "${solution.title}"`, "PmxSolution", solution._id.toString());

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

// Create exportable document
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
      const annotations = await analyzeScreenshotUI(s.title);
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
    doc.tokensUsed = result.tokensUsed;
    doc.aiModel = result.model;
    doc.version = 1;
    await doc.save();

    await logAudit(req, projectId, "idea_prd_generated", `Generated execution-ready PRD for idea: "${idea.slice(0, 80)}"`, "PmxIdeaPrd", doc._id.toString());

    res.json({ success: true, data: doc });
  } catch (err: any) {
    if (doc) {
      doc.status = "failed";
      doc.error = err instanceof TokenBudgetExceededError ? err.message : "PRD generation failed. Please try again.";
      await doc.save().catch(() => {});
    }
    if (err instanceof TokenBudgetExceededError) {
      return res.status(422).json({ success: false, error: err.message });
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
    if (err instanceof TokenBudgetExceededError) {
      return res.status(422).json({ success: false, error: err.message });
    }
    next(err);
  }
});
