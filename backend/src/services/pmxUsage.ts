import { PmxUnderstandingModel, PmxUserUsageModel, IPmxUserUsage } from "../models/Pmx";

// Per-user, combined input+output allowance. Not a per-workspace pool — see
// PmxUserUsageModel's unique {userId, projectId} index, which structurally
// enforces "per user per workspace", not "per workspace".
export const USER_TOKEN_LIMIT = 100_000;

// Workspace-level free trial length. Anchored to the workspace's own
// createdAt (see getWorkspacePlanStatus) rather than a separately stored
// "trial started" timestamp, so old workspaces can never be granted a
// fresh window just by being read after this shipped.
export const TRIAL_DAYS = 7;

export class TokenLimitExceededError extends Error {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly totalTokens: number,
    public readonly limit: number
  ) {
    super(`Token allowance exceeded for userId="${userId}" projectId="${projectId}": ${totalTokens}/${limit} used.`);
    this.name = "TokenLimitExceededError";
  }
}

export class TrialExpiredError extends Error {
  constructor(public readonly projectId: string, public readonly trialEndsAt: Date) {
    super(`Workspace trial expired for projectId="${projectId}" (ended ${trialEndsAt.toISOString()}).`);
    this.name = "TrialExpiredError";
  }
}

// Conservative pre-call estimate used only to reserve headroom before the
// real request goes out — never persisted as if it were real usage. The
// completion side is already capped by maxTokens (the actual request body's
// max_tokens); the prompt side isn't capped before the call, so it's
// estimated from its length using the standard ~4-chars-per-token rule of
// thumb. Reconciled down to the provider's real usage the moment the
// response comes back (see reconcileUsage).
export function estimateTokens(prompt: string, systemPrompt: string, maxTokens: number): number {
  return Math.ceil((prompt.length + systemPrompt.length) / 4) + maxTokens;
}

// Atomically reserves `estimatedTokens` of headroom for (userId, projectId),
// or throws TokenLimitExceededError if that would push totalTokens+reserved
// past the limit. The second step below is a single-document
// findOneAndUpdate with a filter condition on the document's own current
// field values — MongoDB serializes concurrent writers to the same
// document, so two simultaneous reservations against a user close to their
// limit cannot both pass the $expr check (no multi-document transaction
// needed for this guarantee).
export async function reserveUsage(userId: string, projectId: string, estimatedTokens: number): Promise<void> {
  await PmxUserUsageModel.updateOne(
    { userId, projectId },
    { $setOnInsert: { userId, projectId, inputTokens: 0, outputTokens: 0, totalTokens: 0, reservedTokens: 0, limit: USER_TOKEN_LIMIT } },
    { upsert: true }
  );

  const updated = await PmxUserUsageModel.findOneAndUpdate(
    {
      userId,
      projectId,
      $expr: { $lte: [{ $add: ["$totalTokens", "$reservedTokens", estimatedTokens] }, "$limit"] },
    },
    { $inc: { reservedTokens: estimatedTokens } },
    { returnDocument: "after" }
  );

  if (!updated) {
    const current = await PmxUserUsageModel.findOne({ userId, projectId });
    throw new TokenLimitExceededError(userId, projectId, current?.totalTokens ?? 0, current?.limit ?? USER_TOKEN_LIMIT);
  }
}

// Called once a call succeeds — releases the reservation and books the
// provider's real usage as committed. Best-effort (never throws), matching
// deepseek.ts's own logTokenUsage swallow-on-failure convention right next
// to which this is called.
export async function reconcileUsage(
  userId: string,
  projectId: string,
  estimatedTokens: number,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): Promise<void> {
  try {
    await PmxUserUsageModel.updateOne(
      { userId, projectId },
      {
        $inc: {
          reservedTokens: -estimatedTokens,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
      }
    );
  } catch (err: any) {
    console.warn(`[PmxUsage] Failed to reconcile usage for userId="${userId}" projectId="${projectId}": ${err?.message ?? err}`);
  }
}

// Called when a reserved call ultimately fails (all retries exhausted, or a
// non-retriable error) — gives the reservation back since no real usage was
// incurred. Best-effort, same convention as reconcileUsage.
export async function releaseReservation(userId: string, projectId: string, estimatedTokens: number): Promise<void> {
  try {
    await PmxUserUsageModel.updateOne({ userId, projectId }, { $inc: { reservedTokens: -estimatedTokens } });
  } catch (err: any) {
    console.warn(`[PmxUsage] Failed to release reservation for userId="${userId}" projectId="${projectId}": ${err?.message ?? err}`);
  }
}

export interface UserUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limit: number;
  remaining: number;
}

