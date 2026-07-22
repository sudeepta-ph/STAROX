import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FolderOpen, Plus, BarChart3, Clock, Sparkles,
  ExternalLink, Trash2, Search, Loader2, Globe, X, Star,
} from "lucide-react";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy, updateDoc, type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  url: string;
  status: "active" | "completed" | "paused";
  createdAt: Timestamp | null;
  aiRuns: number;
  suggestions: number;
  starred?: boolean;
}

const statusColors = {
  active:    "bg-primary/15 text-primary border-primary/25",
  completed: "bg-primary/20 text-primary border-primary/30",
  paused:    "bg-primary/10 text-primary/80 border-primary/20",
};

const ProjectsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("filter") ?? "all");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Sync filter from URL param
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) setFilterStatus(f);
  }, [searchParams]);

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // Safety timeout — never spin forever
    const timeout = setTimeout(() => setLoading(false), 6000);

    const q = query(
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(timeout);
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeout);
        console.error("Projects query error:", err.message);
        // Index missing — fall back to unordered fetch
        const fallbackQ = query(collection(db, "users", user.uid, "projects"));
        onSnapshot(fallbackQ, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
          docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setProjects(docs);
          setLoading(false);
        });
      }
    );
    return () => { clearTimeout(timeout); unsub(); };
  }, [user]);

  const createProject = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      let url = newUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      await addDoc(collection(db, "users", user.uid, "projects"), {
        name: newName.trim(),
        url,
        status: "active",
        createdAt: serverTimestamp(),
        aiRuns: 0,
        suggestions: 0,
      });
      setNewName("");
      setNewUrl("");
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "projects", id));
  };

  const toggleStar = async (project: Project) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "projects", project.id), {
      starred: !project.starred,
    });
  };

  const openProjectForAnalysis = (project: Project) => {
    if (!project.url) return;
    if (user) {
      void updateDoc(doc(db, "users", user.uid, "projects", project.id), {
        lastViewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    navigate(`/pmx?url=${encodeURIComponent(project.url)}`);
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.url?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      filterStatus === "all" ? true :
      filterStatus === "starred" ? p.starred === true :
      p.status === filterStatus;
    return matchSearch && matchFilter;
  });

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 text-center gap-3">
        <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">Sign in to manage projects</p>
        <p className="text-xs text-muted-foreground">Your projects are saved to your account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </motion.button>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-display font-bold text-foreground mb-2">Projects</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm">Manage your product analysis projects.</motion.p>
        </div>
        <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
          <Plus className="w-4 h-4" /> New Project
        </motion.button>
      </div>

      {/* New project modal */}
      <AnimatePresence>
        {showNew && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNew(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-display font-bold text-foreground">New Project</h2>
                  <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Project name</label>
                    <input type="text" placeholder="My Product" value={newName} onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Website URL (optional)</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="url" placeholder="https://yourproduct.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createProject()}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowNew(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                    Cancel
                  </button>
                  <button onClick={createProject} disabled={!newName.trim() || creating}
                    className="flex-1 py-2.5 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search projects…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "starred", "active", "completed", "paused"].map((s) => (
            <button key={s} onClick={() => {
              setFilterStatus(s);
              if (s === "all") setSearchParams({});
              else setSearchParams({ filter: s });
            }}
              className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all border flex items-center gap-1.5 ${
                filterStatus === s ? "bg-primary/10 text-primary border-primary/30" : "bg-surface border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20"
              }`}>
              {s === "starred" && <Star className="w-3 h-3" />}
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      {projects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Projects", value: projects.length, icon: FolderOpen },
            { label: "Active", value: projects.filter(p => p.status === "active").length, icon: Sparkles },
            { label: "Total AI Runs", value: projects.reduce((s, p) => s + (p.aiRuns ?? 0), 0), icon: BarChart3 },
            { label: "Suggestions", value: projects.reduce((s, p) => s + (p.suggestions ?? 0), 0), icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <stat.icon className="w-4 h-4 text-primary mx-auto mb-2" />
              <p className="text-xl font-display font-bold gradient-text">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Project list */}
      {!loading && (
        <div className="grid gap-4">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass-card p-5 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => openProjectForAnalysis(project)}
                      className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors text-left"
                      title="Open project in Product Intelligence"
                    >
                      {project.name}
                    </button>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${statusColors[project.status] ?? statusColors.active}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.url && (
                    <button
                      type="button"
                      onClick={() => openProjectForAnalysis(project)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-3 w-fit text-left"
                      title="Regenerate in Product Intelligence"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-xs">{project.url}</span>
                    </button>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3 h-3 text-primary" />{project.aiRuns ?? 0} AI runs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-accent" />{project.suggestions ?? 0} suggestions
                    </span>
                    {project.createdAt && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(project.createdAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-100">
                  {project.url && (
                    <button
                      type="button"
                      onClick={() => openProjectForAnalysis(project)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-surface-hover transition-colors"
                      title="Regenerate"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void toggleStar(project); }}
                    className={`p-2 rounded-lg transition-colors ${project.starred ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" : "text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10"}`}
                    title={project.starred ? "Unstar" : "Star"}
                  >
                    <Star className={`w-4 h-4 ${project.starred ? "fill-yellow-400" : ""}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); void deleteProject(project.id); }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {!loading && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {projects.length === 0 ? "No projects yet." : "No projects match your search."}
              </p>
              {projects.length === 0 && (
                <button onClick={() => setShowNew(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl gradient-starox text-white text-xs font-medium hover:opacity-90 transition-opacity mx-auto">
                  <Plus className="w-3.5 h-3.5" /> Create your first project
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
