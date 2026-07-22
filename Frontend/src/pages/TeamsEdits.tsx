import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Wand2, ImagePlay, FileVideo,
  Captions, Layers, CalendarDays, Play,
  Sparkles, Scissors, Zap, Subtitles,
  LayoutTemplate, Share2, Repeat2,
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

const editCards = [
  { icon: Wand2,     title: "AI Video Edits",     description: "Automated cuts, transitions, and enhancements — ship polished video in minutes." },
  { icon: ImagePlay, title: "Content Repurposing", description: "Turn long-form content into clips, reels, and shorts optimized for every platform." },
  { icon: FileVideo, title: "Media Assets",        description: "Manage, transform, and deliver media assets at scale with AI-assisted workflows." },
  { icon: Captions,  title: "Captions & Copy",     description: "Auto-generate captions, subtitles, and supporting copy aligned with your brand voice." },
  { icon: Layers,    title: "Brand Templates",     description: "Consistent design templates across campaigns — instantly applied and always on-brand." },
];

const timelineTracks = [
  { label: "Video",    color: "bg-indigo-500",  segments: [{ left: "0%",  width: "55%" }, { left: "60%", width: "30%" }] },
  { label: "Audio",    color: "bg-sky-500",     segments: [{ left: "0%",  width: "80%" }] },
  { label: "Captions", color: "bg-emerald-500", segments: [{ left: "5%",  width: "25%" }, { left: "35%", width: "20%" }, { left: "60%", width: "28%" }] },
  { label: "B-Roll",   color: "bg-slate-400",   segments: [{ left: "12%", width: "18%" }, { left: "55%", width: "22%" }] },
];

const aiChips = [
  { icon: Scissors, label: "Auto-cut" },
  { icon: Sparkles, label: "Enhance" },
  { icon: Zap,      label: "Captions" },
];

