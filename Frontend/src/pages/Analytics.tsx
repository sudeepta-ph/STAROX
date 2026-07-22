import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const { collapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-y-auto transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: collapsed ? 56 : 224 }}
      >
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Usage analytics and product insights will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
