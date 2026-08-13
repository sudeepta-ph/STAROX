import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Users, ArrowRight, XCircle, Loader2, X, Database, Mail } from "lucide-react";
import { usePmxStore, type PmxPendingInviteForMe } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";

// Uppercase, strip anything that isn't a code character, cap at 8, format
// XXXX-XXXX as the user types — same convention as PmxJoinCode.tsx's
// full-page join flow, which this modal is a compact, in-context version of
// (both drive off the same store actions: resolveInviteCode/acceptInviteCode).
function formatCodeInput(raw: string): string {
  const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return stripped.length > 4 ? `${stripped.slice(0, 4)}-${stripped.slice(4)}` : stripped;
}

type ViewState =
  | { view: "entering" }
  | { view: "resolving" }
  | { view: "confirm"; workspaceName: string; memberCount?: number; sourceCount?: number; roleLabel?: string }
  | { view: "already_member"; workspaceName: string; projectId: string }
  | { view: "error"; message: string }
  | { view: "joining" };

type InviteTabState =
  | { view: "loading" }
  | { view: "list"; invites: PmxPendingInviteForMe[] }
  | { view: "accepting" }
  | { view: "error"; message: string };

export default function JoinWorkspaceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolveInviteCode, acceptInviteCode, acceptEmailInvite, fetchPendingInvitesForMe, setProjectId } = usePmxStore();

  const [tab, setTab] = useState<"code" | "invitations">("code");
  const [code, setCode] = useState("");
  const [state, setState] = useState<ViewState>({ view: "entering" });
  const [emptyError, setEmptyError] = useState(false);
  const [inviteTabState, setInviteTabState] = useState<InviteTabState>({ view: "loading" });

  useEffect(() => {
    if (!isOpen || tab !== "invitations") return;
    setInviteTabState({ view: "loading" });
    fetchPendingInvitesForMe().then((invites) => setInviteTabState({ view: "list", invites }));
  }, [isOpen, tab, fetchPendingInvitesForMe]);

  const reset = () => {
    setTab("code");
    setCode("");
    setState({ view: "entering" });
    setEmptyError(false);
    setInviteTabState({ view: "loading" });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAcceptEmailInvite = async (token: string) => {
    setInviteTabState({ view: "accepting" });
    const result = await acceptEmailInvite(token);
    if (!result) {
      setInviteTabState({ view: "error", message: "Couldn't accept this invitation. Please try again." });
      return;
    }
    toast({ title: `Joined "${result.workspaceName}"` });
    handleClose();
    navigate(`/pmx/overview?workspace=${result.projectId}`);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setEmptyError(true);
      return;
    }
    if (code.length !== 9) {
      setState({ view: "error", message: "That code looks incomplete — codes are 8 characters, e.g. PMX-7K4D2Q." });
      return;
    }
    setEmptyError(false);
    setState({ view: "resolving" });
    const result = await resolveInviteCode(code);
    if (!result) {
      setState({ view: "error", message: "Couldn't check that code right now. Please try again." });
      return;
    }
    switch (result.status) {
      case "valid":
        setState({
          view: "confirm",
          workspaceName: result.workspaceName || "this workspace",
          memberCount: result.memberCount,
          sourceCount: result.sourceCount,
          roleLabel: result.roleLabel,
        });
        break;
      case "already_member":
        setState({ view: "already_member", workspaceName: result.workspaceName || "this workspace", projectId: result.projectId! });
        break;
      default:
        setState({ view: "error", message: result.message || "That invite code isn't valid." });
    }
  };

  const handleConfirmJoin = async () => {
    setState({ view: "joining" });
    const result = await acceptInviteCode(code);
    if (!result) {
      setState({ view: "error", message: "Couldn't join this workspace. Please try again." });
      return;
    }
    toast({ title: `Joined "${result.workspaceName}"` });
    setProjectId(result.projectId);
    handleClose();
    navigate(`/pmx/overview?workspace=${result.projectId}`);
  };

  const handleOpenWorkspace = (projectId: string) => {
    setProjectId(projectId);
    handleClose();
    navigate(`/pmx/overview?workspace=${projectId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Tab switcher — only shown at each tab's base/idle state, so
                switching tabs mid-flow (resolving a code, accepting an
                invite) can't happen. */}
            {((tab === "code" && (state.view === "entering" || state.view === "resolving")) ||
              (tab === "invitations" && inviteTabState.view !== "accepting")) && (
              <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 mb-5">
                <button
                  onClick={() => setTab("code")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    tab === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" /> Join with code
                </button>
                <button
                  onClick={() => setTab("invitations")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    tab === "invitations" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Accept an invitation
                </button>
              </div>
            )}

            {tab === "code" && (state.view === "entering" || state.view === "resolving") && (
              <div className="flex flex-col items-center gap-4 text-center pt-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Join a Workspace</h1>
                  <p className="text-xs text-muted-foreground mt-1.5">Enter the workspace invite code shared by your team.</p>
                </div>

                <div className="w-full text-left">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Workspace code</label>
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => { setCode(formatCodeInput(e.target.value)); setEmptyError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="e.g. PMX-7K4D2Q"
                    disabled={state.view === "resolving"}
                    className={`mt-1 w-full text-center text-lg font-mono tracking-widest bg-background border rounded-lg px-3 py-2.5 text-foreground focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-60 ${
                      emptyError ? "border-destructive" : "border-border focus:border-ring"
                    }`}
                  />
                  {emptyError && <p className="text-[11px] text-destructive mt-1.5">Enter an invite code to continue.</p>}
                </div>

                <div className="w-full flex items-center gap-2 pt-1">
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={state.view === "resolving"}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                  >
                    {state.view === "resolving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Workspace"}
                  </button>
                </div>
              </div>
            )}

            {state.view === "confirm" && (
              <div className="flex flex-col items-center gap-4 text-center pt-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold text-foreground">{state.workspaceName}</h1>
                  <div className="flex items-center justify-center gap-2.5 mt-1.5 text-[11px] text-muted-foreground">
                    {typeof state.sourceCount === "number" && (
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" />{state.sourceCount} source{state.sourceCount === 1 ? "" : "s"}</span>
                    )}
                    {typeof state.memberCount === "number" && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{state.memberCount} member{state.memberCount === 1 ? "" : "s"}</span>
                    )}
                  </div>
                </div>
                <div className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  You will join as <span className="text-foreground font-semibold">{state.roleLabel || "Member"}</span>
                </div>
                <div className="w-full flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 rounded-xl border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmJoin}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                  >
                    Join Workspace
                  </button>
                </div>
              </div>
            )}

            {state.view === "joining" && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Joining workspace…</p>
              </div>
            )}

            {state.view === "already_member" && (
              <div className="flex flex-col items-center gap-4 text-center pt-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Users className="h-5 w-5" />
                </span>
                <p className="text-sm text-foreground">You're already a member of <span className="font-semibold">{state.workspaceName}</span>.</p>
                <button
                  onClick={() => handleOpenWorkspace(state.projectId)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                >
                  Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {tab === "code" && state.view === "error" && (
              <div className="py-2 flex flex-col items-center gap-3 text-center">
                <XCircle className="h-8 w-8 text-destructive/70" />
                <p className="text-sm text-foreground">{state.message}</p>
                <button
                  onClick={reset}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-border text-foreground text-xs font-semibold px-4 py-2 hover:bg-muted transition-colors"
                >
                  Try another code
                </button>
              </div>
            )}

            {/* Accept an invitation tab */}
            {tab === "invitations" && inviteTabState.view === "loading" && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Checking for invitations…</p>
              </div>
            )}

            {tab === "invitations" && inviteTabState.view === "accepting" && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Joining workspace…</p>
              </div>
            )}

            {tab === "invitations" && inviteTabState.view === "error" && (
              <div className="py-2 flex flex-col items-center gap-3 text-center">
                <XCircle className="h-8 w-8 text-destructive/70" />
                <p className="text-sm text-foreground">{inviteTabState.message}</p>
              </div>
            )}

            {tab === "invitations" && inviteTabState.view === "list" && (
              inviteTabState.invites.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center py-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border/40 text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </span>
                  <p className="text-sm text-foreground">No pending invitations</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    Invitations sent to your account's email will show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inviteTabState.invites.map((inv) => (
                    <div key={inv.token} className="rounded-xl border border-border bg-card/30 p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{inv.workspaceName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {inv.invitedByName} invited you as <span className="text-foreground/80">{inv.roleLabel}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleAcceptEmailInvite(inv.token)}
                        className="shrink-0 flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold px-3 py-1.5 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
