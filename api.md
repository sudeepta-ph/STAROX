# STAROX PMX — API Reference

Everything below is `/api/pmx/*` unless noted. Full source:
`backend/src/workspaces/pmx/routes/pmx.ts` (~2000 lines) plus the connector
route files in the same folder (`github.ts`, `google.ts`, `notion.ts`,
`slack.ts`, `connectors.ts`, `screenshot.ts`, `cdx.ts`).

For the pipeline architecture, data model, and frontend routes, see
[`PMX.md`](PMX.md) — this doc is the endpoint-by-endpoint reference plus the
AI token-budget breakdown you won't find there.

## Conventions

- **Auth**: every `/api/pmx/*` route sits behind `pmxRouter.use(authMiddleware)`
  (`backend/src/middleware/auth.ts`) — a Clerk bearer token
  (`Authorization: Bearer <token>`) is required. `authMiddleware` verifies it,
  sets `req.userId`, and every query is scoped to that user.
- **Response envelope**: `{ success: true, data: ... }` on success,
  `{ success: false, error: "..." }` on failure (validation errors are
  `400`, not-found is `404`, everything else falls through to the global
  `errorHandler` as `500`).
- **Scoping**: nearly every route takes `projectId` (query param on `GET`,
  body field on `POST`/`PUT`) — PMX workspaces are just a `projectId` string
  shared across every collection, defaulting to `"default"` if omitted.
- **Soft deletes**: `DELETE` routes set `isDeleted: true` rather than
  removing the document — audit logs (`PmxAuditLog`) are never deleted at all.

---

## Workspaces

| Method | Path | Notes |
|---|---|---|
| GET | `/projects` | List workspaces — derived from `PmxUnderstanding` docs, joined with `PmxInput` counts per `projectId`. |
| POST | `/projects` | Create a workspace. Body: `{ name? }`. Auto-numbers "Untitled N" if no name given. |
| PUT | `/projects/:projectId/rename` | Body: `{ name }`. |
| DELETE | `/projects/:projectId` | Cascading soft-delete across every domain collection for that project. Audit logs preserved. |

## Stage 1 — Sources

| Method | Path | Notes |
|---|---|---|
| GET | `/inputs?projectId=` | List sources. |
| POST | `/inputs` | Body: `{ projectId, name, type, url?, content?, metadata? }`. Fires a 1-sentence AI summary (`generateProductUnderstanding`) inline. |
| PUT | `/inputs/:id` | Body: `{ name?, content?, url? }`. |
| DELETE | `/inputs/:id` | Soft delete. |
| POST | `/inputs/:id/reprocess` | Re-summarizes one input, then fires the full pipeline for just that input (not awaited). |
| POST | `/inputs/process` | **Main trigger.** Body: `{ projectId, selectedSourceIds[] }` → runs `runDownstreamPipeline` (Stages 2–6, synchronous) and returns a `PmxSession`. |
| GET | `/history/sessions?projectId=` | List past pipeline runs. |
| POST | `/history/sessions/:id/rerun` | Re-runs `runDownstreamPipeline` with that session's original `selectedSourceIds`. |

## Stage 2 — Understanding

| Method | Path | Notes |
|---|---|---|
| GET | `/understanding?projectId=` | Returns `null` if none exists — does **not** auto-create (a past version did, which silently materialized every visited `projectId` as a real workspace). |
| PUT | `/understanding` | Full profile update. Archives the previous snapshot into `history[]` and bumps `version`. |

## Stage 3 — Evidence

| Method | Path | Notes |
|---|---|---|
| GET | `/evidence?projectId=&category=&search=` | Filterable by category and a regex search across title/description/quote. |
| POST | `/evidence` | Manual add, tagged `source: "User Uploaded"` so pipeline re-runs never wipe it. |
| DELETE | `/evidence/:id` | Soft delete. |

## UI Analysis (separate from the 9-stage pipeline)

| Method | Path | Notes |
|---|---|---|
| GET | `/analysis?projectId=` | List saved `PmxAnalysis` audit reports. |
| POST | `/analysis/generate` | Stub — a hardcoded mock report, not AI-generated. |
| POST | `/analysis/ui-audit` | Real AI call (`services/uiAuditAi.ts`). Body: `{ url? }` or `{ screenshots[], screenshotLabels[] }`. The model only ever sees a *text description* of screenshots (count + labels), never image bytes. |
| POST | `/analysis/ui-audit/save-to-insights` | Body: `{ projectId, url?, result }` — converts audit issues into `PmxProblem`/`PmxOpportunity`/`PmxDecision` records. |

## Stage 4 — Problems

