import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Rocket, CalendarCheck, ClipboardList,
  Handshake, BarChart3, CalendarDays,
  CheckCircle2, Circle, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import ContactModal from "@/components/ContactModal";
import WhatWeDo from "@/components/WhatWeDo";

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

const teamCards = [
  { icon: Rocket,        title: "MVP Delivery",      description: "Scoped, fast-tracked MVP builds with a managed team — from spec to shipped." },
  { icon: CalendarCheck, title: "RSVP Projects",      description: "Event-driven delivery milestones with coordinated team execution and tracking." },
  { icon: ClipboardList, title: "Project Management", description: "Structured sprints, task ownership, and progress visibility across every workstream." },
  { icon: Handshake,     title: "Managed Delivery",   description: "A dedicated team handles execution end-to-end so you stay focused on decisions." },
  { icon: BarChart3,     title: "Delivery Analytics", description: "Real-time insight into team velocity, bottlenecks, and milestone completion." },
];

const mockSprints = [
  { label: "Design system", status: "done",    tag: "Design" },
  { label: "Auth flow",     status: "done",    tag: "Dev" },
  { label: "API routes",    status: "active",  tag: "Dev" },
  { label: "Dashboard UI",  status: "active",  tag: "Design" },
  { label: "QA pass",       status: "pending", tag: "QA" },
  { label: "Deploy MVP",    status: "pending", tag: "Ops" },
];

const tagColors: Record<string, string> = {
  Design: "bg-indigo-500/15 text-indigo-300",
  Dev:    "bg-sky-500/15 text-sky-300",
  QA:     "bg-amber-500/15 text-amber-300",
  Ops:    "bg-emerald-500/15 text-emerald-300",
};

