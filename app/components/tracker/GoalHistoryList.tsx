"use client";

import { useState } from 'react';
import { History, Trophy, Calendar, ChevronRight, Target, ArrowLeft } from 'lucide-react';
import { GoalHistory, Entry } from './types';
import GoalHistoryDetail from './GoalHistoryDetail';

interface GoalHistoryListProps {
  history: GoalHistory[];
  entries: Entry[];
  onClose: () => void;
}

export default function GoalHistoryList({ history, entries, onClose }: GoalHistoryListProps) {
  const [selectedGoal, setSelectedGoal] = useState<GoalHistory | null>(null);

  if (selectedGoal) {
    return (
      <GoalHistoryDetail
        goal={selectedGoal}
        entries={entries}
        onBack={() => setSelectedGoal(null)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Historia celow</h3>
              <p className="text-slate-400 text-sm">{history.length} zakonczonych celow</p>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400">Brak zakonczonych celow</p>
            <p className="text-slate-500 text-sm mt-1">
              Tutaj pojawi sie historia twoich osiagnietych celow
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      goal.completion_type === 'target_reached'
                        ? 'bg-emerald-500/20'
                        : 'bg-amber-500/20'
                    }`}>
                      {goal.completion_type === 'target_reached' ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Calendar className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {goal.current_weight}kg &rarr; {goal.target_weight}kg
                        </span>
                        <span className={`text-sm ${
                          goal.weight_lost > 0 ? 'text-emerald-400' : goal.weight_lost < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          ({goal.weight_lost > 0 ? '-' : goal.weight_lost < 0 ? '+' : ''}{Math.abs(goal.weight_lost).toFixed(1)}kg)
                        </span>
                      </div>
                      <div className="text-slate-400 text-sm">
                        {new Date(goal.start_date).toLocaleDateString('pl-PL')} - {new Date(goal.completed_at).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-emerald-400 font-semibold">
                        {goal.progress_percentage.toFixed(0)}%
                      </div>
                      <div className="text-slate-500 text-xs">
                        {goal.duration_days} dni
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
