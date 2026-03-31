// app/components/meals/MealCard.tsx
"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, RefreshCw, Trash2, Check, X } from 'lucide-react';
import { MealPlan } from './types';

interface MealCardProps {
  meal: MealPlan;
  onRate: (id: string, rating: number, comment: string) => void;
  onReplace: (meal: MealPlan) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onMarkEaten: (id: string) => void;
}

export default function MealCard({ meal, onRate, onReplace, onAccept, onReject, onMarkEaten }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(meal.rating || 5);
  const [comment, setComment] = useState(meal.rating_comment || '');

  const statusColors: Record<string, string> = {
    planned: 'text-blue-400',
    accepted: 'text-emerald-400',
    eaten: 'text-violet-400',
    rejected: 'text-red-400',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Zaplanowany',
    accepted: 'Zaakceptowany',
    eaten: 'Zjedzony',
    rejected: 'Odrzucony',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500 uppercase">{meal.meal_slot}</span>
              <span className={`text-xs ${statusColors[meal.status]}`}>• {statusLabels[meal.status]}</span>
            </div>
            <h3 className="text-white font-medium">{meal.name}</h3>
          </div>

          {meal.rating && (
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-sm font-medium">{meal.rating}</span>
            </div>
          )}
        </div>

        {/* Macros row */}
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-emerald-400 font-medium">{Math.round(meal.calories)} kcal</span>
          <span className="text-blue-400">B: {Math.round(meal.protein)}g</span>
          <span className="text-amber-400">W: {Math.round(meal.carbs)}g</span>
          <span className="text-red-400">T: {Math.round(meal.fat)}g</span>
          {meal.estimated_cost !== null && (
            <span className="text-slate-400 ml-auto">{meal.estimated_cost.toFixed(2)} zł</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {meal.status === 'planned' && (
            <>
              <button onClick={() => onAccept(meal.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
                <Check className="w-3 h-3" /> Akceptuj
              </button>
              <button onClick={() => onReject(meal.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                <X className="w-3 h-3" /> Odrzuć
              </button>
            </>
          )}
          {meal.status === 'accepted' && (
            <button onClick={() => onMarkEaten(meal.id)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30">
              <Check className="w-3 h-3" /> Zjedzony
            </button>
          )}
          {(meal.status === 'eaten' && !meal.rating) && (
            <button onClick={() => setShowRating(true)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30">
              <Star className="w-3 h-3" /> Oceń
            </button>
          )}
          <button onClick={() => onReplace(meal)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-slate-600/20 text-slate-400 rounded-lg hover:bg-slate-600/30">
            <RefreshCw className="w-3 h-3" /> Zamień
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="ml-auto p-1 text-slate-400 hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Rating form */}
      {showRating && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  n <= rating ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>{n}</button>
            ))}
          </div>
          <input value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Komentarz (opcjonalny)..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500" />
          <button onClick={() => { onRate(meal.id, rating, comment); setShowRating(false); }}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg">
            Zapisz ocenę
          </button>
        </div>
      )}

      {/* Expanded: recipe */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Składniki</h4>
            <ul className="space-y-1">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between text-xs text-slate-400">
                  <span>{ing.name} — {ing.amount} {ing.unit}</span>
                  <span>{Math.round(ing.calories)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Przygotowanie</h4>
            <ol className="space-y-1">
              {meal.recipe_steps.map((step, i) => (
                <li key={i} className="text-xs text-slate-400">
                  <span className="text-violet-400 font-medium">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
