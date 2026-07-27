import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Code2, Zap, Users,
  BarChart3, Plug, BookOpen, Settings,
  HelpCircle, CreditCard, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  name: string;
  desc: string;
  route: string;
  icon: LucideIcon;
  img?: string;
  accentLight: string;
  accentDark: string;
  bgLight: string;
  bgDark: string;
  badge?: string;
}

const CORE_PRODUCTS: Product[] = [
  {
    name: "STAROX PMX",
    desc: "Project Management & Execution",
    route: "/pmx",
    icon: LayoutDashboard,
    img: "/pmx.png",
    accentLight: "#1a73e8", accentDark: "#60a5fa",
    bgLight: "#c7d9fc", bgDark: "rgba(96,165,250,0.22)",
  },
  {
    name: "STAROX BUILD",
    desc: "Websites, Apps & SaaS Development",
    route: "/build",
    icon: Code2,
    img: "/build.png",
    accentLight: "#1e8e3e", accentDark: "#4ade80",
    bgLight: "#bbf0cd", bgDark: "rgba(74,222,128,0.22)",
    badge: "Coming Soon",
  },
  {
    name: "STAROX AUTOMATION",
    desc: "Business & AI Automations",
    route: "/automation",
    icon: Zap,
    img: "/auto.png",
    accentLight: "#e37400", accentDark: "#fb923c",
    bgLight: "#fddcaa", bgDark: "rgba(251,146,60,0.24)",
    badge: "Coming Soon",
  },
  {
    name: "STAROX TEAMS",
    desc: "Managed Dev, Marketing, Design, Ops & Content",
    route: "/teams",
    icon: Users,
    img: "/teams.png",
    accentLight: "#d93025", accentDark: "#f87171",
    bgLight: "#ffc5c2", bgDark: "rgba(248,113,113,0.22)",
  },
];

const TOOLS_PRODUCTS: Product[] = [
  {
    name: "Analytics",
    desc: "Understand your product deeply",
    route: "/analytics",
    icon: BarChart3,
    accentLight: "#7c3aed", accentDark: "#a78bfa",
    bgLight: "#ede9fe", bgDark: "rgba(167,139,250,0.15)",
  },
  {
    name: "Connectors",
    desc: "Integrate your entire stack",
    route: "/connectors",
    icon: Plug,
    accentLight: "#0f766e", accentDark: "#2dd4bf",
    bgLight: "#ccfbf1", bgDark: "rgba(45,212,191,0.13)",
  },
  {
    name: "Blog",
    desc: "Updates, guides & perspectives",
    route: "/blog",
    icon: BookOpen,
    accentLight: "#be185d", accentDark: "#f472b6",
    bgLight: "#fce7f3", bgDark: "rgba(244,114,182,0.12)",
  },
  {
    name: "Community",
    desc: "Connect, share & grow together",
    route: "/starox-intelligence/community",
    icon: Users,
    accentLight: "#0369a1", accentDark: "#38bdf8",
    bgLight: "#e0f2fe", bgDark: "rgba(56,189,248,0.13)",
    badge: "Coming Soon",
  },
];

const SUPPORT_PRODUCTS: Product[] = [
  {
    name: "Pricing",
    desc: "Simple plans for every team",
    route: "/pricing",
    icon: CreditCard,
    accentLight: "#15803d", accentDark: "#4ade80",
    bgLight: "#dcfce7", bgDark: "rgba(74,222,128,0.12)",
  },
  {
    name: "Settings",
    desc: "Manage your account",
    route: "/settings",
    icon: Settings,
    accentLight: "#475569", accentDark: "#94a3b8",
    bgLight: "#f1f5f9", bgDark: "rgba(148,163,184,0.12)",
  },
  {
    name: "Help",
    desc: "Guides & support resources",
    route: "/help",
    icon: HelpCircle,
    accentLight: "#b45309", accentDark: "#fcd34d",
    bgLight: "#fef9c3", bgDark: "rgba(252,211,77,0.12)",
  },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

function ProductCard({ product }: { product: Product }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const navigate = useNavigate();
  const Icon = product.icon;
  const accent = isDark ? product.accentDark : product.accentLight;
  const bg = isDark ? product.bgDark : product.bgLight;

  return (
    <motion.button
      onClick={() => navigate(product.route)}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: smoothEase }}
      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background px-4 py-3.5 text-left transition-all duration-150
        hover:border-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_16px_rgba(0,0,0,0.3)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-105">
        {product.img
          ? <img src={product.img} alt={product.name} className="h-14 w-14 object-contain rounded-2xl" />
          : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: bg }}>
              <Icon className="h-7 w-7" style={{ color: accent }} />
            </div>
          )
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
          {product.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {product.badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug truncate">{product.desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:text-muted-foreground group-hover:translate-x-0.5" />
    </motion.button>
  );
}

function ProductGroup({ title, products }: { title: string; products: Product[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.name} product={p} />
        ))}
      </div>
    </section>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center gap-4 px-6 sm:px-10">
          <Link to="/starox-intelligence" className="flex shrink-0 items-center gap-2.5">
            <img
              src="/strx.png"
              alt="STAROX"
              className="h-8 w-8 object-contain drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]"
            />
            <span className="font-display text-base font-bold tracking-tight text-foreground">STAROX</span>
          </Link>
          <div className="flex-1" />
          <Link
            to="/starox-intelligence"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Intelligence
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-border/40 bg-muted/20 px-6 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: smoothEase }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">All Products</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            STAROX Intelligence Suite
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Every workspace, tool, and resource — in one place. Click any product to jump straight in.
          </p>
        </motion.div>
      </div>

      {/* Product groups */}
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: smoothEase }}
        >
          <ProductGroup title="Core Workspaces" products={CORE_PRODUCTS} />
          <ProductGroup title="Tools & Integrations" products={TOOLS_PRODUCTS} />
          <ProductGroup title="Account & Support" products={SUPPORT_PRODUCTS} />
        </motion.div>
      </main>
    </div>
  );
}
