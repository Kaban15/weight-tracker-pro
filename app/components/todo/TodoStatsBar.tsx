"use client";

import { Calendar, Clock, ListTodo, AlertCircle, Circle, Check } from "lucide-react";

interface TodoStats {
  total: number;
  completed: number;
  notCompleted: number;
  overdue: number;
  today: number;
  percentComplete: number;
}

interface TodoStatsBarProps {
  stats: TodoStats;
  formattedDate: string;
}

export default function TodoStatsBar({ stats, formattedDate }: TodoStatsBarProps) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Data</span>
          </div>
          <div className="text-lg font-bold text-[var(--foreground)]">{formattedDate}</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Dziś</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.today}</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <ListTodo className="w-4 h-4" />
            <span>Wszystkie</span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span>Spóźnione</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.overdue}</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Circle className="w-4 h-4 text-[var(--muted)]" />
            <span>Nie Ukończone</span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{stats.notCompleted}</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--accent)]/30">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Check className="w-4 h-4 text-[var(--accent)]" />
            <span>Ukończone</span>
          </div>
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.completed}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)] mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--muted)] text-sm">Postęp</span>
          <span className="text-white font-bold">{stats.percentComplete}%</span>
        </div>
        <div className="h-4 bg-[var(--surface)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-500"
            style={{ width: `${stats.percentComplete}%` }}
          />
        </div>
      </div>
    </>
  );
}
