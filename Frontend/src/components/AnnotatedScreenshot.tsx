import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Download, Loader2,
  StickyNote, Eye, EyeOff, ZoomIn, ZoomOut, ExternalLink,
  AlertTriangle, RotateCcw,
} from "lucide-react";
import type { PageScreenshot } from "@/lib/store";

interface Props {
  screenshots: PageScreenshot[];
  isOpen: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  exporting: boolean;
}

// Severity styles
const SEV: Record<string, { dot: string; badge: string }> = {
  critical: { dot: "bg-primary",              badge: "text-primary bg-primary/15 border-primary/25" },
  high:     { dot: "bg-primary/80",           badge: "text-primary/80 bg-primary/10 border-primary/20" },
  medium:   { dot: "bg-primary/60",           badge: "text-primary/70 bg-primary/8 border-primary/15" },
  low:      { dot: "bg-muted-foreground/40",  badge: "text-muted-foreground bg-muted/20 border-border/20" },
};

// Warm sticky-note paper colors
const NOTE_COLORS = ["#fef08a", "#fda4af", "#86efac", "#93c5fd", "#d8b4fe", "#fdba74", "#a5f3fc"];

export default function AnnotatedScreenshot({ screenshots, isOpen, onClose, onExportPdf, exporting }: Props) {
  const [idx, setIdx]           = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(true);
  const [zoom, setZoom]         = useState(1);
  const [active, setActive]     = useState<string | null>(null);

  const current = screenshots[idx];

  const goTo = useCallback((i: number) => {
    setIdx(i);
    setDismissed(new Set());
    setActive(null);
  }, []);

  const visible = current?.annotations.filter(a => !dismissed.has(a.id)) ?? [];

  if (!isOpen || !current) return null;

  const pathname = (() => { try { return new URL(current.url).pathname || "/"; } catch { return "/"; } })();

  return (
    <AnimatePresence>
      <motion.div
        key="annotated-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-md"
      >
        {/* ── Top bar ── */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/60">
          {/* Left: title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <StickyNote className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-display font-bold text-foreground leading-none">Annotated Screenshots</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{current.url}</p>
            </div>
            {visible.length > 0 && (
              <div className="shrink-0 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-[10px] text-primary font-semibold">{visible.length} note{visible.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
              <button
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notes toggle */}
            <button
              onClick={() => setShowNotes(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                showNotes
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showNotes ? "Notes on" : "Notes off"}
            </button>

            {/* Open in tab */}
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Export */}
            <button
              onClick={onExportPdf}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-starox text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Page tabs ── */}
        {screenshots.length > 1 && (
          <div className="shrink-0 flex gap-1.5 px-4 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto">
            {screenshots.map((s, i) => {
              const p = (() => { try { return new URL(s.url).pathname || "/"; } catch { return "/"; } })();
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    i === idx
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-transparent hover:text-foreground/70 hover:bg-muted/50"
                  }`}
                >
                  {p}
                  {s.annotations.length > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      i === idx ? "bg-primary/60 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {s.annotations.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Screenshot canvas ── */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-[#060a10]">
          <div
            className="relative inline-block origin-top transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          >
            {/* Page label */}
            <div className="absolute -top-7 left-0 flex items-center gap-1.5 text-[10px] text-white/30">
              <span>{pathname}</span>
              {current.annotations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/60/10 text-primary/70 border border-amber-400/15">
                  {current.annotations.length} annotation{current.annotations.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <img
              src={current.dataUrl}
              alt={`Screenshot of ${current.url}`}
              className="block rounded-xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/8"
              style={{ maxWidth: "1280px", width: "100%" }}
              draggable={false}
            />

            {/* ── Sticky notes ── */}
            <AnimatePresence>
              {showNotes && current.annotations.map((ann, i) => {
                if (dismissed.has(ann.id)) return null;
                const noteBg = NOTE_COLORS[i % NOTE_COLORS.length];
                const isActive = active === ann.id;
                const sev = SEV[ann.severity] ?? SEV.medium;
                const rotation = (i % 5 - 2) * 1.8;

                return (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, scale: 0.5, y: -16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: -10 }}
                    transition={{ delay: i * 0.055, type: "spring", stiffness: 420, damping: 24 }}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: isActive ? 60 : 20 + i,
                    }}
                    onClick={e => { e.stopPropagation(); setActive(isActive ? null : ann.id); }}
                  >
                    {/* Pin */}
                    <div
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white/90 shadow-lg ${sev.dot}`}
                      style={{ boxShadow: `0 0 10px 3px ${noteBg}55, 0 2px 6px rgba(0,0,0,0.5)` }}
                    />

                    {/* Note body */}
                    <motion.div
                      animate={{ rotate: isActive ? 0 : rotation, scale: isActive ? 1.05 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative rounded-lg cursor-pointer select-none"
                      style={{
                        backgroundColor: noteBg,
                        width: isActive ? 220 : 168,
                        padding: "10px 12px 10px 10px",
                        boxShadow: isActive
                          ? `0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)`
                          : `0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.25)`,
                      }}
                    >
                      {/* Tape strip */}
                      <div
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-9 h-3 rounded-sm opacity-55"
                        style={{ backgroundColor: noteBg, border: "1px solid rgba(0,0,0,0.08)" }}
                      />

                      {/* Dismiss */}
                      <button
                        onClick={e => { e.stopPropagation(); setDismissed(p => new Set([...p, ann.id])); }}
                        className="absolute top-1.5 right-1.5 opacity-30 hover:opacity-70 transition-opacity"
                      >
                        <X className="w-3 h-3 text-black" />
                      </button>

                      {/* Severity badge */}
                      <span className={`inline-flex text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border mb-1.5 ${sev.badge}`}>
                        {ann.severity}
                      </span>

                      {/* Issue label — what is wrong */}
                      <p className="text-[11px] font-bold text-black/90 leading-snug pr-4">
                        {ann.label}
                      </p>

                      {/* Expanded: fix + impact + priority */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-black/10 space-y-1.5">
                              {/* Fix */}
                              <div>
                                <p className="text-[8px] font-bold text-black/40 uppercase tracking-wider mb-0.5">Fix</p>
                                <p className="text-[10px] text-black/70 leading-relaxed">{ann.recommendation}</p>
                              </div>
                              {/* Impact + Priority row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[8px] font-semibold text-black/50">
                                  Impact: <span className="text-black/70">{ann.issue || "—"}</span>
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isActive && (
                        <p className="text-[9px] text-black/40 italic mt-1">tap to expand</p>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom legend ── */}
        {current.annotations.length > 0 && (
          <div className="shrink-0 border-t border-border/50 bg-card/60 px-4 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {current.annotations.length} annotation{current.annotations.length !== 1 ? "s" : ""}
              </span>
              {dismissed.size > 0 && (
                <button
                  onClick={() => { setDismissed(new Set()); setActive(null); }}
                  className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore {dismissed.size}
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {current.annotations.map((ann, i) => {
                const isDismissed = dismissed.has(ann.id);
                const sev = SEV[ann.severity] ?? SEV.medium;
                return (
                  <button
                    key={ann.id}
                    onClick={() => {
                      if (isDismissed) {
                        setDismissed(p => { const n = new Set(p); n.delete(ann.id); return n; });
                      } else {
                        setActive(active === ann.id ? null : ann.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 ${
                      isDismissed
                        ? "opacity-25 border-border/30 text-muted-foreground/25"
                        : active === ann.id
                          ? "bg-primary/10 border-primary/25 text-primary"
                          : "bg-muted/30 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                    {ann.label.length > 28 ? ann.label.slice(0, 28) + "…" : ann.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {screenshots.length > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-4 py-2.5 border-t border-border/50 bg-card/60">
            <button
              onClick={() => goTo(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === idx ? "w-5 h-2 bg-primary/60" : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(Math.min(screenshots.length - 1, idx + 1))}
              disabled={idx === screenshots.length - 1}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