export async function getUserUsage(userId: string, projectId: string): Promise<UserUsageSummary> {
  const row = await PmxUserUsageModel.findOne({ userId, projectId });
  const inputTokens = row?.inputTokens ?? 0;
  const outputTokens = row?.outputTokens ?? 0;
  const totalTokens = row?.totalTokens ?? 0;
  const limit = row?.limit ?? USER_TOKEN_LIMIT;
  return { inputTokens, outputTokens, totalTokens, limit, remaining: Math.max(0, limit - totalTokens) };
}

export interface WorkspacePlanStatus {
  plan: "trial" | "active";
  trialStartedAt: Date;
  trialEndsAt: Date;
  daysRemaining: number;
  status: "trial_active" | "trial_expired" | "active";
  upgradeRequestedAt: Date | null;
}

// Trial start/end are derived from the workspace's own createdAt, not a
// separately stored field — see the model comment on PmxUnderstandingModel.
export async function getWorkspacePlanStatus(projectId: string): Promise<WorkspacePlanStatus | null> {
  const doc = await PmxUnderstandingModel.findOne({ projectId, isDeleted: false }).sort({ createdAt: 1 });
  if (!doc) return null;

  const trialStartedAt = doc.createdAt;
  const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const plan = doc.plan ?? "trial";
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  const status: WorkspacePlanStatus["status"] =
    plan === "active" ? "active" : now > trialEndsAt ? "trial_expired" : "trial_active";

  return {
    plan,
    trialStartedAt,
    trialEndsAt,
    daysRemaining,
    status,
    upgradeRequestedAt: doc.upgradeRequestedAt ?? null,
  };
}

// Gates AI generation only (see deepseek.ts) — never gates read access to
// existing PRDs/executions/artifacts/sources/history/tasks/members/settings,
// which stay fully accessible per the spec's "do not destroy or hide data"
// requirement. A workspace with no persisted understanding doc yet is still
// bootstrapping (mirrors requireWorkspaceAccess's own "no row yet, allow"
// case) — nothing to have expired.
export async function assertWorkspaceTrialActive(projectId: string): Promise<void> {
  const status = await getWorkspacePlanStatus(projectId);
  if (!status) return;
  if (status.status === "trial_expired") {
    throw new TrialExpiredError(projectId, status.trialEndsAt);
  }
}

export interface MemberUsageRow {
  userId: string;
  name: string;
  role: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limit: number;
  remaining: number;
  status: "active" | "limit_reached";
}

// Given an already-fetched member list (caller already enforces owner/admin
// gating before calling this — see GET /billing/summary), returns one usage
// row per member. Members with no PmxUserUsage doc yet simply read as
// 0/limit — no need to backfill rows for members who've never triggered a
// billable call.
export async function getWorkspaceMemberUsage(
  projectId: string,
  members: Array<{ userId: string; role: string; name: string }>
): Promise<MemberUsageRow[]> {
  if (members.length === 0) return [];
  const rows = await PmxUserUsageModel.find({ projectId, userId: { $in: members.map(m => m.userId) } });
  const byUserId = new Map<string, IPmxUserUsage>(rows.map(r => [r.userId, r]));

  return members.map(m => {
    const row = byUserId.get(m.userId);
    const inputTokens = row?.inputTokens ?? 0;
    const outputTokens = row?.outputTokens ?? 0;
    const totalTokens = row?.totalTokens ?? 0;
    const limit = row?.limit ?? USER_TOKEN_LIMIT;
    const remaining = Math.max(0, limit - totalTokens);
    return {
      userId: m.userId,
      name: m.name,
      role: m.role,
      inputTokens,
      outputTokens,
      totalTokens,
      limit,
      remaining,
      status: remaining > 0 ? "active" : "limit_reached",
    };
  });
}
