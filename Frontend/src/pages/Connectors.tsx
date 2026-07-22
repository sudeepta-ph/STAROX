import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Check, Plug } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { useEffect } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ── Connector logo components (SVG inline, no external deps) ──────────────────
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M3.493 13.054L10.95 20.51a10.01 10.01 0 0 1-7.457-7.456zM2.86 10.787l10.358 10.358A10.01 10.01 0 0 1 2.86 10.787zm.474-2.414L18.633 21.67A9.998 9.998 0 0 1 3.334 8.373zm1.29-2.19L21.03 15.688C21.352 14.52 21.52 13.284 21.52 12c0-5.238-4.008-9.55-9.112-10.04-.02.003-.04.006-.06.01L4.624 6.183zM12 2a10.01 10.01 0 0 1 9.626 7.273L8.273 2.374A9.967 9.967 0 0 1 12 2zm7.47 3.04A9.96 9.96 0 0 1 21.52 12c0 .387-.022.77-.064 1.147L11.853 3.147A9.996 9.996 0 0 1 19.47 5.04z" />
    </svg>
  );
}

function JiraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 0 0 5.214 5.214h2.132v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.024-1.005zM23.013 0H11.47a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.018 12.49V1.005A1.005 1.005 0 0 0 23.013 0z" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 10.98c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V10.98H8.148zm4.587 13.019c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49 4.49 2.014 4.49 4.49-2.014 4.49-4.49 4.49zm0-7.51c-1.665 0-3.019 1.355-3.019 3.02 0 1.664 1.354 3.018 3.019 3.018 1.665 0 3.019-1.354 3.019-3.019s-1.354-3.019-3.019-3.019zm4.587-5.509h-4.588V8.981h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.489-4.49 4.489zm0-7.509h-3.117v5.981h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-2.962-3.019-2.962z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Connector data ────────────────────────────────────────────────────────────
function GAIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#F9AB00" d="M13.5 2.5a2 2 0 1 1 4 0v19a2 2 0 1 1-4 0v-19z"/>
      <path fill="#E37400" d="M7 13.5a2 2 0 1 1 4 0v8a2 2 0 1 1-4 0v-8z"/>
      <circle fill="#E37400" cx="3" cy="20" r="2.5"/>
    </svg>
  );
}
function AmplitudeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="5" fill="#0066FF"/>
      <path d="M5 17l3.5-7 2.5 5 2-3 3 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function MixpanelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="5" fill="#7856FF"/>
      <circle cx="7" cy="12" r="2.5" fill="white"/>
      <circle cx="12" cy="8" r="2.5" fill="white" opacity="0.75"/>
      <circle cx="17" cy="12" r="2.5" fill="white" opacity="0.5"/>
    </svg>
  );
}
function PostHogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect width="24" height="24" rx="5" fill="#F54E00"/>
      <path d="M5 19V9l4.5 4.5L12 5l2.5 8.5L17 9v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const CONNECTORS = [
  { id: "github",     name: "GitHub",           type: "Dev",       Icon: GitHubIcon,   connected: false },
  { id: "linear",     name: "Linear",           type: "Project",   Icon: LinearIcon,   connected: false },
  { id: "jira",       name: "Jira",             type: "Project",   Icon: JiraIcon,     connected: false },
  { id: "slack",      name: "Slack",            type: "Comms",     Icon: SlackIcon,    connected: false },
  { id: "notion",     name: "Notion",           type: "Docs",      Icon: NotionIcon,   connected: false },
  { id: "figma",      name: "Figma",            type: "Design",    Icon: FigmaIcon,    connected: false },
  { id: "gmail",      name: "Gmail",            type: "Google",    Icon: GoogleIcon,   connected: false },
  { id: "gcalendar",  name: "Google Calendar",  type: "Google",    Icon: GoogleIcon,   connected: false },
  { id: "gdrive",     name: "Google Drive",     type: "Google",    Icon: GoogleIcon,   connected: false },
  { id: "gmeet",      name: "Google Meet",      type: "Google",    Icon: GoogleIcon,   connected: false },
  { id: "ga4",        name: "Google Analytics", type: "Analytics", Icon: GAIcon,       connected: false },
  { id: "amplitude",  name: "Amplitude",        type: "Analytics", Icon: AmplitudeIcon,connected: false },
  { id: "mixpanel",   name: "Mixpanel",         type: "Analytics", Icon: MixpanelIcon, connected: false },
  { id: "posthog",    name: "PostHog",          type: "Analytics", Icon: PostHogIcon,  connected: false },
];

type FilterTab = "all" | "connected" | "not-connected";

export default function ConnectorsPage() {
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isConnected = (id: string) => !!connected[id];

  const filtered = CONNECTORS.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "connected")     return matchSearch && isConnected(c.id);
    if (filter === "not-connected") return matchSearch && !isConnected(c.id);
    return matchSearch;
  });

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-xl font-bold text-foreground">Connectors</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your tools to enhance PMX analysis with live data.
              </p>
            </div>
            {/* search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search connectors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-card/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 w-52 transition-colors"
              />
            </div>
          </motion.div>

          {/* Filter tabs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/30 w-fit"
          >
            {(["all", "connected", "not-connected"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize ${
                  filter === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "not-connected" ? "Not connected" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.08 }}
            className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden"
          >
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_120px] px-5 py-2.5 border-b border-border/30 bg-muted/10">
              <span className="text-[11px] font-medium text-muted-foreground">Connector</span>
              <span className="text-[11px] font-medium text-muted-foreground">Type</span>
              <span className="text-[11px] font-medium text-muted-foreground">Status</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No connectors match your filter.</div>
            ) : (
              filtered.map((c, i) => {
                const Icon = c.Icon;
                const active = isConnected(c.id);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.06 + i * 0.04 }}
                    className="grid grid-cols-[1fr_120px_120px] items-center px-5 py-3.5 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
                  >
                    {/* Name + icon */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card text-foreground/70 shrink-0">
                        <Icon />
                      </div>
                      <span className="text-sm text-foreground font-medium">{c.name}</span>
                    </div>

                    {/* Type */}
                    <span className="text-sm text-muted-foreground">{c.type}</span>

                    {/* Status / action */}
                    <div>
                      {active ? (
                        <button
                          onClick={() => toggle(c.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Connected
                        </button>
                      ) : (
                        <button
                          onClick={() => toggle(c.id)}
                          className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 hover:border-primary/30 transition-all"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>

          {/* Footer note */}
          <p className="mt-4 text-[11px] text-muted-foreground/50 text-center">
            Connected integrations are used to enrich PMX analysis with live signals.
          </p>
        </div>
      </div>
    </div>
  );
}
