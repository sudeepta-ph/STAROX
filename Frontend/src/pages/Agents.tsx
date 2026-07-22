import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  BookOpenText,
  LineChart,
  Megaphone,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type AgentCard = {
  id: string;
  routeAgent: "starox1" | "starox2" | "starox3" | "starox4" | "starox5";
  name: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentSoft: string;
  prompts: string[];
};

const AGENTS: AgentCard[] = [
  {
    id: "starox-1",
    routeAgent: "starox1",
    name: "STAROX-1",
    title: "Product Intelligence",
    tagline: "Raw inputs into roadmap decisions",
    description: "Turn product signals into sharper roadmap priorities, opportunity framing, and high-confidence next steps.",
    icon: BrainCircuit,
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.10)",
    prompts: [
      "What should I build next?",
      "What is holding the product back?",
      "Which features matter most right now?",
    ],
  },
  {
    id: "starox-2",
    routeAgent: "starox2",
    name: "STAROX-2",
    title: "Experience Intelligence",
    tagline: "Friction into flow improvements",
    description: "Surface UX friction, identify drop-off patterns, and outline improvements that raise clarity and conversion.",
    icon: LineChart,
    accent: "#67e8f9",
    accentSoft: "rgba(103,232,249,0.09)",
    prompts: [
      "Where are users dropping off?",
      "Which UX patterns create friction?",
      "What should be improved first?",
    ],
  },
  {
    id: "starox-3",
    routeAgent: "starox3",
    name: "STAROX-3",
    title: "Documentation Intelligence",
    tagline: "System knowledge into clear docs",
    description: "Translate complexity into documentation, onboarding narratives, and explainers your team can actually use.",
    icon: BookOpenText,
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.09)",
    prompts: [
      "What should the docs explain first?",
      "Where is product knowledge unclear?",
      "How do we structure technical narratives better?",
    ],
  },
  {
    id: "starox-4",
    routeAgent: "starox4",
    name: "STAROX-4",
    title: "Engineering Intelligence",
    tagline: "Code signals into safer execution",
    description: "Spot implementation risk, rank technical priorities, and guide engineering work with system-aware clarity.",
    icon: Wrench,
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.09)",
    prompts: [
      "Which technical issues matter most?",
      "What should engineering fix first?",
      "Where are reliability risks hiding?",
    ],
  },
  {
    id: "starox-5",
    routeAgent: "starox5",
    name: "STAROX-5",
    title: "Marketing Intelligence",
    tagline: "Product signals into market momentum",
    description: "Turn what the product is telling you into positioning, messaging, campaigns, and clearer audience focus.",
    icon: Megaphone,
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.09)",
    prompts: [
      "What message will land best?",
      "Which audiences should we focus on?",
      "How should the product be positioned?",
    ],
  },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

const AgentsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-2 sm:pb-20">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: smoothEase }}
          className="relative overflow-hidden rounded-[1.8rem] border border-border/40 bg-card px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:px-10 sm:py-14"
        >
          {/* Right glow + star */}
          <div className="pointer-events-none absolute inset-y-0 right-[-6%] w-[28rem] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,hsl(var(--primary)/0.04)_42%,transparent_74%)] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_60%,hsl(var(--primary)/0.03))]" />
          <div className="pointer-events-none absolute inset-y-0 right-[-10%] hidden w-[24rem] sm:block">
            <div className="absolute inset-y-[10%] right-[6%] w-[20rem] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.10)_0%,transparent_72%)] blur-3xl" />
            <div className="hero-star-core h-full w-full" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-primary/80 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.28em]">
              <Sparkles className="h-3.5 w-3.5" />
              STAROX Agent Directory
            </div>
            <h1 className="mt-4 font-display text-[clamp(2rem,7vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.03em] text-foreground sm:mt-5">
              Meet the full<br className="hidden sm:block" /> intelligence lineup
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:mt-5 sm:text-base">
              Browse every STAROX role in one place. Each agent is tuned for a different layer of product work, from roadmap judgment to marketing momentum.
            </p>
          </div>
        </motion.section>

        {/* ── Agent cards ── */}
        <section className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            const isComingSoon = agent.routeAgent === "starox4" || agent.routeAgent === "starox5";

            return (
              <motion.button
                key={agent.id}
                type="button"
                onClick={() => !isComingSoon && navigate(`/pmx?agent=${agent.routeAgent}`)}
                disabled={isComingSoon}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 + index * 0.055, ease: smoothEase }}
                whileHover={!isComingSoon ? { y: -6, scale: 1.015 } : undefined}
                whileTap={!isComingSoon ? { scale: 0.99 } : undefined}
                className={`group relative overflow-hidden rounded-[1.5rem] border bg-card p-5 text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 sm:rounded-[1.8rem] sm:p-6 ${
                  isComingSoon
                    ? "cursor-not-allowed border-border/30 opacity-70"
                    : "border-border/40 hover:border-primary/35 hover:shadow-[0_16px_48px_hsl(var(--primary)/0.12)]"
                }`}
              >
                {/* Accent glow */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle at 10% 10%, ${agent.accentSoft} 0%, transparent 55%)` }}
                />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border sm:h-12 sm:w-12"
                        style={{
                          borderColor: `${agent.accent}28`,
                          background: agent.accentSoft,
                          boxShadow: `0 0 14px ${agent.accent}22`,
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: agent.accent }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-display font-semibold tracking-[0.18em] text-foreground/70 sm:text-[11px]">{agent.name}</p>
                        <p className="mt-0.5 text-xs text-primary/70 font-medium">{agent.title}</p>
                      </div>
                    </div>
                    {!isComingSoon && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-foreground/20 transition-all duration-200 group-hover:text-primary/70 group-hover:translate-x-0.5 mt-1" />
                    )}
                  </div>

                  {/* Tagline */}
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary/50 sm:text-[11px]">{agent.tagline}</p>

                  {isComingSoon ? (
                    <div className="mt-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:mt-4">
                      Coming Soon
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-[13px] leading-6 text-muted-foreground sm:text-sm">{agent.description}</p>

                      <div className="mt-5 space-y-2 sm:mt-6">
                        {agent.prompts.map((prompt) => (
                          <div key={prompt} className="flex items-center gap-2 text-[12px] text-muted-foreground sm:text-[13px]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: agent.accent }} />
                            {prompt}
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium sm:mt-7 sm:text-sm" style={{ color: agent.accent }}>
                        Open agent
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </>
                  )}
                </div>
              </motion.button>
            );
          })}
        </section>

      </div>
    </div>
  );
};

export default AgentsPage;
