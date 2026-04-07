"use client";

import React from 'react';
import { History, Trophy, ChevronRight } from 'lucide-react';
import type { Goal, GoalHistory, Stats } from './types';

interface GoalProgressSectionProps {
  readonly chartMode: 'all' | 'current-goal';
  readonly goal: Goal | null;
  readonly progress: number;
  readonly filteredStats: Stats & { currentWeight: number };
  readonly goalHistory: GoalHistory[];
  readonly onEditGoal: () => void;
  readonly onViewHistory: () => void;
}

export function GoalProgressSection({
  chartMode,
  goal,
  progress,
  filteredStats,
  goalHistory,
  onEditGoal,
  onViewHistory,
}: GoalProgressSectionProps) {
  return (
    <>
      {/* Goal Progress - only in current-goal mode */}
      {chartMode === 'current-goal' && goal && (
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[var(--foreground)]">Postęp celu</h3>
            <button onClick={onEditGoal} className="text-[var(--accent)] hover:text-[var(--accent-dark)] text-sm">
              Edytuj
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">
                Cel: {goal.target_weight}kg do {new Date(goal.target_date).toLocaleDateString('pl-PL')}
              </span>
              <span className="text-[var(--accent)] font-semibold">
                {Math.max(0, Math.min(100, progress)).toFixed(0)}%
              </span>
            </div>
            <div className="h-4 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Start: {goal.current_weight}kg</span>
              <span>Teraz: {filteredStats.currentWeight.toFixed(1)}kg</span>
              <span>Cel: {goal.target_weight}kg</span>
            </div>
          </div>
          {goal.monitoring_method && (
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <p className="text-[var(--muted)] text-sm">
                <strong>Metoda monitorowania:</strong> {goal.monitoring_method}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Goal History Button - only in 'all' mode */}
      {chartMode === 'all' && goalHistory.length > 0 && (
        <button
          onClick={onViewHistory}
          className="w-full bg-[var(--card-bg)] hover:bg-[var(--surface)] rounded-xl p-6 border-2 border-[var(--card-border)] hover:border-[var(--accent)]/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--surface)] rounded-xl flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                <History className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Historia celów</h3>
                <p className="text-[var(--muted)] text-sm">
                  {goalHistory.length} {goalHistory.length === 1 ? 'zakończony cel' :
                    goalHistory.length < 5 ? 'zakończone cele' : 'zakończonych celów'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {goalHistory.filter(g => g.completion_type === 'target_reached').length > 0 && (
                <div className="flex items-center gap-1 bg-[var(--accent)]/20 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-[var(--accent)] text-sm font-medium">
                    {goalHistory.filter(g => g.completion_type === 'target_reached').length}
                  </span>
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
          </div>
        </button>
      )}
    </>
  );
}
