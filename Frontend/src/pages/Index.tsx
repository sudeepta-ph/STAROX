import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "@/components/ChatInterface";
import Starox2HeroInput from "@/components/Starox2HeroInput";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { BrainCircuit, LineChart, ChevronRight, type LucideIcon } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { useAnalysisStore } from "@/lib/store";
import { useLocation, useNavigate } from "react-router-dom";
import type { Starox2Target } from "@/lib/store";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

type AgentId = "starox1" | "starox2";

type AgentTheme = {
  id: AgentId;
  icon: LucideIcon;
  name: string;
  label: string;
  badge: string;
  title: string;
  description: string;
  tagline: string;
  questions: string[];
  color: string;
  iconColor: string;
  dotColor: string;
  heroRadial: string;
  heroRadialIce: string;
  heroGridLine: string;
  primary: string;
  ring: string;
  starImage?: string;
};

const PRODUCT_INTELLIGENCE_VISUAL_THEME = {
  color: "border-primary/20 bg-primary/5",
  iconColor: "text-primary",
  dotColor: "bg-primary",
  heroRadial: "204 78% 57%",
  heroRadialIce: "205 48% 82%",
  heroGridLine: "204 46% 62%",
  primary: "204 78% 57%",
  ring: "204 78% 57%",
} as const;

const AGENT_THEMES: Record<AgentId, AgentTheme> = {
  starox1: {
    id: "starox1",
    icon: BrainCircuit,
    name: "STAROX PMX",
    label: "Product Experience Intelligence",
    badge: "AI Product Experience Intelligence",
    title: "STAROX Product Experience Intelligence",
    description: "Paste your website URL. Let AI analyze your product, surface friction, map the experience, and turn signals into clear decisions.",
    tagline: "Raw Inputs -> Structured Product Decisions",
    questions: [
      "What should I build next?",
      "What is holding the product back?",
      "Which features matter most right now?",
      "How should this roadmap scale?",
    ],
    ...PRODUCT_INTELLIGENCE_VISUAL_THEME,
  },
  starox2: {
    id: "starox2",
    icon: LineChart,
    name: "STAROX PMX",
    label: "Product Experience Intelligence",
    badge: "AI Product Experience Intelligence",
    title: "STAROX Product Experience Intelligence",
    description: "Paste your website URL. Let AI analyze your product, surface friction, map the experience, and turn signals into clear decisions.",
    tagline: "Product State -> Optimized Experience",
    questions: [
      "Where are users dropping off?",
      "Which UX patterns create friction?",
      "What should be improved first?",
      "How can the flow convert better?",
    ],
    ...PRODUCT_INTELLIGENCE_VISUAL_THEME,
  },
};

const AGENT_ORDER: AgentId[] = ["starox1", "starox2"];

