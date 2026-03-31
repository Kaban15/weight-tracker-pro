"use client";

import { Star } from 'lucide-react';
import { DaySummary } from './types';
import Modal from '../shared/Modal';

interface MealDaySummaryProps {
  summary: DaySummary;
  targetCalories: number;
  onClose: () => void;
}

export default function MealDaySummary({ summary, targetCalories, onClose }: MealDaySummaryProps) {
  const calPercent = Math.round((summary.totalCalories / targetCalories) * 100);
  const calColor = calPercent > 110 ? 'text-red-400' : calPercent > 90 ? 'text-emerald-400' : 'text-amber-400';

  return (
    <Modal isOpen={true} onClose={onClose} title={summary.date} size="max-w-md">
        {/* Totals */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Kalorie</span>
            <span className={`font-bold ${calColor}`}>{Math.round(summary.totalCalories)} / {Math.round(targetCalories)} kcal ({calPercent}%)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Białko</span>
            <span className="text-blue-400">{Math.round(summary.totalProtein)}g</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Węglowodany</span>
            <span className="text-amber-400">{Math.round(summary.totalCarbs)}g</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Tłuszcze</span>
            <span className="text-red-400">{Math.round(summary.totalFat)}g</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Koszt</span>
            <span className="text-white">{summary.totalCost.toFixed(2)} zł</span>
          </div>
          {summary.avgRating && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Średnia ocena</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" /> {summary.avgRating}
              </span>
            </div>
          )}
        </div>

        {/* Meals list */}
        <div className="space-y-2">
          {summary.meals.map(meal => (
            <div key={meal.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase">{meal.meal_slot}</span>
                  <p className="text-white text-sm">{meal.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 text-sm">{Math.round(meal.calories)} kcal</p>
                  {meal.rating && (
                    <p className="text-amber-400 text-xs flex items-center gap-0.5 justify-end">
                      <Star className="w-3 h-3 fill-amber-400" /> {meal.rating}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {summary.meals.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Brak posiłków w tym dniu.</p>
          )}
        </div>
    </Modal>
  );
}
