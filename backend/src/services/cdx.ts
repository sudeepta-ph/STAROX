import type { CdxType, CdxResponse } from "../types";
import {
  callDeepSeek,
  parseJsonResponse,
  getCdx1Prompt,
  getCdx2Prompt,
  getCdx3Prompt,
  AI_MODEL
} from "./ai";

// ── Main generation function ───────────────────────────────────────────────────
// `model` is still accepted on the request for backwards compatibility with
// the existing route contract, but it is intentionally never forwarded to
// the AI call — every PMX/CDX call is pinned to AI_MODEL (see PART C:
// single-model enforcement). Callers cannot override this from the client.
export async function generateCdxOutput(
  type: CdxType,
  _requestedModel: string,
  userPrompt: string = "Analyze this product",
  userId?: string,
  projectId?: string
): Promise<CdxResponse> {
  const prompt =
    type === "cdx1"
      ? getCdx1Prompt(userPrompt)
      : type === "cdx3"
      ? getCdx3Prompt(userPrompt)
      : getCdx2Prompt(userPrompt);

  // cdx3 generates much more content — use higher token limit
  const maxTokens = type === "cdx3" ? 4000 : 2000;

  const systemPrompt = "You are a structured AI agent. Always respond with valid JSON only. No markdown, no explanation outside the JSON object.";
  const responseText = await callDeepSeek(prompt, AI_MODEL, maxTokens, undefined, systemPrompt, type, undefined, userId, projectId);
  const parsed = parseJsonResponse(responseText, type);

  return {
    sections: [JSON.stringify(parsed)],
    model: AI_MODEL,
    provider: "deepseek"
  };
}
