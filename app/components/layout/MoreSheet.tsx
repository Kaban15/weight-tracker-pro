"use client";

import { CalendarDays, UtensilsCrossed, Shield, MessageSquare, Bell, Activity, X } from "lucide-react";
import { type AppMode } from "@/lib/NavigationContext";
import { isAdmin } from "@/app/components/admin";
import { useAuth } from "@/lib/AuthContext";
import ThemeToggle from "@/app/components/shared/ThemeToggle";

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (mode: AppMode) => void;
  onOpenFeedback: () => void;
  onOpenNotifications: () => void;
  onOpenHealth: () => void;
}

export default function MoreSheet({
  isOpen,
  onClose,
  onNavigate,
  onOpenFeedback,
  onOpenNotifications,
  onOpenHealth,
}: MoreSheetProps) {
  const { user } = useAuth();
  const showAdmin = isAdmin(user?.email);

  if (!isOpen) return null;

  const navItem = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-[var(--card-bg)] rounded-t-2xl p-4 pb-8 animate-fade-in-up"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Więcej</h3>
          <button onClick={onClose} className="text-[var(--muted)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {navItem(<CalendarDays className="w-5 h-5 text-cyan-500" />, "Harmonogram", () => onNavigate("schedule"))}
          {navItem(<UtensilsCrossed className="w-5 h-5 text-violet-500" />, "Posiłki", () => onNavigate("meals"))}
          {showAdmin && navItem(<Shield className="w-5 h-5 text-indigo-500" />, "Panel Admina", () => onNavigate("admin"))}
          <hr className="border-[var(--card-border)] my-2" />
          {navItem(<Activity className="w-5 h-5 text-pink-500" />, "Integracje zdrowotne", onOpenHealth)}
          {navItem(<Bell className="w-5 h-5 text-amber-500" />, "Powiadomienia", onOpenNotifications)}
          {navItem(<MessageSquare className="w-5 h-5 text-[var(--accent)]" />, "Prześlij opinię", onOpenFeedback)}
          <div className="flex items-center gap-3 px-4 py-3">
            <ThemeToggle />
            <span className="text-sm text-[var(--muted)]">Motyw</span>
          </div>
        </div>
      </div>
    </div>
  );
}