| Method | Path | Notes |
|---|---|---|
| GET | `/problems?projectId=` | |
| POST | `/problems` | Manual add. Body: `{ projectId, title, description, type, evidence[], confidence, severity, businessImpact, userImpact, suggestedFix, affectedFeatures[] }`. |
| DELETE | `/problems/:id` | Soft delete. |

## Stage 5 — Opportunities

| Method | Path | Notes |
|---|---|---|
| GET | `/opportunities?projectId=` | Sorted by `riceScore` descending. |
| POST | `/opportunities` | Create, or update-in-place if `id` is passed in the body. ICE/RICE are computed by the model's `pre("save")` hook. |
| DELETE | `/opportunities/:id` | Soft delete. |

## Stage 6 — Decisions

| Method | Path | Notes |
|---|---|---|
| GET | `/decisions?projectId=&status=` | |
| PUT | `/decisions/:id/status` | Body: `{ status }` (`pending`/`approved`/`rejected`/`implemented`). Approving **synchronously generates a `PmxSolution`** inline (calls `generateSolutionDetails`) — the automatic bridge from Stage 6 into Stage 7. |
| DELETE | `/decisions/:id` | Soft delete. |

## Stage 7 — Solutions (Solution Studio / PRD)

| Method | Path | Notes |
|---|---|---|
| GET | `/solutions?projectId=` | |
| GET | `/solutions/:id` | |
| PUT | `/solutions/:id` | Full field update (edits `prd`, `techSpecs`, etc). Archives the pre-edit `{prd, techSpecs}` into `history[]`. |
| POST | `/solutions/:id/refine` | Body: `{ instruction }` — AI edit-in-place on the `prd` field only (Cursor/Canvas-style, preserves unaffected sections). |
| POST | `/solutions/:id/rewind` | Body: `{ historyId }` — restores `prd`/`techSpecs` from a past version. |
| POST | `/solutions/combine` | Body: `{ solutionIds[], title? }` — AI-merges 2+ blueprints into one new solution document (source blueprints untouched). |
| POST | `/solutions/generate` | Manual, on-demand blueprint generation. Body: `{ projectId, title, category?, reasoning? }`. |

## Idea → PRD (separate, one-shot pipeline)

| Method | Path | Notes |
|---|---|---|
| POST | `/idea/generate` | Body: `{ idea, projectId }` — one AI call produces the full PRD markdown + tech stack + page/layout suggestions. Stored as a `PmxIdeaPrd` doc. |
| GET | `/idea/prd/latest?projectId=` | Most recent completed doc for the workspace. |
| GET | `/idea/prd/:id` | |
| POST | `/idea/prd/:id/refine` | Body: `{ instruction }` — edit-in-place, same contract as solution refine but covers the full 7-section structure. |
| POST | `/idea/prd/:id/rewind` | Body: `{ version }` — restores a past version. |

## Stage 8 — Execution Tasks

