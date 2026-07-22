export function resolveProvider(model: string): "openai" | "anthropic" | "google" {
  const key = model.toLowerCase();
  if (key.includes("gpt")) return "openai";
  if (key.includes("claude")) return "anthropic";
  if (key.includes("gemini")) return "google";
  return "openai";
}