export default function TeamsTeamX() {
  const { collapsed } = useSidebarStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="h-screen bg-[#08080d] flex overflow-hidden">
      <Sidebar />

      <div
        className="flex-1 relative flex flex-col overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        {/* top bar */}
        <div className="relative z-20 shrink-0 flex items-center justify-between px-6 pt-5 pb-0">
          <motion.button
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: smoothEase }}
            type="button"
            onClick={() => navigate("/teams")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/30 hover:text-white/65 transition-colors duration-200"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            Back to Teams
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: 0.05, ease: smoothEase }}
            type="button"
            onClick={() => setContactOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#111118] px-4 py-2 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-[#18181f] hover:border-white/25 hover:text-white"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Book a Demo
          </motion.button>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-6 pb-6">

            {/* hero text */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: smoothEase }}
              className="mb-6"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sky-400/75 mb-2">
                Team Delivery
              </p>
              <h1
                className="font-bold tracking-tight text-white leading-[0.92]"
                style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
              >
                Execution,<br />handled.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
                End-to-end project execution with a managed team — full projects, MVPs, RSVPs, and coordinated delivery that actually ships.
              </p>
            </motion.div>

            {/* sprint board */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.44, delay: 0.08, ease: smoothEase }}
              className="rounded-2xl border border-white/[0.08] bg-[#0e0e15] overflow-hidden"
            >
              {/* titlebar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/25">
                  Active Sprint
                </span>
                <span className="text-[10px] text-white/16">Sprint 3 · Week 2</span>
              </div>

              {/* tasks grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mockSprints.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: 0.1 + i * 0.045, ease: smoothEase }}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#111118] px-3.5 py-2.5"
                  >
                    {item.status === "done"    && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                    {item.status === "active"  && <Clock        className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                    {item.status === "pending" && <Circle       className="h-3.5 w-3.5 shrink-0 text-white/18" />}
                    <span className={`text-xs font-medium flex-1 ${item.status === "done" ? "text-white/32 line-through" : "text-white/75"}`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tagColors[item.tag]}`}>
                      {item.tag}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* progress */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/22">Sprint progress</span>
                  <span className="text-[10px] font-semibold text-sky-400/75">33%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "33%" }}
                    transition={{ duration: 1, delay: 0.4, ease: smoothEase }}
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* infinite scroll ticker */}
          <div className="w-full border-t border-white/[0.05] overflow-hidden py-5">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/18 mb-4">Capabilities</p>
            <div className="flex gap-4 w-max px-4" style={{ animation: "tickerScroll 30s linear infinite" }}>
              {[...teamCards, ...teamCards].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="shrink-0 w-52 rounded-2xl border border-white/[0.08] bg-[#111118] p-4 hover:border-white/[0.16] transition-colors duration-200"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] mb-2.5">
                      <Icon className="h-3.5 w-3.5 text-white/55" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                    <p className="text-xs leading-4 text-white/35">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* what we do */}
          <WhatWeDo
            headline="End-to-end execution, without the overhead"
            subline="We handle the people, the process, and the delivery — so you can stay focused on what matters most."
            rows={[
              {
                title: "Managed teams, ready to ship",
                description: "We assign the right people to your project immediately. Designers, developers, PMs, and QA — coordinated from day one, no hiring required.",
                imageContent: (
                  <div className="w-full h-full flex flex-col p-5 gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">Active Team</span>
                      <span className="text-[10px] text-emerald-400/70">● Live</span>
                    </div>
                    {[
                      { initials: "AK", role: "Lead Developer",  status: "active",  color: "bg-sky-500" },
                      { initials: "SM", role: "UI/UX Designer",   status: "active",  color: "bg-indigo-500" },
                      { initials: "RJ", role: "Project Manager",  status: "active",  color: "bg-emerald-500" },
                      { initials: "TL", role: "QA Engineer",      status: "review",  color: "bg-amber-500" },
                    ].map((m) => (
                      <div key={m.initials} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111118] px-3.5 py-2.5">
                        <div className={`h-7 w-7 rounded-full ${m.color} flex items-center justify-center shrink-0`}>
                          <span className="text-[10px] font-bold text-white">{m.initials}</span>
                        </div>
                        <span className="text-xs text-white/70 flex-1">{m.role}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {m.status === "active" ? "On task" : "In review"}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                title: "Sprint delivery, on schedule",
                description: "Every project runs in tight, tracked sprints with clear milestones and daily visibility. You see exactly what's being built, when, and by whom.",
                reverse: true,
                imageContent: (
                  <div className="w-full h-full flex flex-col p-5 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">Sprint 4</span>
                      <span className="text-[10px] text-sky-400/70">Day 5 of 10</span>
                    </div>
                    {[
                      { label: "Design",  pct: 100, color: "bg-indigo-500" },
                      { label: "Backend", pct: 72,  color: "bg-sky-500" },
                      { label: "Frontend",pct: 55,  color: "bg-blue-400" },
                      { label: "QA",      pct: 20,  color: "bg-amber-500" },
                    ].map((t) => (
                      <div key={t.label} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs text-white/35">{t.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${t.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full ${t.color} opacity-70`}
                          />
                        </div>
                        <span className="w-8 text-right text-[10px] text-white/30">{t.pct}%</span>
                      </div>
                    ))}
                    <div className="mt-1 rounded-xl border border-white/[0.06] bg-[#111118] px-3.5 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-white/45">Next milestone</span>
                      <span className="text-xs font-medium text-white/70">MVP handoff · Day 10</span>
                    </div>
                  </div>
                ),
              },
              {
                title: "Real-time delivery visibility",
                description: "No black boxes. Track velocity, blockers, and delivery health in one view. Every stakeholder stays aligned without needing a status meeting.",
                imageContent: (
                  <div className="w-full h-full flex flex-col p-5 gap-3">
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: "Velocity",    value: "94%", sub: "vs last sprint", color: "text-emerald-400" },
                        { label: "Blockers",    value: "0",   sub: "active",          color: "text-white/70" },
                        { label: "On track",    value: "8/9", sub: "milestones",       color: "text-sky-400" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-white/[0.07] bg-[#111118] p-3 flex flex-col gap-1">
                          <span className="text-[10px] text-white/28">{s.label}</span>
                          <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                          <span className="text-[9px] text-white/22">{s.sub}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[#111118] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                        <span className="text-[10px] text-white/30">Latest update · 2 min ago</span>
                      </div>
                      <p className="text-xs text-white/50 leading-5">Dashboard UI merged to main. QA reviewing PR #48 — expected green in ~30 min.</p>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} context="Team Delivery" />
      </div>
    </div>
  );
}
