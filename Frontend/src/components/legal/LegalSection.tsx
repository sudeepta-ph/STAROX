import type { ReactNode } from "react";

interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-4 text-[15px] leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-semibold uppercase tracking-wide text-foreground/90">
      {children}
    </h3>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/70">{children}</ul>
  );
}
