import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import PricingToggle from "@/components/pricing/PricingToggle";
import PricingGrid from "@/components/pricing/PricingCard";
import FeaturesGrid from "@/components/pricing/FeatureCard";
import ComparisonTable from "@/components/pricing/ComparisonTable";
import FAQ from "@/components/pricing/FAQ";
import CTA from "@/components/pricing/CTA";
import { ArrowRight, Sparkles } from "lucide-react";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const HERO_STYLE: CSSProperties = {
  ["--hero-radial" as string]: "204 78% 57%",
  ["--hero-radial-ice" as string]: "205 48% 82%",
  ["--hero-grid-line" as string]: "204 46% 62%",
  ["--primary" as string]: "204 78% 57%",
  ["--ring" as string]: "204 78% 57%",
  ["--hero-star-image" as string]: "url('/hero-star-core.svg')",
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function PricingPage() {
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Scrollable Canvas */}
      <div
        className="flex-1 relative flex flex-col overflow-y-auto scroll-smooth transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 56 : 224,
          paddingTop: isMobile ? 56 : 0,
        }}
      >
        {/* Tech background overlay */}
        <section className="relative w-full min-h-screen flex flex-col" style={HERO_STYLE}>
          <motion.div
            className="hero-tech-bg absolute inset-0 z-0 pointer-events-none"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.992 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, ease: smoothEase }}
          >
            <div className="hero-grid" />
            <div className="hero-fog hero-fog-top" />
            <div className="hero-fog hero-fog-bottom" />
            <div className="hero-beam" />
          </motion.div>

          {/* Half-star background accentuation */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-0 transition-opacity duration-300
              right-0 top-[25%] [transform:translateY(-50%)_translateX(50%)]
              max-[1400px]:right-auto max-[1400px]:left-1/2 max-[1400px]:top-[35%] max-[1400px]:[transform:translate(-50%,-50%)] max-[1400px]:opacity-[0.16]"
            style={{ width: "clamp(340px, 45vw, 480px)", aspectRatio: "1" }}
          >
            <img src="/hero-star-core.svg" alt="" className="h-full w-full object-contain hero-edge-star-img" />
          </div>

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 flex flex-col py-16 px-4">
            
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto mb-12 mt-8">
              <motion.div
                className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-primary/85 backdrop-blur-xl sm:text-[11px]"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: smoothEase }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" /> Plans & Pricing
              </motion.div>
              
              <motion.h1
                className="font-display text-[clamp(2rem,7vw,4.5rem)] font-extrabold leading-[0.98] tracking-tight text-foreground"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05, ease: smoothEase }}
              >
                Simple pricing.<br />
                <span className="gradient-text">Powerful AI.</span>
              </motion.h1>
              
              <motion.p
                className="mt-6 text-sm md:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: smoothEase }}
              >
                Choose the perfect plan for your workflow. Scale from solo builders to enterprise teams with autonomous agents.
              </motion.p>

              {/* Hero Action Buttons */}
              <motion.div
                className="mt-8 flex flex-wrap justify-center gap-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: smoothEase }}
              >
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl gradient-starox text-white text-xs font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(56,189,248,0.25)] flex items-center gap-1.5"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-secondary/80 text-foreground border border-border/80 hover:bg-secondary text-xs font-bold tracking-wide transition-all"
                >
                  Contact Sales
                </button>
              </motion.div>
            </div>

            {/* Monthly / Yearly Toggle */}
            <motion.div
              className="mb-14 text-center z-10"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: smoothEase }}
            >
              <PricingToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
            </motion.div>

            {/* 5-Card Pricing Grid */}
            <motion.div
              className="w-full max-w-7xl mx-auto z-10 mb-20"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: smoothEase }}
            >
              <PricingGrid billingCycle={billingCycle} />
            </motion.div>

            {/* Why STAROX Section (Feature Cards Grid) */}
            <div className="w-full max-w-5xl mx-auto mb-20">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold font-display text-foreground sm:text-3xl">
                  Why STAROX?
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Built to automate product strategy, mapping, and core code execution.
                </p>
              </div>
              <FeaturesGrid />
            </div>

            {/* Feature Comparison Matrix */}
            <div className="w-full max-w-7xl mx-auto mb-20">
              <ComparisonTable />
            </div>

            {/* FAQ Accordions */}
            <div className="w-full max-w-7xl mx-auto mb-10">
              <FAQ />
            </div>

            {/* Call To Action Banner */}
            <div className="w-full max-w-7xl mx-auto">
              <CTA />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
