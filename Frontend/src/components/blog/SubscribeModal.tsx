import { useState } from "react";
import { Loader2, Check, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

type SubscribeState = "idle" | "loading" | "success" | "already" | "invalid" | "error";

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubscribeModal({ open, onOpenChange }: SubscribeModalProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubscribeState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Reset after the close animation so the form doesn't visibly flash
      // back to "idle" mid-close.
      setTimeout(() => { setState("idle"); setEmail(""); setMessage(null); }, 200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/blogs/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        // 400 = invalid email, anything else (429/500) is a generic error
        setState(res.status === 400 ? "invalid" : "error");
        setMessage(json.error || "Enter a valid email address.");
        return;
      }

      if (json.code === "ALREADY_SUBSCRIBED") {
        setState("already");
        setMessage(json.message || "You're already subscribed to the STAROX Blog.");
      } else if (json.success) {
        setState("success");
        setMessage(json.message || "You're subscribed. We'll email you when a new post is published.");
      } else {
        setState("error");
        setMessage(json.error || "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Please check your connection and try again.");
    }
  };

  const isDone = state === "success" || state === "already";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-sm">
        {isDone ? (
          <div className="py-2 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {state === "already" ? "You're already subscribed" : "You're subscribed"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              New STAROX Blog posts will be sent to your inbox.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Subscribe to the STAROX Blog
              </DialogTitle>
              <DialogDescription>
                Get new engineering updates, research, product launches, tutorials, and company insights delivered to your inbox.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === "invalid" || state === "error") setState("idle"); }}
                placeholder="email@example.com"
                className="w-full h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground transition-colors"
              />
              {(state === "invalid" || state === "error") && message && (
                <p className="text-xs text-destructive">{message}</p>
              )}
              <button
                type="submit"
                disabled={state === "loading" || !email.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Subscribe
              </button>
              <p className="text-[11px] text-center text-muted-foreground">You can unsubscribe at any time.</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
