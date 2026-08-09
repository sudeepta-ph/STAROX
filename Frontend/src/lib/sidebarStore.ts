import { create } from "zustand";

interface SidebarStore {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  // Nav item paths to hide from the shared Sidebar's nav list. Empty by
  // default everywhere; only set (by PmxPrd, for the idea-input entry path)
  // so other routes/entries never see a behavior change.
  hiddenNavPaths: string[];
  setHiddenNavPaths: (paths: string[]) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  setCollapsed: (v) => set({ collapsed: v }),
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  hiddenNavPaths: [],
  setHiddenNavPaths: (paths) => set({ hiddenNavPaths: paths }),
}));
