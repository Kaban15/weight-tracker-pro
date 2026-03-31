"use client";

import { Scale, Target, Flame, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import type { Stats, Goal, GoalHistory } from './types';

interface DashboardSummaryProps {
  currentWeight: number;
  stats: Stats;
  goal: Goal | null;
  progress: number;
  goalHistory: GoalHistory[];
  onSetGoal: () => void;
  onViewHistory: () => void;
}

export default function DashboardSummary({
  currentWeight,
  stats,
  goal,
  progress,
  goalHistory,
  onSetGoal,
  onViewHistory,
}: DashboardSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Current Weight */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <Scale className="w-4 h-4" />
          <span>Aktualna waga</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{currentWeight.toFixed(1)}</span>
          <span className="text-slate-400 text-sm">kg</span>
        </div>
        {stats.totalWeightChange !== 0 && (
          <div className={`flex items-center gap-1 text-sm mt-1 ${stats.totalWeightChange < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalWeightChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            <span>{stats.totalWeightChange > 0 ? '+' : ''}{stats.totalWeightChange.toFixed(1)} kg</span>
          </div>
        )}
      </div>

      {/* Progress - only show when goal exists */}
      {goal ? (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Postep</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{Math.max(0, Math.min(100, progress)).toFixed(0)}</span>
            <span className="text-slate-400 text-sm">%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Tryb wolny</span>
          </div>
          <div className="text-white text-sm mt-2">
            Sledzisz wage bez aktywnego celu
          </div>
          <button
            onClick={onSetGoal}
            className="text-emerald-400 hover:text-emerald-300 text-sm mt-2"
          >
            Ustal cel &rarr;
          </button>
        </div>
      )}

      {/* Streak */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Seria dni</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
          <span className="text-slate-400 text-sm">dni</span>
        </div>
        {stats.currentStreak >= 7 && (
          <div className="text-orange-400 text-sm mt-1">Super! 🔥</div>
        )}
      </div>

      {/* Days Remaining / History */}
      {goal ? (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>Do celu</span>
          </div>
          {(() => {
            const daysLeft = goal?.target_date
              ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            const weightLeft = goal ? (currentWeight - goal.target_weight).toFixed(1) : '0';
            return (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{Math.max(0, daysLeft)}</span>
                  <span className="text-slate-400 text-sm">dni</span>
                </div>
                {parseFloat(weightLeft) > 0 && (
                  <div className="text-amber-400 text-sm mt-1">
                    Zostalo {weightLeft} kg
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>Historia</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{goalHistory.length}</span>
            <span className="text-slate-400 text-sm">celow</span>
          </div>
          {goalHistory.length > 0 && (
            <button
              onClick={onViewHistory}
              className="text-emerald-400 hover:text-emerald-300 text-sm mt-1"
            >
              Zobacz historie &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
