import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plug,
  Settings,
  User,
  CreditCard,
  HelpCircle,
  FileText,
  BarChart3,
  Bell,
  Shield,
  LogOut,
  ChevronDown,
  LogIn,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/authStore";
import { useClerk } from "@clerk/clerk-react";
import AuthModal from "./AuthModal";

const navItems = [
  { name: "STAROX Intelligence", icon: LayoutDashboard, path: "/pmx" },
  { name: "Agents", icon: Sparkles, path: "/agents" },
  { name: "Projects", icon: FileText, path: "/projects" },
  { name: "Analytics", icon: BarChart3, path: "/analytics" },
  { name: "Integrations", icon: Plug, path: "/integrations" },
];

const menuItems = [
  { name: "Profile", icon: User, path: "/profile" },
  { name: "Settings", icon: Settings, path: "/settings" },
  { name: "Pricing", icon: CreditCard, path: "/pricing" },
  { name: "Notifications", icon: Bell, path: "/notifications" },
  { name: "Help & Support", icon: HelpCircle, path: "/help" },
  { name: "Privacy", icon: Shield, path: "/privacy" },
];

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncLayout = () => setIsMobileNav(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsNavDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-sidebar-width", "0rem");
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  const { signOut } = useClerk();

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 h-16 px-4 sm:px-6">
        <div className="h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobileNav && (
              <button
                type="button"
                aria-label={isNavDrawerOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setIsNavDrawerOpen((prev) => !prev)}
                className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {isNavDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link to="/" className="flex items-center shrink-0">
              <div className="h-8 flex items-center">
                <img
                  src="/starox-buffer-star.png"
                  alt="Starox Logo"
                  className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(102,214,255,0.45)]"
                />
              </div>
            </Link>

            {!isMobileNav && (
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                        isActive
                          ? "text-primary bg-muted/80 ring-1 ring-border"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="navbar-active"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 p-1 rounded-full hover:bg-muted/50 transition-colors pr-2 border border-border"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full gradient-starox flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground hidden sm:inline-block max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-foreground/60 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden py-1 z-50"
                    >
                      <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        {menuItems.map((item) => (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-border pt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileNav && isNavDrawerOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavDrawerOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-black/45"
              aria-label="Close navigation menu"
            />

            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className="fixed top-16 left-0 z-50 w-[18rem] max-w-[88vw] border-r border-border bg-card/95 backdrop-blur-xl h-[calc(100vh-4rem)] p-3 overflow-y-auto"
            >
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "text-primary bg-muted/80 ring-1 ring-border"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Navbar;
