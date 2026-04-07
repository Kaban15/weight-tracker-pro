"use client";

import React from 'react';
import { Flame, Footprints, Dumbbell, Award, LineChart } from 'lucide-react';
import type { Stats, Goal } from './types';

interface StatsGridProps {
  readonly filteredStats: Stats & { currentWeight: number };
  readonly chartMode: 'all' | 'current-goal';
  readonly goal: Goal | null;
}

export function StatsGrid({ filteredStats, chartMode, goal }: StatsGridProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[var(--foreground)]">
          Statystyki {chartMode === 'current-goal' ? 'bieżącego celu' : 'ogólne'}
        </h3>
        <span className="text-[var(--muted)] text-sm">
          {filteredStats.totalEntries} {filteredStats.totalEntries === 1 ? 'wpis' : filteredStats.totalEntries < 5 ? 'wpisy' : 'wpisów'}
        </span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--accent)]/10 rounded-xl p-6 border-2 border-[var(--accent)]/20">
          <div className="text-[var(--accent)] text-sm mb-2 font-semibold">Aktualna waga</div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{filteredStats.currentWeight.toFixed(1)} kg</div>
          <div className="text-[var(--muted)] text-xs mt-1">
            {filteredStats.totalWeightChange > 0 ? '+' : ''}{filteredStats.totalWeightChange.toFixed(1)}kg od startu
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/10 rounded-xl p-6 border-2 border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400 text-sm mb-2 font-semibold">
            <Flame className="w-4 h-4" />Śr. kalorie
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)]">
            {filteredStats.avgCalories > 0 ? Math.round(filteredStats.avgCalories) : '—'}
          </div>
          {goal?.daily_calories_limit && (
            <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.daily_calories_limit}/dzień</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-xl p-6 border-2 border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2 font-semibold">
            <Footprints className="w-4 h-4" />Śr. kroki
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)]">
            {filteredStats.avgSteps > 0 ? Math.round(filteredStats.avgSteps).toLocaleString() : '—'}
          </div>
          {goal?.daily_steps_goal && (
            <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.daily_steps_goal.toLocaleString()}/dzień</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl p-6 border-2 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-2 font-semibold">
            <Dumbbell className="w-4 h-4" />Treningi
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{filteredStats.totalWorkouts}</div>
          {goal?.weekly_training_hours && (
            <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.weekly_training_hours}h/tydz.</div>
          )}
        </div>
      </div>

      {/* Streak and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--accent)] text-sm mb-2 font-semibold">
            <Award className="w-5 h-5" />Seria
          </div>
          <div className="text-5xl font-bold text-[var(--foreground)] mb-2">{filteredStats.currentStreak}</div>
          <div className="text-[var(--muted)]">dni z rzędu!</div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--accent)] text-sm mb-2 font-semibold">
            <LineChart className="w-5 h-5" />Podsumowanie
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Wszystkie wpisy:</span>
              <span className="text-white font-semibold">{filteredStats.totalEntries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Najlepsza waga:</span>
              <span className="text-white font-semibold">{filteredStats.bestWeight.toFixed(1)}kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Średnia waga:</span>
              <span className="text-white font-semibold">{filteredStats.avgWeight.toFixed(1)}kg</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
