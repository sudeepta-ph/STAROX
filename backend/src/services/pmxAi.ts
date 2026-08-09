import {
  callDeepSeek,
  parseJsonResponse,
  withRecoveryRetry,
  getProductUnderstandingPrompt,
  getEvidenceSignalsPrompt,
  getProductProblemsPrompt,
  getOpportunitiesPrompt,
  getDecisionsPrompt,
  getSolutionDetailsPrompt,
  getCombineSolutionsPrompt,
  getCompileArtifactPrompt,
  getExecutionTasksPrompt,
  getSolutionRefinePrompt,
  AI_MODEL,
  AI_MODEL_PRO,
} from "./ai";

// Named per-stage token budgets — see PART D. Every function below takes an
// optional trailing `model` param (defaulting to AI_MODEL, or AI_MODEL_PRO
// for the heavier synthesis/authoring stages), plus userId/projectId so
// callDeepSeek can attribute the PmxTokenUsage row it logs to the right
// user/workspace. All wrapped in withRecoveryRetry (PART D4) so a single
// truncated/malformed response doesn't fail the whole pipeline.
const MAX_TOKENS_UNDERSTANDING = 3000;
const MAX_TOKENS_EVIDENCE = 4000;
const MAX_TOKENS_PROBLEMS = 4500;
const MAX_TOKENS_OPPORTUNITIES = 3000;
const MAX_TOKENS_DECISIONS = 5000;
const MAX_TOKENS_SOLUTION_DETAILS = 8000;
// Combine round-trips every merged field across N blueprints, so its budget
// scales with input count rather than staying fixed like a single blueprint.
const MAX_TOKENS_COMBINE_SOLUTIONS = 12000;
// Compile reads the whole workspace (PRD, evidence, problems, opportunities,
// decisions, sources, analysis, tasks) into one document — comparable in
// scale to combine, sometimes larger.
const MAX_TOKENS_COMPILE_ARTIFACT = 10000;
const MAX_TOKENS_REFINE_SOLUTION = 8000;
const MAX_TOKENS_EXECUTION_TASKS = 6000;

export async function generateProductUnderstanding(inputsText: string[], model: string = AI_MODEL, userId?: string, projectId?: string): Promise<any> {
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getProductUnderstandingPrompt(context);
  return withRecoveryRetry("understanding", MAX_TOKENS_UNDERSTANDING, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_UNDERSTANDING, undefined, undefined, "understanding", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    return parseJsonResponse(responseText, "understanding");
  });
}

export async function generateEvidenceSignals(inputsText: string[], model: string = AI_MODEL, userId?: string, projectId?: string): Promise<any[]> {
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getEvidenceSignalsPrompt(context);
  return withRecoveryRetry("evidence", MAX_TOKENS_EVIDENCE, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_EVIDENCE, undefined, undefined, "evidence", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    const parsed = parseJsonResponse(responseText, "evidence", "evidence");
    return parsed.evidence ?? [];
  });
}

export async function detectProductProblems(evidenceList: any[], inputsText: string[], model: string = AI_MODEL, userId?: string, projectId?: string): Promise<any[]> {
  const evidenceStr = JSON.stringify(evidenceList, null, 2);
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getProductProblemsPrompt(evidenceStr, context);
  return withRecoveryRetry("problems", MAX_TOKENS_PROBLEMS, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_PROBLEMS, undefined, undefined, "problems", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    const parsed = parseJsonResponse(responseText, "problems", "problems");
    return parsed.problems ?? [];
  });
}

export async function scoreOpportunities(problems: any[], understanding: any, model: string = AI_MODEL, userId?: string, projectId?: string): Promise<any[]> {
  const problemsStr = JSON.stringify(problems, null, 2);
  const understandingStr = JSON.stringify(understanding, null, 2);
  const prompt = getOpportunitiesPrompt(problemsStr, understandingStr);
  return withRecoveryRetry("opportunities", MAX_TOKENS_OPPORTUNITIES, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_OPPORTUNITIES, undefined, undefined, "opportunities", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    const parsed = parseJsonResponse(responseText, "opportunities", "opportunities");
    return parsed.opportunities ?? [];
  });
}

