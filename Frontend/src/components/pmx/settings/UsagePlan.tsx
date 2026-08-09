import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { usePmxStore, type PmxWorkspaceRole } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { SettingsSection, SettingsGroupHeading, SettingsCard } from "@/components/pmx/settings/fields";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

// ── Upgrade CTA — same button everywhere it appears (plan card, and both
// blocked states) so the workspace's "how do I get more" answer is always
// the same one action, honestly wired to a real (non-payment) endpoint.
function UpgradeButton({ canRequest, requested, onClick, busy }: {
  canRequest: boolean; requested: boolean; onClick: () => void; busy: boolean;
}) {
  if (!canRequest) {
    return (
      <p className="text-xs text-muted-foreground">Ask a workspace owner or admin to upgrade this workspace.</p>
    );
  }
  if (requested) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
        Upgrade requested — we'll follow up.
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      Upgrade workspace
    </button>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="h-1.5 flex-1" />
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-9 text-right">{pct}%</span>
    </div>
  );
}

export function UsagePlanSection({ viewerRole }: { viewerRole: PmxWorkspaceRole | null }) {
  const { billingSummary, billingSummaryLoading, fetchBillingSummary, requestUpgrade, projectId } = usePmxStore();
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchBillingSummary(); }, [projectId]);

  const canRequestUpgrade = viewerRole === "owner" || viewerRole === "admin";

  const handleUpgrade = async () => {
    setUpgradeBusy(true);
    const ok = await requestUpgrade();
    setUpgradeBusy(false);
    if (!ok) toast({ variant: "destructive", title: "Couldn't send the upgrade request" });
  };

  if (billingSummaryLoading && !billingSummary) {
    return (
      <SettingsSection title="Usage & Plan" description="Manage workspace access, trial status, and usage.">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </SettingsSection>
    );
  }

  if (!billingSummary) {
    return (
      <SettingsSection title="Usage & Plan" description="Manage workspace access, trial status, and usage.">
        <p className="text-sm text-muted-foreground">Couldn't load usage information.</p>
      </SettingsSection>
    );
  }

  const { plan, trial, memberCount, currentUser, upgradeRequestedAt, members } = billingSummary;
  const trialExpired = trial?.status === "trial_expired";
  const limitReached = currentUser.remaining <= 0;
  const requested = !!upgradeRequestedAt;

  return (
    <SettingsSection title="Usage & Plan" description="Manage workspace access, trial status, and usage.">
      {trialExpired && (
        <SettingsCard className="border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Your free trial has ended</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade this workspace to continue using PMX.</p>
            </div>
            <UpgradeButton canRequest={canRequestUpgrade} requested={requested} onClick={handleUpgrade} busy={upgradeBusy} />
          </div>
        </SettingsCard>
      )}

      {!trialExpired && limitReached && (
        <SettingsCard className="border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Usage limit reached</p>
              <p className="text-xs text-muted-foreground mt-0.5">You've used your 100,000-token allowance for this period.</p>
            </div>
            <UpgradeButton canRequest={canRequestUpgrade} requested={requested} onClick={handleUpgrade} busy={upgradeBusy} />
          </div>
        </SettingsCard>
      )}

      <div>
        <SettingsGroupHeading title="Workspace plan" />
        <SettingsCard className="mt-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Current plan</p>
              <p className="text-lg font-semibold text-foreground mt-1 flex items-center gap-1.5">
                {plan === "active" ? "Active" : "Free Trial"}
                {plan === "trial" && <Sparkles className="h-4 w-4 text-primary" />}
              </p>
              {plan === "trial" && trial && (
                <span
                  className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    trialExpired
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}
                >
                  {trialExpired ? "Trial expired" : `${trial.daysRemaining} day${trial.daysRemaining === 1 ? "" : "s"} remaining`}
                </span>
              )}
              {plan === "active" && (
                <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  Active
                </span>
              )}
            </div>
            {!trialExpired && !limitReached && (
              <UpgradeButton canRequest={canRequestUpgrade} requested={requested} onClick={handleUpgrade} busy={upgradeBusy} />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/40">
            <div>
              <p className="text-[11px] text-muted-foreground">Workspace members</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
            </div>
            {trial && (
              <>
                <div>
                  <p className="text-[11px] text-muted-foreground">{plan === "trial" ? "Trial started" : "Started"}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{formatDate(trial.startedAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{plan === "trial" ? "Trial ends" : "Trial end"}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{formatDate(trial.endsAt)}</p>
                </div>
              </>
            )}
          </div>
        </SettingsCard>
      </div>

      <div>
        <SettingsGroupHeading title="Your usage" description="Usage is tracked per user. Input and output are counted together." />
        <SettingsCard className="mt-3 space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {formatTokens(currentUser.totalTokens)} / {formatTokens(currentUser.limit)}
              </p>
              <p className="text-xs text-muted-foreground">{formatTokens(currentUser.remaining)} remaining</p>
            </div>
            <div className="mt-2">
              <UsageBar used={currentUser.totalTokens} limit={currentUser.limit} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/40">
            <div>
              <p className="text-[11px] text-muted-foreground">Input</p>
              <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{formatTokens(currentUser.inputTokens)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Output</p>
              <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{formatTokens(currentUser.outputTokens)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{formatTokens(currentUser.totalTokens)}</p>
            </div>
          </div>
        </SettingsCard>
      </div>

      {members && (
        <div>
          <SettingsGroupHeading title="Member usage" description="Visible to workspace owners and admins." />
          <div className="mt-3 rounded-xl border border-border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1.4fr_0.8fr_1fr] gap-3 px-4 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Member</span>
              <span>Role</span>
              <span>Usage</span>
              <span>Remaining</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-border/40">
              {members.map(m => (
                <div key={m.userId} className="grid sm:grid-cols-[1.2fr_1fr_1.4fr_0.8fr_1fr] gap-1.5 sm:gap-3 items-center px-4 py-3">
                  <span className="text-[13px] font-medium text-foreground truncate">{m.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{m.role.replace(/_/g, " ")}</span>
                  <div className="min-w-[100px]">
                    <div className="flex items-baseline justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="tabular-nums">{formatTokens(m.totalTokens)} / {formatTokens(m.limit)}</span>
                    </div>
                    <UsageBar used={m.totalTokens} limit={m.limit} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatTokens(m.remaining)}</span>
                  <span
                    className={`inline-flex w-fit items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      m.status === "limit_reached"
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    }`}
                  >
                    {m.status === "limit_reached" ? "Limit reached" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
