import { useEffect, useMemo, useRef } from "react";
import anime from "animejs/lib/anime.es.js";

interface AnalysisBufferScreenProps {
  title: string;
  subtitle?: string;
  progress?: number;
}

const AnalysisBufferScreen = ({ title, subtitle, progress }: AnalysisBufferScreenProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cleanTitle = useMemo(() => title.replace(/\.{3,}$/, ""), [title]);
  const boundedProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : 0;
  const dots = useMemo(
    () =>
      Array.from({ length: 15 }, (_, idx) => ({
        id: idx,
        layer: idx % 3,
        angle: (idx * 41) % 360,
        size: idx % 4 === 0 ? 6 : idx % 3 === 0 ? 5 : 4,
        alpha: idx % 4 === 0 ? 0.95 : idx % 3 === 0 ? 0.8 : 0.65,
      })),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ringPulse = anime({
      targets: root.querySelectorAll(".buffer-ring"),
      scale: [0.97, 1.04],
      opacity: [0.32, 0.7],
      easing: "easeInOutSine",
      duration: 2400,
      delay: anime.stagger(120),
      direction: "alternate",
      loop: true,
    });

    const orbitA = anime({
      targets: root.querySelectorAll(".buffer-orbit-0"),
      rotate: "1turn",
      easing: "linear",
      duration: 7200,
      loop: true,
    });

    const orbitB = anime({
      targets: root.querySelectorAll(".buffer-orbit-1"),
      rotate: "-1turn",
      easing: "linear",
      duration: 9800,
      loop: true,
    });

    const orbitC = anime({
      targets: root.querySelectorAll(".buffer-orbit-2"),
      rotate: "1turn",
      easing: "linear",
      duration: 12400,
      loop: true,
    });

    const dotPulse = anime({
      targets: root.querySelectorAll(".buffer-dot"),
      scale: [0.85, 1.25],
      opacity: [0.35, 1],
      easing: "easeInOutSine",
      duration: 2200,
      delay: anime.stagger(110),
      direction: "alternate",
      loop: true,
    });

    const shimmer = anime({
      targets: root.querySelectorAll(".buffer-shimmer"),
      rotate: [0, 360],
      opacity: [0.2, 0.5],
      easing: "easeInOutSine",
      duration: 5200,
      direction: "alternate",
      loop: true,
    });

    const starFloat = anime({
      targets: root.querySelectorAll(".buffer-star"),
      translateY: [-3, 3],
      rotate: [-3, 3],
      scale: [0.985, 1.03],
      easing: "easeInOutSine",
      duration: 3000,
      direction: "alternate",
      loop: true,
    });

    const starGlow = anime({
      targets: root.querySelectorAll(".buffer-star-glow"),
      opacity: [0.3, 0.72],
      scale: [0.96, 1.08],
      easing: "easeInOutSine",
      duration: 2600,
      direction: "alternate",
      loop: true,
    });

    const titleGlow = anime({
      targets: root.querySelectorAll(".buffer-title"),
      opacity: [0.82, 1],
      easing: "easeInOutSine",
      duration: 1700,
      direction: "alternate",
      loop: true,
    });

    const subtitleDrift = anime({
      targets: root.querySelectorAll(".buffer-subtitle"),
      translateY: [0, 2],
      opacity: [0.72, 0.95],
      easing: "easeInOutSine",
      duration: 2200,
      direction: "alternate",
      loop: true,
    });

    const ellipsisPulse = anime({
      targets: root.querySelectorAll(".buffer-ellipsis-dot"),
      opacity: [0.25, 1],
      easing: "easeInOutSine",
      duration: 900,
      delay: anime.stagger(160),
      direction: "alternate",
      loop: true,
    });

    const progressShine = anime({
      targets: root.querySelectorAll(".buffer-progress-shine"),
      translateX: ["-140%", "240%"],
      easing: "easeInOutSine",
      duration: 2100,
      loop: true,
    });

    const progressGlow = anime({
      targets: root.querySelectorAll(".buffer-progress-fill"),
      opacity: [0.86, 1],
      easing: "easeInOutSine",
      duration: 1300,
      direction: "alternate",
      loop: true,
    });

    const progressValue = anime({
      targets: root.querySelectorAll(".buffer-progress-value"),
      opacity: [0.55, 1],
      easing: "easeInOutSine",
      duration: 1200,
      direction: "alternate",
      loop: true,
    });

    return () => {
      ringPulse.pause();
      orbitA.pause();
      orbitB.pause();
      orbitC.pause();
      dotPulse.pause();
      shimmer.pause();
      starFloat.pause();
      starGlow.pause();
      titleGlow.pause();
      subtitleDrift.pause();
      ellipsisPulse.pause();
      progressShine.pause();
      progressGlow.pause();
      progressValue.pause();
      anime.remove(root.querySelectorAll(".buffer-ring, .buffer-orbit-0, .buffer-orbit-1, .buffer-orbit-2, .buffer-dot, .buffer-shimmer, .buffer-star, .buffer-star-glow, .buffer-title, .buffer-subtitle, .buffer-ellipsis-dot, .buffer-progress-shine, .buffer-progress-fill, .buffer-progress-value"));
    };
  }, []);

  return (
    <div ref={rootRef} className="h-full flex flex-col items-center justify-center px-6 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06)_0%,transparent_65%)]">
      {/* Orbital animation */}
      <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
        <div className="buffer-ring absolute w-52 h-52 rounded-full border border-primary/10" />
        <div className="buffer-ring absolute w-40 h-40 rounded-full border border-primary/18" />
        <div className="buffer-ring absolute w-28 h-28 rounded-full border border-primary/28" />

        <div className="buffer-star-glow absolute w-44 h-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="buffer-star-glow absolute w-32 h-32 rounded-full bg-cyan-400/10 blur-2xl" />
        <img
          src="/starox-buffer-star.png"
          alt="STAROX"
          className="buffer-star relative z-10 w-24 h-24 object-contain drop-shadow-[0_0_24px_rgba(56,189,248,0.9)]"
          draggable={false}
        />

        <div className="buffer-shimmer absolute w-20 h-20 rounded-full border border-cyan-300/15 bg-[radial-gradient(circle,rgba(186,230,253,0.18)_0%,rgba(59,130,246,0.04)_46%,transparent_72%)]" />

        {[0, 1, 2].map((layer) => {
          const radius = layer === 0 ? 38 : layer === 1 ? 55 : 72;
          return (
            <div key={layer} className={`buffer-orbit-${layer} absolute inset-0`}>
              {dots
                .filter((dot) => dot.layer === layer)
                .map((dot) => (
                  <span
                    key={dot.id}
                    className="buffer-dot absolute left-1/2 top-1/2 block rounded-full bg-primary"
                    style={{
                      width: `${dot.size}px`,
                      height: `${dot.size}px`,
                      opacity: dot.alpha,
                      transform: `translate(-50%, -50%) rotate(${dot.angle}deg) translateX(${radius}px)`,
                      boxShadow: "0 0 10px rgba(56,189,248,0.6)",
                    }}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Info card */}
      <div className="w-full max-w-md rounded-2xl border border-primary/15 bg-card/80 px-6 py-5 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.10),0_8px_32px_rgba(0,0,0,0.15)]">
        {/* Step label */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">Analyzing</span>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>

        <p className="buffer-title text-center text-[clamp(1rem,2.2vw,1.4rem)] font-semibold tracking-tight text-foreground">
          {cleanTitle}
          <span className="inline-flex w-5 justify-start text-primary ml-0.5">
            <span className="buffer-ellipsis-dot">.</span>
            <span className="buffer-ellipsis-dot">.</span>
            <span className="buffer-ellipsis-dot">.</span>
          </span>
        </p>

        {subtitle && (
          <p className="buffer-subtitle mt-2 text-center text-sm text-primary/60">
            {subtitle}
          </p>
        )}

        {typeof progress === "number" && (
          <div className="mt-5">
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden ring-1 ring-primary/10">
              <div
                className="buffer-progress-fill relative h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${boundedProgress}%`,
                  background: "linear-gradient(90deg, #38bdf8, #60a5fa)",
                  boxShadow: "0 0 12px rgba(56,189,248,0.5)",
                }}
              >
                <span className="buffer-progress-shine absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground/50">Processing data</span>
              <p className="buffer-progress-value text-xs tabular-nums text-primary/80 font-medium">
                {Math.round(boundedProgress)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisBufferScreen;
