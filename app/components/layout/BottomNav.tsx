"use client";

import { Home, Scale, Target, CheckSquare, MoreHorizontal } from "lucide-react";
import { type AppMode } from "@/lib/NavigationContext";

interface BottomNavProps {
  activeMode: AppMode;
  onNavigate: (mode: AppMode) => void;
  onMorePress: () => void;
}

const navItems = [
  { mode: null as AppMode, icon: Home, label: "Home" },
  { mode: "tracker" as AppMode, icon: Scale, label: "Waga" },
  { mode: "challenge" as AppMode, icon: Target, label: "Wyzwania" },
  { mode: "todo" as AppMode, icon: CheckSquare, label: "Zadania" },
];

export default function BottomNav({ activeMode, onNavigate, onMorePress }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] border-t border-[var(--card-border)] z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ mode, icon: Icon, label }) => {
          const isActive = activeMode === mode;
          return (
            <button
              key={label}
              onClick={() => onNavigate(mode)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-semibold" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMorePress}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[var(--muted)] transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Więcej</span>
        </button>
      </div>
    </nav>
  );
}
