import { env } from "../../config/env";
import { AI_CONFIG, AI_MODEL } from "./models";
import { PmxTokenUsageModel } from "../../models/Pmx";
import { estimateCost } from "./pricing";
import { assertWorkspaceTrialActive, estimateTokens, reserveUsage, reconcileUsage, releaseReservation } from "../pmxUsage";

// Observability-only guardrail: when a user's same-day AI spend crosses this
// threshold, logTokenUsage below logs a console.warn so it shows up in log
// monitoring. It never throws, blocks, or otherwise changes call behavior —
// there is no enforcement attached to this constant.
const SOFT_DAILY_CAP_USD = 2.0;

// Enforcement guardrail: once a user's same-day AI spend reaches this
// amount, callDeepSeekWithUsage refuses to make the API call at all and
// throws UsageCapExceededError instead (see pmx.ts for the 402 this becomes
// at the route layer).
export const HARD_DAILY_CAP_USD = 5.0;

// Thrown by callDeepSeekWithUsage when a caller is over HARD_DAILY_CAP_USD
// for the day, instead of making the API call. Routes catch this by type
// (see pmx.ts's error-handling middleware) to return a 402 with cap details
// rather than a generic 500.
export class UsageCapExceededError extends Error {
  constructor(public readonly userId: string, public readonly todayCostUsd: number, public readonly cap: number) {
    super(`Daily AI usage cap exceeded for userId="${userId}": $${todayCostUsd.toFixed(4)} spent today (cap $${cap.toFixed(2)}).`);
    this.name = "UsageCapExceededError";
  }
}

