import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, Crown } from "lucide-react";
import { PMX_ROLE_LABELS, type PmxWorkspaceRole } from "@/lib/pmxStore";

// Display order matches the spec's own table — not PMX_WORKSPACE_ROLES'
// storage-oriented order (which groups "member" earlier).
const ROLE_ORDER: PmxWorkspaceRole[] = [
  "owner", "admin", "product_manager", "engineering", "designer", "qa",
  "marketing", "sales", "support", "member", "viewer",
];

const ROLE_SUMMARY: Record<PmxWorkspaceRole, string> = {
  owner: "Full workspace access",
  admin: "Workspace administration",
  product_manager: "Product planning",
  engineering: "Execution & technical work",
  designer: "Design & UX work",
  qa: "Testing & validation",
  marketing: "Launch & growth work",
  sales: "Adoption & customer work",
  support: "Sustaining product work",
  member: "Standard workspace access",
  viewer: "Read-only access",
};

const ROLE_DETAIL: Record<PmxWorkspaceRole, string> = {
  owner: "Full control over the workspace — manage members, change permissions, configure product settings, and delete the workspace or product.",
  admin: "Can manage the workspace and team — invite and remove members, and manage product/workspace settings. Cannot delete the workspace or product, or manage other admins.",
  product_manager: "Can edit PRDs, Execution, and product planning across the workspace.",
  engineering: "Can update Execution, Artifacts, and technical sections across the workspace.",
  designer: "Can work across Insights, PRD, Execution, and Artifacts.",
  qa: "Can work across Insights, Execution, and Artifacts.",
  marketing: "Can work across Insights, PRD, Execution, and Artifacts.",
  sales: "Can work across Insights, Execution, and Artifacts.",
  support: "Can work across Insights, Execution, and Artifacts.",
  member: "Standard read-write access — use Insights, create and update PRDs, work Execution tickets, use Artifacts, and view History. Cannot access Settings or manage the team.",
  viewer: "Read-only across the workspace — can view Overview, PRD, Execution, Artifacts, Insights, and History, but cannot create or change anything.",
};

export function RoleList({ viewerRole }: { viewerRole: PmxWorkspaceRole | null }) {
  const [openRole, setOpenRole] = useState<PmxWorkspaceRole | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[1fr_1.4fr_auto] gap-3 px-4 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Role</span>
          <span>Access summary</span>
          <span />
        </div>
        <div className="divide-y divide-border/40">
          {ROLE_ORDER.map(r => {
            const isYours = viewerRole === r;
            return (
              <button
                key={r}
                onClick={() => setOpenRole(r)}
                className="w-full grid sm:grid-cols-[1fr_1.4fr_auto] gap-1 sm:gap-3 items-center px-4 py-3 text-left hover:bg-muted/20 transition-colors"
              >
                <span className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                  {r === "owner" && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                  {PMX_ROLE_LABELS[r]}
                  {isYours && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Your role</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{ROLE_SUMMARY[r]}</span>
                <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/50 justify-self-end" />
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!openRole} onOpenChange={(o) => !o && setOpenRole(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          {openRole && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {openRole === "owner" && <Crown className="h-4 w-4 text-amber-400" />}
                  {PMX_ROLE_LABELS[openRole]}
                  {viewerRole === openRole && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Your role</span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{ROLE_DETAIL[openRole]}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
