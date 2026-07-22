import { env } from "../../config/env";
import { AI_CONFIG } from "./models";

// Helper to safely parse JSON response from LLM, removing any markdown fences.
// Recovers keys gracefully if the JSON response was truncated due to token limit.
export function parseJsonResponse(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn("[DeepSeek AI] JSON parsing failed, attempting dynamic recovery:", err.message);

    // Helper to parse a single flat object string using robust key-value extraction regex
    const parseFlatObject = (objText: string) => {
      const obj: any = {};
      const matches = objText.matchAll(/"([^"]+)"\s*:\s*(?:\s*"([\s\S]*?)"(?=\s*,?\s*"\w+"\s*:|\s*\})|\s*"([\s\S]*?)"|(-?\d+(?:\.\d+)?)|(true|false)|\[([^\]]*)\])/g);
      for (const m of matches) {
        const key = m[1];
        const strVal = m[2] !== undefined ? m[2] : m[3];
        const numVal = m[4];
        const boolVal = m[5];
        const arrVal = m[6];

        if (strVal !== undefined) {
          obj[key] = strVal.replace(/\\"/g, '"').replace(/\\n/g, '\n');
        } else if (numVal !== undefined) {
          obj[key] = Number(numVal);
        } else if (boolVal !== undefined) {
          obj[key] = boolVal === "true";
        } else if (arrVal !== undefined) {
          obj[key] = arrVal
            .split(",")
            .map(s => s.trim().replace(/^"|"$/g, ""))
            .filter(s => s !== "");
        }
      }
      return obj;
    };

    // 1. Check if the output is an array of objects (evidence, problems, opportunities, decisions, tasks)
    const arrayKeys = ["evidence", "problems", "opportunities", "decisions", "tasks"];
    for (const key of arrayKeys) {
      if (cleaned.includes(`"${key}"`)) {
        const list: any[] = [];
        // Match all curly brace blocks { ... } inside the array
        const blocks = cleaned.match(/\{[\s\S]*?\}/g) || [];
        for (const block of blocks) {
          const parsedObj = parseFlatObject(block);
          if (Object.keys(parsedObj).length > 0) {
            list.push(parsedObj);
          }
        }
        return { [key]: list };
      }
    }

    // 2. Check if it's the Product Understanding block
    if (cleaned.includes("productSummary") || cleaned.includes("businessModel")) {
      const result: any = {
        productSummary: {
          name: "STAROX Product",
          oneLiner: "Elevator pitch.",
          category: "SaaS",
          stage: "idea"
        },
        businessModel: "",
        coreFeatures: [],
        targetAudience: "",
        personas: [],
        customerSegments: [],
        businessGoals: [],
        valueProposition: "",
        customerJourney: []
      };

      // Extract simple keys
      const extractStringVal = (k: string) => {
        const regex = new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`);
        const m = cleaned.match(regex);
        return m ? m[1] : "";
      };

      result.businessModel = extractStringVal("businessModel");
      result.targetAudience = extractStringVal("targetAudience");
      result.valueProposition = extractStringVal("valueProposition");

      // Extract nested productSummary strings
      const nameRegex = /"name"\s*:\s*"([^"]*)"/;
      const pitchRegex = /"oneLiner"\s*:\s*"([^"]*)"/;
      const catRegex = /"category"\s*:\s*"([^"]*)"/;
      const stageRegex = /"stage"\s*:\s*"([^"]*)"/;

      const nameMatch = cleaned.match(nameRegex);
      if (nameMatch) result.productSummary.name = nameMatch[1];
      const pitchMatch = cleaned.match(pitchRegex);
      if (pitchMatch) result.productSummary.oneLiner = pitchMatch[1];
      const catMatch = cleaned.match(catRegex);
      if (catMatch) result.productSummary.category = catMatch[1];
      const stageMatch = cleaned.match(stageRegex);
      if (stageMatch) result.productSummary.stage = stageMatch[1];

      // Extract features and goals arrays of objects
      const blocks = cleaned.match(/\{[\s\S]*?\}/g) || [];
      for (const block of blocks) {
        const parsed = parseFlatObject(block);
        if (parsed.name && parsed.description) {
          result.coreFeatures.push(parsed);
        } else if (parsed.goal && parsed.successMetric) {
          result.businessGoals.push(parsed);
        } else if (parsed.painPoints || parsed.goals) {
          result.personas.push(parsed);
        }
      }

      return result;
    }

    // 3. Fallback to Solution Blueprint block structure
    const result: any = {};
    const extractString = (key: string) => {
      const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,?\\s*"\\w+"\\s*:)`);
      let match = cleaned.match(regex);
      if (!match) {
        const endRegex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`);
        match = cleaned.match(endRegex);
      }
      return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "";
    };

    result.title = extractString("title") || "AI Solution Blueprint";
    result.prd = extractString("prd") || "PRD specifications compiled.";
    result.epic = extractString("epic") || "High-level sprint milestones.";
    result.techSpecs = extractString("techSpecs") || "Technical specification architectures.";
    result.apiContracts = extractString("apiContracts") || "API Schema mappings.";
    result.databaseChanges = extractString("databaseChanges") || "Database collection updates.";
    result.securityNotes = extractString("securityNotes") || "Sanitization and authentication notes.";
    result.uxImprovements = extractString("uxImprovements") || "Visual wireframe layouts.";
    result.edgeCases = extractString("edgeCases") || "Network timeouts and error handlers.";
    result.userStories = [];

    try {
      const storiesMatch = cleaned.match(/"userStories"\s*:\s*\[([\s\S]*?)\]/);
      if (storiesMatch) {
        const storiesText = storiesMatch[1];
        const storyBlocks = storiesText.split(/\{\s*"story"/);
        for (const block of storyBlocks) {
          if (!block.trim()) continue;
          const story = block.match(/:\s*"([^"]*)"/)?.[1] || "";
          const acceptance = block.match(/"acceptanceCriteria"\s*:\s*"([^"]*)"/)?.[1] || "";
          if (story) {
            result.userStories.push({ story, acceptanceCriteria: acceptance });
          }
        }
      }
    } catch (e) {}

    if (result.userStories.length === 0) {
      result.userStories = [{ story: "User epic story definition.", acceptanceCriteria: "Acceptance checking notes." }];
    }

    return result;
  }
}

export async function callDeepSeek(
  prompt: string,
  model?: string,
  maxTokens = 3000,
  signal?: AbortSignal,
  systemPrompt = "You are STAROX PMX, a world-class AI Principal Product Manager. Respond ONLY with valid JSON. Do not write introductory text, markdown code blocks (unless specified), or explanations outside of the JSON structure."
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable. Check backend/.env");
  }

  const selectedModel = model || AI_CONFIG.DEFAULT_MODEL;
  const endpoint = `${AI_CONFIG.BASE_URL}/chat/completions`;

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            { role: "user", content: prompt },
          ],
          temperature: AI_CONFIG.TEMPERATURE,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limits (429) or transient gateway overloads (502, 503) with backoff retry
        if ((response.status === 429 || response.status === 502 || response.status === 503) && attempt < maxRetries) {
          console.warn(`[DeepSeek AI] Status ${response.status} on attempt ${attempt}. Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        if (response.status === 401) {
          throw new Error("Invalid DEEPSEEK_API_KEY configured.");
        }

        throw new Error(`DeepSeek API failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.choices[0]?.message?.content ?? "{}";
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError" && !signal) {
        console.warn(`[DeepSeek AI] Timeout reached on attempt ${attempt}.`);
        if (attempt < maxRetries) continue;
        throw new Error("DeepSeek request timed out.");
      }

      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`[DeepSeek AI] Error on attempt ${attempt}: ${err.message}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  throw lastError || new Error("All DeepSeek retries failed");
}
