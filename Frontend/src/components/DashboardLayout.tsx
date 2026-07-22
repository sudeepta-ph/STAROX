import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { collapsed } = useSidebarStore();
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main
        className="flex-1 px-8 pt-8 pb-12 min-h-screen overflow-y-auto scroll-smooth transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: collapsed ? 56 : 224 }}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
