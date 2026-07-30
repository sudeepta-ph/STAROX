import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Plug, ChevronDown, ListPlus, PenSquare, X, PartyPopper, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { getPmxHeaders } from "@/lib/pmxStore";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 800);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ── Connector logos — inline SVG, no external deps ─────────────────────────────
// Every logo is a self-contained 24x24 rounded badge with its own brand-ish
// background color, so rows can render <Icon /> directly at a fixed size.
function Box({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 rounded-lg shrink-0">
      <rect width="24" height="24" rx="6" fill={bg} />
      {children}
    </svg>
  );
}

function GitHubIcon() {
  return (
    <Box bg="#181717">
      <g transform="translate(4,4) scale(0.667)">
        <path fill="#fff" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </g>
    </Box>
  );
}

function SlackIcon() {
  return (
    <Box bg="#fff">
      <g transform="translate(3,3) scale(0.75)">
        <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
        <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
        <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
        <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </g>
    </Box>
  );
}

function NotionIcon() {
  return (
    <Box bg="#fff">
      <g transform="translate(3.5,3.5) scale(0.72)">
        <path fill="#000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
      </g>
    </Box>
  );
}

function GAIcon() {
  return (
    <Box bg="#fff">
      <g transform="translate(3,3) scale(0.75)">
        <path fill="#F9AB00" d="M13.5 2.5a2 2 0 1 1 4 0v19a2 2 0 1 1-4 0v-19z"/>
        <path fill="#E37400" d="M7 13.5a2 2 0 1 1 4 0v8a2 2 0 1 1-4 0v-8z"/>
        <circle fill="#E37400" cx="3" cy="20" r="2.5"/>
      </g>
    </Box>
  );
}

function AmplitudeIcon() {
  return (
    <Box bg="#0066FF">
      <path d="M5 17l3.5-7 2.5 5 2-3 3 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </Box>
  );
}

function MixpanelIcon() {
  return (
    <Box bg="#7856FF">
      <circle cx="7" cy="12" r="2.5" fill="#fff"/>
      <circle cx="12" cy="8" r="2.5" fill="#fff" opacity="0.75"/>
      <circle cx="17" cy="12" r="2.5" fill="#fff" opacity="0.5"/>
    </Box>
  );
}

function ClarityIcon() {
  return (
    <Box bg="#6264A7">
      <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="2" fill="#fff"/>
    </Box>
  );
}

function IntercomIcon() {
  return (
    <Box bg="#1F8FFF">
      <rect x="6" y="7" width="12" height="10" rx="3" fill="#fff"/>
      <rect x="8.5" y="10" width="1.8" height="4" rx="0.9" fill="#1F8FFF"/>
      <rect x="11.1" y="10" width="1.8" height="4" rx="0.9" fill="#1F8FFF"/>
      <rect x="13.7" y="10" width="1.8" height="4" rx="0.9" fill="#1F8FFF"/>
    </Box>
  );
}

function CannyIcon() {
  return (
    <Box bg="#5E6AD2">
      <path d="M12 17V8m0 0l-3.2 3.2M12 8l3.2 3.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </Box>
  );
}

function StripeIcon() {
  return (
    <Box bg="#635BFF">
      <path fill="#fff" d="M9 9.7c0-.9.9-1.3 2-1.3 1.4 0 2.7.5 3.8 1.2V7c-1.1-.5-2.4-.9-3.8-.9-2.7 0-4.6 1.4-4.6 3.7 0 3.6 5 3 5 4.5 0 .9-.8 1.3-2 1.3-1.4 0-3-.5-4.2-1.3v2.6c1.2.6 2.6 1 4.2 1 2.8 0 4.7-1.3 4.7-3.7 0-3.9-5.1-3.2-5.1-4.5z"/>
    </Box>
  );
}

