import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Sparkles,
  FileText,
  Award,
  Lightbulb,
  Clock,
  Settings,
  HelpCircle,
  Command,
  Layers,
  X,
} from "lucide-react";
import { usePmxStore } from "@/lib/pmxStore";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { type Product } from "@/components/pmx/ProductSwitcher";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const pmxNav = [
  { name: "Overview",  icon: LayoutDashboard, path: "/pmx/overview",  shortcut: "g o" },
  { name: "Sources",   icon: Database,        path: "/pmx/sources",   shortcut: "g s" },
  { name: "UI Analysis", icon: TrendingUp,      path: "/pmx/analysis",  shortcut: "g a", glow: true },
  { name: "Insights",  icon: Sparkles,        path: "/pmx/insights",  shortcut: "g i" },
  { name: "PRD",       icon: FileText,        path: "/pmx/prd",       shortcut: "g p" },
  { name: "Execution", icon: Award,           path: "/pmx/execution", shortcut: "g x" },
  { name: "Artifacts", icon: Lightbulb,       path: "/pmx/artifacts", shortcut: "g r" },
  { name: "History",   icon: Clock,           path: "/pmx/history",   shortcut: "g h" },
  { name: "PMX Settings", icon: Settings, path: "/pmx/settings", shortcut: "g ," },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

export default function PmxLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchAll, loading, fetchWorkspaces, workspaces, projectId, setProjectId, startFreshWorkspace, openTabIds, closeWorkspaceTab } = usePmxStore();
  const { collapsed } = useSidebarStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const products: Product[] = workspaces.map((w) => ({
    id: w.projectId,
    name: w.name,
    category: w.isProject ? "Project" : "Source",
    stage: "",
    workspace: `${w.sourceCount} source${w.sourceCount === 1 ? "" : "s"}`,
    lastSynced: timeAgo(w.updatedAt),
  }));
  // Only ever show a tab for a workspace that's actually real — an open
  // "tab" pointing at a projectId with no materialized workspace (fresh,
  // or since deleted) has nothing to show, so it's dropped rather than
  // rendered as a blank/placeholder pill. Home covers that state instead.
  const realOpenTabIds = openTabIds.filter((id) => products.some((p) => p.id === id));

  // Initial fetch of all state data
  useEffect(() => {
    fetchAll();
    fetchWorkspaces();
  }, [fetchAll, fetchWorkspaces]);

  // Keyboard Shortcuts (Linear-style)
  useEffect(() => {
    let lastKey = "";
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in inputs/textareas
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Open command search with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      // Linear-style two-key shortcuts: e.g. "g" then "o"
      if (lastKey === "g") {
        e.preventDefault();
        if (key === "o") navigate("/pmx/overview");
        if (key === "s") navigate("/pmx/sources");
        if (key === "a") navigate("/pmx/analysis");
        if (key === "i") navigate("/pmx/insights");
        if (key === "p") navigate("/pmx/prd");
        if (key === "x") navigate("/pmx/execution");
        if (key === "r") navigate("/pmx/artifacts");
        if (key === "h") navigate("/pmx/history");
        if (key === ",") navigate("/pmx/settings");
        lastKey = "";
      } else if (key === "g") {
        lastKey = "g";
        // Reset key combo after 800ms
        setTimeout(() => {
          if (lastKey === "g") lastKey = "";
        }, 800);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      
      {/* Dynamic Sidebar */}
      <Sidebar />

      {/* ── MAIN WORKSPACE CONTENT ────────────────────────────────── */}
      <div
        className="flex-grow flex flex-col min-w-0 transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        
        {/* Topbar Header */}
        <header className="hidden md:flex h-14 items-center justify-between border-b border-border/50 px-6 bg-background/80 backdrop-blur-md shrink-0 select-none relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 w-64 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/65 border border-border hover:border-border/80 text-muted-foreground text-left text-xs transition-colors"
            >
              <Command className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="flex-1">Search workspace (Cmd+K)</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded-lg bg-muted border border-border text-[9px] text-muted-foreground font-mono">
                ⌘K
              </kbd>
            </button>
            <div className="flex items-center gap-1 max-w-[420px] overflow-x-auto">
              <button
                onClick={() => { startFreshWorkspace(); navigate("/pmx/overview"); }}
                title="Start something new"
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  realOpenTabIds.includes(projectId)
                    ? "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground/80"
                    : "border-border bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <LayoutDashboard className="h-3 w-3 shrink-0" />
                Home
              </button>
              {realOpenTabIds.map((id) => {
                const tabProduct = products.find((p) => p.id === id);
                const active = id === projectId;
                return (
                  <div
                    key={id}
                    onClick={() => setProjectId(id)}
                    className={`group flex shrink-0 items-center gap-1 rounded-lg border py-1.5 pl-2.5 pr-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-border bg-muted/60 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground/80"
                    }`}
                  >
                    <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="max-w-[110px] truncate">{tabProduct?.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const wasLast = realOpenTabIds.length === 1;
                        closeWorkspaceTab(id);
                        if (wasLast) navigate("/pmx/overview");
                      }}
                      title="Close tab"
                      className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {loading.pipeline && (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse bg-primary/5 border border-primary/10 px-3 py-1 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                AI is compiling product intelligence...
              </span>
            )}
            {loading.executionGenerate && (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse bg-primary/5 border border-primary/10 px-3 py-1 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                AI is building your execution plan...
              </span>
            )}
            <div className="h-4 w-px bg-border" />
            <Link
              to="/pmx/docs"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Docs</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 overflow-y-auto bg-background relative z-10 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* ── COMMAND PALETTE SEARCH MODAL ────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center border-b border-border px-3">
                <Command className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 py-3 px-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0"
                  autoFocus
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:bg-muted text-[10px] uppercase font-mono border border-border"
                >
                  esc
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
                {pmxNav
                  .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          navigate(item.path);
                        }}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>Go to {item.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 font-mono">
                          {item.shortcut}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
