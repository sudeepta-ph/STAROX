import {
  callDeepSeek,
  parseJsonResponse,
  getProductUnderstandingPrompt,
  getEvidenceSignalsPrompt,
  getProductProblemsPrompt,
  getOpportunitiesPrompt,
  getDecisionsPrompt,
  getSolutionDetailsPrompt,
  getExecutionTasksPrompt,
} from "./ai";

export async function generateProductUnderstanding(
  inputsText: string[],
  model?: string
): Promise<any> {
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getProductUnderstandingPrompt(context);
  const responseText = await callDeepSeek(prompt, model);
  return parseJsonResponse(responseText);
}

export async function generateEvidenceSignals(
  inputsText: string[],
  model?: string
): Promise<any[]> {
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getEvidenceSignalsPrompt(context);
  const responseText = await callDeepSeek(prompt, model);
  const parsed = parseJsonResponse(responseText);
  return parsed.evidence ?? [];
}

export async function detectProductProblems(
  evidenceList: any[],
  inputsText: string[],
  model?: string
): Promise<any[]> {
  const evidenceStr = JSON.stringify(evidenceList, null, 2);
  const context = inputsText.join("\n\n---\n\n");
  const prompt = getProductProblemsPrompt(evidenceStr, context);
  const responseText = await callDeepSeek(prompt, model);
  const parsed = parseJsonResponse(responseText);
  return parsed.problems ?? [];
}

export async function scoreOpportunities(
  problems: any[],
  understanding: any,
  model?: string
): Promise<any[]> {
  const problemsStr = JSON.stringify(problems, null, 2);
  const understandingStr = JSON.stringify(understanding, null, 2);
  const prompt = getOpportunitiesPrompt(problemsStr, understandingStr);
  const responseText = await callDeepSeek(prompt, model);
  const parsed = parseJsonResponse(responseText);
  return parsed.opportunities ?? [];
}

export async function generateDecisionRecommendations(
  problems: any[],
  opportunities: any[],
  model?: string
): Promise<any[]> {
  const problemsStr = JSON.stringify(problems, null, 2);
  const opportunitiesStr = JSON.stringify(opportunities, null, 2);
  const prompt = getDecisionsPrompt(problemsStr, opportunitiesStr);
  const responseText = await callDeepSeek(prompt, model);
  const parsed = parseJsonResponse(responseText);
  return parsed.decisions ?? [];
}

export async function generateSolutionDetails(
  decisionTitle: string,
  decisionCategory: string,
  reasoning: string,
  model?: string
): Promise<any> {
  const prompt = getSolutionDetailsPrompt(decisionTitle, decisionCategory, reasoning);
  const responseText = await callDeepSeek(prompt, model, 4000);
  return parseJsonResponse(responseText);
}

export async function generateExecutionTasks(
  prd: string,
  techSpecs: string,
  model?: string
): Promise<any[]> {
  const prompt = getExecutionTasksPrompt(prd, techSpecs);
  const responseText = await callDeepSeek(prompt, model, 4000);
  const parsed = parseJsonResponse(responseText);
  return parsed.tasks ?? [];
}
