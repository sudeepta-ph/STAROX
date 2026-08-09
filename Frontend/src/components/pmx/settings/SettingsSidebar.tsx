import { Layers, Users, Package, Database, Zap, Bell, Lock, CreditCard, type LucideIcon } from "lucide-react";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  { label: "General", items: [
    { id: "product",   label: "Product",   icon: Package  },
    { id: "sources",   label: "Sources",   icon: Database },
    { id: "workspace", label: "Workspace", icon: Layers   },
  ]},
  { label: "Automation", items: [
    { id: "automation",    label: "Automation",    icon: Zap  },
    { id: "notifications", label: "Notifications", icon: Bell },
  ]},
  { label: "Team", items: [
    { id: "team",        label: "Team & Users", icon: Users },
    { id: "permissions", label: "Permissions",  icon: Lock  },
  ]},
  { label: "Billing & Usage", items: [
    { id: "billing", label: "Usage & Plan", icon: CreditCard },
  ]},
];

export const SETTINGS_NAV_FLAT: SettingsNavItem[] = SETTINGS_NAV.flatMap(g => g.items);

function NavButton({ item, active, onSelect, layout }: {
  item: SettingsNavItem; active: boolean; onSelect: (id: string) => void; layout: "list" | "pill";
}) {
  const Icon = item.icon;
  if (layout === "pill") {
    return (
      <button
        onClick={() => onSelect(item.id)}
        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {item.label}
      </button>
    );
  }
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`relative w-full flex items-center gap-2.5 rounded-lg pl-3.5 pr-3 py-2 text-[13px] font-medium text-left transition-colors ${
        active ? "bg-muted/50 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/25"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />}
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </button>
  );
}

export function SettingsSidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <>
      {/* Desktop — fixed nav column */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col overflow-y-auto py-5 pr-2">
        <p className="px-3.5 pb-3 text-[11px] font-semibold text-muted-foreground">Settings</p>
        <div className="space-y-4">
          {SETTINGS_NAV.map(group => (
            <div key={group.label}>
              <p className="px-3.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavButton key={item.id} item={item} active={activeId === item.id} onSelect={onSelect} layout="list" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile/tablet — horizontally scrollable pill row, no page overflow */}
      <div className="md:hidden shrink-0 border-b border-border/60 -mx-4 px-4 py-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 w-max">
          {SETTINGS_NAV_FLAT.map(item => (
            <NavButton key={item.id} item={item} active={activeId === item.id} onSelect={onSelect} layout="pill" />
          ))}
        </div>
      </div>
    </>
  );
}
