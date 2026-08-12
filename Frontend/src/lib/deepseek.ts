const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080/api";

// Proxied through the backend (POST /api/starox1/analyze) rather than
// calling DeepSeek directly — a VITE_-prefixed key would ship in the public
// JS bundle, readable by any visitor via devtools/the built bundle, with no
// rate limiting. The real DEEPSEEK_API_KEY now lives server-side only (see
// backend/src/api/routes/starox1.ts).
export async function callDeepSeek(system: string, user: string): Promise<string> {
  const response = await fetch(`${API_BASE}/starox1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`STAROX-1 analysis failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { content: string };
  if (!data.content) throw new Error("Empty response from AI");
  return data.content;
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
