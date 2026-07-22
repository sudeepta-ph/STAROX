import { motion } from "framer-motion";

interface FeatureRow {
  title: string;
  description: string;
  imageContent: React.ReactNode;
  reverse?: boolean;
}

interface WhatWeDoProps {
  headline: string;
  subline: string;
  rows: FeatureRow[];
}

const smoothEase = [0.22, 1, 0.36, 1] as const;

function FeatureBlock({ title, description, imageContent, reverse }: FeatureRow) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} gap-6 items-stretch`}
    >
      {/* text side */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <h3 className="text-lg font-bold text-white leading-snug mb-3">{title}</h3>
        <p className="text-sm leading-6 text-white/42 max-w-sm">{description}</p>
      </div>

      {/* image/visual side */}
      <div className="flex-1 rounded-2xl border border-white/[0.07] bg-[#0e0e15] overflow-hidden min-h-[180px] lg:min-h-[220px] flex items-center justify-center">
        {imageContent}
      </div>
    </motion.div>
  );
}

export default function WhatWeDo({ headline, subline, rows }: WhatWeDoProps) {
  return (
    <section className="w-full border-t border-white/[0.05] bg-[#08080d]">
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">

        {/* section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.42, ease: smoothEase }}
          className="mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3 max-w-lg">
            {headline}
          </h2>
          <p className="text-sm leading-6 text-white/38 max-w-md">{subline}</p>
        </motion.div>

        {/* feature rows */}
        <div className="flex flex-col gap-8">
          {rows.map((row, i) => (
            <FeatureBlock key={i} {...row} />
          ))}
        </div>
      </div>
    </section>
  );
}
