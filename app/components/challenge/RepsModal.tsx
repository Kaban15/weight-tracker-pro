"use client";

import { X, Target, Check, TrendingUp } from "lucide-react";

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

interface RepsModalProps {
  isOpen: boolean;
  day: number;
  month: number;
  value: string;
  dailyGoal?: number;
  goalUnit?: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function RepsModal({
  isOpen,
  day,
  month,
  value,
  dailyGoal,
  goalUnit = 'powtórzeń',
  onChange,
  onSave,
  onDelete,
  onClose
}: RepsModalProps) {
  if (!isOpen) return null;

  const currentValue = parseInt(value) || 0;
  const hasGoal = dailyGoal && dailyGoal > 0;
  const goalReached = hasGoal && currentValue >= dailyGoal;
  const progress = hasGoal ? Math.min(100, Math.round((currentValue / dailyGoal) * 100)) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {day} {MONTH_NAMES[month]}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Daily Goal Display */}
          {hasGoal && (
            <div className={`p-3 rounded-lg border ${goalReached ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4" />
                  Cel dzienny
                </span>
                {goalReached && <Check className="w-5 h-5 text-emerald-400" />}
              </div>
              <p className={`text-xl font-bold ${goalReached ? 'text-emerald-400' : 'text-amber-400'}`}>
                {dailyGoal} {goalUnit}
              </p>
              {currentValue > 0 && (
                <div className="mt-2">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${goalReached ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {currentValue}/{dailyGoal} ({progress}%)
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {hasGoal ? `Ile ${goalUnit} wykonałeś?` : 'Liczba powtórzeń'}
            </label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={hasGoal ? `np. ${dailyGoal}` : 'np. 50'}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white text-2xl text-center placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Quick buttons for goal */}
          {hasGoal && (
            <div className="flex gap-2">
              <button
                onClick={() => onChange(dailyGoal.toString())}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                Cel ({dailyGoal})
              </button>
              <button
                onClick={() => onChange(Math.round(dailyGoal * 1.5).toString())}
                className="flex-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 py-2 rounded-lg text-sm"
              >
                +50%
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onDelete}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
            >
              Usuń
            </button>
            <button
              onClick={onSave}
              className={`flex-1 py-2 rounded-lg font-medium ${goalReached ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
