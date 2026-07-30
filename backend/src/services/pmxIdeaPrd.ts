/**
 * Development PRD pipeline. Five sequential DeepSeek calls each produce one
 * markdown slice of the final document, feeding forward only compact JSON
 * (never accumulated prose) so the whole pipeline — input + output, across
 * every call — stays well under an 80,000 token hard budget. Refinement
 * (the AI prompt bar / theme controls) is a single call that edits the
 * existing markdown in place.
 */
import {
  callDeepSeekWithUsage,
  parseJsonResponse,
  getIdeaDiscoveryPrompt,
  getIdeaProductSpecPrompt,
  getIdeaEngineeringSpecPrompt,
  getIdeaDeliveryPrompt,
  getIdeaCodingPromptPrompt,
  getIdeaRefinePrompt,
} from "./ai";
import type { IPmxIdeaPrdStack } from "../models/Pmx";

const TOKEN_BUDGET = 80_000;

export class TokenBudgetExceededError extends Error {
  constructor(usedSoFar: number, step: string) {
    super(`Idea→PRD pipeline exceeded its ${TOKEN_BUDGET}-token budget at step "${step}" (used ${usedSoFar} tokens so far).`);
    this.name = "TokenBudgetExceededError";
  }
}

async function callStep(prompt: string, maxTokens: number, step: string, tokenTracker: { used: number }, model?: string) {
  if (tokenTracker.used >= TOKEN_BUDGET) throw new TokenBudgetExceededError(tokenTracker.used, step);
  const { content, usage } = await callDeepSeekWithUsage(prompt, model, maxTokens);
  tokenTracker.used += usage.total_tokens || 0;
  if (tokenTracker.used > TOKEN_BUDGET) throw new TokenBudgetExceededError(tokenTracker.used, step);
  return parseJsonResponse(content);
}

export interface IdeaPrdResult {
  markdown: string;
  stack: IPmxIdeaPrdStack;
  assumptions: string[];
  productName: string;
  tokensUsed: number;
  model: string;
}

export async function generateIdeaPrd(idea: string, model?: string): Promise<IdeaPrdResult> {
  const tracker = { used: 0 };

  // 1. Discovery — expand the idea, mark assumptions, pick a stack, and
  // write the first 4 sections (Executive Summary → Users & Use Cases).
  const discovery = await callStep(getIdeaDiscoveryPrompt(idea), 2000, "discovery", tracker, model);

  // 2. Product spec — Functional Requirements, Technical Architecture,
  // Frontend/Backend Specification. Fed only the compact discovery slice.
  const productSpecContext = JSON.stringify({
    productName: discovery.productName,
    stack: discovery.stack,
    problemAndUsers: discovery.markdown,
  });
  const productSpec = await callStep(getIdeaProductSpecPrompt(productSpecContext), 4000, "productSpec", tracker, model);

  // 3. Data & API — Database Schema, API Design, Auth, Integrations, NFRs.
  const engineeringContext = JSON.stringify({
    productName: discovery.productName,
    stack: discovery.stack,
    productSpec: productSpec.markdown,
  });
  const engineeringSpec = await callStep(getIdeaEngineeringSpecPrompt(engineeringContext), 4000, "engineeringSpec", tracker, model);

  // 4. Delivery — Engineering Tasks, Roadmap, Future Enhancements.
  const deliveryContext = JSON.stringify({
    productSpec: productSpec.markdown,
    engineeringSpec: engineeringSpec.markdown,
  });
  const delivery = await callStep(getIdeaDeliveryPrompt(deliveryContext), 2500, "delivery", tracker, model);

  // 5. Master AI Coding Prompt — needs the full picture, still passed as
  // compact markdown rather than re-expanded prose.
  const fullContext = [discovery.markdown, productSpec.markdown, engineeringSpec.markdown, delivery.markdown].join("\n\n");
  const codingPrompt = await callStep(getIdeaCodingPromptPrompt(fullContext), 3000, "aiCodingPrompt", tracker, model);

  const markdown = [
    discovery.markdown,
    productSpec.markdown,
    engineeringSpec.markdown,
    delivery.markdown,
    codingPrompt.markdown,
  ].join("\n\n");

  return {
    markdown,
    stack: discovery.stack || {},
    assumptions: discovery.assumptions || [],
    productName: discovery.productName || "Untitled Product",
    tokensUsed: tracker.used,
    model: model || "deepseek-chat",
  };
}

export interface IdeaPrdRefineResult {
  markdown: string;
  stack: IPmxIdeaPrdStack;
  changeSummary: string;
  tokensUsed: number;
}

export async function refineIdeaPrd(
  currentMarkdown: string,
  stack: IPmxIdeaPrdStack,
  instruction: string,
  model?: string
): Promise<IdeaPrdRefineResult> {
  const tracker = { used: 0 };
  const result = await callStep(getIdeaRefinePrompt(currentMarkdown, stack as Record<string, string | undefined>, instruction), 8000, "refine", tracker, model);
  return {
    markdown: result.markdown,
    stack: result.stack || stack,
    changeSummary: result.changeSummary || "Updated the PRD.",
    tokensUsed: tracker.used,
  };
}