export default function TeamsEdits() {
  const { collapsed } = useSidebarStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contactOpen, setContactOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

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

        {/* scrollable content area */}
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
                Edits &amp; Content
              </p>
              <h1
                className="font-bold tracking-tight text-white leading-[0.92]"
                style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
              >
                Edits,<br />at speed.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
                AI-assisted video, content, and media edits — fast iteration for marketing and creators who need to ship without the bottleneck.
              </p>
            </motion.div>

            {/* video showcase */}
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
                  Starox Edits
                </span>
                <div className="flex items-center gap-1.5">
                  {aiChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <span
                        key={chip.label}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/50"
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* video placeholder */}
              <div className="relative mx-4 mt-3 rounded-xl overflow-hidden flex items-center justify-center bg-[#0a0a12]" style={{ aspectRatio: "16/6" }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d0d20 0%, #0c1628 45%, #081520 75%, #0a0a0d 100%)" }} />
                <div
                  className="absolute inset-0 opacity-[0.045]"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                    backgroundSize: "36px 36px",
                  }}
                />
                <div className="absolute pointer-events-none" style={{ width: "40%", height: "80%", top: "10%", left: "30%", background: "radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)", filter: "blur(36px)" }} />
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/7 transition-all duration-200 hover:bg-white/14 hover:scale-105"
                >
                  <Play className="h-4 w-4 text-white fill-white translate-x-px" />
                </button>
                <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] text-white/22">campaign_v3_final.mp4</span>
                  <span className="text-[10px] text-white/16">0:00 / 2:34</span>
                </div>
              </div>

              {/* timeline */}
              <div className="px-4 pt-3 pb-4 space-y-1.5">
                {timelineTracks.map((track, i) => (
                  <div key={track.label} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-right text-[10px] text-white/20">{track.label}</span>
                    <div className="relative flex-1 h-4 rounded bg-white/[0.03] overflow-hidden">
                      {track.segments.map((seg, j) => (
                        <motion.div
                          key={j}
                          initial={{ scaleX: 0, originX: "left" }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: 0.22 + i * 0.06 + j * 0.04, ease: smoothEase }}
                          className={`absolute top-0.5 bottom-0.5 rounded-sm ${track.color} opacity-55`}
                          style={{ left: seg.left, width: seg.width }}
                        />
                      ))}
                      <div className="absolute top-0 bottom-0 w-px bg-white/22" style={{ left: "33%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* infinite scroll ticker */}
          <div className="w-full border-t border-white/[0.05] overflow-hidden py-5">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/18 mb-4">Capabilities</p>
            <div className="flex gap-4 w-max px-4" style={{ animation: "tickerScroll 28s linear infinite" }}>
              {[...editCards, ...editCards].map((card, i) => {
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
            headline="Ship content without the bottleneck"
            subline="From raw footage to published assets — AI-assisted editing that keeps your team moving fast, every time."
            rows={[
              {
                title: "Edit together without delays",
                description: "Teams collaborate on video and content in real time. Review, comment, and approve cuts without long email chains or waiting on one editor.",
                imageContent: (
                  <div className="w-full h-full flex flex-col gap-3 p-5">
                    {/* mock collab UI */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">campaign_launch_v4.mp4</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-300 text-[11px] font-medium">Review</span>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-medium">Approved</span>
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl bg-[#0a0a12] border border-white/[0.06] p-4 space-y-2.5">
                      {[
                        { user: "AK", comment: "Cut the intro at 0:12, feels slow", color: "bg-indigo-500" },
                        { user: "SM", comment: "Caption timing on slide 3 is off", color: "bg-sky-500" },
                        { user: "RJ", comment: "Looks great — approve for publish", color: "bg-emerald-500" },
                      ].map((c) => (
                        <div key={c.user} className="flex items-start gap-2.5">
                          <div className={`h-6 w-6 rounded-full ${c.color} flex items-center justify-center shrink-0`}>
                            <span className="text-[9px] font-bold text-white">{c.user}</span>
                          </div>
                          <p className="text-xs text-white/45 leading-5">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <div className="flex-1 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                      <div className="h-8 px-3 rounded-lg bg-white text-[#08080d] text-xs font-semibold flex items-center">Send</div>
                    </div>
                  </div>
                ),
              },
              {
                title: "Repurpose once, publish everywhere",
                description: "Turn one long-form video into 10+ pieces of content. Clips, captions, thumbnails, and copy — generated and formatted for every platform automatically.",
                reverse: true,
                imageContent: (
                  <div className="w-full h-full flex items-center justify-center p-5">
                    <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs">
                      {[
                        { label: "YouTube",   ratio: "16:9", color: "bg-red-500/20 border-red-500/20" },
                        { label: "Reels",     ratio: "9:16", color: "bg-indigo-500/20 border-indigo-500/20" },
                        { label: "Twitter/X", ratio: "1:1",  color: "bg-sky-500/20 border-sky-500/20" },
                        { label: "LinkedIn",  ratio: "4:5",  color: "bg-blue-500/20 border-blue-500/20" },
                        { label: "TikTok",    ratio: "9:16", color: "bg-white/10 border-white/10" },
                        { label: "Thumbnail", ratio: "16:9", color: "bg-amber-500/20 border-amber-500/20" },
                      ].map((p) => (
                        <div key={p.label} className={`rounded-lg border p-2.5 ${p.color} flex flex-col items-center gap-1`}>
                          <div className="text-[9px] font-semibold text-white/60">{p.label}</div>
                          <div className="text-[8px] text-white/30">{p.ratio}</div>
                          <div className="w-full h-1 rounded-full bg-white/10 mt-1">
                            <div className="h-full rounded-full bg-white/30 w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                title: "Captions, copy, and assets — automated",
                description: "AI generates accurate captions, subtitle files, and supporting copy aligned with your brand voice. No manual transcription, no delays.",
                imageContent: (
                  <div className="w-full h-full flex flex-col justify-center p-5 gap-3">
                    <div className="rounded-xl bg-[#0a0a12] border border-white/[0.06] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-white/35 uppercase tracking-wider">Auto-captioning</span>
                      </div>
                      {[
                        { time: "0:00", text: "Welcome to the product launch..." },
                        { time: "0:08", text: "Today we're shipping something big." },
                        { time: "0:14", text: "Built for teams who move fast—" },
                      ].map((line) => (
                        <div key={line.time} className="flex items-start gap-3">
                          <span className="text-[10px] text-white/22 w-8 shrink-0 font-mono">{line.time}</span>
                          <div className="flex-1 h-5 rounded bg-white/[0.05] flex items-center px-2">
                            <span className="text-[11px] text-white/55">{line.text}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[10px]">SRT export</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px]">VTT export</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/8 text-white/40 text-[10px]">Copy to doc</span>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} context="Edits & Content" />
      </div>
    </div>
  );
}
