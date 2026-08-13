import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, ArrowRight, XCircle, Mail } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { usePmxStore } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import AuthModal from "@/components/AuthModal";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";
const PENDING_EMAIL_INVITE_KEY = "pmx_pending_email_invite_token";

type PublicPreview =
  | { status: "invalid" | "expired" | "revoked" }
  | { status: "valid" | "accepted"; workspaceName: string; roleLabel: string; invitedByName: string };

type ViewState =
  | { view: "loading" }
  | { view: "invalid" }
  | { view: "expired" }
  | { view: "revoked" }
  | { view: "needs_auth"; workspaceName: string; roleLabel: string; invitedByName: string }
  | { view: "ready"; workspaceName: string; roleLabel: string }
  | { view: "already_member"; workspaceName: string; projectId: string }
  | { view: "mismatch"; invitedEmail: string; workspaceName: string }
  | { view: "accepting" }
  | { view: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  invalid: "This invitation isn't valid — it may have already been used with a different account.",
  expired: "This invitation has expired. Ask the workspace admin to resend it.",
  revoked: "This invitation has been revoked.",
};

export default function PmxAcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthStore();
  const { resolveEmailInvite, acceptEmailInvite, setProjectId } = usePmxStore();

  const [publicPreview, setPublicPreview] = useState<PublicPreview | null>(null);
  const [state, setState] = useState<ViewState>({ view: "loading" });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Step 1 — public preview (no auth required), mirrors PmxJoin.tsx's
  // fetch of /pmx-invite/:token for the legacy code flow.
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/pmx-invite-email/${token}`);
        const json = await res.json();
        setPublicPreview(json.success ? json.data : { status: "invalid" });
      } catch {
        setPublicPreview({ status: "invalid" });
      }
    })();
  }, [token]);

  // Step 2 — once the preview resolves and auth state is known, either show
  // the sign-in prompt or run the authenticated resolve for the
  // email-match/already-member checks the public preview can't do.
  useEffect(() => {
    if (!publicPreview || !token) return;
    if (publicPreview.status !== "valid" && publicPreview.status !== "accepted") {
      setState({ view: publicPreview.status });
      return;
    }
    const preview = publicPreview;
    if (authLoading) return;
    if (!user) {
      setState({ view: "needs_auth", workspaceName: preview.workspaceName, roleLabel: preview.roleLabel, invitedByName: preview.invitedByName });
      return;
    }
    (async () => {
      setState({ view: "loading" });
      const result = await resolveEmailInvite(token);
      if (!result) {
        setState({ view: "error", message: "Couldn't check this invitation right now. Please try again." });
        return;
      }
      switch (result.status) {
        case "valid":
          setState({ view: "ready", workspaceName: result.workspaceName!, roleLabel: result.roleLabel! });
          break;
        case "already_member":
          setState({ view: "already_member", workspaceName: result.workspaceName!, projectId: result.projectId! });
          break;
        case "email_mismatch":
          setState({ view: "mismatch", invitedEmail: result.invitedEmail!, workspaceName: result.workspaceName! });
          break;
        default:
          setState({ view: "error", message: ERROR_COPY[result.status] || "This invitation is no longer valid." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicPreview, authLoading, user, token]);

  const handleAccept = async () => {
    if (!token) return;
    setState({ view: "accepting" });
    setAcceptError(null);
    const result = await acceptEmailInvite(token);
    if (!result) {
      setAcceptError("Couldn't accept this invitation. Please try again.");
      setState({ view: "ready", workspaceName: (state as any).workspaceName, roleLabel: (state as any).roleLabel });
      return;
    }
    toast({ title: `Joined "${result.workspaceName}"` });
    navigate(`/pmx/overview?workspace=${result.projectId}`);
  };

  const handleSignInToAccept = () => {
    if (token) sessionStorage.setItem(PENDING_EMAIL_INVITE_KEY, token);
    setAuthModalOpen(true);
  };

  const handleOpenWorkspace = (projectId: string) => {
    setProjectId(projectId);
    navigate(`/pmx/overview?workspace=${projectId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 h-64 -z-0"
        style={{
          background: "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(56,189,248,0.13) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-lg p-7 text-center"
        >
          {(state.view === "loading" || state.view === "accepting") && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{state.view === "accepting" ? "Joining workspace…" : "Checking invitation…"}</p>
            </div>
          )}

          {(state.view === "invalid" || state.view === "expired" || state.view === "revoked") && (
            <div className="py-4 flex flex-col items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive/70" />
              <h1 className="text-sm font-bold text-foreground">
                {state.view === "expired" ? "Invitation expired" : state.view === "revoked" ? "Invitation revoked" : "Invalid invitation"}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">{ERROR_COPY[state.view]}</p>
              <button
                onClick={() => navigate("/pmx/overview")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 transition-colors"
              >
                Go to PMX
              </button>
            </div>
          )}

          {state.view === "error" && (
            <div className="py-4 flex flex-col items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive/70" />
              <p className="text-sm text-foreground">{state.message}</p>
            </div>
          )}

          {state.view === "mismatch" && (
            <div className="py-2 flex flex-col items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Mail className="h-5 w-5" />
              </span>
              <h1 className="text-sm font-bold text-foreground">Wrong account</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This invitation to <span className="text-foreground font-semibold">{state.workspaceName}</span> was sent to{" "}
                <span className="text-foreground font-semibold">{state.invitedEmail}</span>. Sign in with that email address to accept it.
              </p>
            </div>
          )}

          {(state.view === "needs_auth" || state.view === "ready") && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="h-5 w-5" />
              </span>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400 mb-1">Workspace invitation</p>
                <h1 className="text-lg font-bold text-foreground">{state.workspaceName}</h1>
                {state.view === "needs_auth" && (
                  <p className="text-xs text-muted-foreground mt-1.5">Invited by {state.invitedByName}</p>
                )}
              </div>

              <div className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                You'll join as <span className="text-foreground font-semibold">{state.roleLabel}</span>
              </div>

              {acceptError && <p className="text-xs text-destructive">{acceptError}</p>}

              {state.view === "ready" ? (
                <button
                  onClick={handleAccept}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                >
                  Accept invitation <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSignInToAccept}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                >
                  Sign in or create an account to accept
                </button>
              )}
            </div>
          )}

          {state.view === "already_member" && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="h-5 w-5" />
              </span>
              <p className="text-sm text-foreground">
                You're already a member of <span className="font-semibold">{state.workspaceName}</span>.
              </p>
              <button
                onClick={() => handleOpenWorkspace(state.projectId)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
              >
                Open Workspace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
