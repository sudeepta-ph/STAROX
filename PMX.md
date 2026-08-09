# PMX — how it works

PMX is the "AI product manager" workspace: a 9-stage pipeline that turns raw
product sources (a website, a GitHub repo, pasted docs, analytics) into a
structured understanding of the product, then AI-generated evidence,
problems, opportunities, decisions, a PRD/solution, and execution tickets —
plus a separate, newer "Idea → PRD" one-shot pipeline for going from a single
sentence to a full spec, and the STAROX Teams pages (Edits, TeamX) that pick
up where PMX leaves off.

This doc covers the whole stack: data model, backend routes/pipeline, AI
prompts, the frontend that drives it, the Teams marketing/handoff pages, and
the contact-form email pipeline. **For the full REST endpoint reference and
AI token-budget numbers (including real measured usage), see
[`api.md`](api.md) — this doc stays at the architecture/"how it fits
together" level and doesn't duplicate that route-by-route table.**

```
Sources ──▶ Understanding ──▶ Evidence ──▶ Problems ──▶ Opportunities ──▶ Decisions ──▶ Solution (PRD) ──▶ Execution Tasks ──▶ Artifacts
 Stage 1        Stage 2         Stage 3      Stage 4        Stage 5          Stage 6         Stage 7            Stage 8            Stage 9
                                                                                (approve)      (manual/auto)      (manual)      (manual, AI-compiled)
```

