import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { BrainCircuit, LineChart } from "lucide-react";

const features = [
  {
    title: "Product Intelligence",
    description: "Acts as your Product Manager \u2014 understands ideas, defines features, performs market analysis, and plans product architecture and roadmap.",
    icon: BrainCircuit,
    color: "from-primary/20 to-primary/10",
    iconColor: "text-primary"
  },
  {
    title: "Experience & Improvement",
    description: "Focuses on UX, feature improvements, and product optimization by analyzing the application and suggesting enhancements.",
    icon: LineChart,
    color: "from-primary/15 to-primary/8",
    iconColor: "text-primary"
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.7, 
        delay: index * 0.1, 
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      style={{ perspective: 1000 }}
      className={`relative z-10 md:col-span-3`}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`h-full relative overflow-hidden rounded-2xl p-6 bg-surface/30 backdrop-blur-xl border border-border/40 hover:border-primary/30 transition-colors duration-500 cursor-pointer shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] group`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out`}
          style={{ transform: "translateZ(-1px)" }}
        />

        <div style={{ transform: "translateZ(30px)" }} className="relative z-10 flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center mb-6 shadow-inner border border-border/20 group-hover:scale-110 transition-transform duration-500">
            <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
          </div>

          <h3 className="text-xl font-display font-semibold text-foreground mb-3 tracking-tight group-hover:text-primary transition-colors">
            {feature.title}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed flex-1 group-hover:text-muted-foreground/90 transition-colors">
            {feature.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FeaturesGrid = () => {
  return (
    <div className="w-full max-w-6xl mx-auto mt-48 md:mt-52 mb-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-4 inline-block shadow-[0_0_20px_rgba(var(--primary),0.2)]">
          Capabilities
        </span>
        <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
          Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-starox-ice">Features</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        {features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} index={idx} />
        ))}
      </div>
    </div>
  );
};

export default FeaturesGrid;
