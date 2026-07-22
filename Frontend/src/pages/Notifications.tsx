import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Sparkles, FileText, Info, BarChart3, Circle, Loader2 } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, writeBatch, query, orderBy, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";

type NotificationType = "analysis" | "suggestion" | "system" | "report";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: Timestamp | null;
  read: boolean;
}

const typeIcons: Record<NotificationType, typeof Sparkles> = {
  analysis: BarChart3, suggestion: Sparkles, system: Info, report: FileText,
};
const typeColors: Record<NotificationType, string> = {
  analysis: "bg-primary/15 text-primary",
  suggestion: "bg-primary/10 text-primary/80",
  system: "bg-muted text-muted-foreground",
  report: "bg-primary/12 text-primary",
};

type FilterTab = "all" | "unread" | "analysis" | "suggestion" | "system" | "report";

function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts.seconds * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NotificationsPage = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.read;
    return n.type === activeTab;
  });

  const markAllRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const toggleRead = async (id: string, current: boolean) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: !current });
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "analysis", label: "Analyses" },
    { key: "suggestion", label: "Suggestions" },
    { key: "system", label: "System" },
  ];

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 text-center gap-3">
        <Bell className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sign in to view notifications.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-display font-bold text-foreground mb-2">Notifications</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm">Stay updated on your analyses, suggestions, and system alerts.</motion.p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap ${
              activeTab === tab.key ? "bg-primary/10 text-primary border-primary/30" : "bg-surface border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!loading && filtered.map((notif, i) => {
            const Icon = typeIcons[notif.type] ?? Info;
            return (
              <motion.div key={notif.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                onClick={() => toggleRead(notif.id, notif.read)}
                className={`glass-card p-4 cursor-pointer hover:border-primary/30 transition-all ${!notif.read ? "border-l-2 border-l-primary" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${typeColors[notif.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-medium ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.read && <Circle className="w-2 h-2 fill-primary text-primary" />}
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(notif.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notif.body}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run an analysis to get started.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
