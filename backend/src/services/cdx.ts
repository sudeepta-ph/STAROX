import type { CdxType, CdxResponse } from "../types";
import {
  callDeepSeek,
  parseJsonResponse,
  getCdx1Prompt,
  getCdx2Prompt,
  getCdx3Prompt,
  AI_CONFIG
} from "./ai";

// ── Main generation function ───────────────────────────────────────────────────
export async function generateCdxOutput(
  type: CdxType,
  model: string,
  userPrompt: string = "Analyze this product"
): Promise<CdxResponse> {
  const prompt =
    type === "cdx1"
      ? getCdx1Prompt(userPrompt)
      : type === "cdx3"
      ? getCdx3Prompt(userPrompt)
      : getCdx2Prompt(userPrompt);

  const selectedModel = model || AI_CONFIG.DEFAULT_MODEL;

  // cdx3 generates much more content — use higher token limit
  const maxTokens = type === "cdx3" ? 4000 : 2000;

  const systemPrompt = "You are a structured AI agent. Always respond with valid JSON only. No markdown, no explanation outside the JSON object.";
  const responseText = await callDeepSeek(prompt, selectedModel, maxTokens, undefined, systemPrompt);
  const parsed = parseJsonResponse(responseText);

  return {
    sections: [JSON.stringify(parsed)],
    model: selectedModel,
    provider: "deepseek"
  };
}
