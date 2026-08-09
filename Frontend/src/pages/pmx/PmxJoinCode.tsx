import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, KeyRound, ArrowRight, XCircle, Users } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { usePmxStore } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import AuthModal from "@/components/AuthModal";

const PENDING_CODE_KEY = "pmx_pending_invite_code";

type Status = "valid" | "already_member" | "invalid" | "expired" | "revoked" | "limit_reached";

type ViewState =
  | { view: "entering" }
  | { view: "resolving" }
  | { view: "confirm"; workspaceName: string }
  | { view: "already_member"; workspaceName: string; projectId: string }
  | { view: "error"; message: string }
  | { view: "joining" };

// Uppercase, strip anything that isn't a code character, cap at 8, format
// XXXX-XXXX as the user types.
function formatCodeInput(raw: string): string {
  const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return stripped.length > 4 ? `${stripped.slice(0, 4)}-${stripped.slice(4)}` : stripped;
}

export default function PmxJoinCode() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthStore();
  const { resolveInviteCode, acceptInviteCode, setProjectId } = usePmxStore();

  const [code, setCode] = useState("");
  const [state, setState] = useState<ViewState>({ view: "entering" });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const runResolve = async (candidate: string) => {
    setState({ view: "resolving" });
    const result = await resolveInviteCode(candidate);
    if (!result) {
      setState({ view: "error", message: "Couldn't check that code right now. Please try again." });
      return;
    }
    const status = result.status as Status;
    if (status === "valid") {
      setState({ view: "confirm", workspaceName: result.workspaceName || "this workspace" });
    } else if (status === "already_member") {
      setState({ view: "already_member", workspaceName: result.workspaceName || "this workspace", projectId: result.projectId! });
    } else {
      setState({ view: "error", message: result.message || "That invite code isn't valid." });
    }
  };

  // Resume after sign-in (either via ?code= from ClerkAuthSync's redirect,
  // or a code already sitting in the input) — mirrors the pending-token
  // resume pattern in PmxJoin.tsx.
  useEffect(() => {
    if (authLoading || !user) return;
    const fromQuery = searchParams.get("code");
    const pending = fromQuery || sessionStorage.getItem(PENDING_CODE_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_CODE_KEY);
      const formatted = formatCodeInput(pending);
      setCode(formatted);
      runResolve(formatted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleSubmit = () => {
    if (code.length !== 9) return;
    if (!authLoading && !user) {
      sessionStorage.setItem(PENDING_CODE_KEY, code);
      setAuthModalOpen(true);
      return;
    }
    runResolve(code);
  };

  const handleConfirmJoin = async () => {
    setState({ view: "joining" });
    const result = await acceptInviteCode(code);
    if (!result) {
      setState({ view: "error", message: "Couldn't join this workspace. Please try again." });
      return;
    }
    toast({ title: `You're now a member of ${result.workspaceName}.` });
    navigate("/pmx/overview");
  };

  const handleOpenWorkspace = (projectId: string) => {
    setProjectId(projectId);
    navigate("/pmx/overview");
  };

  const reset = () => {
    setCode("");
    setState({ view: "entering" });
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
          {(state.view === "entering" || state.view === "resolving") && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-foreground">Join a workspace</h1>
                <p className="text-xs text-muted-foreground mt-1.5">Enter the invite code shared with you.</p>
              </div>

              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(formatCodeInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="XXXX-XXXX"
                disabled={state.view === "resolving"}
                className="w-full text-center text-lg font-mono tracking-widest bg-background border border-border focus:border-ring rounded-lg px-3 py-2.5 text-foreground focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
              />

              <button
                onClick={handleSubmit}
                disabled={code.length !== 9 || state.view === "resolving"}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
              >
                {state.view === "resolving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join Workspace <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>

              <p className="text-[11px] text-muted-foreground">
                Don't have a code? Ask a workspace owner or administrator.
              </p>
            </div>
          )}

          {state.view === "confirm" && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-foreground">Join {state.workspaceName}?</h1>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  You've been invited to join this workspace as a <span className="text-foreground font-semibold">Member</span>.
                </p>
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
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="h-5 w-5" />
              </span>
              <p className="text-sm text-foreground">You're already a member of this workspace.</p>
              <button
                onClick={() => handleOpenWorkspace(state.projectId)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
              >
                Open Workspace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {state.view === "error" && (
            <div className="py-2 flex flex-col items-center gap-3">
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
        </motion.div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
