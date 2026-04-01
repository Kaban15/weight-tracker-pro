"use client";

import {
  AlertCircle,
  ArrowLeft,
  LayoutDashboard,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import { TaskStats } from "./types";

interface WeeklyHeaderProps {
  stats: TaskStats;
  syncError: string | null;
  showBacklog: boolean;
  onBack: () => void;
  onToggleBacklog: () => void;
  onReload: () => void;
}

export default function WeeklyHeader({
  stats,
  syncError,
  showBacklog,
  onBack,
  onToggleBacklog,
  onReload,
}: WeeklyHeaderProps) {
  return (
    <>
      {/* Naglowek */}
      <header className="bg-[var(--background)] border-b border-[var(--card-border)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Powrot</span>
          </button>
          <div className="flex items-center gap-3">
            <ListTodo className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">Lista Zadan</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBacklog}
              className={`p-2 rounded-lg transition-colors ${
                showBacklog
                  ? "bg-blue-600 text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
              }`}
              title="Pokaz/Ukryj backlog"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Pasek statystyk */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--card-border)] px-4 py-2 overflow-x-auto">
        <div className="flex items-center justify-center gap-3 sm:gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">Wszystkie:</span>
            <span className="text-white font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Dzis:</span>
            <span className="text-amber-400 font-semibold">{stats.today}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500">Spoznione:</span>
            <span className="text-blue-400 font-semibold">{stats.overdue}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">Ukonczone:</span>
            <span className="text-[var(--accent)] font-semibold">
              {stats.completed}
            </span>
          </div>
          <div className="hidden sm:block w-32 bg-[var(--surface)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all"
              style={{ width: `${stats.percentComplete}%` }}
            />
          </div>
          <span className="text-white font-semibold">
            {stats.percentComplete}%
          </span>
        </div>
      </div>

      {/* Baner bledu synchronizacji */}
      {syncError && (
        <div className="bg-red-900/30 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{syncError}</span>
          </div>
          <button
            onClick={onReload}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-semibold px-3 py-1 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ponów
          </button>
        </div>
      )}
    </>
  );
}
