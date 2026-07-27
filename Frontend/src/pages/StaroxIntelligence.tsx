import React, { useEffect, useState, useRef, Component, ErrorInfo, ReactNode, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Code2,
  Zap,
  Users,
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  Settings,
  CreditCard,
  HelpCircle,
  BookOpen,
  Bell,
  LogOut,
  LogIn,
  ArrowRight,
  BarChart3,
  Plug,
  FileText,
  Folder,
  Compass,
  MessageSquare,
  Terminal,
  ClipboardList,
  User,
  Sliders,
  Mail,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";
import { useClerk } from "@clerk/clerk-react";
import AuthModal from "@/components/AuthModal";
import { SEARCH_ITEMS } from "@/lib/searchData";

const SEARCH_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Code2,
  Zap,
  Users,
  Folder,
  Compass,
  CreditCard,
  BookOpen,
  MessageSquare,
  HelpCircle,
  BarChart3,
  Plug,
  FileText,
  Terminal,
  ClipboardList,
  User,
  Sliders,
  Mail,
  AlertCircle
};

const getSearchIcon = (name: string): LucideIcon => {
  return SEARCH_ICON_MAP[name] || HelpCircle;
};

const POPULAR_ITEMS = [
  { title: "STAROX PMX", route: "/products/pmx", iconName: "LayoutDashboard", desc: "Project Intelligence" },
  { title: "Teams", route: "/teams", iconName: "Users", desc: "AI workspaces" },
  { title: "Pricing", route: "/pricing", iconName: "CreditCard", desc: "View plans" },
  { title: "Docs", route: "/help#docs", iconName: "FileText", desc: "Getting started" },
  { title: "Connectors", route: "/connectors", iconName: "Plug", desc: "Integrate stack" },
  { title: "Blog", route: "/blog", iconName: "BookOpen", desc: "Read articles" }
];

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/25 text-primary font-bold rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  route: string;
  img: string;
  name: string;
  label: string;
  accentLight: string;
  accentDark: string;
  bgLight: string;
  bgDark: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const WORKSPACES: Workspace[] = [
  {
    id: "pmx",
    route: "/products/pmx",
    img: "/pmx.png",
    name: "STAROX PMX",
    label: "Project Management & Execution",
    accentLight: "#1a73e8",
    accentDark: "#60a5fa",
    bgLight: "#e8f0fe",
    bgDark: "rgba(96,165,250,0.12)",
  },
  {
    id: "build",
    route: "/products/build",
    img: "/build.png",
    name: "STAROX BUILD",
    label: "Websites, Apps & SaaS Development",
    accentLight: "#1e8e3e",
    accentDark: "#4ade80",
    bgLight: "#e6f4ea",
    bgDark: "rgba(74,222,128,0.10)",
  },
  {
    id: "automation",
    route: "/products/automation",
    img: "/auto.png",
    name: "STAROX AUTOMATION",
    label: "Business & AI Automations",
    accentLight: "#e37400",
    accentDark: "#fb923c",
    bgLight: "#fef3e2",
    bgDark: "rgba(251,146,60,0.11)",
  },
  {
    id: "teams",
    route: "/products/teams",
    img: "/teams.png",
    name: "STAROX TEAMS",
    label: "Managed Dev, Marketing, Design, Ops & Content Editing",
    accentLight: "#d93025",
    accentDark: "#f87171",
    bgLight: "#fce8e6",
    bgDark: "rgba(248,113,113,0.10)",
  },
];

interface ToolProduct {
  id: string;
  route: string;
  icon: LucideIcon;
  name: string;
  label: string;
  accentLight: string;
  accentDark: string;
  bgLight: string;
  bgDark: string;
}

