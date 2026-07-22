import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Film, Users, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  { icon: Film,  title: "Edits & Content", description: "AI-assisted video, content, and media edits — fast iteration for marketing and creators.", href: "/teams/edits" },
  { icon: Users, title: "Team Delivery",   description: "End-to-end project execution: full projects, MVPs, RSVPs, and managed delivery.",           href: "/teams/teamx" },
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

  return (
    <div className="h-screen bg-[#08080d] flex overflow-hidden">
      <Sidebar />

      {/* main area — full height, no scroll */}
      <div
        className="flex-1 relative flex flex-col overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        {/* gradient bg */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(37,99,235,0.32) 0%, rgba(29,78,216,0.14) 40%, transparent 65%), " +
              "linear-gradient(180deg, #08080d 0%, #090c18 100%)",
          }}
        />

        {/* top bar: back left only — no book demo here */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <motion.button
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: smoothEase }}
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/35 hover:text-white/65 transition-colors duration-200"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            Back to Intelligence
          </motion.button>
        </div>

        {/* center content — flex-1 so it fills remaining height */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0">

          {/* STAROX TEAMS badge — refined */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: smoothEase }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5"
          >
            <img src="/strx.png" alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain opacity-70" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">Starox Teams</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.05, ease: smoothEase }}
            className="font-bold tracking-tight text-white leading-[0.92]"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            Teams{" "}
            <motion.img
              src="/strx.png"
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
                filter: "brightness(1.15) drop-shadow(0 0 12px rgba(56,189,248,0.5))",
                animation: "starSpin 8s ease-in-out infinite",
              }}
            />{" "}
            unified.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.12, ease: smoothEase }}
            className="mt-4 max-w-sm text-sm leading-6 text-white/38"
          >
            Managed Dev, Marketing, Design, Ops & Content Editing in one operating layer — execution that stays coordinated.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.2, ease: smoothEase }}
            type="button"
            onClick={() => setContactOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-6 py-2.5 text-sm font-semibold text-[#08080d] shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-all duration-200 hover:bg-white/92 hover:shadow-[0_0_32px_rgba(255,255,255,0.18)]"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Book a Demo
          </motion.button>

          {/* cards */}
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
                  className="group rounded-2xl border border-white/[0.10] bg-[#111118] p-5 cursor-pointer text-left transition-all duration-200 hover:border-white/[0.20] hover:bg-[#15151e]"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07]">
                      <Icon className="h-4 w-4 text-white/65" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">{card.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-white/42">{card.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-white/28 group-hover:text-white/65 transition-colors duration-200">
                      Open <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ticker strip — pinned to bottom */}
        <div className="relative z-10 shrink-0 border-t border-white/[0.05] overflow-hidden py-3.5">
          <div className="flex gap-8 w-max" style={{ animation: "tickerScroll 22s linear infinite" }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-white/18 whitespace-nowrap">
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
