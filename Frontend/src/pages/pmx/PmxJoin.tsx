import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, ArrowRight, XCircle } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { usePmxStore } from "@/lib/pmxStore";
import AuthModal from "@/components/AuthModal";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";
const PENDING_INVITE_KEY = "pmx_pending_invite_token";

type ResolveState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "valid"; workspaceName: string; memberCount: number };

export default function PmxJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const acceptInvite = usePmxStore((s) => s.acceptInvite);

  const [resolved, setResolved] = useState<ResolveState>({ status: "loading" });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/pmx-invite/${token}`);
        const json = await res.json();
        if (json.success && json.data.valid) {
          setResolved({ status: "valid", workspaceName: json.data.workspaceName, memberCount: json.data.memberCount });
        } else {
          setResolved({ status: "invalid" });
        }
      } catch {
        setResolved({ status: "invalid" });
      }
    })();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setJoinError(null);
    const result = await acceptInvite(token);
    setJoining(false);
    if (!result) {
      setJoinError("Couldn't join this workspace. The link may have expired — ask for a new one.");
      return;
    }
    navigate("/pmx/overview");
  };

  const handleSignInToJoin = () => {
    if (token) sessionStorage.setItem(PENDING_INVITE_KEY, token);
    setAuthModalOpen(true);
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
          {resolved.status === "loading" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Checking invite link…</p>
            </div>
          )}

          {resolved.status === "invalid" && (
            <div className="py-4 flex flex-col items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive/70" />
              <h1 className="text-sm font-bold text-foreground">This invite link is no longer active</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                It may have been regenerated or revoked. Ask whoever shared it with you for a new link.
              </p>
              <button
                onClick={() => navigate("/pmx/overview")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 transition-colors"
              >
                Go to PMX
              </button>
            </div>
          )}

          {resolved.status === "valid" && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="h-5 w-5" />
              </span>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400 mb-1">
                  Workspace invite
                </p>
                <h1 className="text-lg font-bold text-foreground">{resolved.workspaceName}</h1>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {resolved.memberCount} {resolved.memberCount === 1 ? "person" : "people"} already here
                </p>
              </div>

              {!authLoading && user ? (
                <>
                  <div className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    You'll join as <span className="text-foreground font-semibold">Member</span>
                  </div>
                  {joinError && <p className="text-xs text-destructive">{joinError}</p>}
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                  >
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join Workspace <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSignInToJoin}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
                >
                  Sign in to join
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