const TOOLS_PRODUCTS: ToolProduct[] = [
  {
    id: "analytics",
    route: "/analytics",
    icon: BarChart3,
    name: "Analytics",
    label: "Understand your product deeply.",
    accentLight: "#7c3aed",
    accentDark: "#a78bfa",
    bgLight: "#ede9fe",
    bgDark: "rgba(167,139,250,0.15)",
  },
  {
    id: "connectors",
    route: "/connectors",
    icon: Plug,
    name: "Connectors",
    label: "Integrate your entire stack.",
    accentLight: "#0f766e",
    accentDark: "#2dd4bf",
    bgLight: "#ccfbf1",
    bgDark: "rgba(45,212,191,0.13)",
  },
];

const NAV_LINKS = [
  { label: "Solutions", href: "#", hasSolutionsDropdown: true },
  { label: "Products", href: "#", hasDropdown: true },
  { label: "Community", href: "/starox-intelligence/community" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Help", href: "/help" },
];

// ── Solutions data ────────────────────────────────────────────────────────────

const SOLUTIONS_WHO = [
  { title: "For Work",          desc: "Run on what you build.", href: "/solutions/for-work" },
  { title: "Founders",          desc: "Ship before you pitch.", href: "/solutions/founders" },
  { title: "Product managers",  desc: "Prototype, don't spec.", href: "/solutions/product-managers" },
  { title: "Designers",         desc: "Your designs, built.", href: "/solutions/designers" },
  { title: "Marketers",         desc: "Launch pages in minutes.", href: "/solutions/marketing" },
  { title: "Sales",             desc: "Build the demo live.", href: "/solutions/sales" },
  { title: "Ops",               desc: "Tools that fit your flow.", href: "/solutions/operations" },
  { title: "People",            desc: "HR tools your team loves.", href: "/solutions/hr" },
];

const SOLUTIONS_USE_CASES = [
  { title: "Websites",       desc: "From idea to live site.", href: "/solutions/websites" },
  { title: "Prototyping",    desc: "Proof of concept in hours.", href: "/solutions/prototyping" },
  { title: "Internal tools", desc: "Built for your team.", href: "/solutions/internal-tools" },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

// ── MegaMenuDropdown Component ───────────────────────────────────────────────

interface MegaMenuDropdownProps {
  label: string;
  parentHref: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  dropdownWidth?: number | string;
}

export function MegaMenuDropdown({
  label,
  parentHref,
  children,
  dropdownWidth = 560
}: MegaMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const closeTimeoutRef = useRef<number | null>(null);

  // Check if touch device or mobile width
  const isTouchDevice = () => {
    return !window.matchMedia("(hover: hover)").matches || window.innerWidth < 768;
  };

  const handleMouseEnter = () => {
    if (isTouchDevice()) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isTouchDevice()) return;
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 180); // 150-200ms delay to avoid flickering
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (isTouchDevice()) {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setOpen(false);
        navigate(parentHref);
      }
    } else {
      // On desktop, click navigates to parent page immediately
      setOpen(false);
      navigate(parentHref);
    }
  };

  const getFocusableItems = () => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
        'a[href], button:not([disabled])'
      )
    );
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setTimeout(() => {
          const items = getFocusableItems();
          if (items.length > 0) items[0].focus();
        }, 50);
      } else {
        const items = getFocusableItems();
        const currentIndex = items.indexOf(document.activeElement as any);
        if (currentIndex === -1) {
          if (items.length > 0) items[0].focus();
        } else {
          const nextIndex = (currentIndex + 1) % items.length;
          items[nextIndex].focus();
        }
      }
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      const items = getFocusableItems();
      const currentIndex = items.indexOf(document.activeElement as any);
      if (currentIndex === -1) {
        if (items.length > 0) items[items.length - 1].focus();
      } else {
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      }
    }
  };

  // Focus out close handler
  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  // Close on outside clicks (useful for touch devices)
  useEffect(() => {
    const clickOutsideHandler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutsideHandler);
    return () => document.removeEventListener("mousedown", clickOutsideHandler);
  }, []);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-0.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 flex overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
            style={{ width: dropdownWidth }}
          >
            {typeof children === "function" ? children(closeMenu) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// ── Legacy Dropdowns ────────────────────────────────────────────────────────
export function SolutionsDropdown() { return null; }
export function ProductsDropdown() { return null; }

// ── Shared Mega Menu Component ───────────────────────────────────────────────
export function SharedMegaMenu({
  activeTab,
  dir,
  onClose,
  handleMenuMouseEnter,
  handleMenuMouseLeave,
}: {
  activeTab: "solutions" | "products";
  dir: "left" | "right";
  onClose: () => void;
  handleMenuMouseEnter: () => void;
  handleMenuMouseLeave: () => void;
}) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleProductClick = (route: string) => {
    onClose();
    if (route.startsWith("http") || route.includes(".space")) {
      window.location.href = route;
    } else {
      navigate(route);
    }
  };

  const slideVariants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "right" ? 80 : -80,
      opacity: 0,
      filter: "blur(2px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "right" ? -80 : 80,
      opacity: 0,
      filter: "blur(2px)",
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.18, ease: smoothEase }}
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
      className="shared-megamenu-container absolute left-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl w-[560px] h-[390px]"
    >
      <div className="relative w-full h-full">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {activeTab === "solutions" ? (
            <motion.div
              key="solutions"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: smoothEase }}
              className="flex w-full h-full absolute inset-0"
            >
              {/* Left panel: Who is it for? */}
              <div className="flex-1 px-7 py-6 flex flex-col justify-between">
                <div>
                  <p className="mb-4 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Who is it for?</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                    {SOLUTIONS_WHO.map((item) => (
                      <Link
                        key={item.title}
                        to={item.href}
                        onClick={onClose}
                        className="group text-left"
                      >
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                          {item.desc}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-border/60 my-4 shrink-0" />

              {/* Right panel: Use cases */}
              <div className="w-52 shrink-0 px-7 py-6 flex flex-col">
                <p className="mb-4 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Use cases</p>
                <div className="flex flex-col gap-3.5">
                  {SOLUTIONS_USE_CASES.map((item) => (
                    <Link
                      key={item.title}
                      to={item.href}
                      onClick={onClose}
                      className="group text-left"
                    >
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {item.desc}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="products"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: smoothEase }}
              className="flex flex-col w-full h-full absolute inset-0 p-6 gap-5"
            >
              {/* Workspaces Segment */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
                  Workspaces
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {WORKSPACES.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleProductClick(ws.route)}
                      className="flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors group border border-border/10 w-full"
                    >
                      <img src={ws.img} alt={ws.name} className="h-9 w-9 shrink-0 object-contain rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground leading-tight">{ws.name}</p>
                        <p className="text-xs text-muted-foreground leading-snug truncate mt-0.5">{ws.label}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Segment Divider */}
              <div className="h-px bg-border/60 w-full shrink-0" />

              {/* Tools & Integrations Segment */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
                  Tools & Integrations
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {TOOLS_PRODUCTS.map((tool) => {
                    const bg = isDark ? tool.bgDark : tool.bgLight;
                    const accent = isDark ? tool.accentDark : tool.accentLight;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleProductClick(tool.route)}
                        className="flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors group border border-border/10 w-full"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
                          <tool.icon className="h-5 w-5" style={{ color: accent }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground leading-tight">{tool.name}</p>
                          <p className="text-xs text-muted-foreground leading-snug truncate mt-0.5">{tool.label}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Theme Cycle Button ───────────────────────────────────────────────────────

export function ThemeCycleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// ── Workspace Tile ───────────────────────────────────────────────────────────

function WorkspaceTile({
  ws,
  index,
  onSelect,
}: {
  ws: Workspace;
  index: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.08 + index * 0.04, ease: smoothEase }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-background p-5 text-left transition-all duration-200
        hover:border-border hover:shadow-[0_1px_8px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_1px_12px_rgba(0,0,0,0.3)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Icon */}
      <img
        src={ws.img}
        alt={ws.name}
        className="mt-0.5 h-11 w-11 shrink-0 object-contain rounded-xl transition-transform duration-200 group-hover:scale-105"
      />

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{ws.name}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{ws.label}</p>
      </div>

      {/* Arrow */}
      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-200
          group-hover:text-muted-foreground group-hover:translate-x-0.5"
      />
    </motion.button>
  );
}

// ── User Avatar / Auth ───────────────────────────────────────────────────────

export function UserAvatar({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  const { user } = useAuthStore();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden ring-2 ring-transparent hover:ring-border transition-all"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={displayName} className="h-9 w-9 object-cover rounded-full" />
        ) : (
          <div className="gradient-starox flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white">
            {initials}
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-popover-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              {[
                { label: "Settings", icon: Settings, path: "/settings" },
                { label: "Pricing", icon: CreditCard, path: "/pricing" },
                { label: "Blog", icon: BookOpen, path: "/blog" },
                { label: "Notifications", icon: Bell, path: "/notifications" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => { setOpen(false); navigate(item.path); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <div className="border-t border-border pt-1 pb-1">
                <button
                  onClick={async () => { setOpen(false); await signOut(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Features Section ─────────────────────────────────────────────────────────

const FEATURE_PILLARS = [
  {
    title: "Personalised AI built in",
    desc: "Do your best work faster with intelligent tools that bring the context of your work to you — across every workspace.",
  },
  {
    title: "Tools born in the cloud",
    desc: "Collaborate in real time, from any device, across tools that are always up to date and always available.",
  },
  {
    title: "Enterprise-grade security",
    desc: "Protect your projects, files and communications with AI-powered security and enterprise compliance controls.",
  },
];

const WORKSPACE_ICONS: Array<
  | { name: string; img: string; bgLight?: string; bgDark?: string; icon?: never; accentLight?: never; accentDark?: never }
  | { name: string; icon: LucideIcon; accentLight: string; accentDark: string; bgLight: string; bgDark: string; img?: never }
> = [
  { name: "PMX",        img: "/pmx.png"   },
  { name: "BUILD",      img: "/build.png" },
  { name: "AUTOMATION", img: "/auto.png"  },
  { name: "TEAMS",      img: "/teams.png" },
  { name: "Analytics",  icon: BarChart3,  accentLight: "#7c3aed", accentDark: "#a78bfa", bgLight: "#ede9fe", bgDark: "rgba(167,139,250,0.22)" },
  { name: "Connectors", icon: Plug,       accentLight: "#0f766e", accentDark: "#2dd4bf", bgLight: "#ccfbf1", bgDark: "rgba(45,212,191,0.20)"  },
  { name: "Projects",   icon: BookOpen,   accentLight: "#b45309", accentDark: "#fcd34d", bgLight: "#fef3c7", bgDark: "rgba(252,211,77,0.20)"  },
  { name: "Blog",       icon: FileText,   accentLight: "#be185d", accentDark: "#f472b6", bgLight: "#fce7f3", bgDark: "rgba(244,114,182,0.20)" },
];

function FeaturesSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <section className="border-t border-border/50 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Headline */}
        <motion.h2
          className="text-center font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          All the tools that you need and a few more that we think you'll love.
        </motion.h2>

        {/* Three-pillar row */}
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {FEATURE_PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              className="text-center"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.32, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>



      </div>
    </section>
  );
}

// ── Marquee data ─────────────────────────────────────────────────────────────

const MARQUEE_CARDS = [
  {
    img: "/pmx.png",
    accentLight: "#1a73e8",
    accentDark: "#60a5fa",
    bgLight: "#e8f0fe",
    bgDark: "rgba(96,165,250,0.12)",
    label: "STAROX PMX",
    route: "/pmx",
    title: "Manage every project end-to-end",
    desc: "Run full project lifecycles with AI-powered execution, source tracking, and decision intelligence.",
  },
  {
    img: "/build.png",
    accentLight: "#1e8e3e",
    accentDark: "#4ade80",
    bgLight: "#e6f4ea",
    bgDark: "rgba(74,222,128,0.10)",
    label: "STAROX BUILD",
    route: "/build",
    title: "Ship websites, apps & SaaS fast",
    desc: "From design to deployment — build production-ready digital products with AI assistance at every step.",
  },
  {
    img: "/auto.png",
    accentLight: "#e37400",
    accentDark: "#fb923c",
    bgLight: "#fef3e2",
    bgDark: "rgba(251,146,60,0.11)",
    label: "STAROX AUTOMATION",
    route: "/automation",
    title: "Automate your business workflows",
    desc: "Connect tools, trigger actions, and eliminate repetitive work with intelligent AI automations.",
  },
  {
    img: "/teams.png",
    accentLight: "#d93025",
    accentDark: "#f87171",
    bgLight: "#fce8e6",
    bgDark: "rgba(248,113,113,0.10)",
    label: "STAROX TEAMS",
    route: "/teams",
    title: "Scale your team without chaos",
    desc: "Managed dev, design, marketing, ops & content editing — all coordinated in one place.",
  },
  {
    icon: BarChart3,
    accentLight: "#7c3aed",
    accentDark: "#a78bfa",
    bgLight: "#ede9fe",
    bgDark: "rgba(167,139,250,0.22)",
    label: "Analytics",
    route: "/analytics",
    title: "Understand your product deeply",
    desc: "Track performance, uncover insights, and make data-driven decisions across every workspace.",
  },
  {
    icon: Plug,
    accentLight: "#0f766e",
    accentDark: "#2dd4bf",
    bgLight: "#ccfbf1",
    bgDark: "rgba(45,212,191,0.20)",
    label: "Connectors",
    route: "/connectors",
    title: "Integrate your entire stack",
    desc: "Connect your favourite tools — GitHub, Notion, Slack, Figma and more — in minutes.",
  },
];

// ── Marquee Section ───────────────────────────────────────────────────────────

function MarqueeSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const navigate = useNavigate();
  // Duplicate for seamless loop
  const cards = [...MARQUEE_CARDS, ...MARQUEE_CARDS];

  return (
    <section className="border-t border-border/50 py-14 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-8">
        <p className="text-center text-lg font-semibold text-foreground">
          One subscription. So much intelligence.
        </p>
      </div>

      {/* Marquee track */}
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10
          bg-[linear-gradient(to_right,hsl(var(--background)),transparent)]" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10
          bg-[linear-gradient(to_left,hsl(var(--background)),transparent)]" />

        <div className="flex gap-4 marquee-track" style={{ width: "max-content" }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
          {cards.map((card, i) => {
            const bg = isDark ? card.bgDark : card.bgLight;
            const accent = isDark ? card.accentDark : card.accentLight;
            return (
              <motion.div
                key={i}
                className="group w-64 h-[310px] shrink-0 rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-3.5 cursor-pointer relative overflow-hidden"
                onClick={() => navigate(card.route)}
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  boxShadow: isDark
                    ? "0 12px 24px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.02)"
                    : "0 12px 24px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06), 0 0 12px rgba(0,0,0,0.01)",
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Preview area */}
                <div
                  className="h-28 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                  style={{ background: bg }}
                >
                  {'img' in card && card.img ? (
                    <img
                      src={card.img}
                      alt={card.label}
                      className="h-16 w-16 object-contain opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
                    />
                  ) : (
                    <card.icon
                      className="h-10 w-10 opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
                      style={{ color: accent }}
                    />
                  )}
                </div>

                {/* Label chip */}
                <div className="flex items-center gap-2">
                  {'img' in card && card.img ? (
                    <img src={card.img} alt="" className="h-5 w-5 object-contain rounded-md shrink-0" />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ background: bg }}>
                      <card.icon className="h-3 w-3" style={{ color: accent }} />
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-muted-foreground">{card.label}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground leading-snug">{card.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────

function CtaSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="border-t border-border/50 bg-muted/30 dark:bg-muted/10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 sm:px-6 text-center">
        {/* Logo row */}
        <div className="flex items-center gap-3">
          <img src="/pmx.png"   alt="STAROX PMX"        className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          <img src="/build.png" alt="STAROX BUILD"       className="h-9 w-9 object-contain opacity-80" />
          <img src="/auto.png"  alt="STAROX AUTOMATION"  className="h-9 w-9 object-contain opacity-60" />
          <img src="/teams.png" alt="STAROX TEAMS"       className="h-9 w-9 object-contain opacity-40" />
        </div>

        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight tracking-tight text-foreground">
          Use STAROX PMX today.
        </h2>

        <p className="max-w-sm text-base text-muted-foreground leading-relaxed">
          Start free. No credit card required. Access every workspace and AI tool instantly.
        </p>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground
            shadow-[0_4px_16px_rgba(26,115,232,0.35)] hover:bg-primary/90 transition-all"
        >
          Get Started Free
        </button>
      </div>
    </section>
  );
}

// ── Social Footer ─────────────────────────────────────────────────────────────

export function SocialFooter() {
  const socials = [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/starox-01/",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      label: "GitHub",
      href: "https://github.com/STAROX-SPACE",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/@staroxIntelligence",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/buildwithstarox/",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    },
    {
      label: "Email",
      href: "mailto:support@starox.space",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="border-t border-border/50">
      {/* Social bar */}
      <div className="border-b border-border/40 bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-4 py-4 sm:px-6">
          <Link
            to="/blog"
            className="text-sm text-muted-foreground hover:text-foreground font-medium shrink-0 transition-colors"
          >
            Follow our blog
          </Link>
          <div className="w-px h-4 bg-border/60" />
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 sm:px-6 relative">
        <div className="flex items-center justify-center gap-3.5 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <img src="/strx.png" alt="STAROX" className="h-4 w-4 object-contain opacity-50" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            © {new Date().getFullYear()} STAROX
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5 sm:ml-auto">
          {[
            { label: "Privacy", href: "/privacy" },
            { label: "Help",    href: "/help" },
            { label: "Blog",    href: "/blog" },
            { label: "Pricing", href: "/pricing" },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
class SearchErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Search Error Boundary] caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// ── Global Search Panel Component ────────────────────────────────────────────

function GlobalSearchPanel({
  query,
  setQuery,
  onClose
}: {
  query: string;
  setQuery: (q: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<any[]>([]);

  // Load recents on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("starox_recent_searches");
      if (stored) {
        setRecents(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save to recents
  const saveToRecents = (item: any) => {
    try {
      const stored = localStorage.getItem("starox_recent_searches");
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((x: any) => x.route !== item.route);
      list.unshift({ 
        title: item.title, 
        route: item.route, 
        iconName: item.iconName, 
        description: item.description 
      });
      list = list.slice(0, 5);
      localStorage.setItem("starox_recent_searches", JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  // Auto focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter items based on query
  const flatMatches = useMemo(() => {
    if (!query) return [];
    const term = query.trim().toLowerCase();
    return SEARCH_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(term))
      );
    });
  }, [query]);

  // Group filtered results
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof SEARCH_ITEMS> = {};
    flatMatches.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [flatMatches]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleItemClick = (item: any) => {
    saveToRecents(item);
    onClose();
    setQuery("");
    navigate(item.route);
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    
    const itemsCount = query ? flatMatches.length : POPULAR_ITEMS.length + recents.length;
    if (itemsCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % itemsCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + itemsCount) % itemsCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query) {
        if (flatMatches[activeIndex]) {
          handleItemClick(flatMatches[activeIndex]);
        }
      } else {
        const combined = [...recents, ...POPULAR_ITEMS];
        if (combined[activeIndex]) {
          handleItemClick(combined[activeIndex]);
        }
      }
    }
  };

  // Auto-scroll highlighted result
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = document.getElementById(`search-item-${activeIndex}`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-border/40 bg-background px-6 py-4 sm:px-10 relative flex flex-col z-50 w-full"
    >
      {/* Search input bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, tools, docs, settings, help..."
          className="w-full rounded-2xl border border-border bg-muted/30 py-3 pl-12 pr-20 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 transition-all font-medium"
        />
        
        {/* Keyboard shortcut indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-1 rounded-md shadow-sm">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Results Dropdown */}
      <div
        className="mt-3 max-h-[380px] overflow-y-auto w-full border border-border bg-popover rounded-2xl p-2 shadow-2xl space-y-4 scrollbar-thin animate-in fade-in duration-200"
      >
        {query ? (
          flatMatches.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedResults).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1.5 border-b border-border/10">
                    {category}
                  </h4>
                  <div className="space-y-0.5 mt-1">
                    {items.map((item) => {
                      const globalIndex = flatMatches.indexOf(item);
                      const isActive = globalIndex === activeIndex;
                      const Icon = getSearchIcon(item.iconName);

                      return (
                        <button
                          key={item.route}
                          id={`search-item-${globalIndex}`}
                          onClick={() => handleItemClick(item)}
                          className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                            isActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/40 border border-border/30">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                <HighlightMatch text={item.title} query={query} />
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[480px]">
                                <HighlightMatch text={item.description} query={query} />
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State matching */
            <div className="py-8 text-center space-y-4">
              <p className="text-xs text-muted-foreground">
                No results found matching "<span className="font-bold text-foreground">{query}</span>"
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="text-muted-foreground text-[11px]">Try searching:</span>
                {["PMX", "Pricing", "Docs", "Automation"].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => setQuery(keyword)}
                    className="px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[10px] font-semibold"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          /* Empty State: Popular & Recent */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {/* Recents */}
            {recents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 border-b border-border/10 pb-1">
                  Recent
                </h4>
                <div className="space-y-0.5 mt-1">
                  {recents.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    const Icon = getSearchIcon(item.iconName);
                    return (
                      <button
                        key={item.route}
                        id={`search-item-${idx}`}
                        onClick={() => handleItemClick(item)}
                        className={`flex w-full items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/40 border border-border/30">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 border-b border-border/10 pb-1">
                Popular
              </h4>
              <div className="space-y-0.5 mt-1">
                {POPULAR_ITEMS.map((item, idx) => {
                  const actualIdx = recents.length + idx;
                  const isActive = actualIdx === activeIndex;
                  const Icon = getSearchIcon(item.iconName);
                  return (
                    <button
                      key={item.route}
                      id={`search-item-${actualIdx}`}
                      onClick={() => handleItemClick(item)}
                      className={`flex w-full items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/40 border border-border/30">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const StaroxIntelligence = () => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Shared Mega Menu states
  const [activeTab, setActiveTab] = useState<"solutions" | "products" | null>(null);
  const [dir, setDir] = useState<"left" | "right">("right");
  const closeTimeoutRef = useRef<number | null>(null);

  const handleTabChange = (newTab: "solutions" | "products" | null) => {
    if (newTab && activeTab) {
      if (activeTab === "solutions" && newTab === "products") {
        setDir("right");
      } else if (activeTab === "products" && newTab === "solutions") {
        setDir("left");
      }
    }
    setActiveTab(newTab);
  };

  const handleNavMouseLeave = () => {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      const hoverEl = document.querySelector(".shared-megamenu-container:hover");
      if (!hoverEl) {
        handleTabChange(null);
      }
    }, 180);
  };

  const handleMenuMouseEnter = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      handleTabChange(null);
    }, 180);
  };

  const handleNavBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      handleTabChange(null);
    }
  };

  // Global Cmd/Ctrl + K shortcut to focus/toggle search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Navigation Bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center gap-4 px-6 sm:px-10">
          {/* Logo — left edge */}
          <Link to="/starox-intelligence" className="flex shrink-0 items-center gap-3 mr-3">
            <img
              src="/strx.png"
              alt="STAROX"
              className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]"
            />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              STAROX
            </span>
          </Link>

          {/* Nav links — centre-left */}
          <nav 
            className="hidden md:flex items-center gap-0.5 relative"
            onMouseLeave={handleNavMouseLeave}
            onBlur={handleNavBlur}
          >
            <button
              onMouseEnter={() => handleTabChange("solutions")}
              onFocus={() => handleTabChange("solutions")}
              onClick={() => navigate("/solutions")}
              aria-haspopup="true"
              aria-expanded={activeTab === "solutions"}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === "solutions" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Solutions
            </button>

            <button
              onMouseEnter={() => handleTabChange("products")}
              onFocus={() => handleTabChange("products")}
              onClick={(e) => { e.preventDefault(); handleTabChange(activeTab === "products" ? null : "products"); }}
              aria-haspopup="true"
              aria-expanded={activeTab === "products"}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === "products" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Products
            </button>

            <Link
              to="/starox-intelligence/community"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Community
            </Link>

            <Link
              to="/pricing"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Pricing
            </Link>

            <Link
              to="/blog"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Blog
            </Link>

            <Link
              to="/help"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Help
            </Link>

            <AnimatePresence>
              {activeTab && (
                <SharedMegaMenu 
                  activeTab={activeTab} 
                  dir={dir} 
                  onClose={() => handleTabChange(null)}
                  handleMenuMouseEnter={handleMenuMouseEnter}
                  handleMenuMouseLeave={handleMenuMouseLeave}
                />
              )}
            </AnimatePresence>
          </nav>
          {/* Spacer pushes right actions to far right edge */}
          <div className="flex-1" />

          {/* Right actions — right edge */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
              title="Search workspaces"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <ThemeCycleButton />
            <UserAvatar onSignIn={() => setAuthModalOpen(true)} />
          </div>
        </div>

        {/* Sticky Global Search Panel */}
        <AnimatePresence>
          {searchOpen && (
            <SearchErrorBoundary>
              <GlobalSearchPanel
                query={searchQuery}
                setQuery={setSearchQuery}
                onClose={() => setSearchOpen(false)}
              />
            </SearchErrorBoundary>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[calc(100dvh-64px)] flex flex-col justify-center items-center py-[clamp(2rem,6vh,5rem)]">
        {/* Subtle background gradient — light/dark aware */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_120%_60%_at_10%_0%,rgba(26,115,232,0.06)_0%,transparent_55%),radial-gradient(ellipse_80%_50%_at_90%_100%,rgba(30,142,62,0.05)_0%,transparent_55%)]
            dark:bg-[radial-gradient(ellipse_120%_60%_at_10%_0%,rgba(96,165,250,0.08)_0%,transparent_55%),radial-gradient(ellipse_80%_50%_at_90%_100%,rgba(74,222,128,0.06)_0%,transparent_55%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 w-full flex flex-col justify-center items-center">
          <motion.div
            className="flex flex-col items-center text-center gap-[clamp(1rem,3vh,2rem)] max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: smoothEase }}
          >
            {/* Badge */}
            <motion.span
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1 text-[clamp(10px,1.2vw,12px)] font-semibold uppercase tracking-widest text-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
            >
              STAROX Intelligence
            </motion.span>

            {/* Headline */}
            <motion.h1
              className="font-display text-[clamp(2rem,6vw,5rem)] font-bold leading-[1.15] tracking-tight text-foreground max-w-3xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.09, ease: smoothEase }}
            >
              The AI Intelligence Platform
            </motion.h1>

            {/* Subline */}
            <motion.p
              className="max-w-xl text-[clamp(0.95rem,1.8vw,1.25rem)] leading-relaxed text-muted-foreground"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.14, ease: smoothEase }}
            >
              One workspace to think, build, automate, and grow.
            </motion.p>

            {/* CTA */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.2, ease: smoothEase }}
            >
              <button
                onClick={() => navigate("/pmx")}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_rgba(26,115,232,0.35)] hover:bg-primary/90 transition-all"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/pricing"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border px-8 py-3 text-base font-medium text-foreground/80 hover:bg-muted transition-all"
              >
                View Pricing
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────── */}
      <FeaturesSection />

      {/* ── Marquee Section ──────────────────────────────────────── */}
      <MarqueeSection />

      {/* ── CTA Section ──────────────────────────────────────────── */}
      <CtaSection onGetStarted={() => navigate("/pmx")} />

      {/* ── Social Bar + Footer ───────────────────────────────────── */}
      <SocialFooter />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default StaroxIntelligence;
