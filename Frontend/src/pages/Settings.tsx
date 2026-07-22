import { motion } from "framer-motion";
import { useState } from "react";
import { 
  ArrowLeft,
  Bell, 
  Palette,
  MessageSquare,
  MoonStar,
  Volume2,
  Trash2,
  Save,
  Plug,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

// ── Inline SVG connector icons ────────────────────────────────────────────────
function GitHubIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>;
}
function SlackIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>;
}
function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}
function NotionIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>;
}
function FigmaIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 10.98c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V10.98H8.148zm4.587 13.019c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49 4.49 2.014 4.49 4.49-2.014 4.49-4.49 4.49zm0-7.51c-1.665 0-3.019 1.355-3.019 3.02 0 1.664 1.354 3.018 3.019 3.018 1.665 0 3.019-1.354 3.019-3.019s-1.354-3.019-3.019-3.019zm4.587-5.509h-4.588V8.981h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.489-4.49 4.489zm0-7.509h-3.117v5.981h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-2.962-3.019-2.962z"/></svg>;
}

const SETTINGS_CONNECTORS = [
  { id: "github",    name: "GitHub",          Icon: GitHubIcon  },
  { id: "slack",     name: "Slack",           Icon: SlackIcon   },
  { id: "notion",    name: "Notion",          Icon: NotionIcon  },
  { id: "figma",     name: "Figma",           Icon: FigmaIcon   },
  { id: "gmail",     name: "Gmail",           Icon: GoogleIcon  },
  { id: "gdrive",    name: "Google Drive",    Icon: GoogleIcon  },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly: false,
  });
  const [showTokenUsage, setShowTokenUsage] = useState(() => {
    return localStorage.getItem("starox_show_token_usage") === "true";
  });
  const [soundNotification, setSoundNotification] = useState(() => {
    return localStorage.getItem("starox_sound_notification") !== "false";
  });
  const [defaultModel, setDefaultModel] = useState(() => {
    return localStorage.getItem("starox_default_model") || "gpt-5.3-codex";
  });

  const activeTheme = theme ?? "dark";
  const [settingsConnected, setSettingsConnected] = useState<Record<string, boolean>>({});
  const toggleConnector = (id: string) => setSettingsConnected(prev => ({ ...prev, [id]: !prev[id] }));

  const updateTokenUsage = () => {
    setShowTokenUsage((prev) => {
      const next = !prev;
      localStorage.setItem("starox_show_token_usage", String(next));
      return next;
    });
  };

  const updateSoundNotification = () => {
    setSoundNotification((prev) => {
      const next = !prev;
      localStorage.setItem("starox_sound_notification", String(next));
      return next;
    });
  };

  const updateDefaultModel = (value: string) => {
    setDefaultModel(value);
    localStorage.setItem("starox_default_model", value);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </motion.button>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-foreground mb-2"
        >
          Settings
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm"
        >
          Manage your account preferences and application settings.
        </motion.p>
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "email", label: "Email notifications", desc: "Receive updates via email" },
              { key: "push", label: "Push notifications", desc: "Browser push notifications" },
              { key: "weekly", label: "Weekly digest", desc: "Summary of your product insights" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                    animate={{ left: notifications[item.key as keyof typeof notifications] ? "22px" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Theme */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Theme</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Change the interface to bright, dark, or your default system preference.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Bright" },
              { id: "system", label: "System" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTheme === item.id
                    ? "border-primary/45 bg-primary/12 text-primary"
                    : "border-border/60 bg-card/35 text-foreground/80 hover:bg-card/60"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Token usage */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MoonStar className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Token Usage</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Display token usage in chat</p>
              <p className="text-xs text-muted-foreground">When activated, your token consumption is shown above the prompt field.</p>
            </div>
            <button
              onClick={updateTokenUsage}
              className={`relative h-5 w-10 rounded-full transition-colors ${showTokenUsage ? "bg-primary" : "bg-secondary"}`}
            >
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white"
                animate={{ left: showTokenUsage ? "22px" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </motion.section>

        {/* Sound notification */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Volume2 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Sound Notification</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Play completion chime</p>
              <p className="text-xs text-muted-foreground">Play a sound when STAROX finishes responding in your active tab.</p>
            </div>
            <button
              onClick={updateSoundNotification}
              className={`relative h-5 w-10 rounded-full transition-colors ${soundNotification ? "bg-primary" : "bg-secondary"}`}
            >
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white"
                animate={{ left: soundNotification ? "22px" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </motion.section>

        {/* Chat */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Chat</h2>
          </div>
          <label className="block text-sm text-foreground mb-1">Default model</label>
          <p className="mb-3 text-xs text-muted-foreground">
            Choose the model used for new chats. Existing projects are not changed.
          </p>
          <select
            value={defaultModel}
            onChange={(e) => updateDefaultModel(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-surface p-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="gpt-5.3-codex">GPT-5.3-Codex</option>
            <option value="gpt-5.1">GPT-5.1</option>
            <option value="claude-sonnet">Claude Sonnet</option>
          </select>
        </motion.section>

        {/* Connectors */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plug className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-medium text-foreground">Connectors</h2>
            </div>
            <a
              href="/connectors"
              className="text-xs text-primary/70 hover:text-primary transition-colors"
            >
              Manage all →
            </a>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your tools to enrich PMX analysis with live signals.
          </p>
          <div className="space-y-2">
            {SETTINGS_CONNECTORS.map((c) => {
              const Icon = c.Icon;
              const active = !!settingsConnected[c.id];
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-card text-foreground/70 shrink-0">
                      <Icon />
                    </div>
                    <span className="text-sm text-foreground">{c.name}</span>
                  </div>
                  {active ? (
                    <button
                      onClick={() => toggleConnector(c.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Connected
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleConnector(c.id)}
                      className="rounded-lg border border-border/50 bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/40 hover:border-primary/30 transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Danger zone */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6 border-destructive/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Danger Zone</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive hover:bg-destructive/20 transition-colors">
            Delete Account
          </button>
        </motion.section>

        {/* Save button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex justify-end"
        >
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
