import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../../middleware/auth";
import { PmxWorkspaceMemberModel, PmxUnderstandingModel, PmxWorkspaceRole } from "../../../models/Pmx";

export type WorkspaceRole = PmxWorkspaceRole;

// Access-level ranking, used for the minRole gate (member/admin/owner
// routes). Every named role besides owner/admin (member, product_manager,
// engineering, designer, qa, marketing, sales, support, viewer) ranks
// alongside plain "member" here — they all have *access* to the workspace.
// Whether a role can *write* is a separate axis, see canWrite() below —
// deliberately not folded into this rank, since "viewer" needs the same
// access rank as everyone else but zero write permission.
const RANK: Record<WorkspaceRole, number> = {
  member: 0, product_manager: 0, engineering: 0, designer: 0, qa: 0,
  marketing: 0, sales: 0, support: 0, viewer: 0,
  admin: 1, owner: 2,
};

export interface WorkspaceScopedRequest extends AuthenticatedRequest {
  workspaceRole?: WorkspaceRole;
}

export async function getMemberRole(projectId: string, userId: string): Promise<WorkspaceRole | null> {
  const row = await PmxWorkspaceMemberModel.findOne({ projectId, userId }, { role: 1 });
  return (row?.role as WorkspaceRole | undefined) ?? null;
}

// The one centrally-enforced write restriction for this pass: Viewer is
// read-only, everywhere, full stop. Every other non-owner/admin role
// (including plain "member") gets standard read-write access — per-section
// scoping between those roles is a deliberate later pass, not this one.
export function canWrite(role: WorkspaceRole | null): boolean {
  return !!role && role !== "viewer";
}

// Express middleware factory — resolves projectId from params/query/body,
// 403s unless the caller is a member of that workspace at or above minRole.
// Applied as an explicit second argument on individual route registrations
// rather than a blanket pmxRouter.use(...), since a handful of routes
// (GET/POST /projects, and the "genesis" routes POST /inputs,
// POST /idea/generate, PUT /understanding) intentionally have no membership
// row to check yet for a workspace that hasn't materialized — see their own
// inline gates.
//
// For the default member-level gate specifically: fetchAll() polls every
// list/detail route (GET /inputs, /evidence, /problems, ...) immediately
// after a brand-new client-generated projectId is set, before any source or
// idea has run ensureWorkspace and before any membership row exists. Those
// requests must behave like "nothing here yet" (empty list), not 403 — so
// a member-level gate only enforces membership once the workspace actually
// exists; a non-existent workspace passes through with no role attached.
// Admin/owner gates (rename, delete, member management) always require a
// real membership row regardless, since those operations are meaningless
// (and should just be denied) on a workspace that was never created.
export function requireWorkspaceAccess(minRole: WorkspaceRole = "member") {
  return async (req: WorkspaceScopedRequest, res: Response, next: NextFunction) => {
    try {
      const projectId =
        (req.params.projectId as string) ||
        (req.query.projectId as string) ||
        (req.body?.projectId as string);

      if (!projectId) {
        return res.status(400).json({ success: false, error: "projectId is required" });
      }

      const role = await getMemberRole(projectId, req.userId!);
      if (role) {
        if (RANK[role] < RANK[minRole]) {
          return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
        }
        if (req.method !== "GET" && !canWrite(role)) {
          return res.status(403).json({ success: false, error: "Viewers have read-only access to this workspace." });
        }
        req.workspaceRole = role;
        return next();
      }

      if (minRole === "member") {
        const exists = await PmxUnderstandingModel.exists({ projectId, isDeleted: false });
        if (!exists) return next();
      }

      return res.status(403).json({ success: false, error: "You do not have access to this workspace." });
    } catch (err) {
      next(err);
    }
  };
}
