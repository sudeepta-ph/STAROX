import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePmxStore, getPmxHeaders, PMX_INVITE_ROLES, PMX_ROLE_LABELS, type PmxInviteRole } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Check, RefreshCw, AlertCircle, Trash2, Plus, X, Copy, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ProductSwitcher, { type Product } from "@/components/pmx/ProductSwitcher";
import { useAuthStore } from "@/lib/authStore";

import { SettingsLayout } from "@/components/pmx/settings/SettingsLayout";
import {
  SettingsSection, SettingsGroupHeading, SettingsField, SettingsCard,
  ToggleRow, TextInput, TextArea, SelectField,
} from "@/components/pmx/settings/fields";
import { DangerZone } from "@/components/pmx/settings/DangerZone";
import { RoleList } from "@/components/pmx/settings/RoleList";
import { UsagePlanSection } from "@/components/pmx/settings/UsagePlan";
import { InvitePeopleModal } from "@/components/pmx/settings/InvitePeopleModal";
import {
  CreatableSelect, TagMultiSelect, MemberRow, SourceSettingsRow, timeAgo,
  ROLE_BADGE_CLASS, CATEGORY_PRESETS, AUDIENCE_PRESETS,
} from "@/components/pmx/settings/subcomponents";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

// ── Save status badge ─────────────────────────────────────────────────────────
function SaveBadge({ status }: { status: "saved" | "saving" | "unsaved" | "idle" }) {
  if (status === "idle") return null;
  const map = {
    saved:   { icon: Check,       text: "Saved",           cls: "text-green-500 bg-green-500/10 border-green-500/20" },
    saving:  { icon: RefreshCw,   text: "Saving...",       cls: "text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse" },
    unsaved: { icon: AlertCircle, text: "Unsaved changes",  cls: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${m.cls}`}>
      <Icon className={`h-3 w-3 ${status === "saving" ? "animate-spin" : ""}`} /> {m.text}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PmxSettings() {
  const {
    understanding, fetchUnderstanding, deleteProject, projectId, setProjectId, workspaces, fetchWorkspaces, startFreshWorkspace,
    role, inputs, fetchInputs, members, membersLoading, fetchMembers, changeMemberRole, removeMember,
    inviteCodes, inviteCodesLoading, lastCreatedCode, fetchInviteCodes, createInviteCode, revokeInviteCodeById,
    emailInvites, emailInvitesLoading, fetchEmailInvites, sendEmailInvites, resendEmailInvite, revokeEmailInviteById,
  } = usePmxStore();
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const viewerUserId = useAuthStore((s) => s.user?.uid);

  const [activeSection, setActiveSection] = useState("workspace");
  const [saveStatus, setSaveStatus]       = useState<"idle" | "saved" | "saving" | "unsaved">("idle");
  const [unsavedWarning, setUnsavedWarning] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Settings is owner/admin territory — this is a client-side nicety only;
  // every settings-backing endpoint enforces the same restriction server-side.
  // Every other role (member, product_manager, engineering, ..., viewer)
  // gets the same standard read-write access this pass, so they're all
  // bounced here the same way plain "member" always was.
  useEffect(() => {
    if (role && role !== "owner" && role !== "admin") {
      toast({ title: "Settings are managed by workspace owners and admins." });
      navigate("/pmx/overview");
    }
  }, [role, navigate, toast]);

  // ── Product fields — oneLiner/stage/businessModel/valueProposition are
  // kept in state and still round-tripped through PUT /understanding on
  // save, but are no longer rendered as editable fields (simplified Product
  // page shows only Name/Category/Audience).
  const [name,             setName]             = useState(understanding?.productSummary?.name || "");
  const [oneLiner,         setOneLiner]         = useState(understanding?.productSummary?.oneLiner || "");
  const [category,         setCategory]         = useState(understanding?.productSummary?.category || "SaaS");
  const [stage,            setStage]            = useState(understanding?.productSummary?.stage || "idea");
  const [businessModel,    setBusinessModel]    = useState(understanding?.businessModel || "");
  const [targetAudience,   setTargetAudience]   = useState(understanding?.targetAudience || "");
  const [valueProposition, setValueProposition] = useState(understanding?.valueProposition || "");

  // ── Workspace fields ──────────────────────────────────────────────────────
  const [workspaceName,        setWorkspaceName]        = useState(understanding?.workspaceName || "");
  const [workspaceDescription, setWorkspaceDescription] = useState(understanding?.workspaceDescription || "");
  const [inviteLinksEnabled,   setInviteLinksEnabled]   = useState(understanding?.inviteLinksEnabled ?? true);

  // ── Automation fields — autoAnalysis is real/persisted (aiSettings on the
  // understanding doc); schedule/runOn* are local-only today, unchanged.
  const [autoAnalysis, setAutoAnalysis] = useState(understanding?.aiSettings?.autoAnalysis ?? false);
  const [schedule,     setSchedule]     = useState("daily");
  const [runOnPush,    setRunOnPush]    = useState(false);
  const [runOnReview,  setRunOnReview]  = useState(true);
  const [runOnError,   setRunOnError]   = useState(true);

  // ── Notification fields (local-only — unchanged from before this redesign) ─
  const [slackNotifs,  setSlackNotifs]  = useState(false);
  const [emailNotifs,  setEmailNotifs]  = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyPrd,   setMonthlyPrd]   = useState(false);

  // ── Product switcher — backed by real PMX workspaces ────────────────────────
  useEffect(() => { fetchWorkspaces(); }, []);

  const products: Product[] = workspaces.map(w => ({
    id: w.projectId,
    name: w.name,
    category: w.isProject ? "Project" : "Source",
    stage: "",
    workspace: `${w.sourceCount} source${w.sourceCount === 1 ? "" : "s"}`,
    lastSynced: timeAgo(w.updatedAt),
  }));
  const selectedProduct = products.find(p => p.id === projectId) ?? null;

  // Populate form fields from the active workspace's understanding doc
  useEffect(() => {
    if (understanding?.productSummary) {
      setName(understanding.productSummary.name || "");
      setCategory(understanding.productSummary.category || "SaaS");
      setStage(understanding.productSummary.stage || "mvp");
      setOneLiner(understanding.productSummary.oneLiner || "");
      setBusinessModel(understanding.businessModel || "");
      setTargetAudience(understanding.targetAudience || "");
      setValueProposition(understanding.valueProposition || "");
      setWorkspaceName(understanding.workspaceName || "");
      setWorkspaceDescription(understanding.workspaceDescription || "");
      setInviteLinksEnabled(understanding.inviteLinksEnabled ?? true);
      setAutoAnalysis(understanding.aiSettings?.autoAnalysis ?? false);
    }
  }, [understanding]);

  useEffect(() => {
    if (activeSection === "sources") fetchInputs();
    if (activeSection === "team") { fetchMembers(); fetchInviteCodes(); fetchEmailInvites(); }
    if (activeSection === "workspace") fetchInviteCodes();
  }, [activeSection]);

  // Marked dirty explicitly by each field's own onChange handler below —
  // NOT by a blanket effect watching every field, which used to fire
  // markDirty() the moment the understanding-population effect above (or
  // even initial mount) set these same fields, flagging the form as
  // "unsaved" before the user had touched anything.
  const markDirty = useCallback(() => setSaveStatus("unsaved"), []);

  // Section switch with unsaved guard
  const requestSection = (id: string) => {
    if (saveStatus === "unsaved" && id !== activeSection) {
      setPendingSection(id);
      setUnsavedWarning(true);
    } else {
      setActiveSection(id);
    }
  };

  const confirmDiscard = () => {
    if (pendingSection) setActiveSection(pendingSection);
    setSaveStatus("idle");
    setUnsavedWarning(false);
    setPendingSection(null);
  };

  // Save
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaveStatus("saving");
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/understanding`, {
        method: "PUT", headers,
        body: JSON.stringify({
          projectId,
          productSummary: { name, oneLiner, category, stage },
          businessModel, targetAudience, valueProposition,
          coreFeatures: understanding?.coreFeatures || [],
          personas: understanding?.personas || [],
          customerSegments: understanding?.customerSegments || [],
          businessGoals: understanding?.businessGoals || [],
          customerJourney: understanding?.customerJourney || [],
          workspaceName, workspaceDescription, inviteLinksEnabled,
          aiSettings: { autoAnalysis },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus("saved");
        fetchUnderstanding();
        fetchWorkspaces();
        toast({ title: "Settings saved" });
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    } catch {
      toast({ variant: "destructive", title: "Error saving settings" });
      setSaveStatus("unsaved");
    }
  };

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [name, oneLiner, category, stage, businessModel, targetAudience, valueProposition, workspaceName, workspaceDescription, inviteLinksEnabled, autoAnalysis]);

  // ── Invite code (shared by the Workspace quick-widget and Team's full list) ─
  const [newCodeRole, setNewCodeRole] = useState<PmxInviteRole>("engineering");
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);
  const [generatingQuickCode, setGeneratingQuickCode] = useState(false);

  const handleCopyCode = (plaintext: string) => {
    navigator.clipboard.writeText(plaintext);
    toast({ title: "Invite code copied" });
  };

  const handleCreateInviteCode = async () => {
    setCreatingCode(true);
    try {
      const plaintext = await createInviteCode({ role: newCodeRole, label: newCodeLabel.trim() || undefined });
      if (plaintext) {
        toast({ title: "Invite code created", description: `${PMX_ROLE_LABELS[newCodeRole]} invite ready to share.` });
        setNewCodeLabel("");
      }
    } finally {
      setCreatingCode(false);
    }
  };

  const handleGenerateQuickCode = async () => {
    setGeneratingQuickCode(true);
    try {
      const plaintext = await createInviteCode({ role: "member" });
      if (plaintext) toast({ title: "Invite code created" });
    } finally {
      setGeneratingQuickCode(false);
    }
  };

  const handleRevokeInviteCode = async (codeId: string) => {
    if (!window.confirm("Revoke this invite code? Nobody will be able to join with it anymore.")) return;
    await revokeInviteCodeById(codeId);
    toast({ title: "Invite code revoked" });
  };

  // ── Invite by email — quick single-email composer on Workspace ─────────────
  const [quickInviteEmail, setQuickInviteEmail] = useState("");
  const [sendingQuickInvite, setSendingQuickInvite] = useState(false);

  const handleQuickInvite = async () => {
    const email = quickInviteEmail.trim();
    if (!email) return;
    setSendingQuickInvite(true);
    try {
      const results = await sendEmailInvites({ emails: [email], role: "member" });
      if (!results) return;
      const r = results[0];
      if (r?.status === "sent") {
        toast({ title: "Invitation sent" });
        setQuickInviteEmail("");
      } else {
        const labels: Record<string, string> = { already_member: "Already a member", already_pending: "Invitation already pending", invalid: "Invalid email address" };
        toast({ variant: "destructive", title: labels[r?.status] || "Couldn't send invitation" });
      }
    } finally {
      setSendingQuickInvite(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    const ok = await resendEmailInvite(inviteId);
    toast(ok ? { title: "Invitation resent" } : { variant: "destructive", title: "Couldn't resend invitation" });
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm("Revoke this invitation?")) return;
    await revokeEmailInviteById(inviteId);
    toast({ title: "Invitation revoked" });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this person from the workspace?")) return;
    const ok = await removeMember(memberId);
    toast(ok ? { title: "Member removed" } : { variant: "destructive", title: "Couldn't remove member" });
  };

  const handleChangeMemberRole = async (memberId: string, role: "admin" | "member") => {
    const ok = await changeMemberRole(memberId, role);
    toast(ok ? { title: `Role updated to ${role}` } : { variant: "destructive", title: "Couldn't update role" });
  };

  const canManageTeam = role === "owner" || role === "admin";
  const latestCode = inviteCodes[0] ?? null;
  const latestCodePlaintext = latestCode && lastCreatedCode?.codeId === latestCode._id ? lastCreatedCode.plaintext : null;

  // ── Section content ───────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case "workspace": return (
        <div className="space-y-8">
          <SettingsSection title="Workspace" description="Manage workspace identity and access.">
            <form onSubmit={handleSave} className="space-y-4">
              <SettingsField label="Name">
                <TextInput value={workspaceName} onChange={v => { setWorkspaceName(v); markDirty(); }} placeholder={name || "My Workspace"} />
              </SettingsField>
              <SettingsField label="Description">
                <TextArea value={workspaceDescription} onChange={v => { setWorkspaceDescription(v); markDirty(); }} placeholder="What this workspace is for..." />
              </SettingsField>
            </form>
          </SettingsSection>

          <div className="space-y-3">
            <SettingsGroupHeading title="Workspace access" />
            <SettingsCard className="!p-0 px-4">
              <ToggleRow
                value={inviteLinksEnabled}
                onChange={v => { setInviteLinksEnabled(v); markDirty(); }}
                label="Allow people to join with invite code"
                description="People with a valid invite code can join this workspace."
                disabled={!canManageTeam}
              />
            </SettingsCard>
          </div>

          {canManageTeam && (
            <>
              <div className="space-y-3">
                <SettingsGroupHeading title="Invite people" />
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={quickInviteEmail}
                    onChange={(e) => setQuickInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickInvite()}
                    className="flex-1 h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleQuickInvite}
                    disabled={sendingQuickInvite || !quickInviteEmail.trim()}
                    className="shrink-0 h-10 inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 text-sm font-semibold text-primary-foreground transition-colors"
                  >
                    {sendingQuickInvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Send invite
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <SettingsGroupHeading title="Invite code" />
                {latestCode ? (
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 h-10 flex items-center px-3 rounded-lg border border-border bg-background font-mono text-sm tracking-widest ${latestCodePlaintext ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {latestCodePlaintext || "••••-••••"}
                    </span>
                    <button
                      onClick={() => latestCodePlaintext && handleCopyCode(latestCodePlaintext)}
                      disabled={!latestCodePlaintext}
                      title={latestCodePlaintext ? "Copy code" : "Codes are only shown once, right after creation — see Team to manage codes"}
                      className="shrink-0 h-10 inline-flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-4 text-sm font-semibold text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateQuickCode}
                    disabled={generatingQuickCode}
                    className="h-10 inline-flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-4 text-sm font-semibold text-foreground transition-colors disabled:opacity-60"
                  >
                    {generatingQuickCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Generate code
                  </button>
                )}
                <p className="text-xs text-muted-foreground">Manage all invite codes and roles from Team.</p>
              </div>
            </>
          )}
        </div>
      );

      case "product": return (
        <form onSubmit={handleSave} className="space-y-8">
          <SettingsSection title="Product" description="Manage product information.">
            <div className="space-y-6">
              <div className="space-y-3">
                <SettingsGroupHeading title="Product identity" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Name"><TextInput value={name} onChange={v => { setName(v); markDirty(); }} placeholder="My Product" /></SettingsField>
                  <SettingsField label="Category">
                    <CreatableSelect value={category} onChange={v => { setCategory(v); markDirty(); }} options={CATEGORY_PRESETS} placeholder="Select category..." />
                  </SettingsField>
                </div>
              </div>
              <div className="space-y-3">
                <SettingsGroupHeading title="Audience" />
                <SettingsField label="Target audience">
                  <TagMultiSelect value={targetAudience} onChange={v => { setTargetAudience(v); markDirty(); }} options={AUDIENCE_PRESETS} placeholder="Who are your users..." />
                </SettingsField>
              </div>
            </div>
          </SettingsSection>

          <DangerZone
            description="Deleting this product permanently removes its associated workspace data — sources, signals, insights, PRDs, and execution tasks — for every member."
            actionLabel={deleting ? "Deleting…" : "Delete product"}
            actionDisabled={deleting}
            actionBusy={deleting}
            note={role !== "owner" ? "Only the workspace owner can delete this product." : undefined}
            onAction={async () => {
              if (!window.confirm(`Delete "${name || "this product"}" and all its data? This cannot be undone.`)) return;
              setDeleting(true);
              const ok = await deleteProject(projectId);
              setDeleting(false);
              if (!ok) {
                toast({ variant: "destructive", title: "Delete failed", description: "Could not delete product data. Please try again." });
                return;
              }
              toast({ variant: "destructive", title: "Product deleted", description: "All sources, insights, and execution data have been removed." });
              setSaveStatus("idle");
              const remaining = workspaces.filter(w => w.projectId !== projectId);
              if (remaining[0]) setProjectId(remaining[0].projectId);
              else startFreshWorkspace();
              fetchWorkspaces();
            }}
          />
        </form>
      );

      case "sources": {
        const activeSources = inputs.filter(i => !i.isArchived);
        const archivedSources = inputs.filter(i => i.isArchived);
        return (
          <SettingsSection title="Sources" description="Manage the product sources STAROX uses for context.">
            {inputs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No sources connected yet. Add one from the Sources page to give STAROX something to learn from.
              </p>
            ) : (
              <div className="space-y-4">
                {activeSources.length > 0 && (
                  <div className="rounded-xl border border-border divide-y divide-border/30">
                    {activeSources.map(input => <SourceSettingsRow key={input._id} input={input} />)}
                  </div>
                )}
                {archivedSources.length > 0 && (
                  <div className="space-y-2">
                    <SettingsGroupHeading title="Archived" description="Excluded from analysis." />
                    <div className="rounded-xl border border-border/60 divide-y divide-border/20 opacity-70">
                      {archivedSources.map(input => <SourceSettingsRow key={input._id} input={input} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SettingsSection>
        );
      }

      case "automation": return (
        <SettingsSection title="Automation" description="Configure automatic workflows.">
          <div className="space-y-6">
            <div className="space-y-3">
              <SettingsGroupHeading title="Scheduled analysis" />
              <SelectField value={schedule} onChange={v => { setSchedule(v); markDirty(); }} className="max-w-xs">
                <option value="1h">Every hour</option>
                <option value="2h">Every 2 hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="manual">Manual only</option>
              </SelectField>
            </div>
            <div className="space-y-3">
              <SettingsGroupHeading title="Event triggers" />
              <SettingsCard className="!p-0 px-4">
                <ToggleRow value={autoAnalysis} onChange={v => { setAutoAnalysis(v); markDirty(); }} label="Run when a new source is connected" />
                <ToggleRow value={runOnPush}   onChange={v => { setRunOnPush(v); markDirty(); }}   label="Run after code changes" />
                <ToggleRow value={runOnReview} onChange={v => { setRunOnReview(v); markDirty(); }} label="Run after new reviews" />
                <ToggleRow value={runOnError}  onChange={v => { setRunOnError(v); markDirty(); }}  label="Run after production errors" />
              </SettingsCard>
            </div>
          </div>
        </SettingsSection>
      );

      case "notifications": return (
        <SettingsSection title="Notifications" description="Choose what you hear about.">
          <div className="space-y-6">
            <div className="space-y-3">
              <SettingsGroupHeading title="Workspace notifications" />
              <SettingsCard className="!p-0 px-4">
                <ToggleRow value={emailNotifs}  onChange={v => { setEmailNotifs(v); markDirty(); }}  label="Email notifications" description="Receive email summaries" />
                <ToggleRow value={weeklyReport} onChange={v => { setWeeklyReport(v); markDirty(); }} label="Weekly product report" description="Auto weekly product health email every Monday" />
              </SettingsCard>
            </div>
            <div className="space-y-3">
              <SettingsGroupHeading title="Integrations" />
              <SettingsCard className="!p-0 px-4">
                <ToggleRow value={slackNotifs} onChange={v => { setSlackNotifs(v); markDirty(); }} label="Slack notifications" description="Send updates to a Slack channel" />
              </SettingsCard>
            </div>
            <div className="space-y-3">
              <SettingsGroupHeading title="Generated reports" />
              <SettingsCard className="!p-0 px-4">
                <ToggleRow value={monthlyPrd} onChange={v => { setMonthlyPrd(v); markDirty(); }} label="Monthly PRD generation" description="Auto-generate a PRD summary each month" />
              </SettingsCard>
            </div>
          </div>
        </SettingsSection>
      );

      case "team": return (
        <div className="space-y-8">
          <SettingsSection title="Team" description="Manage who has access.">
            {canManageTeam && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Invite people
              </button>
            )}
          </SettingsSection>

          <div className="space-y-3">
            <SettingsGroupHeading title="Members" />
            {membersLoading && members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Loading team…</p>
            ) : (
              <div className="rounded-xl border border-border px-4">
                {members.map(m => (
                  <MemberRow
                    key={m._id}
                    member={m}
                    viewerRole={role}
                    viewerUserId={viewerUserId}
                    onChangeRole={handleChangeMemberRole}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </div>
            )}
          </div>

          {canManageTeam && emailInvites.length > 0 && (
            <div className="space-y-3">
              <SettingsGroupHeading title="Pending invitations" />
              <div className="rounded-xl border border-border divide-y divide-border/30">
                {emailInvites.map(inv => (
                  <div key={inv._id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {PMX_ROLE_LABELS[inv.role]} · invited by {inv.invitedByName} · {timeAgo(inv.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 capitalize">
                      {inv.status}
                    </span>
                    <div className="shrink-0 flex items-center gap-1">
                      <button onClick={() => handleResendInvite(inv._id)} title="Resend" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleRevokeInvite(inv._id)} title="Revoke" className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canManageTeam && (
            <div className="space-y-3">
              <SettingsGroupHeading title="Workspace codes" description="Role-specific codes, e.g. an Engineering or Marketing invite. Multiple can be active at once." />

              {inviteCodesLoading && inviteCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Loading invite codes…</p>
              ) : inviteCodes.length > 0 ? (
                <div className="space-y-2">
                  {inviteCodes.map(c => {
                    const plaintext = lastCreatedCode?.codeId === c._id ? lastCreatedCode.plaintext : null;
                    return (
                      <div key={c._id} className="rounded-xl border border-border p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">
                              {c.label || `${PMX_ROLE_LABELS[c.role]} invite`}
                            </p>
                            <p className={`text-base font-mono font-semibold tracking-widest mt-0.5 ${plaintext ? "text-foreground" : "text-muted-foreground/50"}`}>
                              {plaintext || "••••-••••"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => plaintext && handleCopyCode(plaintext)}
                              disabled={!plaintext}
                              title={plaintext ? "Copy code" : "Codes are only shown once, right after creation"}
                              className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                            <button
                              onClick={() => handleRevokeInviteCode(c._id)}
                              title="Revoke this code"
                              className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" /> Revoke
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ROLE_BADGE_CLASS[c.role]}`}>
                            {PMX_ROLE_LABELS[c.role]}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            created {timeAgo(c.createdAt)} ·{" "}
                            {c.maxUses ? `${c.usageCount}/${c.maxUses} uses` : `${c.usageCount} uses`}
                            {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/70">No invite codes yet.</p>
              )}

              <div className="rounded-xl border border-dashed border-border p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">Generate invite code</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-40 shrink-0">
                    <SelectField value={newCodeRole} onChange={v => setNewCodeRole(v as PmxInviteRole)}>
                      {PMX_INVITE_ROLES.map(r => <option key={r} value={r}>{PMX_ROLE_LABELS[r]}</option>)}
                    </SelectField>
                  </div>
                  <input
                    type="text"
                    placeholder="Label (optional), e.g. Engineering Invite"
                    value={newCodeLabel}
                    onChange={(e) => setNewCodeLabel(e.target.value)}
                    className="flex-1 min-w-[160px] h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleCreateInviteCode}
                    disabled={creatingCode}
                    className="shrink-0 h-10 flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 text-sm font-semibold text-primary-foreground transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Generate
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70">
                Invite codes never grant Admin or Owner access — the invite determines the role granted.
              </p>
            </div>
          )}

          <InvitePeopleModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
        </div>
      );

      case "permissions": return (
        <SettingsSection title="Roles & Permissions" description="Control what each role can do.">
          <RoleList viewerRole={role} />
          <p className="text-xs text-muted-foreground/70 mt-4 leading-relaxed">
            Product Manager, Engineering, Designer, QA, Marketing, Sales, and Support currently share the same
            standard read-write access as Member — section-by-section write scoping between these roles is a
            planned follow-up. Viewer's read-only restriction is enforced today.
          </p>
        </SettingsSection>
      );

      case "billing": return (
        <UsagePlanSection viewerRole={role} />
      );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Unsaved changes warning ──────────────────────────────────────── */}
      <AnimatePresence>
        {unsavedWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Unsaved changes</h3>
                  <p className="text-xs text-muted-foreground mt-1">You have unsaved changes. Do you want to discard them and switch sections?</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setUnsavedWarning(false); setPendingSection(null); }}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  Keep Editing
                </button>
                <button onClick={confirmDiscard}
                  className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-colors">
                  Discard Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsLayout
        activeId={activeSection}
        onSelectSection={requestSection}
        headerRight={
          <>
            <ProductSwitcher
              variant="compact"
              products={products}
              selected={selectedProduct}
              onSelect={p => {
                if (saveStatus === "unsaved") {
                  toast({ title: "Save your changes first before switching products." });
                  return;
                }
                setProjectId(p.id);
              }}
              onCreateNew={() => { startFreshWorkspace(); navigate("/pmx/overview"); }}
              onManage={() => navigate("/projects")}
            />
            <div className="h-4 w-px bg-border" />
            <SaveBadge status={saveStatus} />
            {saveStatus === "unsaved" && (
              <button onClick={() => handleSave()}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all">
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            )}
          </>
        }
      >
        <motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {renderSection()}
        </motion.div>
      </SettingsLayout>
    </div>
  );
}
