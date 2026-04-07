"use client";

import { ArrowLeft, Trophy, Calendar, TrendingDown, Flame, Dumbbell, Target, Scale } from 'lucide-react';
import { GoalHistory, Entry } from './types';
import ProgressChart from '../ProgressChart';

interface GoalHistoryDetailProps {
  goal: GoalHistory;
  entries: Entry[];
  onBack: () => void;
}

export default function GoalHistoryDetail({ goal, entries, onBack }: GoalHistoryDetailProps) {
  // Filter entries within goal date range
  const completedDate = goal.completed_at.split('T')[0]!;
  const relevantEntries = entries.filter(entry => {
    return entry.date >= goal.start_date && entry.date <= completedDate;
  });

  // Create a goal object for the chart
  const historicGoal = {
    current_weight: goal.current_weight,
    target_weight: goal.target_weight,
    target_date: goal.target_date,
    start_date: goal.start_date,
    weekly_weight_loss: goal.weekly_weight_loss,
  };

  const isSuccess = goal.completion_type === 'target_reached';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--muted)] hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Powrot do historii</span>
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isSuccess ? 'bg-[var(--accent)]/20' : 'bg-amber-500/20'
          }`}>
            {isSuccess ? (
              <Trophy className="w-7 h-7 text-[var(--accent)]" />
            ) : (
              <Calendar className="w-7 h-7 text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {goal.current_weight}kg &rarr; {goal.final_weight}kg
            </h2>
            <p className="text-[var(--muted)]">
              {new Date(goal.start_date).toLocaleDateString('pl-PL')} - {new Date(goal.completed_at).toLocaleDateString('pl-PL')}
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          isSuccess
            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {isSuccess ? <Trophy className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          {isSuccess ? 'Cel osiagniety' : 'Termin minal'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <TrendingDown className="w-4 h-4" />
            <span>Zmiana wagi</span>
          </div>
          <div className={`text-2xl font-bold ${goal.weight_lost > 0 ? 'text-[var(--accent)]' : goal.weight_lost < 0 ? 'text-red-400' : 'text-[var(--muted)]'}`}>
            {goal.weight_lost > 0 ? '-' : goal.weight_lost < 0 ? '+' : ''}{Math.abs(goal.weight_lost).toFixed(1)} kg
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Postep</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {goal.progress_percentage.toFixed(0)}%
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Scale className="w-4 h-4" />
            <span>Najlepsza waga</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {goal.best_weight.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Seria</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {goal.current_streak} dni
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Czas trwania</span>
          </div>
          <div className="text-xl font-bold text-white">
            {goal.duration_days} dni
          </div>
          <div className="text-[var(--muted)] text-sm">{goal.total_entries} wpisow</div>
        </div>

        {goal.avg_calories && goal.avg_calories > 0 && (
          <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
            <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
              <Flame className="w-4 h-4" />
              <span>Sr. kalorie</span>
            </div>
            <div className="text-xl font-bold text-white">
              {Math.round(goal.avg_calories)}
            </div>
            {goal.daily_calories_limit && (
              <div className="text-[var(--muted)] text-sm">cel: {goal.daily_calories_limit}</div>
            )}
          </div>
        )}

        <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
            <Dumbbell className="w-4 h-4" />
            <span>Treningi</span>
          </div>
          <div className="text-xl font-bold text-white">
            {goal.total_workouts}
          </div>
        </div>
      </div>

      {/* Chart */}
      {relevantEntries.length > 0 && (
        <ProgressChart
          entries={relevantEntries}
          goal={historicGoal}
          startDate={goal.start_date}
          endDate={completedDate}
        />
      )}

      {relevantEntries.length === 0 && (
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)] text-center">
          <p className="text-[var(--muted)]">Brak danych wpisow dla tego okresu</p>
        </div>
      )}
    </div>
  );
}
