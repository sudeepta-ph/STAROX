import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Help", href: "/help" },
];

// Lightweight top nav for standalone public pages (legal, help, etc.)
// that don't run inside the app sidebar shell.
export default function PublicHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/starox-intelligence" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img
            src="/assets/images/strx.png"
            alt="STAROX"
            className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(102,214,255,0.45)]"
          />
          <span className="font-display text-sm font-bold tracking-wide text-foreground">STAROX</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/starox-intelligence"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full gradient-starox px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(26,115,232,0.3)] transition-opacity hover:opacity-90"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
