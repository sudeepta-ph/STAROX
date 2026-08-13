import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Plus, X, UserMinus, Crown, ExternalLink } from "lucide-react";
import { usePmxStore, getPmxHeaders, PMX_ROLE_LABELS, PMX_INVITE_ROLES, type PmxWorkspaceMember, type PmxWorkspaceRole } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CATEGORY_PRESETS = [
  "SaaS", "Marketplace", "E-commerce", "Fintech", "Healthtech", "EdTech",
  "Developer Tools", "AI / ML", "Productivity", "Social", "Gaming", "Other",
];

const AUDIENCE_PRESETS = [
  "Developers", "Marketers", "Founders / Startups", "Enterprises",
  "Small Businesses", "Consumers", "Students", "Freelancers",
  "Non-technical Users", "Sales Teams", "Support Teams", "Designers",
];

export { CATEGORY_PRESETS, AUDIENCE_PRESETS };

// Single-select dropdown that also lets the user type and save a value not in the preset list.
export function CreatableSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setAdding(false); setCustomInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  const commitCustom = () => {
    const v = customInput.trim();
    if (v) { onChange(v); setOpen(false); }
    setAdding(false); setCustomInput("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-10 flex items-center justify-between bg-background border border-border hover:border-ring/50 rounded-lg px-3 text-sm text-left focus:outline-none transition-colors">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {allOptions.map(o => (
                <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${o === value ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-muted/50"}`}>
                  {o}
                  {o === value && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              {adding ? (
                <input
                  autoFocus
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } if (e.key === "Escape") { setAdding(false); setCustomInput(""); } }}
                  onBlur={commitCustom}
                  placeholder="Type a new category..."
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                />
              ) : (
                <button type="button" onClick={() => setAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add custom category
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Multi-select tag picker (backed by a single comma-separated string, matching the
// existing free-text `targetAudience` field on the understanding doc) that also lets
// the user type a custom audience tag not in the preset list.
export function TagMultiSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag];
    onChange(next.join(", "));
  };

  const addCustom = () => {
    const tag = customInput.trim();
    setCustomInput("");
    if (!tag || selected.includes(tag)) return;
    onChange([...selected, tag].join(", "));
  };

  const allOptions = [...new Set([...options, ...selected])];

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full min-h-[40px] flex flex-wrap items-center gap-1.5 bg-background border border-border hover:border-ring/50 rounded-lg px-3 py-2 text-sm text-left transition-colors">
        {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
        {selected.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 text-[11px] font-medium">
            {tag}
            <span role="button" onClick={e => { e.stopPropagation(); toggle(tag); }} className="hover:text-destructive cursor-pointer">
              <X className="h-2.5 w-2.5" />
            </span>
          </span>
        ))}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {allOptions.map(o => {
                const isSel = selected.includes(o);
                return (
                  <button key={o} type="button" onClick={() => toggle(o)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSel ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-muted/50"}`}>
                    {o}
                    {isSel && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border p-2 flex items-center gap-1.5">
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder="Add custom audience..."
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
              />
              <button type="button" onClick={addCustom} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Team members ────────────────────────────────────────────────────────────
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export const ROLE_BADGE_CLASS: Record<PmxWorkspaceRole, string> = {
  owner: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  admin: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  member: "text-muted-foreground bg-muted border-border",
  product_manager: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  engineering: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  designer: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  qa: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  marketing: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  sales: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  support: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  viewer: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

// Every role besides owner/admin is "member-tier" for management purposes —
// same access rank, same who-can-touch-whom rules. Viewer's actual write
// restriction is enforced server-side, not here.
export function isMemberTier(role: PmxWorkspaceRole) {
  return role !== "owner" && role !== "admin";
}

export function MemberRow({
  member, viewerRole, viewerUserId, onChangeRole, onRemove,
}: {
  member: PmxWorkspaceMember;
  viewerRole: PmxWorkspaceRole | null;
  viewerUserId: string | undefined;
  onChangeRole: (memberId: string, role: PmxWorkspaceRole) => void;
  onRemove: (memberId: string) => void;
}) {
  const isSelf = member.userId === viewerUserId;
  const isOwnerRow = member.role === "owner";
  // Only the owner may touch admin-tier rows; anyone with admin+ can manage
  // member-tier rows. Nobody can touch their own row or the owner's row here.
  const canManage = !isSelf && !isOwnerRow && (viewerRole === "owner" || (viewerRole === "admin" && isMemberTier(member.role)));

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0 overflow-hidden">
        {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : initials(member.name || member.email || "?")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate flex items-center gap-1.5">
          {member.name || "Unnamed"}
          {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_BADGE_CLASS[member.role]}`}>
        {isOwnerRow && <Crown className="h-2.5 w-2.5" />}
        {PMX_ROLE_LABELS[member.role]}
      </span>
      {canManage && (
        <div className="shrink-0 flex items-center gap-1">
          <select
            value={member.role}
            onChange={(e) => onChangeRole(member._id, e.target.value as PmxWorkspaceRole)}
            className="bg-background border border-border rounded-lg px-1.5 py-1 text-[11px] text-foreground focus:outline-none"
          >
            <option value="admin">Admin</option>
            {PMX_INVITE_ROLES.filter(r => r !== "admin").map(r => (
              <option key={r} value={r}>{PMX_ROLE_LABELS[r]}</option>
            ))}
          </select>
          <button
            onClick={() => onRemove(member._id)}
            title="Remove from workspace"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <UserMinus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sources ──────────────────────────────────────────────────────────────────
export function SourceSettingsRow({ input }: { input: { _id: string; name: string; url?: string; type: string; status: string; isArchived?: boolean; updatedAt?: string; createdAt: string } }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const toggleArchive = async () => {
    setBusy(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs/${input._id}/archive`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isArchived: !input.isArchived }),
      });
      const json = await res.json();
      if (json.success) {
        usePmxStore.getState().fetchInputs();
      } else {
        toast({ variant: "destructive", title: "Couldn't update source" });
      }
    } catch {
      toast({ variant: "destructive", title: "Couldn't update source" });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = () => {
    if (input.url) window.open(input.url, "_blank", "noopener,noreferrer");
    else navigate("/pmx/sources");
  };

  const statusClass = input.status === "completed"
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : input.status === "failed"
      ? "text-red-400 bg-red-500/10 border-red-500/20"
      : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate">{input.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground capitalize">{input.type}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${statusClass}`}>{input.status}</span>
          <span className="text-[11px] text-muted-foreground">Synced {timeAgo(input.updatedAt || input.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleOpen}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Open
        </button>
        <button
          onClick={toggleArchive}
          disabled={busy}
          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            input.isArchived
              ? "border-primary/30 text-primary hover:bg-primary/10"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {input.isArchived ? "Include" : "Archive"}
        </button>
      </div>
    </div>
  );
}
