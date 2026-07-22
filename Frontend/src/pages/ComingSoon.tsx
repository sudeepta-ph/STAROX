import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ComingSoonProps {
  title: string;
  description: string;
}

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = `${title} access request`;
    const bodyLines = [
      "Hi STAROX,",
      "",
      `Please keep me updated about ${title}.`,
      email ? `My Gmail: ${email}` : "",
      details ? "" : "",
      details ? `Details:\n${details}` : "",
    ].filter(Boolean);

    const mailto = `mailto:hello@starox.space?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10)_0%,transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.12)_0%,transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: smoothEase }}
            className="max-h-[calc(100dvh-1.5rem)] overflow-auto rounded-[1.75rem] border border-primary/15 bg-card/70 p-4 shadow-[0_0_60px_rgba(14,165,233,0.10),0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-28 w-28 items-center justify-center sm:mb-6 sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                <motion.div
                  className="absolute inset-0 rounded-full border border-primary/10"
                  animate={{ scale: [0.96, 1.04] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border border-primary/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-8 rounded-full border border-cyan-300/20"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-10 rounded-full bg-primary/10 blur-2xl" />
                <motion.img
                  src="/strx.png"
                  alt="STAROX"
                  draggable={false}
                  className="relative z-10 h-14 w-14 object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.85)] sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                  animate={{ y: [-3, 3], scale: [0.98, 1.03] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />
              </div>

              <motion.div
                className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1, ease: smoothEase }}
              >
                Coming Soon
              </motion.div>

              <motion.h1
                className="font-display text-[clamp(1.6rem,4.5vw,3.25rem)] font-bold leading-[0.95] tracking-tight text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14, ease: smoothEase }}
              >
                {title}
              </motion.h1>

              <motion.p
                className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-[15px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18, ease: smoothEase }}
              >
                {description}
              </motion.p>

              <form onSubmit={handleSubmit} className="mt-5 w-full max-w-md sm:mt-6">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                  <div className="space-y-2.5">
                    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-surface/40 px-4 py-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-primary/70" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your Gmail"
                        className="h-auto border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <textarea
                      required
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="Share a few details about what you need"
                      className="min-h-24 w-full resize-none rounded-xl border border-border/70 bg-surface/40 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
                    />
                    <Button type="submit" className="h-11 w-full rounded-xl px-5">
                      Send to hello@starox.space
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
                    We’ll open a draft addressed to hello@starox.space with your Gmail and details filled in.
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}