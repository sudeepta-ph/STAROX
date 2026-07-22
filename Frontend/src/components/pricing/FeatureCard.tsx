import { motion } from "framer-motion";
import { BrainCircuit, Zap, Users, ShieldCheck, type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
  accentSoft: string;
  accentGlow: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  accentColor,
  accentSoft,
  accentGlow,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 backdrop-blur-xl p-6 text-left transition-colors duration-150 hover:border-primary/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_30px_rgba(56,189,248,0.08),0_12px_40px_rgba(0,0,0,0.2)]"
    >
      {/* Decorative radial gradient highlighting the corner */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200 opacity-40 group-hover:opacity-75"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${accentSoft} 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105"
          style={{
            borderColor: accentSoft,
            background: accentSoft,
            boxShadow: `0 0 12px ${accentGlow}`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: accentColor }} />
        </div>

        <div>
          <h3 className="text-base font-bold leading-tight text-foreground">{title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturesGrid() {
  const features = [
    {
      title: "AI Agent Ecosystem",
      description: "Multiple specialized agents collaborating together to tackle multi-dimensional product challenges.",
      icon: BrainCircuit,
      accentColor: "#38bdf8",
      accentSoft: "rgba(56, 189, 248, 0.12)",
      accentGlow: "rgba(56, 189, 248, 0.25)",
    },
    {
      title: "Autonomous Workflows",
      description: "Agents execute complex workflows automatically. Turn prompt inputs into working execution steps without manual code logic.",
      icon: Zap,
      accentColor: "#60a5fa",
      accentSoft: "rgba(96, 165, 250, 0.11)",
      accentGlow: "rgba(96, 165, 250, 0.24)",
    },
    {
      title: "Built for Teams",
      description: "Shared workspace memory and collaborative intelligence. Work seamlessly across builders, designers, and managers.",
      icon: Users,
      accentColor: "#93c5fd",
      accentSoft: "rgba(147, 197, 253, 0.11)",
      accentGlow: "rgba(147, 197, 253, 0.24)",
    },
    {
      title: "Enterprise Ready",
      description: "Dedicated security, compliance standards (SSO, SOC2 ready), audit trails, and scalability for massive workloads.",
      icon: ShieldCheck,
      accentColor: "#38bdf8",
      accentSoft: "rgba(56, 189, 248, 0.11)",
      accentGlow: "rgba(56, 189, 248, 0.24)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
      {features.map((feature, i) => (
        <FeatureCard key={i} {...feature} />
      ))}
    </div>
  );
}
