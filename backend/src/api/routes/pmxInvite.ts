import { Router } from "express";
import { PmxWorkspaceInviteModel, PmxUnderstandingModel, PmxWorkspaceMemberModel } from "../../models/Pmx";

// Public (unauthenticated) invite-resolve endpoint, mounted at a separate
// path prefix from pmxRouter (which applies authMiddleware to everything).
// Lets an invite link preview the workspace name before the visitor signs
// in — see PmxJoin.tsx. Actually joining still requires auth, via
// POST /api/pmx/invite/:token/accept.
export const pmxInviteRouter = Router();

pmxInviteRouter.get("/:token", async (req, res, next) => {
  try {
    const invite = await PmxWorkspaceInviteModel.findOne({ token: req.params.token, revoked: false });
    if (!invite) return res.json({ success: true, data: { valid: false } });

    const workspace = await PmxUnderstandingModel.findOne({ projectId: invite.projectId, isDeleted: false });
    if (!workspace || workspace.inviteLinksEnabled === false) {
      return res.json({ success: true, data: { valid: false } });
    }

    const memberCount = await PmxWorkspaceMemberModel.countDocuments({ projectId: invite.projectId });

    res.json({
      success: true,
      data: {
        valid: true,
        workspaceName: workspace.workspaceName || workspace.productSummary?.name || "Workspace",
        memberCount,
      },
    });
  } catch (err) {
    next(err);
  }
});
