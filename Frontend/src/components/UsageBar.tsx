import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";

const LIMIT = 10;

export default function UsageBar() {
  const { user } = useAuthStore();
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "usage", "analysis"))
      .then((snap) => setUsed((snap.data()?.count as number) ?? 0))
      .catch(() => {});
  }, [user]);

  if (!user || used === null) return null;

  const pct = Math.min(100, (used / LIMIT) * 100);
  const remaining = Math.max(0, LIMIT - used);

  return (
    <div className="shrink-0 px-4 py-1.5 border-b border-border/30 bg-surface/20 flex items-center gap-3">
      <div className="flex-1 h-1 rounded-full bg-primary/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {remaining} free run{remaining !== 1 ? "s" : ""} left
      </span>
    </div>
  );
}
