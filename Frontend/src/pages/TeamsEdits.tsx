import { useEffect, useRef, useState } from "react";
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

const aiChips = [
  { icon: Scissors, label: "Auto-cut" },
  { icon: Sparkles, label: "Enhance" },
  { icon: Zap,      label: "Captions" },
];

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TeamsEdits() {
  const { collapsed } = useSidebarStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contactOpen, setContactOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
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
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-all duration-200 hover:bg-muted hover:border-border hover:text-foreground"
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
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sky-500 dark:text-sky-400/75 mb-2">
                Edits &amp; Content
              </p>
              <h1
                className="font-bold tracking-tight text-foreground leading-[0.92]"
                style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
              >
                Edits,<br />at speed.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                AI-generated video, AI-assisted edits, and content production — fast iteration for marketing and creators who need to ship without the bottleneck.
              </p>
            </motion.div>

            {/* video showcase */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.44, delay: 0.08, ease: smoothEase }}
              className="rounded-2xl border border-border/50 bg-card overflow-hidden"
            >
              {/* titlebar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                  Starox Edits
                </span>
                <div className="flex items-center gap-1.5">
                  {aiChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <span
                        key={chip.label}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* video showcase */}
              <div
                onClick={togglePlay}
                className="relative mx-4 mt-3 rounded-xl overflow-hidden flex items-center justify-center bg-background cursor-pointer group/video"
                style={{ aspectRatio: "16/6" }}
              >
                <video
                  ref={videoRef}
                  src="/assets/videos/starox-edits-demo.mp4"
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                  onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                />
                <div
                  className="absolute inset-0 opacity-[0.045] pointer-events-none"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                    backgroundSize: "36px 36px",
                  }}
                />
                <div className="absolute pointer-events-none" style={{ width: "40%", height: "80%", top: "10%", left: "30%", background: "radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)", filter: "blur(36px)" }} />
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:scale-105"
                  >
                    <Play className="h-4 w-4 text-white fill-white translate-x-px" />
                  </button>
                )}
                <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] text-white/70 drop-shadow">starox-edits-demo.mp4</span>
                  <span className="text-[10px] text-white/50 drop-shadow">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* infinite scroll ticker */}
          <div className="w-full border-t border-border/40 overflow-hidden py-5">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">Capabilities</p>
            <div className="flex gap-4 w-max px-4" style={{ animation: "tickerScroll 28s linear infinite" }}>
              {[...editCards, ...editCards].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="shrink-0 w-52 rounded-2xl border border-border/50 bg-card p-4 hover:border-border transition-colors duration-200"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted mb-2.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{card.title}</p>
                    <p className="text-xs leading-4 text-muted-foreground">{card.description}</p>
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
                      <span className="text-xs text-muted-foreground">campaign_launch_v4.mp4</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[11px] font-medium">Review</span>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-medium">Approved</span>
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl bg-background border border-border/40 p-4 space-y-2.5">
                      {[
                        { user: "AK", comment: "Cut the intro at 0:12, feels slow", color: "bg-indigo-500" },
                        { user: "SM", comment: "Caption timing on slide 3 is off", color: "bg-sky-500" },
                        { user: "RJ", comment: "Looks great — approve for publish", color: "bg-emerald-500" },
                      ].map((c) => (
                        <div key={c.user} className="flex items-start gap-2.5">
                          <div className={`h-6 w-6 rounded-full ${c.color} flex items-center justify-center shrink-0`}>
                            <span className="text-[9px] font-bold text-white">{c.user}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-5">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <div className="flex-1 h-8 rounded-lg bg-muted/40 border border-border/40" />
                      <div className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center">Send</div>
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
                        { label: "TikTok",    ratio: "9:16", color: "bg-muted border-border" },
                        { label: "Thumbnail", ratio: "16:9", color: "bg-amber-500/20 border-amber-500/20" },
                      ].map((p) => (
                        <div key={p.label} className={`rounded-lg border p-2.5 ${p.color} flex flex-col items-center gap-1`}>
                          <div className="text-[9px] font-semibold text-foreground/80">{p.label}</div>
                          <div className="text-[8px] text-muted-foreground">{p.ratio}</div>
                          <div className="w-full h-1 rounded-full bg-muted mt-1">
                            <div className="h-full rounded-full bg-foreground/40 w-3/4" />
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
                    <div className="rounded-xl bg-background border border-border/40 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-captioning</span>
                      </div>
                      {[
                        { time: "0:00", text: "Welcome to the product launch..." },
                        { time: "0:08", text: "Today we're shipping something big." },
                        { time: "0:14", text: "Built for teams who move fast—" },
                      ].map((line) => (
                        <div key={line.time} className="flex items-start gap-3">
                          <span className="text-[10px] text-muted-foreground/70 w-8 shrink-0 font-mono">{line.time}</span>
                          <div className="flex-1 h-5 rounded bg-muted/40 flex items-center px-2">
                            <span className="text-[11px] text-foreground/80">{line.text}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 text-[10px]">SRT export</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[10px]">VTT export</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">Copy to doc</span>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />

          {/* connected to PMX */}
          <div className="w-full border-t border-border/40 py-14">
            <div className="max-w-5xl mx-auto px-6 lg:px-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.42, ease: smoothEase }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-background p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <Sparkles className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Plugged into PMX</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground max-w-md">
                      Approve a marketing or launch task in PMX and it lands here — briefs, assets, and drafts ready for the Edits team to turn around, no handoff meeting required.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/pmx/overview")}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-2 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200"
                >
                  Open PMX
                  <ArrowRight className="h-3 w-3" />
                </button>
              </motion.div>

              {/* proof strip */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "<24h", label: "Typical turnaround" },
                  { value: "10+",  label: "Formats per upload" },
                  { value: "0",    label: "Editors to hire" },
                  { value: "AI",   label: "First-pass on every cut" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.32, delay: i * 0.05, ease: smoothEase }}
                    className="rounded-xl border border-border/40 bg-card p-4 text-center"
                  >
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} context="Edits & Content" />
      </div>
    </div>
  );
}