export async function generateDecisionRecommendations(problems: any[], opportunities: any[], model: string = AI_MODEL_PRO, userId?: string, projectId?: string): Promise<any[]> {
  const problemsStr = JSON.stringify(problems, null, 2);
  const opportunitiesStr = JSON.stringify(opportunities, null, 2);
  const prompt = getDecisionsPrompt(problemsStr, opportunitiesStr);
  return withRecoveryRetry("decisions", MAX_TOKENS_DECISIONS, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_DECISIONS, undefined, undefined, "decisions", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    const parsed = parseJsonResponse(responseText, "decisions", "decisions");
    return parsed.decisions ?? [];
  });
}

export async function generateSolutionDetails(decisionTitle: string, decisionCategory: string, reasoning: string, model: string = AI_MODEL_PRO, userId?: string, projectId?: string): Promise<any> {
  const prompt = getSolutionDetailsPrompt(decisionTitle, decisionCategory, reasoning);
  return withRecoveryRetry(
    "solutionDetails",
    MAX_TOKENS_SOLUTION_DETAILS,
    async (reportCompletionTokens) => {
      const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_SOLUTION_DETAILS, undefined, undefined, "solutionDetails", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
      return parseJsonResponse(responseText, "solutionDetails");
    },
    (parsed) => !!parsed?.prd && String(parsed.prd).trim().length > 40
  );
}

export async function combineSolutions(blueprints: Array<{ title: string; prd: string; techSpecs: string }>, model: string = AI_MODEL_PRO, userId?: string, projectId?: string): Promise<any> {
  const prompt = getCombineSolutionsPrompt(blueprints);
  return withRecoveryRetry(
    "combineSolutions",
    MAX_TOKENS_COMBINE_SOLUTIONS,
    async (reportCompletionTokens) => {
      const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_COMBINE_SOLUTIONS, undefined, undefined, "combineSolutions", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
      return parseJsonResponse(responseText, "combineSolutions");
    },
    (parsed) => !!parsed?.prd && String(parsed.prd).trim().length > 40
  );
}

export async function compileArtifact(docType: string, title: string, context: string, model: string = AI_MODEL_PRO, userId?: string, projectId?: string): Promise<string> {
  const prompt = getCompileArtifactPrompt(docType, title, context);
  const parsed = await withRecoveryRetry(
    "compileArtifact",
    MAX_TOKENS_COMPILE_ARTIFACT,
    async (reportCompletionTokens) => {
      const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_COMPILE_ARTIFACT, undefined, undefined, "compileArtifact", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
      return parseJsonResponse(responseText, "compileArtifact");
    },
    (parsed) => !!parsed?.content && String(parsed.content).trim().length > 40
  );
  return parsed.content;
}

export async function generateExecutionTasks(prd: string, techSpecs: string, model: string = AI_MODEL, userId?: string, projectId?: string): Promise<any[]> {
  const prompt = getExecutionTasksPrompt(prd, techSpecs);
  return withRecoveryRetry("executionTasks", MAX_TOKENS_EXECUTION_TASKS, async (reportCompletionTokens) => {
    const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_EXECUTION_TASKS, undefined, undefined, "executionTasks", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
    const parsed = parseJsonResponse(responseText, "executionTasks", "tasks");
    return parsed.tasks ?? [];
  });
}

export interface SolutionPrdRefineResult {
  markdown: string;
  changeSummary: string;
}

export async function refineSolutionPrd(currentMarkdown: string, instruction: string, model: string = AI_MODEL_PRO, userId?: string, projectId?: string): Promise<SolutionPrdRefineResult> {
  const prompt = getSolutionRefinePrompt(currentMarkdown, instruction);
  const parsed = await withRecoveryRetry(
    "refineSolution",
    MAX_TOKENS_REFINE_SOLUTION,
    async (reportCompletionTokens) => {
      const responseText = await callDeepSeek(prompt, model, MAX_TOKENS_REFINE_SOLUTION, undefined, undefined, "refineSolution", (usage) => reportCompletionTokens(usage.completion_tokens), userId, projectId);
      return parseJsonResponse(responseText, "refineSolution");
    },
    (parsed) => !!parsed?.markdown && String(parsed.markdown).trim().length > 0
  );
  return {
    markdown: parsed.markdown,
    changeSummary: parsed.changeSummary || "Updated the PRD.",
  };
}
