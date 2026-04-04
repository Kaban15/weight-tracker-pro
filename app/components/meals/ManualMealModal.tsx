"use client";

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../shared/Modal';
import { MealIngredient, PantryUnit } from './types';

interface ManualMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: {
    name: string;
    meal_slot: string;
    ingredients: MealIngredient[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    recipe_steps: string[];
  }) => void;
  mealSlots: string[];
}

interface IngredientRow {
  name: string;
  amount: string;
  unit: PantryUnit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_INGREDIENT: IngredientRow = {
  name: '', amount: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '',
};

export default function ManualMealModal({ isOpen, onClose, onSave, mealSlots }: ManualMealModalProps) {
  const [name, setName] = useState('');
  const [mealSlot, setMealSlot] = useState(mealSlots[0] || 'Śniadanie');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ ...EMPTY_INGREDIENT }]);

  const addIngredient = () => setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);

  const removeIngredient = (i: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateIngredient = (i: number, field: keyof IngredientRow, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const totals = ingredients.reduce((acc, ing) => ({
    calories: acc.calories + (parseFloat(ing.calories) || 0),
    protein: acc.protein + (parseFloat(ing.protein) || 0),
    carbs: acc.carbs + (parseFloat(ing.carbs) || 0),
    fat: acc.fat + (parseFloat(ing.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedIngredients: MealIngredient[] = ingredients
      .filter(ing => ing.name.trim())
      .map(ing => ({
        name: ing.name.trim(),
        amount: parseFloat(ing.amount) || 0,
        unit: ing.unit,
        calories: parseFloat(ing.calories) || 0,
        protein: parseFloat(ing.protein) || 0,
        carbs: parseFloat(ing.carbs) || 0,
        fat: parseFloat(ing.fat) || 0,
        cost: null,
      }));

    onSave({
      name: name.trim(),
      meal_slot: mealSlot,
      ingredients: parsedIngredients,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      recipe_steps: [],
    });

    // Reset
    setName('');
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj posiłek ręcznie" size="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name + slot */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Nazwa posiłku</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Jajecznica z pomidorami"
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Typ posiłku</label>
            <select value={mealSlot} onChange={e => setMealSlot(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white text-sm">
              {mealSlots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--muted)]">Składniki</label>
            <button type="button" onClick={addIngredient}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              <Plus className="w-3 h-3" /> Dodaj składnik
            </button>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_50px_38px_44px_40px_40px_40px_20px] gap-1 text-[10px] text-[var(--muted)]">
              <span>Nazwa</span>
              <span>Ilość</span>
              <span>Jdn.</span>
              <span>kcal</span>
              <span className="text-blue-400">B(g)</span>
              <span className="text-amber-400">W(g)</span>
              <span className="text-red-400">T(g)</span>
              <span></span>
            </div>

            {ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_50px_38px_44px_40px_40px_40px_20px] gap-1">
                <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                  placeholder="np. Jajko"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1.5 text-white text-xs" />
                <input type="number" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)}
                  placeholder="100"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1.5 text-white text-xs text-center" />
                <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value as PantryUnit)}
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-0.5 py-1.5 text-white text-xs">
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="szt">szt</option>
                </select>
                <input type="number" value={ing.calories} onChange={e => updateIngredient(i, 'calories', e.target.value)}
                  placeholder="0"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1.5 text-white text-xs text-center" />
                <input type="number" value={ing.protein} onChange={e => updateIngredient(i, 'protein', e.target.value)}
                  placeholder="0"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1.5 text-blue-300 text-xs text-center" />
                <input type="number" value={ing.carbs} onChange={e => updateIngredient(i, 'carbs', e.target.value)}
                  placeholder="0"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1.5 text-amber-300 text-xs text-center" />
                <input type="number" value={ing.fat} onChange={e => updateIngredient(i, 'fat', e.target.value)}
                  placeholder="0"
                  className="min-w-0 bg-[var(--background)] border border-[var(--card-border)] rounded px-1 py-1.5 text-red-300 text-xs text-center" />
                <button type="button" onClick={() => removeIngredient(i)}
                  className="text-[var(--muted)] hover:text-red-400 flex items-center justify-center">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex gap-4 text-xs bg-[var(--card-bg)] rounded-lg p-2 border border-[var(--card-border)]">
          <span className="text-[var(--muted)]">Suma:</span>
          <span className="text-[var(--accent)] font-medium">{Math.round(totals.calories)} kcal</span>
          <span className="text-blue-400">B: {Math.round(totals.protein)}g</span>
          <span className="text-amber-400">W: {Math.round(totals.carbs)}g</span>
          <span className="text-red-400">T: {Math.round(totals.fat)}g</span>
        </div>

        <button type="submit" disabled={!name.trim()}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white rounded-xl transition-colors font-medium">
          Dodaj posiłek
        </button>
      </form>
    </Modal>
  );
}
