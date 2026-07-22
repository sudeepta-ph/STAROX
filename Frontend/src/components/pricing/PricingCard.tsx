import { motion } from "framer-motion";
import {
  Folder, BrainCircuit, Play, MessageSquare, Code2, Upload, HelpCircle,
  Sparkles, MessageSquareDashed, Cpu, Zap, GitFork, FolderHeart, Github,
  BookOpen, Database, Workflow, Headphones, Crown, FileText, Terminal,
  Chrome, Search, Palette, Briefcase, Key, Server, Flame, Network, Brain,
  LineChart, UserCheck, Slack, Coins, LayoutGrid, HardDrive, Lock,
  Fingerprint, ShieldCheck, Clock, FileSpreadsheet, Puzzle, ServerCrash, Check, type LucideIcon
} from "lucide-react";

interface PlanFeature {
  text: string;
  icon: LucideIcon;
}

interface Plan {
  name: string;
  badge?: string;
  priceMonthly: number | "Custom";
  priceYearly: number | "Custom";
  description: string;
  features: PlanFeature[];
  buttonText: string;
  isPopular?: boolean;
  highlighted?: boolean;
}

interface PricingCardProps {
  plan: Plan;
  billingCycle: "monthly" | "yearly";
}

export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const isCustom = plan.priceMonthly === "Custom";
  const displayPrice = isCustom
    ? "Custom"
    : billingCycle === "yearly"
    ? plan.priceYearly
    : plan.priceMonthly;

  const billingText = isCustom
    ? ""
    : plan.name === "Team"
    ? "/user/month"
    : "/month";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: plan.highlighted ? 1.025 : 1.015 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col w-full max-w-[460px] mx-auto rounded-3xl p-6 md:p-8 backdrop-blur-xl border transition-all duration-300 ${
        plan.highlighted
          ? "border-primary bg-card/90 shadow-[0_0_50px_rgba(56,189,248,0.15)] ring-1 ring-primary/30"
          : "border-border/60 bg-card/60 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(56,189,248,0.05)]"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-starox px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
          {plan.badge || "Most Popular"}
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80 min-h-[36px]">
          {plan.description}
        </p>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="font-display text-3xl font-extrabold text-foreground">
            {typeof displayPrice === "number" ? `$${displayPrice.toLocaleString("en-US")}` : displayPrice}
          </span>
          {typeof displayPrice === "number" && (
            <span className="text-xs font-semibold text-muted-foreground">
              {billingText}
            </span>
          )}
        </div>
        {billingCycle === "yearly" && typeof displayPrice === "number" && (
          <span className="mt-1 block text-[10px] font-medium text-primary">
            Billed yearly
          </span>
        )}
      </div>

      {/* CTA Button */}
      <button
        type="button"
        className={`mb-8 w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all ${
          plan.highlighted
            ? "gradient-starox text-white hover:opacity-95 shadow-[0_4px_20px_rgba(56,189,248,0.35)]"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/80"
        }`}
      >
        {plan.buttonText}
      </button>

      {/* Separator */}
      <div className="w-full h-px bg-border/40 mb-6" />

      {/* Feature List */}
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-4">
          Features
        </p>
        <ul className="space-y-3.5 text-xs text-muted-foreground">
          {plan.features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/8 border border-primary/10">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <span className="leading-snug text-foreground/85">{feature.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}

export default function PricingGrid({ billingCycle }: { billingCycle: "monthly" | "yearly" }) {
  const plans: Plan[] = [
    {
      name: "Free",
      priceMonthly: 0,
      priceYearly: 0,
      description: "Explore the capabilities of AI product design at no cost.",
      buttonText: "Start Free",
      features: [
        { text: "1 Workspace", icon: Folder },
        { text: "3 AI Agents", icon: BrainCircuit },
        { text: "50 Agent Runs/day", icon: Play },
        { text: "Basic AI Chat", icon: MessageSquare },
        { text: "Basic Code Generation", icon: Code2 },
        { text: "Limited File Uploads", icon: Upload },
        { text: "Community Support", icon: HelpCircle },
      ],
    },
    {
      name: "Pro",
      badge: "MOST POPULAR",
      priceMonthly: 19,
      priceYearly: 15, // ~20% off ($15.20 rounded to $15)
      description: "Power tools for professional developers and individual builders.",
      buttonText: "Upgrade to Pro",
      isPopular: true,
      highlighted: true,
      features: [
        { text: "Everything in Free +", icon: Sparkles },
        { text: "Unlimited Chats", icon: MessageSquareDashed },
        { text: "10+ AI Agents", icon: Cpu },
        { text: "1000 Agent Runs/day", icon: Zap },
        { text: "Multi-Agent Collaboration", icon: GitFork },
        { text: "Unlimited Projects", icon: FolderHeart },
        { text: "GitHub Integration", icon: Github },
        { text: "Smart Documentation", icon: BookOpen },
        { text: "Project Memory", icon: Database },
        { text: "Workflow Templates", icon: Workflow },
        { text: "Priority Support", icon: Headphones },
      ],
    },
    {
      name: "Max",
      priceMonthly: 59,
      priceYearly: 47, // ~20% off ($47.20 rounded to $47)
      description: "Scale autonomous research, designs, and executions.",
      buttonText: "Get Max",
      features: [
        { text: "Everything in Pro +", icon: Sparkles },
        { text: "Unlimited Agent Runs*", icon: Zap },
        { text: "Premium AI Models", icon: Crown },
        { text: "Long Context Support", icon: FileText },
        { text: "Autonomous Agents", icon: Terminal },
        { text: "Browser Agent", icon: Chrome },
        { text: "Research Agent", icon: Search },
        { text: "Design Agent", icon: Palette },
        { text: "Business Agent", icon: Briefcase },
        { text: "API Access", icon: Key },
        { text: "MCP Support", icon: Server },
        { text: "Early Access Features", icon: Flame },
      ],
    },
    {
      name: "Team",
      priceMonthly: 39,
      priceYearly: 31, // ~20% off ($31.20 rounded to $31)
      description: "Collaborative tools, shared memory, and team analytics.",
      buttonText: "Start Team Trial",
      features: [
        { text: "Everything in Max +", icon: Sparkles },
        { text: "Shared Workspaces", icon: Network },
        { text: "Team Memory", icon: Brain },
        { text: "Usage Analytics", icon: LineChart },
        { text: "Role Management", icon: UserCheck },
        { text: "Slack Integration", icon: Slack },
        { text: "GitHub Teams Integration", icon: Github },
        { text: "Jira Integration", icon: Clock },
        { text: "Linear Integration", icon: Workflow },
        { text: "Shared Credits pool", icon: Coins },
        { text: "Admin Dashboard", icon: LayoutGrid },
      ],
    },
    {
      name: "Enterprise",
      priceMonthly: "Custom",
      priceYearly: "Custom",
      description: "Full compliance, dedicated infrastructure, and premium security.",
      buttonText: "Contact Sales",
      features: [
        { text: "Everything in Team +", icon: Sparkles },
        { text: "Dedicated Infrastructure", icon: HardDrive },
        { text: "Private Models Deployment", icon: Lock },
        { text: "SSO (SAML/OIDC)", icon: Fingerprint },
        { text: "SOC2 Compliance Ready", icon: ShieldCheck },
        { text: "Enterprise grade SLA", icon: Clock },
        { text: "Detailed Audit Logs", icon: FileSpreadsheet },
        { text: "Dedicated Success Manager", icon: UserCheck },
        { text: "Custom Integrations", icon: Puzzle },
        { text: "On-prem Deployment Option", icon: ServerCrash },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full max-w-5xl mx-auto px-4 justify-center">
      <PricingCard plan={plans[0]} billingCycle={billingCycle} />
      <PricingCard plan={plans[1]} billingCycle={billingCycle} />
      <PricingCard plan={plans[2]} billingCycle={billingCycle} />
      <PricingCard plan={plans[3]} billingCycle={billingCycle} />
      <div className="lg:col-span-2 flex justify-center w-full">
        <PricingCard plan={plans[4]} billingCycle={billingCycle} />
      </div>
    </div>
  );
}
