// app/components/meals/MealCard.tsx
"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, RefreshCw, Check, X, Heart, Pencil, Plus, Trash2, Loader2, Warehouse, ArrowUpFromLine } from 'lucide-react';
import { MealPlan, MealIngredient, PantryUnit } from './types';

interface MealCardProps {
  meal: MealPlan;
  onRate: (id: string, rating: number, comment: string) => void;
  onReplace: (meal: MealPlan) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onMarkEaten: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateIngredients: (id: string, ingredients: MealIngredient[]) => void;
  onSendToTracker?: (meal: MealPlan) => Promise<{ success: boolean; error?: string }>;
  onNutritionLookup?: (index: number, name: string, amount: number, unit: PantryUnit, onResult: (index: number, data: { calories: number; protein: number; carbs: number; fat: number }) => void) => void;
  nutritionLoading?: Set<number>;
  isInTracker?: boolean;
}

export default function MealCard({ meal, onRate, onReplace, onAccept, onReject, onMarkEaten, onToggleFavorite, onUpdateIngredients, onSendToTracker, onNutritionLookup, nutritionLoading, isInTracker }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<MealIngredient[]>(meal.ingredients);
  const [rating, setRating] = useState(meal.rating || 5);
  const [comment, setComment] = useState(meal.rating_comment || '');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const statusColors: Record<string, string> = {
    planned: 'text-blue-400',
    accepted: 'text-[var(--accent)]',
    eaten: 'text-violet-400',
    rejected: 'text-red-400',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Zaplanowany',
    accepted: 'Zaakceptowany',
    eaten: 'Zjedzony',
    rejected: 'Odrzucony',
  };

  const [manualOverride, setManualOverride] = useState<Set<number>>(new Set());

  const costs = meal.ingredient_costs || {};
  const totalCost = Object.values(costs).reduce((s: number, c) => s + (c || 0), 0);

  const handleNutritionResult = (index: number, data: { calories: number; protein: number; carbs: number; fat: number }) => {
    setEditedIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, ...data } : ing
    ));
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    const ing = editedIngredients[index];
    if (!ing || newAmount <= 0) return;

    // Update amount immediately
    setEditedIngredients(prev => prev.map((item, i) =>
      i === index ? { ...item, amount: newAmount } : item
    ));

    // If not manually overridden, lookup/recalc macros
    if (!manualOverride.has(index) && onNutritionLookup) {
      onNutritionLookup(index, ing.name, newAmount, ing.unit, handleNutritionResult);
    } else {
      // Fallback: proportional recalc from original
      const original = meal.ingredients[index];
      if (original && original.amount > 0) {
        const ratio = newAmount / original.amount;
        setEditedIngredients(prev => prev.map((item, i) =>
          i !== index ? item : {
            ...item,
            amount: newAmount,
            calories: Math.round(original.calories * ratio * 10) / 10,
            protein: Math.round(original.protein * ratio * 10) / 10,
            carbs: Math.round(original.carbs * ratio * 10) / 10,
            fat: Math.round(original.fat * ratio * 10) / 10,
          }
        ));
      }
    }
  };

  const updateIngredientField = (index: number, field: keyof MealIngredient, value: string | number) => {
    setEditedIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    ));

    // If user manually edits a macro field, mark as override
    if (['calories', 'protein', 'carbs', 'fat'].includes(field as string)) {
      setManualOverride(prev => new Set(prev).add(index));
      return;
    }

    // Trigger nutrition lookup on name or unit change (if not manually overridden)
    if ((field === 'name' || field === 'unit') && !manualOverride.has(index) && onNutritionLookup) {
      const ing = { ...editedIngredients[index], [field]: value };
      if (ing.name.trim() && ing.amount > 0) {
        onNutritionLookup(index, ing.name, ing.amount, ing.unit, handleNutritionResult);
      }
    }
  };

  const addIngredient = () => {
    setEditedIngredients(prev => [...prev, {
      name: '', amount: 0, unit: 'g' as PantryUnit,
      calories: 0, protein: 0, carbs: 0, fat: 0, cost: null,
      fromPantry: true,
    }]);
  };

  const removeIngredient = (index: number) => {
    if (editedIngredients.length <= 1) return;
    setEditedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = () => {
    onUpdateIngredients(meal.id, editedIngredients.filter(ing => ing.name.trim()));
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedIngredients(meal.ingredients);
    setEditing(false);
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-[var(--muted)] uppercase">{meal.meal_slot}</span>
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
          <span className="text-[var(--accent)] font-medium">{Math.round(meal.calories)} kcal</span>
          <span className="text-blue-400">B: {Math.round(meal.protein)}g</span>
          <span className="text-amber-400">W: {Math.round(meal.carbs)}g</span>
          <span className="text-red-400">T: {Math.round(meal.fat)}g</span>
          {(totalCost > 0 || Object.keys(costs).length > 0) && (
            <span className="text-[var(--muted)] ml-auto">
              {totalCost.toFixed(2)} zł
              {Object.values(costs).some(c => c === null) && (
                <span className="text-[var(--muted)]/50 text-[10px] ml-1">(częściowy)</span>
              )}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {meal.status === 'planned' && (
            <>
              <button onClick={() => onAccept(meal.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600/20 text-[var(--accent)] rounded-lg hover:bg-violet-600/30">
                <Check className="w-3 h-3" /> Akceptuj
              </button>
              <button onClick={() => onReject(meal.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                <X className="w-3 h-3" /> Odrzuć
              </button>
            </>
          )}
          {meal.status === 'accepted' && (
            <>
              <button onClick={() => onMarkEaten(meal.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30">
                <Check className="w-3 h-3" /> Zjedzony
              </button>
              <button onClick={() => { setExpanded(true); setEditing(true); }}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                <Pencil className="w-3 h-3" /> Edytuj skład
              </button>
            </>
          )}
          {meal.status === 'eaten' && (
            <>
              <button onClick={() => { setExpanded(true); setEditing(true); }}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                <Pencil className="w-3 h-3" /> Edytuj skład
              </button>
              {!meal.rating && (
                <button onClick={() => setShowRating(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30">
                  <Star className="w-3 h-3" /> Oceń
                </button>
              )}
            </>
          )}
          <button onClick={() => onToggleFavorite(meal.id)}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg ${
              meal.is_favorite
                ? 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30'
                : 'bg-[var(--muted)]/20 text-[var(--muted)] hover:bg-[var(--surface)]/30'
            }`}>
            <Heart className={`w-3 h-3 ${meal.is_favorite ? 'fill-pink-400' : ''}`} />
            {meal.is_favorite ? 'Ulubiony' : 'Polub'}
          </button>
          <button onClick={() => onReplace(meal)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--muted)]/20 text-[var(--muted)] rounded-lg hover:bg-[var(--surface)]/30">
            <RefreshCw className="w-3 h-3" /> Zamień
          </button>
          {onSendToTracker && (meal.status === 'accepted' || meal.status === 'eaten') && (
            <button
              onClick={async () => {
                if (sendStatus !== 'idle') return;
                setSendStatus('sending');
                try {
                  const result = await onSendToTracker(meal);
                  if (result.success) {
                    setSendStatus('sent');
                    setTimeout(() => setSendStatus('idle'), 2000);
                  } else {
                    setSendStatus('idle');
                  }
                } catch {
                  setSendStatus('idle');
                }
              }}
              disabled={sendStatus === 'sending'}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-bold rounded-full transition-all duration-150 active:scale-95 ${
                sendStatus === 'sent'
                  ? 'bg-green-500/20 text-green-500'
                  : isInTracker
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-[#1d9bf0]/10 text-[#1d9bf0] hover:bg-[#1d9bf0]/20'
              }`}
            >
              {sendStatus === 'sent' ? (
                <Check className="w-[18px] h-[18px] animate-[scaleIn_150ms_ease-out]" strokeWidth={1.5} />
              ) : sendStatus === 'sending' ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
              ) : isInTracker ? (
                <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.5} />
              ) : (
                <ArrowUpFromLine className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
              {sendStatus === 'sent' ? (isInTracker ? 'Zaktualizowano' : 'Wysłano') : isInTracker ? 'Odśwież w wadze' : 'Do wagi'}
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="ml-auto p-1 text-[var(--muted)] hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Rating form */}
      {showRating && (
        <div className="px-4 pb-4 border-t border-[var(--card-border)] pt-3 space-y-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  n <= rating ? 'bg-amber-500 text-white' : 'bg-[var(--surface)] text-[var(--muted)]'
                }`}>{n}</button>
            ))}
          </div>
          <input value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Komentarz (opcjonalny)..."
            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-white text-sm placeholder-[var(--muted)]" />
          <button onClick={() => { onRate(meal.id, rating, comment); setShowRating(false); }}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg">
            Zapisz ocenę
          </button>
        </div>
      )}

      {/* Expanded: ingredients + recipe */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--card-border)] pt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--foreground)]">Składniki</h4>
              {!editing && meal.status === 'accepted' && (
                <button onClick={() => setEditing(true)} className="text-xs text-blue-400 hover:text-blue-300">
                  Edytuj
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[20px_1fr_55px_40px_50px_40px_40px_40px_20px] gap-1 text-[10px] text-[var(--muted)]">
                  <span title="Ze spiżarni"><Warehouse className="w-3 h-3" /></span>
                  <span>Nazwa</span><span>Ilość</span><span>Jdn.</span>
                  <span>kcal</span><span className="text-blue-400">B</span>
                  <span className="text-amber-400">W</span><span className="text-red-400">T</span><span></span>
                </div>

                {editedIngredients.map((ing, i) => (
                  <div key={i} className="grid grid-cols-[20px_1fr_55px_40px_50px_40px_40px_40px_20px] gap-1 items-center">
                    <button
                      type="button"
                      onClick={() => setEditedIngredients(prev => prev.map((item, idx) =>
                        idx === i ? { ...item, fromPantry: item.fromPantry === false ? true : false } : item
                      ))}
                      title={ing.fromPantry === false ? 'Nie pobieraj ze spiżarni' : 'Pobieraj ze spiżarni'}
                      className="flex items-center justify-center"
                    >
                      <Warehouse className={`w-3.5 h-3.5 transition-colors ${
                        ing.fromPantry === false
                          ? 'text-[var(--muted)]/30'
                          : 'text-violet-400'
                      }`} />
                    </button>
                    <div className="relative">
                      <input value={ing.name} onChange={e => updateIngredientField(i, 'name', e.target.value)}
                        placeholder="Składnik"
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1.5 py-1 text-white text-xs w-full" />
                      {nutritionLoading?.has(i) && (
                        <Loader2 className="w-3 h-3 animate-spin text-violet-400 absolute right-1 top-1.5" />
                      )}
                    </div>
                    <input type="number" value={ing.amount || ''} onChange={e => handleAmountChange(i, parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1 text-white text-xs text-center" />
                    <select value={ing.unit} onChange={e => updateIngredientField(i, 'unit', e.target.value)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-0 py-1 text-white text-[10px]">
                      <option value="g">g</option><option value="ml">ml</option><option value="szt">szt</option>
                    </select>
                    <input type="number" value={Math.round(ing.calories) || ''} onChange={e => updateIngredientField(i, 'calories', parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1 text-violet-300 text-xs text-center" />
                    <input type="number" value={Math.round(ing.protein) || ''} onChange={e => updateIngredientField(i, 'protein', parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1 text-blue-300 text-xs text-center" />
                    <input type="number" value={Math.round(ing.carbs) || ''} onChange={e => updateIngredientField(i, 'carbs', parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1 text-amber-300 text-xs text-center" />
                    <input type="number" value={Math.round(ing.fat) || ''} onChange={e => updateIngredientField(i, 'fat', parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1 text-red-300 text-xs text-center" />
                    <button onClick={() => removeIngredient(i)} className="text-[var(--muted)] hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Totals */}
                <div className="flex gap-3 text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--card-border)]">
                  <span>Suma:</span>
                  <span className="text-[var(--accent)]">{Math.round(editedIngredients.reduce((s, i) => s + i.calories, 0))} kcal</span>
                  <span className="text-blue-400">B: {Math.round(editedIngredients.reduce((s, i) => s + i.protein, 0))}g</span>
                  <span className="text-amber-400">W: {Math.round(editedIngredients.reduce((s, i) => s + i.carbs, 0))}g</span>
                  <span className="text-red-400">T: {Math.round(editedIngredients.reduce((s, i) => s + i.fat, 0))}g</span>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={addIngredient}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--surface)] hover:bg-[var(--surface)] text-[var(--foreground)] rounded-lg">
                    <Plus className="w-3 h-3" /> Dodaj składnik
                  </button>
                  <button onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg">
                    Zapisz zmiany
                  </button>
                  <button onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs bg-[var(--surface)] hover:bg-[var(--surface)] text-[var(--foreground)] rounded-lg">
                    Anuluj
                  </button>
                </div>
              </div>
            ) : (
              <ul className="space-y-1">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      {ing.fromPantry === false && (
                        <span title="Poza spiżarnią"><Warehouse className="w-3 h-3 text-[var(--muted)]/30 shrink-0" /></span>
                      )}
                      {ing.name} — {ing.amount} {ing.unit}
                    </span>
                    <span className="flex items-center gap-3">
                      <span>{Math.round(ing.calories)} kcal</span>
                      <span className="w-20 text-right">
                        {ing.fromPantry === false
                          ? <span className="text-[var(--muted)]/50 italic">—</span>
                          : costs[ing.name] !== undefined
                            ? costs[ing.name] !== null
                              ? `${(costs[ing.name] as number).toFixed(2)} zł`
                              : <span className="text-[var(--muted)]/50 italic">brak ceny</span>
                            : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">Przygotowanie</h4>
            <ol className="space-y-1">
              {meal.recipe_steps.map((step, i) => (
                <li key={i} className="text-xs text-[var(--muted)]">
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
