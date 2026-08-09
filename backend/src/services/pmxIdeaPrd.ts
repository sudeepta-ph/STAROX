/**
 * Development PRD pipeline. One DeepSeek call produces the entire markdown
 * document (headings, tables, checklists, code fences, mermaid diagrams) in
 * a single pass, under an 80,000-token completion cap. Refinement (the AI
 * prompt bar / theme controls) is a separate single call that edits the
 * existing markdown in place.
 */
import {
  callDeepSeekWithUsage,
  parseJsonResponse,
  withRecoveryRetry,
  getIdeaOneShotPrompt,
  getIdeaRefinePrompt,
  AI_MODEL_PRO,
} from "./ai";
import type { IPmxIdeaPrdStack } from "../models/Pmx";

const MAX_TOKENS_GENERATE = 80_000;
// Refine must round-trip the FULL document (see getIdeaRefinePrompt), so its
// budget needs the same order of magnitude as generation, not a fraction of
// it — 15k was truncating on any PRD past a couple sections.
const MAX_TOKENS_REFINE = 40_000;

// Whether a parsed response actually has a usable PRD body — guards against
// parseJsonResponse's generic fallback shapes (which return schema-shaped
// but essentially empty stand-ins rather than throwing) silently writing
// blank/near-blank content over a PRD.
function hasUsableMarkdown(parsed: any): boolean {
  return !!parsed?.markdown && String(parsed.markdown).trim().length > 0;
}

export interface IdeaPrdResult {
  markdown: string;
  stack: IPmxIdeaPrdStack;
  assumptions: string[];
  productName: string;
  pages: Array<{ name: string; purpose: string }>;
  layout: string;
  tokensUsed: number;
  model: string;
}

export async function generateIdeaPrd(idea: string, userId?: string, projectId?: string): Promise<IdeaPrdResult> {
  const prompt = getIdeaOneShotPrompt(idea);
  let tokensUsed = 0;

  const parsed = await withRecoveryRetry(
    "ideaPrdGenerate",
    MAX_TOKENS_GENERATE,
    async (reportCompletionTokens) => {
      const { content, usage, finishReason } = await callDeepSeekWithUsage(prompt, AI_MODEL_PRO, MAX_TOKENS_GENERATE, undefined, "ideaPrdGenerate", userId, projectId);
      reportCompletionTokens(usage.completion_tokens || 0);
      tokensUsed = usage.completion_tokens || 0;
      const result = parseJsonResponse(content, "ideaPrdGenerate");
      if (!hasUsableMarkdown(result)) {
        console.error(
          `[PMX Idea→PRD] step="generate" recovered no usable "markdown". ` +
          `finish_reason=${finishReason ?? "n/a"}, completion_tokens=${usage.completion_tokens ?? "n/a"}, ` +
          `max_tokens=${MAX_TOKENS_GENERATE}, raw_response_length=${content.length} chars.`
        );
      }
      return result;
    },
    hasUsableMarkdown
  );

  return {
    markdown: parsed.markdown,
    stack: parsed.stack || {},
    assumptions: parsed.assumptions || [],
    productName: parsed.productName || "Untitled Product",
    pages: parsed.pages || [],
    layout: parsed.layout || "",
    tokensUsed,
    model: AI_MODEL_PRO,
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
  userId?: string,
  projectId?: string
): Promise<IdeaPrdRefineResult> {
  const prompt = getIdeaRefinePrompt(currentMarkdown, stack as Record<string, string | undefined>, instruction);
  let tokensUsed = 0;

  const parsed = await withRecoveryRetry(
    "ideaPrdRefine",
    MAX_TOKENS_REFINE,
    async (reportCompletionTokens) => {
      const { content, usage } = await callDeepSeekWithUsage(prompt, AI_MODEL_PRO, MAX_TOKENS_REFINE, undefined, "ideaPrdRefine", userId, projectId);
      reportCompletionTokens(usage.completion_tokens || 0);
      tokensUsed = usage.completion_tokens || 0;
      return parseJsonResponse(content, "ideaPrdRefine");
    },
    hasUsableMarkdown
  );

  return {
    markdown: parsed.markdown,
    stack: parsed.stack || stack,
    changeSummary: parsed.changeSummary || "Updated the PRD.",
    tokensUsed,
  };
}
