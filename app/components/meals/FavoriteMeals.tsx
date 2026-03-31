// app/components/meals/FavoriteMeals.tsx
"use client";

import { useState } from 'react';
import { ArrowLeft, Heart, UtensilsCrossed, Star, Calendar } from 'lucide-react';
import { MealPlan, formatDate } from './types';

interface FavoriteMealsProps {
  favorites: MealPlan[];
  onReeat: (mealId: string, date: string) => void;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

export default function FavoriteMeals({ favorites, onReeat, onToggleFavorite, onBack }: FavoriteMealsProps) {
  const [reeatTarget, setReeatTarget] = useState<{ id: string; date: string } | null>(null);

  const today = formatDate(new Date());
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDate(d); })();

  const handleReeat = (mealId: string, date: string) => {
    onReeat(mealId, date);
    setReeatTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
      </div>

      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-400 fill-pink-400" /> Ulubione posiłki
      </h2>

      {favorites.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Brak ulubionych posiłków.</p>
          <p className="text-xs mt-1">Oznacz posiłek serduszkiem, żeby dodać go tutaj.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map(meal => (
            <div key={meal.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{meal.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{meal.meal_slot}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-emerald-400">{Math.round(meal.calories)} kcal</span>
                    <span className="text-blue-400">B: {Math.round(meal.protein)}g</span>
                    <span className="text-amber-400">W: {Math.round(meal.carbs)}g</span>
                    <span className="text-red-400">T: {Math.round(meal.fat)}g</span>
                    {meal.estimated_cost !== null && (
                      <span className="text-slate-400">{meal.estimated_cost.toFixed(2)} zł</span>
                    )}
                  </div>
                  {meal.rating && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" /> {meal.rating}/10
                    </div>
                  )}
                </div>
                <button onClick={() => onToggleFavorite(meal.id)}
                  className="p-1.5 text-pink-400 hover:text-pink-300">
                  <Heart className="w-4 h-4 fill-pink-400" />
                </button>
              </div>

              {/* Reeat buttons */}
              <div className="flex gap-2 mt-3">
                {reeatTarget?.id === meal.id ? (
                  <>
                    <button onClick={() => handleReeat(meal.id, today)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
                      <Calendar className="w-3 h-3" /> Dziś
                    </button>
                    <button onClick={() => handleReeat(meal.id, tomorrow)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30">
                      <Calendar className="w-3 h-3" /> Jutro
                    </button>
                    <button onClick={() => setReeatTarget(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">
                      Anuluj
                    </button>
                  </>
                ) : (
                  <button onClick={() => setReeatTarget({ id: meal.id, date: today })}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30">
                    <UtensilsCrossed className="w-3 h-3" /> Zjedz ponownie
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
