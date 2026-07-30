import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Film, Users, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import ContactModal from "@/components/ContactModal";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const smoothEase = [0.22, 1, 0.36, 1] as const;

const capabilityCards = [
  {
    icon: Film,
    title: "Edits & Content",
    description: "AI-assisted video, content, and media edits — fast iteration for marketing and creators.",
    href: "/teams/edits",
    accentLight: "#1a73e8",
    accentDark: "#60a5fa",
    bgLight: "#e8f0fe",
    bgDark: "rgba(96,165,250,0.12)",
  },
  {
    icon: Users,
    title: "Team Delivery",
    description: "End-to-end project execution: full projects, MVPs, RSVPs, and managed delivery.",
    href: "/teams/teamx",
    accentLight: "#d93025",
    accentDark: "#f87171",
    bgLight: "#fce8e6",
    bgDark: "rgba(248,113,113,0.12)",
  },
];

const tickerItems = [
  "Edits & Content", "Team Delivery", "MVP Builds", "Content Strategy",
  "Sprint Management", "Brand Assets", "Managed Ops", "Campaign Execution",
  "Video Production", "Design Systems",
];

export default function Teams() {
  const { collapsed } = useSidebarStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contactOpen, setContactOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      <div
        className="flex-1 relative flex flex-col overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        {/* ── Layered background ─────────────────────────────────── */}
        {/* Light: soft blue-to-rose gradient sweep */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 20% 0%, rgba(219,234,254,0.9) 0%, transparent 55%)," +
              "radial-gradient(ellipse 70% 50% at 85% 10%, rgba(252,231,243,0.7) 0%, transparent 50%)," +
              "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(224,242,254,0.8) 0%, transparent 60%)",
          }}
        />
        {/* Dark: deep blue glow from bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(37,99,235,0.32) 0%, rgba(29,78,216,0.14) 40%, transparent 65%)," +
              "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(56,189,248,0.08) 0%, transparent 50%)",
          }}
        />

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <motion.button
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: smoothEase }}
            type="button"
            onClick={() => navigate("/starox-intelligence")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            Back to Intelligence
          </motion.button>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: smoothEase }}
            className="mb-5 inline-flex items-center gap-2 rounded-full
              border border-primary/20 bg-primary/8 px-3.5 py-1.5
              dark:border-white/[0.09] dark:bg-white/[0.04]"
          >
            <img src="/assets/images/strx.png" alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain opacity-70" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary dark:text-white/45">
              Starox Teams
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.05, ease: smoothEase }}
            className="font-bold tracking-tight text-foreground leading-[0.92]"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            Teams{" "}
            <motion.img
              src="/assets/images/strx.png"
              alt=""
              aria-hidden="true"
              className="inline-block align-middle"
              initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: smoothEase }}
              style={{
                width: "clamp(36px, 5.5vw, 68px)",
                height: "clamp(36px, 5.5vw, 68px)",
                objectFit: "contain",
                verticalAlign: "middle",
                marginBottom: "0.06em",
                filter: "brightness(1.15) drop-shadow(0 0 14px rgba(56,189,248,0.6))",
                animation: "starSpin 8s ease-in-out infinite",
              }}
            />{" "}
            unified.
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.12, ease: smoothEase }}
            className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground"
          >
            Managed Dev, Marketing, Design, Ops & Content Editing
            in one operating layer — execution that stays coordinated.
          </motion.p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.2, ease: smoothEase }}
            type="button"
            onClick={() => setContactOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full
              bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground
              shadow-[0_4px_18px_rgba(26,115,232,0.35)]
              hover:bg-primary/90 hover:shadow-[0_6px_24px_rgba(26,115,232,0.45)]
              transition-all duration-200"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Book a Demo
          </motion.button>

          {/* Capability cards */}
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 max-w-lg mx-auto">
            {capabilityCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.28 + index * 0.06, ease: smoothEase }}
                  onClick={() => navigate(card.href)}
                  className="group rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm p-5 cursor-pointer text-left
                    transition-all duration-200
                    hover:border-border hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                    dark:bg-card dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex flex-col gap-3">
                    {/* Icon badge with card-specific color */}
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                      style={{ background: isDark ? card.bgDark : card.bgLight }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: isDark ? card.accentDark : card.accentLight }}
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{card.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.description}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-semibold transition-colors duration-200"
                      style={{ color: isDark ? card.accentDark : card.accentLight }}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Open
                      </span>
                      <ArrowRight className="h-3 w-3 -translate-x-2 group-hover:translate-x-0 transition-transform duration-200" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Ticker strip */}
        <div className="relative z-10 shrink-0 border-t border-border/40 overflow-hidden py-3.5">
          <div className="flex gap-8 w-max" style={{ animation: "tickerScroll 22s linear infinite" }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={i}
                className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/35 whitespace-nowrap"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} context="Starox Teams" />
      </div>
    </div>
  );
}
