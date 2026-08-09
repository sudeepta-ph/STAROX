// Single source of truth for which DeepSeek model PMX is allowed to call.
// Every AI call site imports AI_MODEL directly — there is no per-request or
// per-environment override, so the model actually billed/logged can never
// drift from what's configured here.
export const AI_MODEL = "deepseek-v4-flash";
export const AI_MODEL_PRO = "deepseek-v4-pro";

export const AI_CONFIG = {
  BASE_URL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  DEFAULT_MODEL: AI_MODEL,
  TEMPERATURE: 0.3,
  TIMEOUT: 60000, // 60 seconds request timeout threshold
};
