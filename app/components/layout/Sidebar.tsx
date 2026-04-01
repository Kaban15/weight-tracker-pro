"use client";

import { Home, Scale, Target, CheckSquare, CalendarDays, UtensilsCrossed, Shield, PanelLeftClose, PanelLeft } from "lucide-react";
import { type AppMode } from "@/lib/NavigationContext";
import { isAdmin } from "@/app/components/admin";
import { useAuth } from "@/lib/AuthContext";
import ThemeToggle from "@/app/components/shared/ThemeToggle";

interface SidebarProps {
  activeMode: AppMode;
  onNavigate: (mode: AppMode) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const mainItems = [
  { mode: null as AppMode, icon: Home, label: "Dashboard" },
  { mode: "tracker" as AppMode, icon: Scale, label: "Waga" },
  { mode: "challenge" as AppMode, icon: Target, label: "Wyzwania" },
  { mode: "todo" as AppMode, icon: CheckSquare, label: "Zadania" },
  { mode: "schedule" as AppMode, icon: CalendarDays, label: "Harmonogram" },
  { mode: "meals" as AppMode, icon: UtensilsCrossed, label: "Posiłki" },
];

export default function Sidebar({ activeMode, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const showAdmin = isAdmin(user?.email);

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-[var(--card-bg)] border-r border-[var(--card-border)] z-40 flex flex-col transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-3 py-5 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-light, var(--accent)))" }}
        >
          W
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-[var(--foreground)]">WeightTracker</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {mainItems.map(({ mode, icon: Icon, label }) => {
          const isActive = activeMode === mode;
          return (
            <button
              key={label}
              onClick={() => onNavigate(mode)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                  : "text-[var(--muted)] hover:bg-[var(--surface)]"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && label}
            </button>
          );
        })}
        {showAdmin && (
          <button
            onClick={() => onNavigate("admin")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors ${
              activeMode === "admin"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                : "text-[var(--muted)] hover:bg-[var(--surface)]"
            } ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Admin" : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && "Admin"}
          </button>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-0.5">
        <div className={`flex items-center ${collapsed ? "justify-center" : "px-2.5"}`}>
          <ThemeToggle />
        </div>
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface)] transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Rozwiń" : "Zwiń"}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!collapsed && "Zwiń menu"}
        </button>
      </div>
    </aside>
  );
}
