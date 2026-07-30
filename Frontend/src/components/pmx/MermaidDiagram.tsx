import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
      background: "transparent",
      primaryColor: "#1a1f2e",
      primaryTextColor: "#e2e8f0",
      primaryBorderColor: "#38bdf8",
      lineColor: "#64748b",
      secondaryColor: "#1e293b",
      tertiaryColor: "#0f172a",
      fontSize: "13px",
    },
    securityLevel: "strict",
  });
  initialized = true;
}

// Renders a mermaid code block as an SVG diagram. Falls back to the raw
// source in a code block if the syntax fails to parse — AI-authored
// diagrams occasionally have minor syntax slips, and a silent blank panel
// would be worse than showing the source for the user to fix via the prompt bar.
export default function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    ensureInit();
    mermaid.render(`mmd-${id}`, code.trim())
      .then(({ svg }) => { if (mounted.current) setSvg(svg); })
      .catch(() => { if (mounted.current) setError(true); });
    return () => { mounted.current = false; };
  }, [code, id]);

  if (error) {
    return (
      <pre className="bg-card/40 border border-border/40 rounded-xl p-4 text-xs text-foreground/70 overflow-x-auto"><code>{code}</code></pre>
    );
  }
  if (!svg) {
    return <div className="h-24 rounded-xl border border-border/30 bg-card/20 animate-pulse" />;
  }
  return (
    <div className="rounded-xl border border-border/40 bg-card/20 p-4 overflow-x-auto flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
