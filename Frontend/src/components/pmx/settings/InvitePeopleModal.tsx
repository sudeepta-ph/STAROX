import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Loader2 } from "lucide-react";
import { usePmxStore, PMX_INVITE_ROLES, PMX_ROLE_LABELS, type PmxInviteRole } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";

const SEND_RESULT_LABEL: Record<string, string> = {
  sent: "Invitation sent",
  already_member: "Already a member",
  already_pending: "Invitation already pending",
  invalid: "Invalid email address",
};

// The first-class "Invite people" experience — opened from Team's header
// button. Calls the same sendEmailInvites() action the rest of the app
// already uses (no new invite mechanism).
export function InvitePeopleModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { sendEmailInvites } = usePmxStore();
  const { toast } = useToast();

  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState<PmxInviteRole>("member");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setEmails([""]);
    setRole("member");
  };

  const handleClose = () => {
    if (!sending) { reset(); onClose(); }
  };

  const updateEmail = (i: number, value: string) => setEmails(prev => prev.map((e, idx) => (idx === i ? value : e)));
  const addRow = () => setEmails(prev => [...prev, ""]);
  const removeRow = (i: number) => setEmails(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const handleSend = async () => {
    const list = emails.map(e => e.trim()).filter(Boolean);
    if (list.length === 0) return;
    setSending(true);
    try {
      const results = await sendEmailInvites({ emails: list, role });
      if (!results) return;
      const sentCount = results.filter(r => r.status === "sent").length;
      const rest = results.filter(r => r.status !== "sent");
      if (sentCount > 0 && rest.length === 0) {
        toast({ title: sentCount === 1 ? "Invitation sent" : `${sentCount} invitations sent` });
        handleClose();
      } else {
        toast({
          title: sentCount > 0 ? `${sentCount} sent, ${rest.length} skipped` : "No invitations sent",
          description: rest.map(r => `${r.email}: ${SEND_RESULT_LABEL[r.status]}`).join(" · "),
        });
        if (sentCount > 0) handleClose();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Invite people</DialogTitle>
          <DialogDescription>Add teammates to this workspace.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            {emails.map((email, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="email"
                  autoFocus={i === 0}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                  className="flex-1 h-10 bg-background border border-border focus:border-ring rounded-lg px-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
                {emails.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addRow} className="text-xs font-semibold text-primary hover:underline">
              + Add another email
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground/90">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PmxInviteRole)}
              className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
            >
              {PMX_INVITE_ROLES.map(r => <option key={r} value={r}>{PMX_ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleClose}
            disabled={sending}
            className="flex-1 h-10 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || emails.every(e => !e.trim())}
            className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold transition-colors"
          >
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send invitations
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