function HubSpotIcon() {
  return (
    <Box bg="#FF7A59">
      <circle cx="16" cy="8" r="2.3" fill="#fff"/>
      <circle cx="8" cy="16" r="2.3" fill="#fff"/>
      <path d="M9.6 14.4l4.8-4.8" stroke="#fff" strokeWidth="1.6"/>
    </Box>
  );
}

// ── Connector catalog ────────────────────────────────────────────────────────
interface ConnectorDef {
  id: string;
  name: string;
  category: string;
  Icon: React.ComponentType;
  popular?: boolean;
}

const CATEGORIES = [
  "Product analytics",
  "Support & feedback",
  "Developer tools",
  "Docs & content",
  "Revenue & CRM",
  "Communication",
] as const;

const CONNECTORS: ConnectorDef[] = [
  { id: "mixpanel",   name: "Mixpanel",           category: "Product analytics", Icon: MixpanelIcon },
  { id: "amplitude",  name: "Amplitude",          category: "Product analytics", Icon: AmplitudeIcon },
  { id: "ga4",        name: "Google Analytics 4", category: "Product analytics", Icon: GAIcon },
  { id: "clarity",    name: "Microsoft Clarity",  category: "Product analytics", Icon: ClarityIcon },

  { id: "intercom",   name: "Intercom",  category: "Support & feedback", Icon: IntercomIcon, popular: true },
  { id: "canny",      name: "Canny",     category: "Support & feedback", Icon: CannyIcon },

  { id: "github", name: "GitHub", category: "Developer tools", Icon: GitHubIcon, popular: true },

  { id: "notion", name: "Notion", category: "Docs & content", Icon: NotionIcon, popular: true },

  { id: "stripe",     name: "Stripe",     category: "Revenue & CRM", Icon: StripeIcon, popular: true },
  { id: "hubspot",    name: "HubSpot",    category: "Revenue & CRM", Icon: HubSpotIcon },

  { id: "slack", name: "Slack", category: "Communication", Icon: SlackIcon, popular: true },
];

// ── Real connection wiring ───────────────────────────────────────────────────
// Mirrors backend/src/workspaces/pmx/routes/connectors.ts REGISTRY field-for-
// field. Credentials are verified against the real provider API before the
// backend marks anything "connected" — see that file for the actual calls.
interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  secret?: boolean;
}