const Index = () => {
  const { user } = useAuthStore();
  const { collapsed } = useSidebarStore();
  const { resetForNewUrl } = useAnalysisStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const smoothEase = [0.22, 1, 0.36, 1] as const;

  const heroItemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: (delay: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.78,
        delay,
        ease: smoothEase,
      },
    }),
  };

  const selectedAgent = useMemo<AgentId>(() => {
    const raw = new URLSearchParams(location.search).get("agent");
    return AGENT_ORDER.includes(raw as AgentId) ? (raw as AgentId) : "starox1";
  }, [location.search]);

  const activeTheme = AGENT_THEMES[selectedAgent];

  const handleAgentChange = (agent: AgentId) => {
    navigate(`/pmx?agent=${agent}`, { replace: true });
    setAgentMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!agentMenuRef.current) return;
      const target = event.target as Node;
      if (!agentMenuRef.current.contains(target)) {
        setAgentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const heroThemeStyle = useMemo<CSSProperties>(
    () => ({
      ["--hero-radial" as string]: activeTheme.heroRadial,
      ["--hero-radial-ice" as string]: activeTheme.heroRadialIce,
      ["--hero-grid-line" as string]: activeTheme.heroGridLine,
      ["--primary" as string]: activeTheme.primary,
      ["--ring" as string]: activeTheme.ring,
      ["--hero-star-image" as string]: activeTheme.starImage ? `url('${activeTheme.starImage}')` : "url('/hero-star-core.png')",
    }),
    [activeTheme],
  );

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).toString();
  };

  const deriveProjectName = (normalizedUrl: string): string => {
    const host = new URL(normalizedUrl).hostname.replace(/^www\./, "");
    const base = host.split(".")[0] || "Project";
    return `${base.charAt(0).toUpperCase()}${base.slice(1)} Project`;
  };

  const handleWebsiteSubmit = async (rawUrl: string) => {
    let normalized: string;
    try {
      normalized = normalizeUrl(rawUrl);
    } catch {
      return;
    }

    // Reset analysis state before navigating to prevent stale data flash
    resetForNewUrl();

    navigate(`/agent/pmx?url=${encodeURIComponent(normalized)}`);

    if (user) {
      void addDoc(collection(db, "users", user.uid, "projects"), {
        name: deriveProjectName(normalized),
        url: normalized,
        status: "active",
        createdAt: serverTimestamp(),
        aiRuns: 0,
        suggestions: 0,
      }).catch(() => {
        // Non-blocking: analysis should continue even if project save fails.
      });
    }
  };

  const handleStarox2Submit = async (target: Starox2Target) => {
    const params = new URLSearchParams();
    params.set("mode", target.mode);
    if (target.url) params.set("url", target.url);
    if (target.runtimeUrl) params.set("runtimeUrl", target.runtimeUrl);
    if (target.repo?.url) params.set("repoUrl", target.repo.url);
    if (target.repo?.fullName) params.set("repoName", target.repo.fullName);
    if (target.repo?.description) params.set("repoDescription", target.repo.description);
    if (target.repo?.language) params.set("repoLanguage", target.repo.language);
    if (target.repo?.defaultBranch) params.set("repoBranch", target.repo.defaultBranch);
    if (target.repo?.visibility) params.set("repoVisibility", target.repo.visibility);
    if (typeof target.repo?.stars === "number") params.set("repoStars", String(target.repo.stars));
    if (typeof target.repo?.forks === "number") params.set("repoForks", String(target.repo.forks));
    if (target.repo?.updatedAt) params.set("repoUpdatedAt", target.repo.updatedAt);

    resetForNewUrl();
    navigate(`/agent/starox2?${params.toString()}`);

    const projectUrl = target.url || target.runtimeUrl || target.repo?.url;
    if (user && projectUrl) {
      void addDoc(collection(db, "users", user.uid, "projects"), {
        name: target.repo?.fullName || deriveProjectName(projectUrl),
        url: projectUrl,
        status: "active",
        createdAt: serverTimestamp(),
        aiRuns: 0,
        suggestions: 0,
      }).catch(() => {
        // Non-blocking.
      });
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 relative flex flex-col overflow-y-auto scroll-smooth transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="relative flex-1 flex flex-col">
          <main className="relative flex-1">
          <section className="relative w-full overflow-visible" style={heroThemeStyle}>

            <div className="hero-shell w-full" style={{ borderRadius: 0, minHeight: "100vh" }}>
              <motion.div
                className="hero-tech-bg"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.992 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.15, ease: smoothEase }}
              >
                <div className="hero-grid" />
                <div className="hero-fog hero-fog-top" />
                <div className="hero-fog hero-fog-bottom" />
                <div className="hero-beam" />
              </motion.div>

              {/* Half-star — right-center on desktop, top-right on mobile */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-40
                  right-0 top-1/2 [transform:translateY(-50%)_translateX(50%)]
                  max-[800px]:top-0 max-[800px]:[transform:translateY(-10%)_translateX(44%)]"
                style={{ width: "clamp(180px, 35vw, 500px)", aspectRatio: "1" }}
              >
                <div className="hero-star-core h-full w-full" />
              </div>

              <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 max-[800px]:justify-start max-[800px]:pt-20">
                <motion.div className="px-2 text-center sm:px-0" initial="hidden" animate="visible" variants={heroItemVariants}>
                  <motion.div
                    className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary/85 backdrop-blur-xl sm:px-4 sm:text-[11px] sm:tracking-[0.28em]"
                    variants={heroItemVariants}
                    custom={0.06}
                  >
                    {activeTheme.badge}
                  </motion.div>
                  <motion.h1
                    className="mx-auto max-w-5xl font-display text-[clamp(2.15rem,11vw,4.5rem)] font-bold leading-[0.95] tracking-tight text-foreground"
                    variants={heroItemVariants}
                    custom={0.16}
                  >
                    {activeTheme.title}
                  </motion.h1>
                  <motion.p
                    className="mx-auto mt-4 max-w-2xl text-xs leading-6 text-foreground/65 dark:text-muted-foreground sm:mt-5 sm:text-sm sm:leading-7 md:text-base"
                    variants={heroItemVariants}
                    custom={0.28}
                  >
                    {activeTheme.description}
                  </motion.p>
                </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.42, ease: smoothEase }}
                    className="relative z-10 mt-10 w-full"
                  >
                    <ChatInterface onWebsiteSubmit={handleWebsiteSubmit} />
                  </motion.div>
              </div>
            </div>
          </section>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
