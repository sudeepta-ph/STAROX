import { Router } from "express";
import { PmxWorkspaceEmailInviteModel, PmxUnderstandingModel, PMX_ROLE_LABELS, PmxWorkspaceRole } from "../../models/Pmx";
import UserModel from "../../models/User";

// Public (unauthenticated) preview for the by-email invite flow — mirrors
// pmxInvite.ts's role for the legacy token link. Lets PmxAcceptInvite.tsx
// show "You've been invited to <workspace> as <role>" before the visitor
// signs in. Deliberately returns no email-match/already-member info (the
// caller isn't authenticated yet) — that finer check happens once signed
// in, via the authenticated GET /api/pmx/invites/email/resolve/:token.
export const pmxEmailInviteRouter = Router();

pmxEmailInviteRouter.get("/:token", async (req, res, next) => {
  try {
    const invite = await PmxWorkspaceEmailInviteModel.findOne({ token: req.params.token });
    if (!invite) return res.json({ success: true, data: { status: "invalid" } });
    if (invite.status === "revoked") return res.json({ success: true, data: { status: "revoked" } });
    if (invite.status !== "accepted" && invite.expiresAt.getTime() < Date.now()) {
      return res.json({ success: true, data: { status: "expired" } });
    }

    const workspace = await PmxUnderstandingModel.findOne({ projectId: invite.projectId, isDeleted: false });
    if (!workspace) return res.json({ success: true, data: { status: "invalid" } });

    const inviter = await UserModel.findOne({ clerkId: invite.invitedBy });
    const invitedByName = inviter
      ? [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") || inviter.username || inviter.email
      : "A workspace admin";

    res.json({
      success: true,
      data: {
        status: invite.status === "accepted" ? "accepted" : "valid",
        workspaceName: workspace.workspaceName || workspace.productSummary?.name || "Workspace",
        role: invite.role,
        roleLabel: PMX_ROLE_LABELS[invite.role as PmxWorkspaceRole],
        invitedByName,
      },
    });
  } catch (err) {
    next(err);
  }
});
