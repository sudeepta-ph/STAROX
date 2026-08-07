import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package, Plus, ExternalLink, Trash2, Search, Loader2, Clock, Database, Check, X, Pencil,
} from "lucide-react";
import { usePmxStore, type PmxWorkspaceSummary } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";

function sourceTag(w: PmxWorkspaceSummary): string {
  if (w.isProject) return `Project · ${w.sourceCount} source${w.sourceCount === 1 ? "" : "s"}`;
  if (w.sourceCount === 1) return "1 source";
  return "No sources yet";
}

export default function PmxProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspaces, workspacesLoading, fetchWorkspaces, startFreshWorkspace, renameWorkspace, projectId, setProjectId, deleteProject } = usePmxStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PmxWorkspaceSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const filtered = workspaces.filter(w =>
    !searchQuery ||
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.primarySource?.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openProduct = (w: PmxWorkspaceSummary) => {
    setProjectId(w.projectId);
    navigate("/pmx/overview");
  };

  const createProduct = () => {
    startFreshWorkspace();
    navigate("/pmx/overview");
  };

  const startRename = (w: PmxWorkspaceSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(w.projectId);
    setRenameDraft(w.name);
  };

  const saveRename = async (w: PmxWorkspaceSummary) => {
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === w.name) { setRenamingId(null); return; }
    setSavingRename(true);
    try {
      const ok = await renameWorkspace(w.projectId, trimmed);
      if (!ok) toast({ variant: "destructive", title: "Couldn't rename product" });
    } finally {
      setSavingRename(false);
      setRenamingId(null);
    }
  };

  const removeProduct = async (w: PmxWorkspaceSummary) => {
    setDeletingId(w.projectId);
    try {
      const ok = await deleteProject(w.projectId);
      if (ok) {
        toast({ title: "Product deleted", description: `"${w.name}" was removed.` });
        fetchWorkspaces();
      } else {
        toast({ variant: "destructive", title: "Couldn't delete product" });
      }
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="relative flex flex-col min-h-full bg-background">
      {/* Ambient top glow, matches Overview */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 h-64 -z-0"
        style={{
          background: "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(56,189,248,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 pt-10 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/8 border border-sky-500/15 px-3 py-1 rounded-full tracking-wide mb-3">
              <Package className="h-3 w-3" />
              All Products
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Every product workspace PMX is tracking for you — switch, create, or clean up from here.
            </p>
          </div>
          <button
            onClick={createProduct}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-200 shadow-[0_2px_12px_rgba(56,189,248,0.22)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.35)]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Product
          </button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="relative mb-6"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border focus:border-ring rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
        </motion.div>

        {/* Loading */}
        {workspacesLoading && workspaces.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {/* Product grid */}
        {(!workspacesLoading || workspaces.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filtered.map((w, i) => {
              const active = w.projectId === projectId;
              return (
                <motion.div
                  key={w.projectId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  onClick={() => openProduct(w)}
                  className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                    active
                      ? "border-sky-500/40 bg-sky-500/[0.06] shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                      : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        active ? "bg-sky-500/15 border-sky-500/25" : "bg-muted/50 border-border/60"
                      }`}>
                        <Package className={`h-4 w-4 ${active ? "text-sky-400" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {renamingId === w.projectId ? (
                          <input
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(w);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => saveRename(w)}
                            disabled={savingRename}
                            className="w-full bg-background border border-primary/40 rounded-lg px-2 py-1 text-sm font-semibold text-foreground focus:outline-none disabled:opacity-60"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {w.name}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate">{sourceTag(w)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {active && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5 mr-0.5">
                          <Check className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                      <button
                        onClick={(e) => startRename(w, e)}
                        title="Rename product"
                        className="p-1.5 rounded-lg text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(w); }}
                        title="Delete product"
                        className="p-1.5 rounded-lg text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {w.primarySource?.url && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/30">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{w.primarySource.url}</span>
                    </div>
                  )}
                  <div className={`flex items-center justify-between text-[10px] text-muted-foreground/80 ${w.primarySource?.url ? "mt-2" : "mt-3 pt-3 border-t border-border/30"}`}>
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />{w.sourceCount} source{w.sourceCount === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(w.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {!workspacesLoading && filtered.length === 0 && (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-border/60 bg-card/20 py-16 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {workspaces.length === 0 ? "No products yet." : "No products match your search."}
                </p>
                {workspaces.length === 0 && (
                  <button
                    onClick={createProduct}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create your first product
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl relative"
            >
              <button
                onClick={() => setConfirmDelete(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-foreground pr-6">Delete "{confirmDelete.name}"?</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                This permanently removes the product and everything PMX has learned about it.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 rounded-xl border border-border hover:bg-muted py-2 text-xs font-semibold text-foreground/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeProduct(confirmDelete)}
                  disabled={deletingId === confirmDelete.projectId}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-400 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {deletingId === confirmDelete.projectId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