Stages 1–6 run automatically as one pipeline call ("Start Session"). Stages
7–9 are triggered separately (approving a decision, generating a solution,
generating tickets, compiling an artifact) — see
[The pipeline](#the-pipeline-rundownstreampipeline) below for the exact
trigger points.

---

## Frontend routes & shell

Everything lives under `/pmx/*`, gated by Clerk auth (`ProtectedRoute` in
`Frontend/src/App.tsx`) and wrapped in a shared layout,
`Frontend/src/components/pmx/PmxLayout.tsx`:

```
/pmx                → redirects to /pmx/overview
/pmx/overview        → PmxOverview.tsx    – landing hero (idea input) OR the returning-workspace
                                             dashboard, depending on whether the active workspace
                                             has been promoted (see "Home" below)
/pmx/sources         → PmxSources.tsx     – add/manage sources, "Start Session"
/pmx/analysis        → PmxAnalysis.tsx    – "AI Experience Intelligence" UI/UX audit
                                             (also embeds "Recent Audits" on its own hero)
/pmx/insights        → PmxInsights.tsx    – decisions + linked evidence/problems/opportunities,
                                             with bulk select/approve/reject on pending items
/pmx/prd             → PmxPrd.tsx         – Idea→PRD viewer, or legacy Solution Studio (with
                                             multi-select "Combine into Unified PRD")
/pmx/execution       → PmxExecution.tsx   – Kanban board over execution tasks, click a card to edit
/pmx/artifacts       → PmxArtifacts.tsx   – AI-compiled strategic documents (see Stage 9)
/pmx/history         → PmxHistory.tsx     – audit timeline + pipeline run history
/pmx/settings        → PmxSettings.tsx    – product profile, workspace switcher, danger zone
/pmx/docs            → PmxDocs.tsx        – static in-app documentation (shortcut list is stale —
                                             see Known inconsistencies)

# legacy redirects (old standalone pages, now folded into Insights/PRD):
/pmx/evidence, /pmx/problems, /pmx/opportunities, /pmx/decisions → /pmx/insights
/pmx/solutions                                                   → /pmx/prd
```

`PmxLayout.tsx` provides:
- **Sidebar** (shared `Sidebar.tsx` component — see below) + a topbar with
  the workspace tab bar and a Cmd/Ctrl+K command palette.
- **Keyboard shortcuts**: `g` then a letter jumps to a section (`o`
  overview, `s` sources, `a` analysis, `i` insights, `p` prd, `x` execution,
  `r` artifacts, `h` history, `,` settings), Linear-style. **`PmxDocs.tsx`
  documents an older, different set of shortcuts — see Known
  inconsistencies.**
- **Data bootstrap**: on mount (and on every `projectId` switch), fetches
  everything (`fetchAll()` + `fetchWorkspaces()` from the store).
- A pulsing "AI is compiling product intelligence..." pill in the topbar
  while a pipeline run is in flight (`loading.pipeline`).

`Sidebar.tsx` is shared with the rest of the app; it switches its whole nav
list based on `location.pathname.startsWith("/pmx")` — PMX gets its own
`pmxNav` (Overview/Sources/Analysis/Insights/PRD/Execution/Artifacts/
History/Settings) plus a "← Back to Home" link back to
`/starox-intelligence`.

### Workspace / tab switching, and "Home"

A **workspace** = a `projectId`. The topbar tab bar (in `PmxLayout.tsx`)
shows a permanent **Home** button plus one tab per *promoted* workspace:

- **`Frontend/src/lib/pmxStore.ts`** (Zustand) — `projectId` is read from
  `localStorage["pmx_active_project_id"]` on load; `openTabIds` (which
  workspaces have a real tab) is read from `localStorage["pmx_open_tabs"]`
  via `loadOpenTabs()`. **`loadOpenTabs()` deliberately does *not* force the
  currently-active `projectId` into the returned list** — an earlier version
  did, which meant reloading the page while on the ephemeral "Home" state
  (see below) made it look like a real, promoted workspace and rendered the
  wrong page (the returning-workspace dashboard instead of the idea hero).
- **`startFreshWorkspace()`** (the topbar "Home" button) mints a brand-new
  `crypto.randomUUID()` `projectId` and switches to it, but — on purpose —
  does **not** add it to `openTabIds`. It only becomes a real, tabbed
  workspace via `promoteToTab()`, called the moment it produces real content
  (an idea gets turned into a PRD, or a source gets connected). Until then,
  `PmxOverview.tsx` computes `isPromotedWorkspace = openTabIds.includes(projectId)`
  and always shows the idea hero when that's `false` — regardless of any
  stale `graduated`/session-exists flags — so Home reliably stays Home.
  The Home button's own styling now also reflects this: it only renders
  "active" when the current `projectId` genuinely isn't one of the open
  tabs (previously it always looked active, which was misleading).
- **`setProjectId(id)`** persists the switch to localStorage, updates state,
  and immediately calls `fetchAll()` to reload every domain array for the
  new workspace.
- Closing a tab (`closeWorkspaceTab`) falls back to another open tab, or —
  if it was the last one — to the same fresh/ephemeral Home state
  `startFreshWorkspace()` produces (not blocked the way it used to be when
  only one tab was open).
- **`Frontend/src/components/pmx/ProductSwitcher.tsx`** is still live — it's
  imported and rendered in `PmxSettings.tsx` (not the main topbar, which
  uses its own tab bar described above), and its `Product` type is imported
  in `PmxLayout.tsx`. Not dead code.
- Backend-side, a "workspace" isn't its own collection — `GET /pmx/projects`
  derives the list from every distinct `PmxUnderstandingModel` document the
  user has (see [Data model](#data-model)).

---

## Data model

All PMX collections live in `backend/src/models/Pmx.ts` and share the same
scoping shape: `{ projectId, userId, isDeleted }`. `userId` is the Clerk
user id; there is no team/org sharing — every document belongs to exactly
one user's one workspace.

| Model | Purpose | Key fields |
|---|---|---|
| `PmxInput` | A source (Stage 1) | `name`, `type` (url/repo/text/csv/report/...), `url?`, `content?`, `status`, `summary`, `history[]` |
| `PmxUnderstanding` | Product profile (Stage 2); doubles as the workspace registry | `productSummary{name,oneLiner,category,stage}`, `businessModel`, `coreFeatures[]`, `targetAudience`, `personas[]`, `customerSegments[]`, `businessGoals[]`, `valueProposition`, `customerJourney[]`, `version`, `history[]` |
| `PmxEvidence` | Signal extracted from sources (Stage 3) | `title`, `description`, `category` (customer/behavior/business/engineering/market), `source`, `quote?`, `confidence` 1-5, `importance` 1-5 |
| `PmxAnalysis` | Stored website/UX audit result | `title`, `score`, `report{navigation,accessibility,performance,flows[],issues[]}` |
| `PmxProblem` | Detected problem (Stage 4) | `title`, `description`, `type` (ux/growth/retention/tech_debt/feature_gap/business_risk), `severity`, `confidence`, `businessImpact`, `userImpact`, `suggestedFix` |
| `PmxOpportunity` | Scored opportunity (Stage 5) | `userImpact/revenueImpact/retentionImpact/strategicAlignment` (1-10), `confidence` (0-100), `effort` (1-10), `iceScore`, `riceScore`, `risk`. Has a `pre("save")` hook that recomputes ICE/RICE. |
| `PmxDecision` | Recommendation (Stage 6) | `title`, `category` (build/improve/optimize/remove/experiment/delay), `reasoning`, `evidence`, `tradeoffs`, `expectedOutcome`, `confidence`, `estimatedROI`, `alternativeSolutions[]`, `status` (pending/approved/rejected/implemented) |
| `PmxSolution` | PRD / solution blueprint (Stage 7, Solution Studio) | `decisionId?`, `title`, `prd`, `epic`, `userStories[]`, `techSpecs`, `apiContracts?`, `databaseChanges?`, `securityNotes?`, `uxImprovements?`, `edgeCases?`, `version`, `history[]`, `sourceInputIds?`, **`combinedFromSolutionIds?`** (set when this doc was produced by merging other blueprints — see [Combine solutions](#stage-7--solutions-prd--solution-studio)) |
| `PmxExecutionTask` | Sprint ticket (Stage 8) | `solutionId?`, `ideaPrdId?`, `type` (frontend/backend/infra/testing/deployment/ux), `priority`, `status` (todo/in_progress/review/done), `timeEstimate`, `assignee?`, `dependencies[]`. `PUT /tasks/:id` only applies fields actually present in the request body (fixed — a status-only Kanban move used to blank out required fields). |
| `PmxArtifact` | Exported document (Stage 9) | `type` (prd/roadmap/technical_spec/sprint_plan), `content`, `format` (markdown/json) |
| `PmxAuditLog` | Activity timeline entry | `action`, `details`, `entityType`, `entityId?`. Never soft-deleted. |
| `PmxSession` | One pipeline run's record | `selectedSourceIds[]`, `resultsSummary{...}`, `aiModel` (reads the real `AI_MODEL` constant, not hardcoded), `durationMs` |
| `PmxIdeaPrd` | One-shot Idea→PRD document | `idea`, `productName`, `status` (generating/completed/failed), `markdown`, `stack{frontend,backend,database,cloud,authProvider,aiProvider,architecture}`, **`pages[{name,purpose}]`**, **`layout`** (navigation/shell description — both used to render the "page structure" suggestion in the PRD workspace's left chat panel), `assumptions[]`, `history[]`, `versions[]`, `version`, `tokensUsed`, `aiModel` |
| `PmxScreenshotProject` | Screenshot-based UX audit workspace | `screenshots[{dataUrl, annotations[]}]` — annotations are sticky-note style feedback with x/y coords, priority, comments |
| `PmxGithubConnection`, `PmxGoogleConnection`, `PmxNotionConnection`, `PmxSlackConnection`, `PmxConnectorCredential` | OAuth / API-key connector state | See [CONNECTORS.md](CONNECTORS.md) |

---

## Backend routes

Everything is mounted at `/api/pmx/*`
(`backend/src/workspaces/pmx/routes/pmx.ts`, ~2000 lines) behind
`pmxRouter.use(authMiddleware)` — every route requires a Clerk bearer token,
and `req.userId` (the Clerk id, set by the middleware) scopes every query.
**Full method/path/body reference for every route: [`api.md`](api.md).**
The summary below is stage-by-stage, with what's changed called out.

**Auth** (`backend/src/middleware/auth.ts`): `authMiddleware` verifies the
`Authorization: Bearer <token>` header via Clerk's `verifyToken`, sets
`req.userId = verifiedToken.sub`, and additionally syncs the Clerk profile
into a local Mongo `User` document on every request (creating one on first
sight, with `role:"user"`, `planTier:"free"`, `creditsRemaining:5`).

### Workspaces
- `GET /projects` — list workspaces (derived from `PmxUnderstanding` docs +
  aggregated `PmxInput` counts per `projectId`).
- `POST /projects` — new workspace: mints `projectId = crypto.randomUUID()`,
  creates a placeholder `PmxUnderstanding` doc.
- `PUT /projects/:projectId/rename`
- `DELETE /projects/:projectId` — cascading soft-delete across every domain
  collection for that project (audit logs are preserved).

### Stage 1 — Sources
- `GET /inputs`, `POST /inputs`, `PUT /inputs/:id`, `DELETE /inputs/:id`
- `POST /inputs/:id/reprocess` — re-summarizes one input, then fires the
  full pipeline for just that input **without awaiting** the response.
- `POST /inputs/process` — **the main trigger.** Body
  `{ projectId, selectedSourceIds }` → runs
  [`runDownstreamPipeline`](#the-pipeline-rundownstreampipeline)
  synchronously and returns the resulting `PmxSession`.
- `GET /history/sessions`, `POST /history/sessions/:id/rerun`

### Stage 2 — Understanding
- `GET /understanding` — returns `null` if none exists; does **not**
  auto-create (an older version did, which silently materialized every
  visited `projectId` as a real workspace on a bare page load).
- `PUT /understanding` — full profile update; archives previous values into
  `history[]` and bumps `version`.

### Stage 3 — Evidence
- `GET /evidence` (search + category filter), `POST /evidence` (manual
  add, tagged `source:"User Uploaded"` so the pipeline never wipes it),
  `DELETE /evidence/:id`.

### Analysis / UX audit (separate from the 9-stage pipeline)
- `GET /analysis`, `POST /analysis/generate` — **this one is still a
  stub**: a hardcoded mock report, not AI-generated.
- `POST /analysis/ui-audit` — real AI call (`services/uiAuditAi.ts`) behind
  `PmxAnalysis.tsx`; accepts a URL or screenshots, but note the model only
  ever receives a **text description** of the screenshots (count + labels),
  never the actual image bytes.
- `POST /analysis/ui-audit/save-to-insights` — converts audit issues into
  `PmxProblem`/`PmxOpportunity`/`PmxDecision` records.
- The `/pmx/analysis` page itself now also has a **"Recent Audits" list**
  on its hero (before any audit is run), reading from the same
  `localStorage`-backed history the split workspace's History tab uses —
  restoring a screenshot-sourced entry (no live URL to fall back on) shows
  a "No preview stored for this audit" placeholder instead of a blank pane.
  "Run AI Experience Intelligence" (on `/pmx/insights` and `/pmx/overview`)
  now **navigates to `/pmx/analysis`** directly instead of opening an inline
  modal — the modal wrapper around the same `UiAuditWorkspace` component was
  removed as redundant.

### Stage 4 — Problems
- `GET /problems`, `POST /problems` (manual add), `DELETE /problems/:id`.

### Stage 5 — Opportunities
- `GET /opportunities`, `POST /opportunities` (create or upsert-by-`id`),
  `DELETE /opportunities/:id`.

### Stage 6 — Decisions
- `GET /decisions`, `DELETE /decisions/:id`.
- `PUT /decisions/:id/status` — approving a decision
  (`status: "approved"`) **synchronously generates a `PmxSolution`** inline
  (calls `generateSolutionDetails`) — this is the automatic bridge from
  Stage 6 into Stage 7.
- `PmxInsights.tsx` now supports **bulk select + approve/reject** on
  pending decisions (checkboxes + a selection bar), calling this same
  endpoint per item — sequentially for approve (each one triggers an AI
  call), in parallel for reject (no AI call, cheap).

### Stage 7 — Solutions (PRD / Solution Studio)
- `GET /solutions`, `GET /solutions/:id`, `PUT /solutions/:id` (edits;
  archives `{prd, techSpecs}` into `history[]`), `POST /solutions/generate`
  (manual, on demand).
- `POST /solutions/:id/refine` — body `{ instruction }`; AI edit-in-place on
  the `prd` field only (Cursor/Canvas-style — preserves unaffected
  sections).
- `POST /solutions/:id/rewind` — body `{ historyId }`.
- **`POST /solutions/combine`** *(new)* — body `{ solutionIds[], title? }`.
  AI-merges 2+ approved blueprints into one new, cohesive `PmxSolution` doc
  (`combinedFromSolutionIds` records the source ids); source blueprints are
  left untouched. Driven from `/pmx/prd`'s tab bar — a "Combine" toggle
  switches the blueprint tabs into multi-select mode, then a button compiles
  the selection. Combined docs get a small violet `GitMerge` badge in the
  tab bar and PRD workspace header so they're visually distinct from
  single-source blueprints.

### Stage 8 — Execution tasks
- `GET /tasks`, `POST /tasks` (manual — now also sends the active
  `projectId`, fixed after tasks were briefly getting created under a
  literal `"default"` project and never showing up on the board),
  `PUT /tasks/:id` (partial update — only fields present in the body are
  applied; **fixed** a bug where a status-only Kanban move used to wipe
  `title`/`description`/`type` since they're required fields), `DELETE
  /tasks/:id`.
- `POST /tasks/generate` — body `{ ideaPrdId }` or `{ solutionId }`; loads
  that doc's PRD/tech specs and calls `generateExecutionTasks`.
- `PmxExecution.tsx`: clicking a task card now opens the same
  create/edit drawer pre-filled (in-place editing, not just delete/move);
  the drawer is rendered via a React portal to `document.body` (matching
  `ContactModal`/`AuthModal`'s existing pattern) since it was getting
  visually clipped by the route's own layout otherwise.

### Stage 9 — Artifacts
- `GET /artifacts`, `GET /artifacts/:id`.
- `POST /artifacts` — manual/direct store; caller supplies `content`
  verbatim, no AI call.
- **`POST /artifacts/compile`** *(new — this is what `PmxArtifacts.tsx`
  actually calls now)* — body `{ projectId, title, type, format? }`. Pulls
  the idea PRD, approved blueprints, evidence, problems, opportunities,
  decisions, connected sources, UI analysis, and sprint tasks for the
  workspace and has the AI synthesize one cohesive document of the
  requested `type`, rather than the old behavior of assembling Markdown
  client-side from whichever fields happened to already be loaded in the
  browser (which silently ignored most of the workspace's actual data).

### Idea → PRD (separate, one-shot pipeline — see below)
- `POST /idea/generate` — body `{ idea, projectId }`; **one** AI call
  (`generateIdeaPrd`), stores the result as a `PmxIdeaPrd` doc, and
  `promoteToTab`s the workspace.
- `GET /idea/prd/latest`, `GET /idea/prd/:id`
- `POST /idea/prd/:id/refine` — body `{ instruction }`; single AI call that
  rewrites only the parts of the doc the instruction touches.
- `POST /idea/prd/:id/rewind` — body `{ version }`.

### Contact / demo-request (not PMX — public marketing site)
- **`POST /api/contact/demo-request`** *(new)* — public, no auth. Body:
  `{ firstName, lastName, email, phone?, website?, problem?, context? }`
  (only name + email are required). Sends two emails via SMTP
  (`backend/src/services/mail.ts`, Nodemailer): an internal notification to
  `CONTACT_TO_EMAIL` and a branded HTML auto-reply (STAROX logo embedded as
  a `cid` attachment) to the submitter. Backs `ContactModal.tsx`'s "Book a
  demo" form, used from `/teams`, `/teams/edits`, `/teams/teamx`. See
  [Teams pages & the contact pipeline](#teams-pages--the-contact-pipeline)
  below.

### Other
- `GET /history` — audit timeline.
- `GET /analytics/overview` — live-computed dashboard counts (no caching).
- `/screenshot-intelligence/*` — screenshot-based UX audit workspace with
  sticky-note annotations (separate from the URL-based `/analysis/ui-audit`
  flow).
- `/github/*`, `/google/*`, `/notion/*`, `/slack/*`, `/connectors/*` — OAuth
  and API-key connector management. See [CONNECTORS.md](CONNECTORS.md) for
  the full connector doc.
- `POST /screenshot` (mounted via `pmxRouter.use(screenshotRouter)`) —
  headless-Chromium (`puppeteer-core`) full-page screenshot of a given URL.

---

## The pipeline — `runDownstreamPipeline`

Defined in `pmx.ts`, invoked by `POST /inputs/process` (and re-invoked by
`.../reprocess` and `.../rerun`). One call runs Stages 1–6 back to back:

1. **Load inputs** — fetch the selected `PmxInput` docs, concatenate their
   `name`/`type`/`content`/`summary` into one text blob per source.
2. **Understanding** — `generateProductUnderstanding(texts)` → upserts the
   single `PmxUnderstanding` doc for the project (archiving the old values
   into `history[]` first).
3. **Evidence** — `generateEvidenceSignals(texts)` → **deletes all
   AI-generated evidence** for the project (`source != "User Uploaded"`
   is preserved), inserts the new set.
4. **Problems** — `detectProductProblems(evidence, texts)` → **deletes all
   problems** for the project (no exemption — manual ones are wiped too on
   every run) and inserts the new set.
5. **Opportunities** — `scoreOpportunities(problems, understanding)` →
   wipes and re-inserts; ICE/RICE scores are computed inline in the route
   handler (since `insertMany` bypasses the model's own `pre("save")` hook).
6. **Decisions** — `generateDecisionRecommendations(problems, opportunities)`
   → wipes and re-inserts.
7. Writes a `PmxSession` record (`resultsSummary` counts — note
   `solutionCount`/`taskCount` are always `0` here, since Stages 7-8 aren't
   part of this cascade) and an audit log entry, returns the session.

**Stage 7 (Solutions)** happens either automatically (approving a decision),
manually (`POST /solutions/generate`), or by **combining** existing ones
(`POST /solutions/combine`). **Stage 8 (Tasks)** only happens manually,
against one specific solution's or idea PRD's content. **Stage 9
(Artifacts)** now has a real AI trigger (`POST /artifacts/compile`) as well
as the older manual store.

### AI provider

`backend/src/services/ai/models.ts` — **DeepSeek**, OpenAI-compatible Chat
Completions API, model **`deepseek-v4-flash`** (`AI_MODEL` — this is the
single source of truth every call site imports; nothing overrides it
per-request or per-environment), temperature `0.3`, 60s timeout, JSON-mode
responses.

`deepseek.ts`'s `callDeepSeek`/`callDeepSeekWithUsage`:
- Retries on 429/502/503 (up to 3 attempts, exponential backoff).
- `parseJsonResponse` includes a structural (brace/string-depth aware)
  recovery parser for JSON truncated mid-array — it salvages complete items
  from an array field cut off by `finish_reason: "length"`. Callers that
  read one specific top-level array field (evidence/problems/opportunities/
  decisions/tasks/issues) now pass that key explicitly
  (`expectedArrayKey`) rather than having the parser guess by substring —
  guessing used to misfire when a stage's *nested* per-item field happened
  to share a name with a different stage's top-level array (e.g. each
  `decisions` item has its own plain-string `evidence` field, which was
  getting matched as if it were the top-level `evidence` array, masking the
  real truncated-decisions recovery entirely).
- `RECOVERY_RETRY_LIMIT = 3` — if a response comes back truncated/malformed
  and nothing usable can be salvaged, the whole stage retries up to 3 times
  before failing.

Every pipeline stage has one prompt builder in
`backend/src/services/ai/prompts.ts` and one thin wrapper in
`backend/src/services/pmxAi.ts` (`generateProductUnderstanding`,
`generateEvidenceSignals`, `detectProductProblems`, `scoreOpportunities`,
`generateDecisionRecommendations`, `generateSolutionDetails`,
`refineSolutionPrd`, `combineSolutions`, `compileArtifact`,
`generateExecutionTasks`). **Per-stage `max_tokens` ceilings and real
measured usage: see [`api.md`](api.md#ai-token-budgets).**

### Idea → PRD pipeline

`backend/src/services/pmxIdeaPrd.ts` — a separate pipeline from the main one
above, and **one-shot**: `generateIdeaPrd(idea)` is a **single** DeepSeek
call (`getIdeaOneShotPrompt`, up to 80,000 completion tokens) that produces
the entire markdown document — Overview, Problem & Solution, Target Users,
Core Features, User Stories, Tech Stack (with a Mermaid diagram), MVP
Scope — plus a suggested tech `stack{}`, and (used by the PRD workspace's
left chat panel) a suggested **`pages[]`** list and **`layout`**
description. *(This replaced an older 5-call discovery → product spec →
engineering spec → delivery plan → coding-prompt chain — if you see
references to that 5-step version elsewhere, they're stale.)*
`refineIdeaPrd(...)` does a single follow-up call (up to 40,000 tokens)
instructed to rewrite only the sections an instruction touches, preserving
the rest verbatim.

This is what powers the "type an idea → get a full PRD" flow on
`/pmx/overview` and the `PrdWorkspace` viewer on `/pmx/prd`. On generation
completing, the PRD workspace's left chat panel gets an assistant message
listing the suggested pages and layout — there's no dedicated tech-stack
picker UI anymore (there used to be a dropdown strip for
frontend/backend/database/cloud/auth/AI/architecture); changing the stack
now happens the same way as any other edit — a plain-language instruction
in the chat ("Use Next.js instead of React"), which goes through the same
refine call and updates `stack{}` as part of its response.

---

## Key frontend components

- **`Frontend/src/lib/pmxStore.ts`** — the single Zustand store every PMX
  page reads from. One `fetch*` action per domain collection, all following
  the same pattern (set `loading.<x>`, call `getPmxHeaders()` for the Clerk
  bearer token, hit `${API_URL}/pmx/...?projectId=...`, `set()` on success).
  `fetchAll()` runs all of them in parallel; `runPipeline()` is what
  "Start Session" calls. Also owns `openTabIds`/tab persistence (see
  [Workspace / tab switching](#workspace--tab-switching-and-home) above).
- **`PmxLayout.tsx`** — shell described above.
- **`PrdWorkspace.tsx`** — renders a `PmxIdeaPrd` or `PmxSolution` doc: left
  pane is a conversation (chat log of refine instructions + assistant
  summaries, plus the page/layout suggestion after a fresh generation),
  right pane splits `markdown`/`prd` on `##` headings and renders via
  `react-markdown` + `remark-gfm` + `rehype-highlight`, routes
  ` ```mermaid ` blocks to `MermaidDiagram`. Toolbar: History (rollback to
  any past version), Sections (Solution Studio only), Export
  (copy/Markdown/JSON/PDF), and **"Go to Build"** — currently a "Coming
  Soon" modal (with a "Check out Teams for now" link to `/teams`) rather
  than a real handoff; a "Generate Tickets" button that used to sit next to
  it was removed as redundant with `/pmx/execution`'s own task-generation
  entry point.
- **`MermaidDiagram.tsx`** — renders a Mermaid string to SVG (dark theme),
  falls back to a code block if it fails to parse.

### Page-by-page

| Page | What it does |
|---|---|
| `PmxOverview.tsx` | Idea hero (default/"Home" state) or the returning-workspace dashboard, gated on `isPromotedWorkspace` (see above). Idea box calls `POST /idea/generate` and routes to `/pmx/prd`; recent sources + quick links. |
| `PmxSources.tsx` | Add/manage sources (URL, file, paste, GitHub repo import), select sources, "Start Session" (→ `runPipeline`) with a confirmation modal. |
| `PmxAnalysis.tsx` | `UiAuditWorkspace` — URL or screenshot UI/UX audit → `POST /analysis/ui-audit`, plus a "Recent Audits" list on the pre-audit hero. History kept client-side in `localStorage`, not the backend. Theme-aware (previously hardcoded dark-only). |
| `PmxInsights.tsx` | Decisions as expandable cards, cross-linking evidence/problems/opportunities; approve/reject a decision, or select multiple pending ones and bulk approve/reject. "Run AI Experience Intelligence" navigates to `/pmx/analysis`. |
| `PmxPrd.tsx` | Shows the Idea→PRD doc via `PrdWorkspace` if one exists; else the tabbed Solution Studio editor, with a "Combine" mode to multi-select blueprints and merge them into one unified PRD. |
| `PmxExecution.tsx` | Kanban board over execution tasks; click a card to edit it in place (not just move/delete). Gated behind a "No sources yet" empty state if the workspace has no connected sources. |
| `PmxArtifacts.tsx` | Compile form posts to `POST /artifacts/compile` (AI-synthesized from the whole workspace) instead of assembling Markdown client-side. Theme-aware (previously hardcoded dark-only). Also gated behind "No sources yet". |
| `PmxHistory.tsx` | Audit-log timeline + pipeline run history (with "rerun"); uses the store's active `projectId`. |
| `PmxSettings.tsx` | Product profile editor, workspace switcher, delete-workspace danger zone. The "unsaved changes" warning used to fire spuriously the moment the form populated from fetched data (a blanket `useEffect` was watching every field, including ones only ever set by that same population effect) — fixed; it now only fires from each field's own `onChange`. |
| `PmxDocs.tsx` | Static in-app explainer of the pipeline and shortcuts — **the shortcut list is stale**, see Known inconsistencies. |

---

## Teams pages & the contact pipeline

Three pages, outside `/pmx/*`, that market/handoff STAROX's execution
capacity — not gated by the PMX sidebar, but each links back into PMX:

```
/teams               → Teams.tsx          – hub: two capability cards (Edits, Team Delivery)
/teams/edits          → TeamsEdits.tsx     – "Edits & Content": AI video/content editing
/teams/teamx          → TeamsTeamX.tsx     – "Team Delivery"/TeamX: the tech team for any idea
```

`/teams/edits` and `/teams/teamx` existed as fully-built components but
**had no registered `<Route>`** in `App.tsx` — following either card from
`/teams` 404'd. Both are now wired in (`/edits` also redirects to
`/teams/edits` instead of just `/teams`).

Both pages, and the shared `Frontend/src/components/WhatWeDo.tsx` feature-row
component they use, were built with a **hardcoded dark-only palette**
(`bg-[#08080d]`, `text-white/NN`, etc.) that never adapted to light mode —
all three were rewritten to the same theme-aware tokens
(`bg-background`/`bg-card`/`bg-muted`/`border-border`/`text-foreground`/
`text-muted-foreground`) used elsewhere in the app. Semantic accent colors
(sky/indigo/emerald/amber tags, macOS traffic-light dots) and the video
player's on-video overlay controls (white text/icons directly on top of
unpredictable footage) were deliberately left as fixed colors — see
[Theming conventions](#theming-conventions) below.

`TeamsEdits.tsx` embeds a real, looping, autoplaying demo video
(`Frontend/public/assets/videos/starox-edits-demo.mp4`, `autoPlay muted
loop playsInline`) in place of the old static gradient mockup; clicking the
frame toggles play/pause.

**"Connected to PMX" sections**: both pages end with a card explaining how
that team's work hands off from PMX — Edits: an approved marketing task's
brief lands ready to edit; TeamX: "PMX plans it, TeamX builds it" — an
approved decision's PRD arrives staffed and ready to sprint — each with a
real `Open PMX` link to `/pmx/overview`, tying the marketing pages back into
the actual product rather than being purely aspirational copy.

**"Book a demo"** (`Frontend/src/components/ContactModal.tsx`, opened from
all three Teams pages) used to be a fake `setTimeout` with no real submit.
It now `POST`s to `/api/contact/demo-request` (see the Contact route above)
— only First name / Last name / Work email are required; Company website
and the "what are you trying to solve" field are optional. On failure it
shows an inline error instead of always pretending to succeed.

---

## Theming conventions

The app uses CSS-variable-backed Tailwind tokens
(`bg-background`/`bg-card`/`bg-muted`, `border-border`, `text-foreground`,
`text-muted-foreground`, `bg-primary`/`text-primary-foreground`) that
resolve differently per light/dark theme. Several PMX/Teams pages were
originally built against a **fixed dark palette** instead
(`bg-zinc-900`/`bg-[#0e0e15]`/`text-white`/`text-white/NN`) and simply never
adapted when the viewer was in light mode. Fixed so far this pass:
`PmxArtifacts.tsx`, `PmxAnalysis.tsx` (`UiAuditWorkspace`), `TeamsEdits.tsx`,
`TeamsTeamX.tsx`, `WhatWeDo.tsx`.

Two categories of color are **intentionally** left as fixed, non-adaptive
values — don't "fix" these if you see them:
- **Fixed brand/action accents** — e.g. the `bg-sky-500 ... text-black`
  buttons used for AI-action CTAs ("Re-audit", "Approve & Add to Insights",
  "Go to Build") — a bright, fixed blue with black text reads correctly in
  both themes by design, and is used consistently as the "this triggers an
  AI action" signal across the app.
- **Overlays on top of unpredictable content** — e.g. video player controls
  drawn directly over live footage, where a fixed white-with-drop-shadow is
  the only choice that stays legible regardless of what's underneath.

If you're auditing another page for the same bug: grep for `bg-\[#`,
`text-white`, `bg-zinc-`, and `border-white/` — any hit outside the two
categories above is almost certainly the same unadapted-dark-palette issue.

---

## Known inconsistencies (as of this writing)

Worth knowing if you're touching this code:

- **Dead pages, still imported**: `PmxEvidence.tsx`, `PmxProblems.tsx`,
  `PmxOpportunities.tsx`, `PmxDecisions.tsx`, `PmxSolutions.tsx` still exist
  on disk and are still imported in `App.tsx`, but no `<Route>` renders any
  of them — their URLs now redirect to `/pmx/insights`/`/pmx/prd` instead.
- **Dead components**: `AskPmx.tsx` and `PmxStatusBar.tsx` are not
  rendered anywhere. `ProductSwitcher.tsx` is in the same state now too
  (superseded by the topbar tab bar — see above).
- **Nav divergence, still present**: `PmxLayout.tsx`'s internal nav array
  points its "Settings" shortcut at `/settings` (the global app settings),
  while `Sidebar.tsx`'s PMX-mode nav points "Settings" at `/pmx/settings` —
  and `Sidebar.tsx`'s own non-PMX `bottomNav` "Settings" is a *third*
  target (`/settings`), different again from its PMX-mode entry.
- **`PmxDocs.tsx`** still lists the pre-consolidation keyboard shortcuts
  (`g e` Evidence, `g p` Problems, `g u` Opportunities, `g d` Decisions,
  `g n` Solutions) — these pages no longer exist as destinations, and the
  list doesn't match the real shortcuts in `PmxLayout.tsx` (e.g. `g i` for
  Insights isn't documented there at all, and `g p` means PRD in
  `PmxLayout.tsx` but "Problems" in `PmxDocs.tsx`).
- **`POST /analysis/generate`** is still a hardcoded mock report, not an AI
  call — don't confuse it with `POST /analysis/ui-audit`, which is real.
- **Contact endpoint has no spam protection** — `POST
  /api/contact/demo-request` is public with only required-field/email-shape
  validation; no rate limiting or captcha yet.
