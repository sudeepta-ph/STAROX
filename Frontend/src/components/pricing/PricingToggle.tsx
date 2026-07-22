import { motion } from "framer-motion";

interface PricingToggleProps {
  billingCycle: "monthly" | "yearly";
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
}

export default function PricingToggle({
  billingCycle,
  setBillingCycle,
}: PricingToggleProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur-xl">
        {/* Background slide pill */}
        <div className="absolute inset-y-1 left-1 flex transition-all duration-300 ease-out"
          style={{
            transform: billingCycle === "yearly" ? "translateX(100%)" : "translateX(0)",
            width: "calc(50% - 4px)",
          }}
        >
          <div className="h-full w-full rounded-full bg-primary/10 border border-primary/20" />
        </div>

        <button
          type="button"
          onClick={() => setBillingCycle("monthly")}
          className={`relative z-10 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-colors ${
            billingCycle === "monthly" ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Monthly
        </button>

        <button
          type="button"
          onClick={() => setBillingCycle("yearly")}
          className={`relative z-10 flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-colors ${
            billingCycle === "yearly" ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Yearly
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
      >
        Save 20%
      </motion.div>
    </div>
  );
}
