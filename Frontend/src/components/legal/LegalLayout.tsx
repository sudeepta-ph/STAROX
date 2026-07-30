import type { ReactNode } from "react";
import { motion } from "framer-motion";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  seoTitle: string;
  seoDescription: string;
  path: string;
  children: ReactNode;
}

const smoothEase = [0.22, 1, 0.36, 1] as const;

// Shared shell for standalone legal pages (Privacy Policy, Terms of Service):
// site header, hero title block, prose container, and site footer.
export default function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  seoTitle,
  seoDescription,
  path,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDescription} path={path} />
      <PublicHeader />

      <main className="relative pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(120%_65%_at_10%_0%,rgba(56,189,248,0.08)_0%,transparent_55%)]"
        />

        <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: smoothEase }}
            className="mb-12 border-b border-border/50 pb-8"
          >
            <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{subtitle}</p>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Last Updated: {lastUpdated}
            </p>
          </motion.div>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: smoothEase }}
            className="space-y-11"
          >
            {children}
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