| Method | Path | Notes |
|---|---|---|
| GET | `/tasks?projectId=` | |
| POST | `/tasks` | Manual ticket creation. |
| PUT | `/tasks/:id` | Partial update — only fields present in the body are applied (status-only Kanban moves don't clobber title/description). |
| DELETE | `/tasks/:id` | Soft delete. |
| POST | `/tasks/generate` | Body: `{ ideaPrdId }` or `{ solutionId }` — AI call over that doc's PRD/tech specs, inserts the resulting tickets. |

## Stage 9 — Artifacts

| Method | Path | Notes |
|---|---|---|
| GET | `/artifacts?projectId=` | |
| GET | `/artifacts/:id` | |
| POST | `/artifacts/compile` | Body: `{ projectId, title, type, format? }` — **AI-synthesized**: pulls the idea PRD, blueprints, evidence, problems, opportunities, decisions, sources, UI analysis, and tasks for the workspace and compiles one cohesive document of the requested `type` (`prd`/`technical_spec`/`sprint_plan`/`roadmap`). |
| POST | `/artifacts` | Manual/direct store — caller supplies `content` verbatim, no AI call. |

## Other

| Method | Path | Notes |
|---|---|---|
| GET | `/history?projectId=` | Audit timeline (`PmxAuditLog`). |
| GET | `/analytics/overview?projectId=` | Live-computed dashboard counts + 30-day session trend — no caching/precomputed rollups. |
| `/screenshot-intelligence/*` | CRUD + AI annotation | Sticky-note-style visual UX review workspace, separate from `/analysis/ui-audit`. |
| POST | `/screenshot` | Headless-Chromium (`puppeteer-core`) full-page screenshot of a given URL. |
| `/github/*`, `/google/*`, `/notion/*`, `/slack/*`, `/connectors/*` | OAuth / API-key connector management — see [`CONNECTORS.md`](CONNECTORS.md). |

## Contact form (not PMX — public marketing site)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/contact/demo-request` | None (public) | Body: `{ firstName, lastName, email, phone?, website?, problem?, context? }`. Sends an internal notification to `CONTACT_TO_EMAIL` and a branded auto-reply to the submitter via SMTP (`backend/src/services/mail.ts`). Only `firstName`/`lastName`/`email` are required. |

---

## AI token budgets

Every PMX AI call goes through `callDeepSeek`/`callDeepSeekWithUsage`
(`backend/src/services/ai/deepseek.ts`) against **DeepSeek**
(`AI_MODEL = "deepseek-v4-flash"`, `backend/src/services/ai/models.ts`),
`temperature: 0.3`, `60s` timeout, JSON-mode responses.

Each stage has a hardcoded `max_tokens` ceiling — this is the response
budget only (prompt/input tokens aren't capped the same way, though long
inputs like PRD markdown are truncated before being embedded in a prompt).
If DeepSeek hits the ceiling mid-response (`finish_reason: "length"`), a
recovery parser salvages complete items from the truncated JSON rather than
failing outright — see `parseJsonResponse` in `deepseek.ts`.

| Stage | Function | File | `max_tokens` |
|---|---|---|---|
| Understanding | `generateProductUnderstanding` | `pmxAi.ts` | 3,000 |
| Evidence | `generateEvidenceSignals` | `pmxAi.ts` | 4,000 |
| Problems | `detectProductProblems` | `pmxAi.ts` | 4,500 |
| Opportunities | `scoreOpportunities` | `pmxAi.ts` | 3,000 |
| Decisions | `generateDecisionRecommendations` | `pmxAi.ts` | 5,000 |
| Solution details (blueprint) | `generateSolutionDetails` | `pmxAi.ts` | 8,000 |
| Solution refine (edit-in-place) | `refineSolutionPrd` | `pmxAi.ts` | 8,000 |
| Combine solutions | `combineSolutions` | `pmxAi.ts` | 12,000 |
| Compile artifact | `compileArtifact` | `pmxAi.ts` | 10,000 |
| Execution tasks | `generateExecutionTasks` | `pmxAi.ts` | 6,000 |
| UI audit (Analysis / Experience Intelligence) | `runUIAudit` | `uiAuditAi.ts` | 3,000 |
| Screenshot annotations | `analyzeScreenshotUI` | `screenshotAi.ts` | 3,000 |
| Idea → PRD: one-shot generate | `generateIdeaPrd` | `pmxIdeaPrd.ts` | 80,000 |
| Idea → PRD: refine | `refineIdeaPrd` | `pmxIdeaPrd.ts` | 40,000 |
| STAROX-1 (`/cdx1/generate`) | — | `cdx.ts` | 2,000 |
| STAROX-2 (`/cdx2/generate`) | — | `cdx.ts` | 2,000 |
| STAROX-3 (`/cdx3/generate`) | — | `cdx.ts` | 4,000 |

**Retries** (`RECOVERY_RETRY_LIMIT = 3` in `deepseek.ts`): if a response comes
back truncated/malformed and the recovery parser can't salvage anything
usable, the whole stage retries up to 3 times before failing — so a single
run of a stage can cost up to `3 × max_tokens` in a worst case, on top of
`callDeepSeek`'s own separate retry-on-429/502/503 (also up to 3 attempts,
exponential backoff) at the HTTP layer.

**Where tokens actually get tracked**: only the Idea → PRD pipeline persists
`tokensUsed` per document (`PmxIdeaPrd.tokensUsed`, shown in the PRD
workspace toolbar as `vN · N,NNN tokens`). No other stage stores its
token usage anywhere — `usage.completion_tokens` is read for the
truncation-diagnostic log line but discarded, not written to Mongo.

### Real-world usage (measured, not the ceiling)

The table above is the hard cap per call — actual usage runs well under it.
Two measurements to size real capacity against:

- **Idea → PRD, one generation**: averaged **~15,600 completion tokens**
  across 10 real documents in this workspace's database (range 4,200–30,700
  depending on how much the model elaborates), plus a near-constant ~1,000
  prompt tokens (the prompt is just the idea text + a fixed template, so it
  doesn't grow with output). **≈16,600 total tokens/generation** on average.
- **One full "Start Session" pipeline run** (Understanding → Evidence →
  Problems → Opportunities → Decisions, 5 chained AI calls): measured live
  at **18,723 total tokens** for a moderate source-text input. Scales up with
  more/longer connected sources and with how many problems/opportunities get
  detected (each downstream stage embeds the previous stage's JSON output in
  its prompt).
- **Refine calls** (PRD edit-in-place) cost noticeably less than a fresh
  generation — accumulated-usage data across refined documents implies
  roughly a third to a half of a fresh generate's completion tokens per
  refine, since only the touched sections get rewritten.
