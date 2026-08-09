import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

type Status = "loading" | "unsubscribed" | "invalid" | "resubscribing" | "resubscribed";

export default function BlogUnsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/blogs/unsubscribe/${token}`, { method: "POST" });
        const json = await res.json();
        if (json.success) {
          setStatus("unsubscribed");
          setMessage(json.message);
        } else {
          setStatus("invalid");
          setMessage(json.error);
        }
      } catch {
        setStatus("invalid");
        setMessage("Couldn't reach the server. Please try again.");
      }
    })();
  }, [token]);

  const handleResubscribe = async () => {
    if (!token) return;
    setStatus("resubscribing");
    try {
      const res = await fetch(`${API_URL}/blogs/resubscribe/${token}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setStatus("resubscribed");
        setMessage(json.message);
      } else {
        setStatus("unsubscribed");
        setMessage(json.error || "Couldn't resubscribe right now.");
      }
    } catch {
      setStatus("unsubscribed");
      setMessage("Couldn't reach the server. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/40 p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Processing your request…</p>
          </>
        )}

        {status === "invalid" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <h1 className="text-base font-semibold text-foreground">This link isn't valid</h1>
            <p className="text-sm text-muted-foreground">{message || "This unsubscribe link is invalid or has expired."}</p>
            <Link to="/blog" className="inline-block text-sm text-primary hover:underline">Back to the STAROX Blog</Link>
          </>
        )}

        {(status === "unsubscribed" || status === "resubscribing") && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-base font-semibold text-foreground">You're unsubscribed from the STAROX Blog.</h1>
            <button
              onClick={handleResubscribe}
              disabled={status === "resubscribing"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {status === "resubscribing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Resubscribe
            </button>
          </>
        )}

        {status === "resubscribed" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-base font-semibold text-foreground">You're subscribed</h1>
            <p className="text-sm text-muted-foreground">New STAROX Blog posts will be sent to your inbox.</p>
            <Link to="/blog" className="inline-block text-sm text-primary hover:underline">Back to the STAROX Blog</Link>
          </>
        )}
      </div>
    </div>
  );
}
