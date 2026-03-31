"use client";

import { useState } from 'react';
import { Trophy, Calendar, Target, TrendingDown, Flame, Award } from 'lucide-react';
import Modal from '../shared/Modal';
import { GoalCompletionData } from './types';

interface CompletionModalProps {
  isOpen: boolean;
  completion: GoalCompletionData | null;
  onStartNewGoal: () => void;
  onContinueWithoutGoal: () => void;
  onClose: () => void | Promise<void>;
}

export default function CompletionModal({
  isOpen,
  completion,
  onStartNewGoal,
  onContinueWithoutGoal,
  onClose
}: CompletionModalProps) {
  const [processing, setProcessing] = useState(false);

  if (!completion) return null;

  const { goal, stats, completionType, finalWeight } = completion;
  const weightLost = goal.current_weight - finalWeight;
  const weightDiff = goal.current_weight - goal.target_weight;
  const progressPct = weightDiff > 0
    ? ((goal.current_weight - finalWeight) / weightDiff) * 100
    : 100;
  const isSuccess = completionType === 'target_reached';

  const handleAction = async (action: 'new' | 'continue' | 'close') => {
    setProcessing(true);
    if (action === 'new') {
      await onStartNewGoal();
    } else if (action === 'continue') {
      await onContinueWithoutGoal();
    } else {
      await onClose();
    }
    setProcessing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => handleAction('close')}
      title={isSuccess ? 'Cel osiagniety!' : 'Wyzwanie zakonczone'}
      size="max-w-md"
    >
      {/* Header with icon */}
      <div className="text-center mb-6">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
          isSuccess ? 'bg-emerald-500/20' : 'bg-amber-500/20'
        }`}>
          {isSuccess ? (
            <Trophy className="w-10 h-10 text-emerald-400" />
          ) : (
            <Calendar className="w-10 h-10 text-amber-400" />
          )}
        </div>
        <p className="text-slate-400">
          {isSuccess
            ? 'Gratulacje! Osiagnales swoja wage docelowa!'
            : 'Twoj plan dobiegl konca. Oto podsumowanie.'}
        </p>
      </div>

      {/* Stats Summary */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Target className="w-4 h-4" />
            <span>Cel</span>
          </div>
          <span className="text-white font-semibold">
            {goal.current_weight}kg &rarr; {goal.target_weight}kg
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingDown className="w-4 h-4" />
            <span>Zmiana wagi</span>
          </div>
          <span className={`font-semibold ${weightLost > 0 ? 'text-emerald-400' : weightLost < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {weightLost > 0 ? '-' : weightLost < 0 ? '+' : ''}{Math.abs(weightLost).toFixed(1)} kg
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Award className="w-4 h-4" />
            <span>Postep</span>
          </div>
          <span className="text-white font-semibold">
            {Math.max(0, progressPct).toFixed(0)}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Najdluzsza seria</span>
          </div>
          <span className="text-orange-400 font-semibold">
            {stats.currentStreak} dni
          </span>
        </div>
      </div>

      {/* Final weight display */}
      <div className="text-center mb-6 py-4 bg-slate-800/30 rounded-xl">
        <div className="text-slate-400 text-sm mb-1">Aktualna waga</div>
        <div className="text-3xl font-bold text-white">{finalWeight.toFixed(1)} kg</div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => handleAction('new')}
          disabled={processing}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Target className="w-5 h-5" />
              Rozpocznij nowe wyzwanie
            </>
          )}
        </button>
        <button
          onClick={() => handleAction('continue')}
          disabled={processing}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Kontynuuj bez celu
        </button>
      </div>
    </Modal>
  );
}
