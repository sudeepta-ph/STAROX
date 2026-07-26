import { useEffect, useState, useRef } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";
import { useClerk } from "@clerk/clerk-react";
import AuthModal from "@/components/AuthModal";

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
    route: "/pmx",
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
    route: "/build",
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
    route: "/automation",
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
    route: "/teams",
    img: "/teams.png",
    name: "STAROX TEAMS",
    label: "Managed Dev, Marketing, Design, Ops & Content Editing",
    accentLight: "#d93025",
    accentDark: "#f87171",
    bgLight: "#fce8e6",
    bgDark: "rgba(248,113,113,0.10)",
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
  { title: "For Work",          desc: "Run on what you build." },
  { title: "Founders",          desc: "Ship before you pitch." },
  { title: "Product managers",  desc: "Prototype, don't spec." },
  { title: "Designers",         desc: "Your designs, built." },
  { title: "Marketers",         desc: "Launch pages in minutes." },
  { title: "Sales",             desc: "Build the demo live." },
  { title: "Ops",               desc: "Tools that fit your flow." },
  { title: "People",            desc: "HR tools your team loves." },
];

const SOLUTIONS_USE_CASES = [
  { title: "Websites",       desc: "From idea to live site." },
  { title: "Prototyping",    desc: "Proof of concept in hours." },
  { title: "Internal tools", desc: "Built for your team." },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

// ── Solutions Dropdown ───────────────────────────────────────────────────────

function SolutionsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        Solutions
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-[calc(100%+10px)] z-50 flex overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
              style={{ minWidth: 560 }}
            >
              {/* ── Left panel: Who is it for? ── */}
              <div className="flex-1 px-7 py-6">
                <p className="mb-5 text-xs text-muted-foreground">Who is it for?</p>
                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                  {SOLUTIONS_WHO.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setOpen(false)}
                      className="group text-left"
                    >
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="w-px bg-border/60 my-4" />

              {/* ── Right panel: Use cases ── */}
              <div className="w-52 shrink-0 px-7 py-6">
                <p className="mb-5 text-xs text-muted-foreground">Use cases</p>
                <div className="flex flex-col gap-4">
                  {SOLUTIONS_USE_CASES.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setOpen(false)}
                      className="group text-left"
                    >
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Products Dropdown ────────────────────────────────────────────────────────

function ProductsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        Products
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
            >
              {/* Header */}
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Workspaces
                </p>
              </div>

              {/* Items */}
              <div className="p-2">
                {WORKSPACES.map((ws) => {
                  return (
                    <button
                      key={ws.id}
                      onClick={() => { setOpen(false); navigate(ws.route); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted transition-colors group"
                    >
                      <img src={ws.img} alt={ws.name} className="h-9 w-9 shrink-0 object-contain rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground leading-tight">{ws.name}</p>
                        <p className="text-xs text-muted-foreground leading-snug truncate">{ws.label}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-border/60 px-4 py-2.5">
                <button
                  onClick={() => { setOpen(false); navigate("/products"); }}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  See all products
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Theme Cycle Button ───────────────────────────────────────────────────────

function ThemeCycleButton() {
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

function UserAvatar({
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

        {/* Divider */}
        <div className="mt-14 border-t border-border/40" />

        {/* Icon strip label */}
        <p className="mt-8 text-center text-sm font-semibold text-foreground">
          STAROX Intelligence includes:
        </p>

        {/* Workspace icon strip */}
        <motion.div
          className="mt-6 flex flex-wrap items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {WORKSPACE_ICONS.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-1.5">
              {item.img ? (
                <img src={item.img} alt={item.name} className="h-12 w-12 object-contain rounded-2xl" />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
                  style={{ background: isDark ? item.bgDark : item.bgLight }}
                >
                  <item.icon className="h-6 w-6" style={{ color: isDark ? item.accentDark : item.accentLight }} />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground font-medium">{item.name}</span>
            </div>
          ))}
        </motion.div>

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
                className="group w-64 shrink-0 rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-4 cursor-pointer relative overflow-hidden"
                onClick={() => navigate(card.route)}
                whileHover={{
                  scale: 1.04,
                  y: -6,
                  boxShadow: isDark
                    ? "0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
                    : "0 20px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Preview area */}
                <div
                  className="h-32 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                  style={{ background: bg }}
                >
                  {'img' in card && card.img ? (
                    <img
                      src={card.img}
                      alt={card.label}
                      className="h-20 w-20 object-contain opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
                    />
                  ) : (
                    <card.icon
                      className="h-12 w-12 opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
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

                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground leading-snug">{card.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>

                {/* Go to button — fades in on hover */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(card.route); }}
                    className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors duration-150"
                    style={{ background: bg, color: accent }}
                  >
                    Go to {card.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
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

function SocialFooter() {
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
          <span className="text-sm text-muted-foreground font-medium shrink-0">Follow our blog</span>
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/strx.png" alt="STAROX" className="h-4 w-4 object-contain opacity-50" />
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} STAROX Intelligence
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
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

// ── Main Page ────────────────────────────────────────────────────────────────

const StaroxIntelligence = () => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) =>
              link.hasSolutionsDropdown ? (
                <SolutionsDropdown key={link.label} />
              ) : link.hasDropdown ? (
                <ProductsDropdown key={link.label} />
              ) : (
                <Link
                  key={link.label}
                  to={link.href!}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
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

        {/* Expandable search bar */}
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border/40 bg-background/95 px-4 py-3 sm:px-6"
          >
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces…"
              className="w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </motion.div>
        )}
      </header>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient — light/dark aware */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_120%_60%_at_10%_0%,rgba(26,115,232,0.06)_0%,transparent_55%),radial-gradient(ellipse_80%_50%_at_90%_100%,rgba(30,142,62,0.05)_0%,transparent_55%)]
            dark:bg-[radial-gradient(ellipse_120%_60%_at_10%_0%,rgba(96,165,250,0.08)_0%,transparent_55%),radial-gradient(ellipse_80%_50%_at_90%_100%,rgba(74,222,128,0.06)_0%,transparent_55%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-28 sm:px-6 sm:pt-36 sm:pb-36">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: smoothEase }}
          >
            {/* Badge */}
            <motion.span
              className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
            >
              STAROX Intelligence
            </motion.span>

            {/* Headline */}
            <motion.h1
              className="mx-auto mt-3 max-w-3xl font-display text-[clamp(2.4rem,6.5vw,4.5rem)] font-bold leading-tight tracking-tight text-foreground"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.09, ease: smoothEase }}
            >
              The AI Intelligence Platform
            </motion.h1>

            {/* Subline */}
            <motion.p
              className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.14, ease: smoothEase }}
            >
              One workspace to think, build, automate, and grow.
            </motion.p>

            {/* CTA */}
            <motion.div
              className="mt-9 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.2, ease: smoothEase }}
            >
              <button
                onClick={() => navigate("/pmx")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_rgba(26,115,232,0.35)] hover:bg-primary/90 transition-all"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3 text-base font-medium text-foreground/80 hover:bg-muted transition-all"
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
