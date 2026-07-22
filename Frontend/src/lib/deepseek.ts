const DEEPSEEK_API_KEY = (import.meta.env.VITE_DEEPSEEK_API_KEY as string) || "";
const DEFAULT_MODEL = (import.meta.env.VITE_DEEPSEEK_MODEL as string) || "deepseek-chat";
const BASE_URL = (import.meta.env.VITE_DEEPSEEK_BASE_URL as string) || "https://api.deepseek.com";

export async function callDeepSeek(system: string, user: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("Missing VITE_DEEPSEEK_API_KEY environment variable.");
  }

  const endpoint = `${BASE_URL}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek error ${response.status}: ${err}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from AI");
  return content;
}

export function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1].trim() : raw.trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]) as T;
    throw new Error("Failed to parse AI JSON response");
  }
}
