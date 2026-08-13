import React from "react";
import { ChevronRight } from "lucide-react";
import { SettingsSidebar, SETTINGS_NAV_FLAT } from "./SettingsSidebar";

// One consistent shell for every /pmx/settings page: a slim breadcrumb +
// context row up top, nav on the left (collapses to a horizontal pill row
// below md — see SettingsSidebar), and a comfortably-width-capped content
// column on the right. No giant empty areas, no full-bleed forms.
export function SettingsLayout({
  activeId,
  onSelectSection,
  headerRight,
  children,
}: {
  activeId: string;
  onSelectSection: (id: string) => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sectionLabel = SETTINGS_NAV_FLAT.find(i => i.id === activeId)?.label ?? "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar — breadcrumb + context (save status, product switcher, etc.) */}
      <div className="shrink-0 border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-4 bg-background/60 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0">
          <span>Settings</span>
          {sectionLabel && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground font-medium truncate">{sectionLabel}</span>
            </>
          )}
        </div>
        {headerRight && <div className="flex items-center gap-2 shrink-0">{headerRight}</div>}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden w-full px-4 md:px-0">
          <SettingsSidebar activeId={activeId} onSelect={onSelectSection} />
          <div className="flex-1 overflow-y-auto md:min-w-0">
            <div className="max-w-[760px] mx-auto py-6 md:py-8 px-0 md:px-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
