import { AI_MODEL, AI_MODEL_PRO } from "./models";

// DeepSeek has not published pricing for AI_MODEL ("deepseek-v4-flash")
// specifically, so this uses DeepSeek's published deepseek-chat (DeepSeek-V3)
// standard/cache-miss list price as the stand-in rate: $0.27 / 1M input
// tokens, $1.10 / 1M output tokens. Update this once deepseek-v4-flash has
// its own published pricing.
//
// AI_MODEL_PRO ("deepseek-v4-pro") is priced at DeepSeek's published ~3.1x
// multiplier over the Flash rate above: $0.837 / 1M input, $3.41 / 1M output.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  [AI_MODEL]: { input: 0.27, output: 1.1 },
  [AI_MODEL_PRO]: { input: 0.837, output: 3.41 },
};

export function estimateCost(promptTokens: number, completionTokens: number, model: string = AI_MODEL): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) {
    // No silent fallback — that's exactly how AI_MODEL_PRO ended up
    // under-priced at the Flash rate for however long it took to notice.
    // Any new model must get an explicit rate above before it can be
    // costed; logTokenUsage's catch block logs this loudly and drops just
    // that one usage row rather than the whole call recording a fabricated
    // price.
    throw new Error(
      `[pricing] No rate defined for model "${model}" in PRICING_PER_MILLION_TOKENS. ` +
      `Add its real $/1M input and output rate to backend/src/services/ai/pricing.ts before costing calls to it.`
    );
  }
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}
