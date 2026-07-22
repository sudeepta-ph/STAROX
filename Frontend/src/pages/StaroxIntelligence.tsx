import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import {
  LayoutDashboard,
  Code2,
  Zap,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

interface Agent {
  id: string;
  route: string;
  icon: LucideIcon;
  name: string;
  label: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
}

const AGENTS: Agent[] = [
  {
    id: "pmx",
    route: "/pmx",
    icon: LayoutDashboard,
    name: "STAROX PMX",
    label: "Project Management & Execution",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.12)",
    accentGlow: "rgba(56,189,248,0.25)",
  },
  {
    id: "build",
    route: "/build",
    icon: Code2,
    name: "STAROX BUILD",
    label: "Websites, Apps & SaaS Development",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.11)",
    accentGlow: "rgba(96,165,250,0.24)",
  },
  {
    id: "automation",
    route: "/automation",
    icon: Zap,
    name: "STAROX AUTOMATION",
    label: "Business & AI Automations",
    accent: "#93c5fd",
    accentSoft: "rgba(147,197,253,0.11)",
    accentGlow: "rgba(147,197,253,0.24)",
  },
  {
    id: "teams",
    route: "/teams",
    icon: Users,
    name: "STAROX TEAMS",
    label: "Managed Dev, Marketing, Design, Ops & Content Editing",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.11)",
    accentGlow: "rgba(56,189,248,0.24)",
  },
];

const HERO_STYLE: CSSProperties = {
  ["--hero-radial" as string]: "204 78% 57%",
  ["--hero-radial-ice" as string]: "205 48% 82%",
  ["--hero-grid-line" as string]: "204 46% 62%",
  ["--primary" as string]: "204 78% 57%",
  ["--ring" as string]: "204 78% 57%",
  ["--hero-star-image" as string]: "url('/hero-star-core.png')",
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

function AgentTile({ agent, index, onSelect }: { agent: Agent; index: number; onSelect: () => void }) {
  const Icon = agent.icon;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.20, delay: 0.22 + index * 0.035, ease: smoothEase }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="agent-tile-pulse group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl text-left transition-all duration-150 p-6 h-full hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.20),0_0_28px_hsl(var(--primary)/0.10),0_8px_40px_rgba(0,0,0,0.15)]"
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-150 opacity-40 group-hover:opacity-70"
        style={{ background: `radial-gradient(circle at 0% 0%, ${agent.accentSoft} 0%, transparent 60%)` }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-150"
            style={{
              borderColor: agent.accentSoft,
              background: agent.accentSoft,
              boxShadow: `0 0 12px ${agent.accentGlow}`,
            }}
          >
            <Icon className="h-6 w-6" style={{ color: agent.accent }} />
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/20 transition-all duration-150 group-hover:text-foreground/70 group-hover:translate-x-1" />
        </div>
        <div>
          <h3 className="text-base font-bold leading-tight text-card-foreground">{agent.name}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{agent.label}</p>
        </div>
      </div>
    </motion.button>
  );
}

const StaroxIntelligence = () => {
  const { collapsed } = useSidebarStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 relative flex flex-col overflow-y-auto scroll-smooth transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        {/* Full-screen hero */}
        <section className="relative w-full" style={{ ...HERO_STYLE, minHeight: "100vh" }}>
          <motion.div
            className="hero-tech-bg"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.992 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, ease: smoothEase }}
          >
            <div className="hero-grid" />
            <div className="hero-fog hero-fog-top" />
            <div className="hero-fog hero-fog-bottom" />
            <div className="hero-beam" />
          </motion.div>

          {/* Half-star — right-center ≥1400px, dimmed centered behind title <1400px */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-0 transition-opacity duration-300
              right-0 top-[35%] [transform:translateY(-50%)_translateX(50%)]
              max-[1400px]:right-auto max-[1400px]:left-1/2 max-[1400px]:top-[44%] max-[1400px]:[transform:translate(-50%,-50%)] max-[1400px]:opacity-[0.22]"
            style={{ width: "clamp(340px, 52vw, 520px)", aspectRatio: "1" }}
          >
            <div className="hero-star-core h-full w-full" />
          </div>

          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 max-[800px]:justify-start max-[800px]:pt-8">
            {/* Badge + Title */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: smoothEase }}
            >
              <motion.div
                className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-primary/85 backdrop-blur-xl sm:px-4 sm:text-[11px]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.03, ease: smoothEase }}
              >
                STAROX Intelligence
              </motion.div>
              <motion.h1
                className="mx-auto max-w-3xl font-display text-[clamp(2.5rem,8vw,5rem)] font-bold leading-[0.95] tracking-tight text-foreground"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.07, ease: smoothEase }}
              >
                STAROX Intelligence
              </motion.h1>
              <motion.p
                className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.12, ease: smoothEase }}
              >
                Select a workspace to jump in.
              </motion.p>
            </motion.div>

            {/* 4-card grid: 1-col → 2-col */}
            <div className="w-full max-w-5xl">
              {/* Row 1 — first 2 cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 items-stretch">
                {AGENTS.slice(0, 2).map((agent, i) => (
                  <AgentTile
                    key={agent.id}
                    agent={agent}
                    index={i}
                    onSelect={() => navigate(agent.route)}
                  />
                ))}
              </div>
              {/* Row 2 — remaining 2 cards */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 items-stretch">
                {AGENTS.slice(2).map((agent, i) => (
                  <AgentTile
                    key={agent.id}
                    agent={agent}
                    index={2 + i}
                    onSelect={() => navigate(agent.route)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StaroxIntelligence;
