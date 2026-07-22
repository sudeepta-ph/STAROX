export const AI_CONFIG = {
  BASE_URL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  DEFAULT_MODEL: process.env.DEEPSEEK_MODEL || "deepseek-chat", // standard DeepSeek V3 completions model
  TEMPERATURE: 0.3,
  TIMEOUT: 60000, // 60 seconds request timeout threshold
};
