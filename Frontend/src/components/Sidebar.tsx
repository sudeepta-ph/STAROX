import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Settings, User, CreditCard,
  HelpCircle, FileText, BarChart3, Bell, Shield, LogOut,
  LogIn, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X, Star, BookOpen, Plug,
  Database, TrendingUp, Lightbulb, Sparkles, Award, Clock, ArrowLeft, Layers
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { useClerk } from "@clerk/clerk-react";
import AuthModal from "./AuthModal";
import { useSidebarStore } from "@/lib/sidebarStore";
import { usePmxStore } from "@/lib/pmxStore";

const mainNav = [
  { name: "STAROX Intelligence",  icon: LayoutDashboard, path: "/starox-intelligence" },
  { name: "Projects",   icon: FileText,        path: "/projects" },
  { name: "Starred",    icon: Star,            path: "/projects?filter=starred" },
  { name: "Analytics",  icon: BarChart3,        path: "/analytics" },
  { name: "Connectors", icon: Plug,            path: "/connectors" },
];

const pmxNav = [
  { name: "Overview",   icon: LayoutDashboard, path: "/pmx/overview" },
  { name: "Workspaces", icon: Layers,          path: "/pmx/products" },
  { name: "Sources",    icon: Database,        path: "/pmx/sources" },
  { name: "AI EXPERIENCE Intelligence", icon: TrendingUp, path: "/pmx/analysis", glow: true },
  { name: "Insights",   icon: Sparkles,        path: "/pmx/insights" },
  { name: "PRD",        icon: FileText,        path: "/pmx/prd" },
  { name: "Execution",  icon: Award,           path: "/pmx/execution" },
  { name: "Artifacts",  icon: Lightbulb,       path: "/pmx/artifacts" },
  { name: "History",    icon: Clock,           path: "/pmx/history" },
  { name: "Settings",   icon: Settings,        path: "/pmx/settings" },
];

