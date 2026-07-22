import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-24 mb-16">
      <div className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-card/65 backdrop-blur-2xl px-8 py-16 md:py-20 text-center shadow-[0_0_80px_rgba(56,189,248,0.08)]">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />

        {/* Decorative Grid Line */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-primary"
          >
            ✦ Start Building Today
          </motion.div>

          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            Ready to build with AI?
          </h2>

          <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed max-w-md">
            Join thousands of developers using STAROX to coordinate agents, design user experiences, and ship codebase implementations.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3.5 rounded-xl gradient-starox text-white text-xs font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, bg: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3.5 rounded-xl bg-secondary/85 text-foreground hover:bg-secondary border border-border/80 text-xs font-bold tracking-wide transition-all flex items-center justify-center"
            >
              Talk to Sales
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