// Recovers as many complete objects as possible from a JSON array field that
// was cut off mid-stream (finish_reason: "length"). Walks forward from the
// array's opening "[" tracking string/escape state and brace depth — so it
// isn't fooled by a "}" or "]" character embedded inside a string value —
// and remembers the end of the last object that closed cleanly at depth 0.
// Everything after that point (an in-progress, never-closed object) is
// discarded. Returns null if not even one complete object could be found.
function recoverTruncatedArray(cleaned: string, key: string): any[] | null {
  const openMatch = cleaned.match(new RegExp(`"${key}"\\s*:\\s*\\[`));
  if (!openMatch) return null;
  const arrStart = openMatch.index! + openMatch[0].length;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastCompleteEnd = -1;

  for (let i = arrStart; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") { depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0) lastCompleteEnd = i + 1;
      continue;
    }
    if (ch === "]" && depth === 0) break; // array closed cleanly — nothing to recover
  }

  if (lastCompleteEnd === -1) return null;

  try {
    const items = JSON.parse(`[${cleaned.slice(arrStart, lastCompleteEnd)}]`);
    return Array.isArray(items) && items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

// Helper to safely parse JSON response from LLM, removing any markdown fences.
// Recovers keys gracefully if the JSON response was truncated due to token limit.
// `stage` is a caller-supplied label (e.g. "evidence", "productSpec") used
// purely for diagnostics — it ties this warning to the finish_reason/
// completion_tokens diagnostic logged in callDeepSeek/callDeepSeekWithUsage
// for the same call, so a truncation can be traced end-to-end in the logs.
// `expectedArrayKey` names the actual top-level array field the caller is
// going to read (e.g. "decisions") — see block 1 below for why this matters.
export function parseJsonResponse(text: string, stage: string = "unknown", expectedArrayKey?: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn(`[DeepSeek AI] JSON parsing failed, attempting dynamic recovery: ${err.message} (stage="${stage}")`);

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

    // 1. Truncated JSON array of objects (evidence, problems, opportunities,
    // decisions, tasks, UI audit issues). Recover structurally (brace/
    // string-depth aware, see recoverTruncatedArray) rather than a flat
    // block regex, so an embedded "}" inside a description/quote string
    // can't fool the scan into splitting or truncating an object early.
    //
    // Candidate keys are matched by their *array-opening* pattern
    // (`"key": [`), not a plain substring — several of these schemas nest a
    // same-named field inside their items (e.g. each "decisions" item has
    // its own plain-string "evidence" field). A substring match on
    // "evidence" would fire for a truncated decisions response too, fail to
    // recover anything from that non-array field, and throw before the real
    // "decisions" array below it was ever tried. When the caller already
    // knows which key it expects (expectedArrayKey), skip the guesswork
    // entirely and go straight to it.
    const arrayKeys = expectedArrayKey
      ? [expectedArrayKey]
      : ["evidence", "problems", "opportunities", "decisions", "tasks", "issues"];
    let matchedKey: string | null = null;
    for (const key of arrayKeys) {
      if (!new RegExp(`"${key}"\\s*:\\s*\\[`).test(cleaned)) continue;
      matchedKey = matchedKey || key;
      const recovered = recoverTruncatedArray(cleaned, key);
      if (recovered) {
        // We only get here after JSON.parse already failed, so this array
        // really was cut off mid-stream — there was at least one further
        // (now-discarded, in-progress) item beyond what's recovered here.
        console.warn(`[DeepSeek AI] Partial recovery for "${key}" (stage="${stage}"): salvaged ${recovered.length} complete item(s) from a truncated response; the trailing in-progress item was discarded.`);
        return { [key]: recovered };
      }
    }
    if (matchedKey) {
      // Not even one complete object could be salvaged for the array key we
      // were actually looking for — a genuine total failure, not "the model
      // returned zero items" (that case would have parsed cleanly above and
      // never reached here). Throw loudly instead of returning
      // { [key]: [] }, which callers like generateEvidenceSignals/
      // detectProductProblems would otherwise silently treat as "nothing
      // found" via `parsed.x ?? []` — and in the pipeline, that means
      // deleting existing records and replacing them with nothing, with no
      // error surfaced.
      throw new Error(`Failed to recover any "${matchedKey}" items from a truncated or malformed AI response (stage="${stage}"). Please try again.`);
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

      // If literally nothing could be salvaged, this stub would otherwise
      // silently overwrite the workspace's real Product Understanding with
      // near-empty placeholder text and never surface as an error — throw
      // loudly instead, same contract as the array-shaped stages above.
      const recoveredAnything =
        !!result.businessModel || !!result.targetAudience || !!result.valueProposition ||
        nameMatch !== null ||
        result.coreFeatures.length > 0 || result.businessGoals.length > 0 || result.personas.length > 0;
      if (!recoveredAnything) {
        throw new Error(`Failed to recover any Product Understanding content from a truncated or malformed AI response (stage="${stage}"). Please try again.`);
      }

      return result;
    }

    // 3. Idea→PRD generation/refine shape ({ markdown, stack, ... }) — the
    // `markdown` value is by far the largest field and the most likely place
    // truncation actually happens, so recover it with a truncation-tolerant
    // scan rather than a regex that requires a closing quote to exist.
    if (cleaned.includes('"markdown"')) {
      const mdKeyMatch = cleaned.match(/"markdown"\s*:\s*"/);
      if (mdKeyMatch) {
        const startIdx = mdKeyMatch.index! + mdKeyMatch[0].length;

        // Primary pass: escape-aware char-by-char scan. Correctly turns
        // \n / \t into real newlines/tabs, and stops at the first
        // *unescaped* closing quote.
        const scanEscaped = (fromIndex: number): string => {
          let out = "";
          for (let i = fromIndex; i < cleaned.length; i++) {
            const ch = cleaned[i];
            if (ch === "\\") {
              const next = cleaned[i + 1];
              if (next === "n") { out += "\n"; i++; }
              else if (next === "t") { out += "\t"; i++; }
              else if (next === '"' || next === "\\" || next === "/") { out += next; i++; }
              else { out += ch; }
              continue;
            }
            if (ch === '"') break; // unescaped closing quote — end of string
            out += ch;
          }
          return out;
        };

        // Fallback pass: anchor on the field's real closing boundary — the
        // last `"` right before the object's closing `}`, or right before a
        // known field that follows markdown in these schemas (stack /
        // changeSummary / productName) — instead of trusting the first
        // unescaped quote encountered. This guards against an observed
        // DeepSeek slip: an accidental/duplicated quote very early in a long
        // markdown body (e.g. right after the opening quote, or around a
        // quoted term like "P0" in a table) fools the scan above into
        // "closing" the string almost immediately, discarding an otherwise
        // intact field and forcing a fall-through to a totally wrong shape.
        const scanByBoundary = (fromIndex: number): string => {
          const rest = cleaned.slice(fromIndex);
          const closer =
            rest.match(/"\s*\}\s*$/) ||
            rest.match(/"\s*,\s*"(?:stack|changeSummary|productName)"\s*:/);
          const raw = closer ? rest.slice(0, closer.index) : rest;
          return raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
        };

        const scanned = scanEscaped(startIdx);
        // A real markdown section is never this short — treat anything under
        // that as a sign the escape-aware scan bailed out early, and prefer
        // whichever pass recovered more.
        const markdown = scanned.trim().length >= 40
          ? scanned
          : (() => {
              const alt = scanByBoundary(startIdx);
              return alt.trim().length > scanned.trim().length ? alt : scanned;
            })();

        if (markdown.trim()) {
          const result: any = { markdown };

          const extractSimple = (key: string) => {
            const m = cleaned.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
            return m ? m[1] : undefined;
          };
          result.productName = extractSimple("productName");
          result.changeSummary = extractSimple("changeSummary");

          const stackMatch = cleaned.match(/"stack"\s*:\s*\{([^}]*)\}/);
          if (stackMatch) result.stack = parseFlatObject(`{${stackMatch[1]}}`);

          const assumptionsMatch = cleaned.match(/"assumptions"\s*:\s*\[([^\]]*)\]/);
          if (assumptionsMatch) {
            result.assumptions = assumptionsMatch[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
          }

          return result;
        }
      }
    }

    // 4. Fallback to Solution Blueprint block structure
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

// Retries a single "call the model, then parse its response" attempt when
// that attempt produced no usable content — distinct from callDeepSeek's own
// 429/502/503 HTTP-level retries, which happen *inside* one attempt here.
// `attemptFn` should call the model and parse the result; it may throw
// (e.g. parseJsonResponse's "recovered nothing" errors) or return a value
// `isUsable` rejects (e.g. an empty/undefined markdown field). Either case
// is retried up to `retryLimit` times before the last failure is thrown —
// used by every PMX AI stage so a single truncated response doesn't fail
// the whole pipeline run.
//
// `attemptFn` receives a `reportCompletionTokens` callback and must call it
// with that attempt's actual `usage.completion_tokens` once the call
// returns (see callDeepSeek's onUsage param / callDeepSeekWithUsage's
// `usage` field) — this is how the token budget below is tracked without
// changing what `attemptFn` returns.
const RECOVERY_RETRY_LIMIT = 3;

// A stage's real per-attempt token cost varies (truncation, retries) but
// each attempt is still capped at `maxTokens`, so 3 full retries could
// previously cost up to 3x max_tokens in completion tokens alone. Capping
// the *cumulative actually-spent* completion tokens at 2x max_tokens instead
// stops the loop before a 3rd expensive attempt, while still allowing two
// full-cost attempts when needed.
const TOKEN_BUDGET_MULTIPLIER = 2;

export async function withRecoveryRetry<T>(
  stage: string,
  maxTokens: number,
  attemptFn: (reportCompletionTokens: (tokens: number) => void) => Promise<T>,
  isUsable: (result: T) => boolean = () => true,
  retryLimit: number = RECOVERY_RETRY_LIMIT
): Promise<T> {
  const tokenBudget = TOKEN_BUDGET_MULTIPLIER * maxTokens;

  let lastError: Error | null = null;
  let lastResult: T | undefined;
  let cumulativeCompletionTokens = 0;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    let attemptTokens = 0;
    try {
      const result = await attemptFn((tokens) => { attemptTokens = tokens; });
      cumulativeCompletionTokens += attemptTokens;
      lastResult = result;
      if (isUsable(result)) return result;
      lastError = new Error(`The AI response for stage "${stage}" was cut off before any usable content could be recovered. Please try again.`);
    } catch (err: any) {
      cumulativeCompletionTokens += attemptTokens;
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (cumulativeCompletionTokens > tokenBudget) {
      console.warn(
        `[DeepSeek AI] stage="${stage}" stopping retries early: cumulative completion_tokens=${cumulativeCompletionTokens} ` +
        `exceeded the ${TOKEN_BUDGET_MULTIPLIER}x max_tokens budget (${tokenBudget}) after attempt ${attempt}/${retryLimit}.`
      );
      // Prefer a salvaged partial over a hard failure — but only ever a
      // parsed result from an actual attempt, never something isUsable
      // already accepted (that would have returned above).
      if (lastResult !== undefined) return lastResult;
      throw lastError || new Error(`Stage "${stage}" exhausted its ${tokenBudget}-token retry budget before producing any usable content.`);
    }

    if (attempt < retryLimit) {
      console.warn(`[DeepSeek AI] stage="${stage}" attempt ${attempt}/${retryLimit} produced no usable content (${lastError.message}); retrying...`);
    }
  }

  // Fail loudly instead of silently writing blank/undefined content once
  // every retry has produced nothing usable.
  throw lastError || new Error(`Stage "${stage}" failed after ${retryLimit} attempts.`);
}

export interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  // Present on reasoning-model responses. This is a breakdown *within*
  // completion_tokens/total_tokens, not additional tokens on top of them —
  // confirmed against a live DeepSeek API response (completion_tokens=9 for
  // a 2-token visible reply, with completion_tokens_details.reasoning_tokens
  // =7 accounting for the rest). DeepSeek bills these as ordinary output
  // tokens; they're already inside completion_tokens, so estimateCost()
  // below doesn't need to add them separately.
  completion_tokens_details?: { reasoning_tokens?: number };
}

// Logs the diagnostic that distinguishes "truncated because max_tokens was
// too low" from any other malformed-JSON cause. finish_reason === "length"
// means DeepSeek stopped writing mid-response purely because it hit the
// completion cap — not because the model chose to stop. Deliberately logged
// here (right where the raw response lands), independent of whether
// JSON.parse later succeeds, so a truncation is visible even in the rare
// case it happens to land on a JSON-parseable boundary.
function logIfTruncated(result: any, stage: string, maxTokens: number) {
  if (result?.choices?.[0]?.finish_reason !== "length") return;
  const completionTokens = result.usage?.completion_tokens ?? "n/a";
  const totalTokens = result.usage?.total_tokens ?? "n/a";
  console.warn(
    `[DeepSeek AI] stage="${stage}" response truncated (finish_reason="length"): ` +
    `max_tokens=${maxTokens}, completion_tokens=${completionTokens}, total_tokens=${totalTokens}. ` +
    `Any downstream JSON parse failure for this call is almost certainly caused by this truncation.`
  );
}

// Sums costUsd logged for this userId since local midnight — shared by the
// soft-cap warning below and the hard-cap check in callDeepSeekWithUsage so
// both read the exact same "today" definition.
async function getTodaySpendUsd(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [totals] = await PmxTokenUsageModel.aggregate([
    { $match: { userId, createdAt: { $gte: todayStart } } },
    { $group: { _id: null, totalCostUsd: { $sum: "$costUsd" } } },
  ]);
  return totals?.totalCostUsd ?? 0;
}

// Best-effort usage logging — never allowed to affect the caller. Errors are
// swallowed (and just warned) rather than thrown, and callers fire this
// without awaiting it so a slow/failed write can't add latency to the
// actual AI call.
async function logTokenUsage(usage: DeepSeekUsage, stage: string, userId: string, projectId: string, aiModel: string) {
  try {
    // completion_tokens/total_tokens already include reasoning tokens (see
    // DeepSeekUsage's doc comment) — estimateCost is deliberately called
    // with completion_tokens as-is, not completion_tokens + reasoningTokens,
    // since that would double-bill the reasoning portion.
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
    await PmxTokenUsageModel.create({
      userId,
      projectId,
      stage,
      aiModel,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      reasoningTokens,
      totalTokens: usage.total_tokens,
      costUsd: estimateCost(usage.prompt_tokens, usage.completion_tokens, aiModel),
    });

    const todayCostUsd = await getTodaySpendUsd(userId);
    if (todayCostUsd > SOFT_DAILY_CAP_USD) {
      console.warn(
        `[DeepSeek AI] Soft daily cost cap exceeded: userId="${userId}" has spent $${todayCostUsd.toFixed(4)} today ` +
        `(cap $${SOFT_DAILY_CAP_USD.toFixed(2)}), pushed over by stage="${stage}".`
      );
    }
  } catch (err: any) {
    console.warn(`[DeepSeek AI] Failed to log token usage (stage="${stage}"): ${err?.message ?? err}`);
  }
}

// Same call/retry contract as callDeepSeek, but also returns token usage so
// callers can enforce a hard budget across a multi-call pipeline (see
// services/pmxIdeaPrd.ts). Kept separate from callDeepSeek so none of the
// existing call sites need to change their destructuring.
export async function callDeepSeekWithUsage(
  prompt: string,
  model?: string,
  maxTokens = 3000,
  systemPrompt = "You are STAROX PMX, a world-class AI Principal Product Manager. Respond ONLY with valid JSON. Do not write introductory text, markdown code blocks (unless specified), or explanations outside of the JSON structure.",
  stage: string = "unknown",
  userId: string = "unknown",
  projectId: string = "unknown"
): Promise<{ content: string; usage: DeepSeekUsage; finishReason: string | undefined }> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable. Check backend/.env");
  }

  // Hard cap check, before any API call is made. A blocked attempt never
  // reaches logTokenUsage, so no PmxTokenUsage row is written for it.
  const todaySpendUsd = await getTodaySpendUsd(userId);
  if (todaySpendUsd >= HARD_DAILY_CAP_USD) {
    throw new UsageCapExceededError(userId, todaySpendUsd, HARD_DAILY_CAP_USD);
  }

  // Workspace trial + per-user token allowance — the single choke point
  // every AI call passes through, so this covers every PMX generation/
  // analysis stage uniformly (see services/pmxUsage.ts for the atomic
  // reserve/reconcile mechanics).
  await assertWorkspaceTrialActive(projectId);
  const estimatedTokens = estimateTokens(prompt, systemPrompt, maxTokens);
  await reserveUsage(userId, projectId, estimatedTokens);

  const selectedModel = model || AI_CONFIG.DEFAULT_MODEL;
  const endpoint = `${AI_CONFIG.BASE_URL}/chat/completions`;

  const maxRetries = 3;
  let lastError: any = null;

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: AI_CONFIG.TEMPERATURE,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 429 || response.status === 502 || response.status === 503) && attempt < maxRetries) {
            console.warn(`[DeepSeek AI] Status ${response.status} on attempt ${attempt}. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          if (response.status === 401) throw new Error("Invalid DEEPSEEK_API_KEY configured.");
          throw new Error(`DeepSeek API failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        logIfTruncated(result, stage, maxTokens);
        const usage: DeepSeekUsage = result.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        void logTokenUsage(usage, stage, userId, projectId, selectedModel);
        void reconcileUsage(userId, projectId, estimatedTokens, usage);
        return {
          content: result.choices[0]?.message?.content ?? "{}",
          usage,
          finishReason: result.choices?.[0]?.finish_reason,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
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
  } catch (err) {
    await releaseReservation(userId, projectId, estimatedTokens);
    throw err;
  }
}

export async function callDeepSeek(
  prompt: string,
  model?: string,
  maxTokens = 3000,
  signal?: AbortSignal,
  systemPrompt = "You are STAROX PMX, a world-class AI Principal Product Manager. Respond ONLY with valid JSON. Do not write introductory text, markdown code blocks (unless specified), or explanations outside of the JSON structure.",
  stage: string = "unknown",
  onUsage?: (usage: DeepSeekUsage) => void,
  userId: string = "unknown",
  projectId: string = "unknown"
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable. Check backend/.env");
  }

  // Workspace trial + per-user token allowance — see callDeepSeekWithUsage
  // above for the full rationale; this is the same choke point, applied to
  // the (much more heavily used) fire-and-forget usage variant.
  await assertWorkspaceTrialActive(projectId);
  const estimatedTokens = estimateTokens(prompt, systemPrompt, maxTokens);
  await reserveUsage(userId, projectId, estimatedTokens);

  const selectedModel = model || AI_CONFIG.DEFAULT_MODEL;
  const endpoint = `${AI_CONFIG.BASE_URL}/chat/completions`;

  const maxRetries = 3;
  let lastError: any = null;

  try {
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
        logIfTruncated(result, stage, maxTokens);
        if (onUsage && result.usage) onUsage(result.usage);
        if (result.usage) {
          void logTokenUsage(result.usage, stage, userId, projectId, selectedModel);
          void reconcileUsage(userId, projectId, estimatedTokens, result.usage);
        } else {
          void releaseReservation(userId, projectId, estimatedTokens);
        }
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
  } catch (err) {
    await releaseReservation(userId, projectId, estimatedTokens);
    throw err;
  }
}