const bottomNav = [
  { name: "Blog",     icon: BookOpen,    path: "/blog" },
  { name: "Settings", icon: Settings,    path: "/settings" },
  { name: "Pricing",  icon: CreditCard,  path: "/pricing" },
  { name: "Help",     icon: HelpCircle,  path: "/help" },
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

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { signOut } = useClerk();
  const { collapsed, toggle, hiddenNavPaths } = useSidebarStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile dropdown on an outside click.
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const isPmxRoute = location.pathname.startsWith("/pmx");

  // Insights / PRD / Execution stay hidden until the active workspace has
  // actually earned them: Insights needs the existing-product pipeline
  // (sources added, decisions generated); PRD and Execution unlock from
  // either that same pipeline (a solution) or the idea-input one-shot flow
  // (an idea PRD) — whichever path got there first.
  const { inputs, decisions, solutions, ideaPrd, role } = usePmxStore();
  const hasExistingProductPipeline = inputs.length > 0 || decisions.length > 0;
  const hasPrd = hasExistingProductPipeline || solutions.length > 0 || !!ideaPrd;
  const NAV_GATES: Record<string, boolean> = {
    "/pmx/insights": hasExistingProductPipeline,
    "/pmx/prd": hasPrd,
    "/pmx/execution": hasPrd,
    // Settings is owner/admin territory — server-enforced on every
    // settings-backing endpoint; this just keeps members from seeing a link
    // that would redirect them straight back out.
    "/pmx/settings": role !== "member",
  };

  const currentNav = (isPmxRoute ? pmxNav : mainNav).filter((item) => {
    if (hiddenNavPaths.includes(item.path)) return false;
    if (isPmxRoute && item.path in NAV_GATES) return NAV_GATES[item.path];
    return true;
  });

  const isActive = (path: string) => {
    if (path === "/blog") {
      return location.pathname.startsWith("/blog") || location.pathname.startsWith("/admin/blog");
    }
    if (path === "/") return location.pathname === "/";
    const [pathname, search] = path.split("?");
    if (search) {
      return location.pathname === pathname && location.search.includes(search.split("=")[1]);
    }
    return location.pathname === pathname && !location.search;
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";
  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {isPmxRoute && (
        <Link to="/dashboard" onClick={onClick}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80 transition-all">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to Home</span>
        </Link>
      )}
      {currentNav.map((item) => {
        const active = isActive(item.path);
        const isGlow = (item as any).glow;
        return (
          <Link key={item.path} to={item.path} onClick={onClick}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
              active
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
            } ${isGlow ? "nav-shimmer" : ""}`}>
            {isGlow && (
              <span className="pointer-events-none absolute inset-0 rounded-xl opacity-60"
                style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.18) 0%, transparent 70%)" }} />
            )}
            <item.icon className={`h-4 w-4 shrink-0 ${isGlow ? "text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]" : ""}`} />
            {isGlow ? (
              <span className="text-sky-500 dark:text-sky-300 font-semibold text-[11px] tracking-tight drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] leading-tight">
                {item.name}
              </span>
            ) : (
              <span>{item.name}</span>
            )}
          </Link>
        );
      })}
    </>
  );

  // ── MOBILE: topbar + drawer ──────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/90 px-4 backdrop-blur-xl">
          <button onClick={() => setDrawerOpen(o => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/assets/images/strx.png" alt="STAROX" className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(102,214,255,0.5)]" />
            <span className="text-sm font-display font-bold tracking-tight text-sidebar-foreground">STAROX</span>
          </Link>

          <button onClick={() => user ? setUserMenuOpen(o => !o) : setAuthModalOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden">
            {user?.photoURL
              ? <img src={user.photoURL} alt={displayName} className="h-9 w-9 object-cover rounded-full" />
              : <div className="gradient-starox flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white">
                  {user ? initials : <LogIn className="h-4 w-4" />}
                </div>
            }
          </button>
        </header>

        {/* Drawer overlay */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl"
              >
                <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
                  <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
                    <img src="/assets/images/strx.png" alt="STAROX" className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(102,214,255,0.5)]" />
                    <span className="text-sm font-display font-bold text-sidebar-foreground">STAROX</span>
                  </Link>
                  <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-sidebar-foreground/35 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
                  <NavLinks onClick={() => setDrawerOpen(false)} />
                </nav>

                <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
                  {user ? (
                    <div className="pt-1">
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
                        <p className="text-[10px] text-sidebar-foreground/35 truncate">{user.email}</p>
                      </div>
                      {bottomNav.map(item => (
                        <Link key={item.path} to={item.path} onClick={() => setDrawerOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                            isActive(item.path)
                              ? "bg-sidebar-accent text-sidebar-foreground"
                              : "text-sidebar-foreground/42 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/72"
                          }`}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.name}
                        </Link>
                      ))}
                      <button onClick={async () => { setDrawerOpen(false); await signOut(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/40 rounded-xl transition-colors mt-1 border-t border-sidebar-border pt-2">
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setDrawerOpen(false); setAuthModalOpen(true); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/40 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-colors">
                      <LogIn className="h-4 w-4" /> Sign In
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  // ── DESKTOP: original sidebar ────────────────────────────────────
  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 56 : 224 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_65%_at_5%_0%,rgba(90,189,255,0.10)_0%,rgba(90,189,255,0.03)_32%,transparent_60%),radial-gradient(95%_55%_at_110%_105%,rgba(72,118,210,0.08)_0%,transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-sidebar-border" />

        <div className="relative z-10 flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
            <img src="/assets/images/strx.png" alt="STAROX" className="h-7 w-7 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(102,214,255,0.5)]" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
                  className="overflow-hidden whitespace-nowrap text-sm font-display font-bold tracking-tight text-sidebar-foreground">
                  STAROX
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button onClick={toggle} className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground/35 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/75"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="relative z-10 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
          {isPmxRoute && (
            <Link to="/dashboard" title={collapsed ? "Back to Home" : undefined}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/48 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/78 transition-all">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="overflow-hidden whitespace-nowrap">Back to Home</span>}
            </Link>
          )}
          {currentNav.map((item) => {
            const active = isActive(item.path);
            const isGlow = (item as any).glow;
            return (
              <Link key={item.path} to={item.path} title={collapsed ? item.name : undefined}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--sidebar-foreground)/0.06),0_4px_12px_rgba(0,0,0,0.10)]"
                    : "text-sidebar-foreground/48 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/78"
                } ${isGlow ? "nav-shimmer overflow-hidden" : ""}`}>
                {isGlow && (
                  <span className="pointer-events-none absolute inset-0 rounded-lg opacity-60"
                    style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.18) 0%, transparent 70%)" }} />
                )}
                <item.icon className={`h-4 w-4 shrink-0 ${isGlow ? "text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]" : ""}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap">
                      {isGlow ? (
                        <span className="whitespace-normal text-sky-500 dark:text-sky-300 font-semibold text-[11px] tracking-tight drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] leading-tight">
                          {item.name}
                        </span>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 shrink-0 space-y-0.5 border-t border-sidebar-border px-2 py-2">
          <div className="relative pt-1" ref={userMenuRef}>
            {user ? (
              <>
                <button onClick={() => setUserMenuOpen(o => !o)} title={collapsed ? displayName : undefined}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent">
                  {user.photoURL
                    ? <img src={user.photoURL} alt={displayName} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    : <div className="gradient-starox flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">{initials}</div>
                  }
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                        <span className="flex-1 truncate text-left whitespace-nowrap text-sm text-sidebar-foreground/60">{displayName}</span>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-sidebar-foreground/25 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.12 }}
                      className={`absolute bottom-full z-50 mb-1 overflow-hidden rounded-xl border border-sidebar-border bg-popover/95 py-1 shadow-2xl backdrop-blur-lg ${collapsed ? "left-12 w-48" : "left-0 right-0"}`}>
                      <div className="border-b border-border/50 px-3 py-2.5">
                        <p className="truncate text-xs font-medium text-popover-foreground">{displayName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                      {[{ name: "Profile", icon: User, path: "/profile" }, { name: "Notifications", icon: Bell, path: "/notifications" }, { name: "Privacy", icon: Shield, path: "/privacy" }].map(item => (
                        <Link key={item.path} to={item.path} onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <item.icon className="h-3.5 w-3.5" />{item.name}
                        </Link>
                      ))}
                      <div className="mt-1 border-t border-border/50 pt-1">
                        {bottomNav.map(item => (
                          <Link key={item.path} to={item.path} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <item.icon className="h-3.5 w-3.5" />{item.name}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-1 border-t border-border/50 pt-1">
                        <button onClick={async () => { setUserMenuOpen(false); await signOut(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <LogOut className="h-3.5 w-3.5" />Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} title={collapsed ? "Sign In" : undefined}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70">
                <LogIn className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="whitespace-nowrap">
                      Sign In
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export { Sidebar as default };
export const SIDEBAR_W_EXPANDED = 224;
export const SIDEBAR_W_COLLAPSED = 56;