const CONNECTOR_FIELDS: Record<string, FieldDef[]> = {
  mixpanel: [
    { key: "token", label: "Project Token", placeholder: "", required: true },
    { key: "secret", label: "API Secret", placeholder: "", required: true, secret: true },
  ],
  amplitude: [
    { key: "apiKey", label: "API Key", placeholder: "", required: true },
    { key: "secretKey", label: "Secret Key", placeholder: "", required: true, secret: true },
  ],
  clarity: [{ key: "token", label: "API Token", placeholder: "", required: true, secret: true }],
  intercom: [{ key: "accessToken", label: "Access Token", placeholder: "", required: true, secret: true }],
  canny: [{ key: "apiKey", label: "API Key", placeholder: "", required: true, secret: true }],
  stripe: [{ key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", required: true, secret: true }],
  hubspot: [{ key: "accessToken", label: "Private App Access Token", placeholder: "", required: true, secret: true }],
};

// Where to generate each credential, shown inline in the connect modal.
const CONNECTOR_HELP: Record<string, { url?: string; note: string }> = {
  mixpanel:  { url: "https://mixpanel.com/settings/project", note: "Project Settings → Access Keys — copy the Project Token and API Secret." },
  amplitude: { url: "https://analytics.amplitude.com/settings/projects", note: "Settings → Projects → your project → General — API Key and Secret Key are both there." },
  clarity:   { url: "https://clarity.microsoft.com/", note: "Open your project → Settings → Data Export → Generate new API token." },
  intercom:  { url: "https://app.intercom.com/a/developer-hub/", note: "Developer Hub → your app → Authentication → Access Token." },
  canny:     { url: "https://canny.io/admin/settings/api", note: "Settings → API." },
  stripe:    { url: "https://dashboard.stripe.com/apikeys", note: "Developers → API keys → Secret key." },
  hubspot:   { url: "https://app.hubspot.com/private-apps/", note: "Settings → Integrations → Private Apps → Create a private app." },
};

function getHelpUrl(id: string): string | null {
  return CONNECTOR_HELP[id]?.url || null;
}

type FilterTab = "all" | "connected" | "not-connected";

interface CustomRequestForm {
  name: string;
  url: string;
  useCase: string;
}

const EMPTY_CUSTOM_FORM: CustomRequestForm = { name: "", url: "", useCase: "" };

export default function ConnectorsPage() {
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Real per-user connection state, fetched from the backend.
  const [status, setStatus] = useState<Record<string, { connected: boolean; label?: string }>>({});
  const [statusLoaded, setStatusLoaded] = useState(false);

  // API-key / token credential modal
  const [credModalId, setCredModalId] = useState<string | null>(null);
  const [credFields, setCredFields] = useState<Record<string, string>>({});
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  // GitHub OAuth (popup flow, same pattern as /pmx/sources)
  const [githubConnecting, setGithubConnecting] = useState(false);

  // Notion OAuth — popup flow, same pattern as GitHub
  const [notionConnecting, setNotionConnecting] = useState(false);

  // Slack OAuth — popup flow, same pattern as GitHub
  const [slackConnecting, setSlackConnecting] = useState(false);

  // Google OAuth (GA4) — popup flow, then a property picker to finish
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [googleProperties, setGoogleProperties] = useState<{ propertyId: string; propertyName: string; accountName: string }[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [selectingPropertyId, setSelectingPropertyId] = useState<string | null>(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");

  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomRequestForm>(EMPTY_CUSTOM_FORM);
  const [requestSent, setRequestSent] = useState(false);

  const isConnected = (id: string) => !!status[id]?.connected;

  const fetchStatus = async () => {
    try {
      const headers = await getPmxHeaders();
      const [connRes, ghRes, notionRes, slackRes] = await Promise.all([
        fetch(`${API_URL}/connectors/status`, { headers }),
        fetch(`${API_URL}/pmx/github/status`, { headers }),
        fetch(`${API_URL}/pmx/notion/status`, { headers }),
        fetch(`${API_URL}/pmx/slack/status`, { headers }),
      ]);
      const connJson = await connRes.json();
      const ghJson = await ghRes.json();
      const notionJson = await notionRes.json();
      const slackJson = await slackRes.json();
      const merged: Record<string, { connected: boolean; label?: string }> = connJson.success ? connJson.data : {};
      merged.github = ghJson.success ? { connected: !!ghJson.connected, label: ghJson.login } : { connected: false };
      merged.notion = notionJson.success ? { connected: !!notionJson.connected, label: notionJson.workspaceName } : { connected: false };
      merged.slack = slackJson.success ? { connected: !!slackJson.connected, label: slackJson.teamName } : { connected: false };
      setStatus(merged);
    } catch { /* leave previous status in place */ }
    finally { setStatusLoaded(true); }
  };

  useEffect(() => { fetchStatus(); }, []);

  // GitHub / Google OAuth popup completion listener (backend posts back to opener)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source === "starox-github-oauth") {
        setGithubConnecting(false);
        if (e.data.success) { toast({ title: "GitHub connected" }); fetchStatus(); }
        else toast({ variant: "destructive", title: "GitHub", description: e.data.error || "Connection failed" });
        return;
      }
      if (e.data?.source === "starox-google-oauth") {
        setGoogleConnecting(false);
        if (e.data.success) openPropertyPicker();
        else toast({ variant: "destructive", title: "Google", description: e.data.error || "Connection failed" });
        return;
      }
      if (e.data?.source === "starox-notion-oauth") {
        setNotionConnecting(false);
        if (e.data.success) { toast({ title: "Notion connected" }); fetchStatus(); }
        else toast({ variant: "destructive", title: "Notion", description: e.data.error || "Connection failed" });
        return;
      }
      if (e.data?.source === "starox-slack-oauth") {
        setSlackConnecting(false);
        if (e.data.success) { toast({ title: "Slack connected" }); fetchStatus(); }
        else toast({ variant: "destructive", title: "Slack", description: e.data.error || "Connection failed" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connectGithub = async () => {
    setGithubConnecting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/github/auth-url`, { headers });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "GitHub", description: json.error || "GitHub OAuth is not configured on the server" });
        setGithubConnecting(false);
        return;
      }
      const popup = window.open(json.url, "github-oauth", "width=600,height=720");
      if (!popup) { toast({ variant: "destructive", title: "GitHub", description: "Popup blocked — allow popups and try again" }); setGithubConnecting(false); }
    } catch {
      toast({ variant: "destructive", title: "GitHub", description: "Failed to start GitHub sign-in" });
      setGithubConnecting(false);
    }
  };

  const connectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/google/auth-url`, { headers });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "Google", description: json.error || "Google OAuth is not configured on the server" });
        setGoogleConnecting(false);
        return;
      }
      const popup = window.open(json.url, "google-oauth", "width=600,height=720");
      if (!popup) { toast({ variant: "destructive", title: "Google", description: "Popup blocked — allow popups and try again" }); setGoogleConnecting(false); }
    } catch {
      toast({ variant: "destructive", title: "Google", description: "Failed to start Google sign-in" });
      setGoogleConnecting(false);
    }
  };

  const connectNotion = async () => {
    setNotionConnecting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/notion/auth-url`, { headers });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "Notion", description: json.error || "Notion OAuth is not configured on the server" });
        setNotionConnecting(false);
        return;
      }
      const popup = window.open(json.url, "notion-oauth", "width=600,height=720");
      if (!popup) { toast({ variant: "destructive", title: "Notion", description: "Popup blocked — allow popups and try again" }); setNotionConnecting(false); }
    } catch {
      toast({ variant: "destructive", title: "Notion", description: "Failed to start Notion sign-in" });
      setNotionConnecting(false);
    }
  };

  const connectSlack = async () => {
    setSlackConnecting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/slack/auth`, { headers });
      const json = await res.json();
      if (!json.success) {
        toast({ variant: "destructive", title: "Slack", description: json.error || "Slack OAuth is not configured on the server" });
        setSlackConnecting(false);
        return;
      }
      const popup = window.open(json.url, "slack-oauth", "width=600,height=720");
      if (!popup) { toast({ variant: "destructive", title: "Slack", description: "Popup blocked — allow popups and try again" }); setSlackConnecting(false); }
    } catch {
      toast({ variant: "destructive", title: "Slack", description: "Failed to start Slack sign-in" });
      setSlackConnecting(false);
    }
  };

  const openPropertyPicker = async () => {
    setPropertyPickerOpen(true);
    setPropertiesLoading(true);
    setPropertiesError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/google/properties`, { headers });
      const json = await res.json();
      if (json.success) setGoogleProperties(json.data);
      else setPropertiesError(json.error || "Failed to load GA4 properties");
    } catch { setPropertiesError("Failed to load GA4 properties"); }
    finally { setPropertiesLoading(false); }
  };

  const selectProperty = async (p: { propertyId: string; propertyName: string }) => {
    setSelectingPropertyId(p.propertyId);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/google/select-property`, { method: "POST", headers, body: JSON.stringify(p) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "GA4 connected", description: p.propertyName });
        setPropertyPickerOpen(false);
        fetchStatus();
      } else {
        setPropertiesError(json.error || "Failed to select property");
      }
    } catch { setPropertiesError("Failed to select property"); }
    finally { setSelectingPropertyId(null); }
  };

  const openConnect = (id: string) => {
    if (id === "github") { connectGithub(); return; }
    if (id === "ga4") { connectGoogle(); return; }
    if (id === "notion") { connectNotion(); return; }
    if (id === "slack") { connectSlack(); return; }
    setCredModalId(id);
    setCredFields({});
    setCredError(null);
  };

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credModalId) return;
    setCredSubmitting(true);
    setCredError(null);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/connectors/${credModalId}/connect`, { method: "POST", headers, body: JSON.stringify(credFields) });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Connected", description: json.label || "Connector linked successfully." });
        setCredModalId(null);
        fetchStatus();
      } else {
        setCredError(json.error || "Connection failed");
      }
    } catch { setCredError("Connection failed — check your network and try again"); }
    finally { setCredSubmitting(false); }
  };

  const disconnect = async (id: string) => {
    try {
      const headers = await getPmxHeaders();
      if (id === "github") await fetch(`${API_URL}/pmx/github/disconnect`, { method: "DELETE", headers });
      else if (id === "ga4") await fetch(`${API_URL}/pmx/google/disconnect`, { method: "DELETE", headers });
      else if (id === "notion") await fetch(`${API_URL}/pmx/notion/disconnect`, { method: "DELETE", headers });
      else if (id === "slack") await fetch(`${API_URL}/pmx/slack/disconnect`, { method: "POST", headers });
      else await fetch(`${API_URL}/connectors/${id}`, { method: "DELETE", headers });
      toast({ title: "Disconnected" });
      fetchStatus();
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to disconnect" }); }
  };

  const matches = (c: ConnectorDef, q: string) =>
    c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);

  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery ? CONNECTORS.filter((c) => matches(c, searchQuery)) : CONNECTORS;

  const filtered = searchResults.filter((c) => {
    if (filter === "connected") return isConnected(c.id);
    if (filter === "not-connected") return !isConnected(c.id);
    return true;
  });

  const grouped = CATEGORIES
    .map((category) => ({ category, items: filtered.filter((c) => c.category === category) }))
    .filter((g) => g.items.length > 0);

  const popularConnectors = CONNECTORS.filter((c) => c.popular);
  const showPopular = !searchQuery && filter === "all";
  const noResults = searchQuery.length > 0 && searchResults.length === 0;

  const browseGrouped = CATEGORIES
    .map((category) => ({
      category,
      items: CONNECTORS.filter((c) => c.category === category && matches(c, browseSearch.trim().toLowerCase())),
    }))
    .filter((g) => g.items.length > 0);

  const openCustomModal = (prefillName = "") => {
    setCustomForm({ ...EMPTY_CUSTOM_FORM, name: prefillName });
    setRequestSent(false);
    setBrowseOpen(false);
    setCustomOpen(true);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;
    // TODO(backend): wire this to a real endpoint once one exists, e.g.
    //   const headers = await getAuthHeaders();
    //   await fetch(`${API_URL}/connectors/requests`, {
    //     method: "POST", headers, body: JSON.stringify(customForm),
    //   });
    // Intentionally not calling anything yet — this only flips local UI
    // state so the request flow can be reviewed before a backend exists.
    setRequestSent(true);
  };

  const closeCustomModal = (open: boolean) => {
    setCustomOpen(open);
    if (!open) setTimeout(() => { setCustomForm(EMPTY_CUSTOM_FORM); setRequestSent(false); }, 200);
  };

  const renderConnectorRow = (c: ConnectorDef) => {
    const active = isConnected(c.id);
    const Icon = c.Icon;
    const connecting = (c.id === "github" && githubConnecting) || (c.id === "ga4" && googleConnecting) || (c.id === "notion" && notionConnecting) || (c.id === "slack" && slackConnecting);
    const label = status[c.id]?.label;
    return (
      <div
        key={c.id}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 hover:border-border transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{active && label ? label : c.category}</p>
          </div>
        </div>
        {active ? (
          <button
            onClick={() => disconnect(c.id)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-destructive/10 hover:border-destructive/25 hover:text-destructive transition-colors shrink-0"
          >
            <Check className="h-3 w-3 group-hover:hidden" />
            <span className="hidden group-hover:inline">Disconnect</span>
            <span className="group-hover:hidden">Connected</span>
          </button>
        ) : (
          <button
            onClick={() => openConnect(c.id)}
            disabled={connecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 hover:border-primary/30 transition-all shrink-0 disabled:opacity-60"
          >
            {connecting && <Loader2 className="h-3 w-3 animate-spin" />}
            {connecting ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
    );
  };

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
            className="flex items-start justify-between gap-4 mb-6 flex-wrap"
          >
            <div>
              <h1 className="text-xl font-bold text-foreground">Connectors</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your tools to enhance PMX analysis with live data.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search connectors…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-card/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 w-52 transition-colors"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 text-xs font-semibold transition-colors">
                    Add
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-card border-border/60 text-foreground">
                  <DropdownMenuItem
                    onClick={() => { setBrowseSearch(""); setBrowseOpen(true); }}
                    className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <ListPlus className="h-3.5 w-3.5" /> Browse connectors
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openCustomModal()}
                    className="text-xs gap-2 cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <PenSquare className="h-3.5 w-3.5" /> Add custom connector
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Popular row */}
          {showPopular && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="mb-7"
            >
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Popular</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {popularConnectors.map((c) => {
                  const Icon = c.Icon;
                  const active = isConnected(c.id);
                  const connecting = (c.id === "github" && githubConnecting) || (c.id === "ga4" && googleConnecting) || (c.id === "notion" && notionConnecting) || (c.id === "slack" && slackConnecting);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon />
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                      </div>
                      {active ? (
                        <button onClick={() => disconnect(c.id)} className="group inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-destructive transition-colors shrink-0">
                          <Check className="h-3 w-3 group-hover:hidden" />
                          <span className="group-hover:hidden">Connected</span>
                          <span className="hidden group-hover:inline">Disconnect</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openConnect(c.id)}
                          disabled={connecting}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary/30 hover:bg-muted/40 transition-all shrink-0 disabled:opacity-60"
                        >
                          {connecting && <Loader2 className="h-3 w-3 animate-spin" />}
                          {connecting ? "Connecting…" : "Connect"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Grouped catalog */}
          {noResults ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-dashed border-border/60 bg-card/20 py-14 px-6 text-center"
            >
              <Plug className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No connector found for "{search.trim()}"</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Can't find the tool you're looking for? Request it and we'll look into adding it.
              </p>
              <button
                onClick={() => openCustomModal(search.trim())}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-semibold transition-colors"
              >
                <PenSquare className="h-3.5 w-3.5" /> Request this connector
              </button>
            </motion.div>
          ) : grouped.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No connectors match your filter.</div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group, gi) => (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + gi * 0.03 }}
                >
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">{group.category}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.items.map(renderConnectorRow)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <p className="mt-8 text-[11px] text-muted-foreground/50 text-center">
            Connected integrations are used to enrich PMX analysis with live signals.
          </p>
        </div>
      </div>

      {/* Browse connectors modal */}
      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="bg-card border-border/60 text-foreground max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 text-left space-y-2">
            <DialogTitle className="text-base font-bold">Browse connectors</DialogTitle>
            <DialogDescription className="text-xs">
              The full connector catalog, grouped by category.
            </DialogDescription>
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search the catalog…"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {browseGrouped.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">No connector found for "{browseSearch.trim()}"</p>
                <button
                  onClick={() => openCustomModal(browseSearch.trim())}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-semibold transition-colors"
                >
                  <PenSquare className="h-3.5 w-3.5" /> Request this connector
                </button>
              </div>
            ) : (
              browseGrouped.map((group) => (
                <div key={group.category}>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{group.category}</p>
                  <div className="space-y-2">
                    {group.items.map(renderConnectorRow)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-border/40 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Can't find a tool you need?</span>
            <button
              onClick={() => openCustomModal()}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Add custom connector
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add custom connector modal */}
      <Dialog open={customOpen} onOpenChange={closeCustomModal}>
        <DialogContent className="bg-card border-border/60 text-foreground max-w-md rounded-2xl">
          {!requestSent ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <PenSquare className="h-4 w-4 text-primary" /> Add custom connector
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Don't see the tool you need? Tell us about it and we'll look into adding it.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCustomSubmit} className="space-y-3.5 mt-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Connector name</label>
                  <input
                    required
                    type="text"
                    value={customForm.name}
                    onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Segment"
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Website / docs URL <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                  <input
                    type="url"
                    value={customForm.url}
                    onChange={(e) => setCustomForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://"
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">What would you use it for? <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={customForm.useCase}
                    onChange={(e) => setCustomForm((f) => ({ ...f, useCase: e.target.value }))}
                    placeholder="e.g. Pull customer event data into PMX analysis"
                    className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customForm.name.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2.5 text-xs transition-all disabled:opacity-50"
                >
                  Send request
                </button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <PartyPopper className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Request sent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thanks — we've noted the request for "{customForm.name}". We'll follow up once it's available.
                </p>
              </div>
              <button
                onClick={() => closeCustomModal(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-4 py-2 text-xs font-medium text-foreground transition-all"
              >
                <X className="h-3.5 w-3.5" /> Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect via API key / token modal */}
      <Dialog open={!!credModalId} onOpenChange={(open) => { if (!open) setCredModalId(null); }}>
        <DialogContent className="bg-card border-border/60 text-foreground max-w-sm rounded-2xl">
          {credModalId && (() => {
            const c = CONNECTORS.find((x) => x.id === credModalId);
            const Icon = c?.Icon;
            const fields = CONNECTOR_FIELDS[credModalId] || [];
            const help = CONNECTOR_HELP[credModalId];
            const helpUrl = getHelpUrl(credModalId);
            return (
              <>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {Icon && <Icon />} Connect {c?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Verified directly against {c?.name}'s API before anything is saved.
                  </DialogDescription>
                </DialogHeader>

                {help && (
                  <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
                    {helpUrl ? (
                      <a href={helpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                        Get your {c?.name} credentials <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-foreground font-medium">Where to find it</span>
                    )}
                    <p className="mt-0.5">{help.note}</p>
                  </div>
                )}

                <form onSubmit={submitCredentials} className="space-y-3 mt-2">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{f.label}</label>
                      <input
                        required={f.required}
                        type={f.secret ? "password" : "text"}
                        value={credFields[f.key] || ""}
                        onChange={(e) => setCredFields((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        autoComplete="off"
                        className="mt-1 w-full bg-background border border-border focus:border-ring rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none font-mono"
                      />
                    </div>
                  ))}
                  {credError && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-[10px] text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{credError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={credSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2.5 text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {credSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {credSubmitting ? "Verifying…" : "Connect"}
                  </button>
                </form>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* GA4 property picker — shown right after the Google OAuth popup succeeds */}
      <Dialog open={propertyPickerOpen} onOpenChange={(open) => { if (!open) setPropertyPickerOpen(false); }}>
        <DialogContent className="bg-card border-border/60 text-foreground max-w-sm rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GAIcon /> Choose a GA4 property
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick which Google Analytics 4 property PMX should use.
            </DialogDescription>
          </DialogHeader>

          {propertiesError && (
            <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{propertiesError}</span>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {propertiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : googleProperties.length === 0 ? (
              !propertiesError && <p className="text-xs text-muted-foreground text-center py-8">No GA4 properties found on this Google account.</p>
            ) : (
              googleProperties.map((p) => (
                <button
                  key={p.propertyId}
                  onClick={() => selectProperty(p)}
                  disabled={!!selectingPropertyId}
                  className="w-full text-left rounded-lg border border-border/40 bg-background/40 hover:border-primary/30 hover:bg-primary/5 px-3 py-2 transition-all disabled:opacity-60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.propertyName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.accountName}</p>
                  </div>
                  {selectingPropertyId === p.propertyId && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
