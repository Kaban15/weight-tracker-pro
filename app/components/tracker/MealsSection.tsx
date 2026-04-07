"use client";

import { UtensilsCrossed, Trash2, Plus, Download } from 'lucide-react';
import { Meal, MealType } from './types';
import { MealImportPicker } from './MealImportPicker';
import type { MealPlan } from '@/app/components/meals/types';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];

interface MacroSummary {
  readonly calories: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
}

interface MealsSectionProps {
  readonly meals: Meal[];
  readonly macroSummary: MacroSummary;
  readonly onAddMeal: () => void;
  readonly onRemoveMeal: (id: string) => void;
  readonly onUpdateMeal: (id: string, updates: Partial<Meal>) => void;
  readonly showImportButton: boolean;
  readonly importLoading: boolean;
  readonly onOpenImport: () => void;
  readonly showImportPicker: boolean;
  readonly availableMealPlans: MealPlan[];
  readonly selectedImports: Set<string>;
  readonly onToggleImport: (id: string) => void;
  readonly onImportSelected: () => void;
  readonly onCancelImport: () => void;
  readonly isMealAlreadyImported: (mealPlan: MealPlan) => boolean;
}

export function MealsSection({
  meals,
  macroSummary,
  onAddMeal,
  onRemoveMeal,
  onUpdateMeal,
  showImportButton,
  importLoading,
  onOpenImport,
  showImportPicker,
  availableMealPlans,
  selectedImports,
  onToggleImport,
  onImportSelected,
  onCancelImport,
  isMealAlreadyImported,
}: MealsSectionProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[var(--foreground)] mb-2 font-semibold">
        <UtensilsCrossed className="w-4 h-4 text-amber-400" />
        Posiłki
      </label>

      {meals.length > 0 && (
        <div className="sticky top-0 z-10 mb-3 p-3 bg-[var(--background)] rounded-xl border border-[var(--card-border)] shadow-lg">
          <div className="text-xs text-[var(--muted)] mb-1">Suma dnia</div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-orange-400 font-semibold">{macroSummary.calories} kcal</span>
            <span className="text-blue-400">B: {macroSummary.protein}g</span>
            <span className="text-yellow-400">W: {macroSummary.carbs}g</span>
            <span className="text-red-400">T: {macroSummary.fat}g</span>
          </div>
        </div>
      )}

      {meals.map((m) => (
        <div key={m.id} className="mb-3 p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="text"
              value={m.name}
              onChange={(e) => onUpdateMeal(m.id, { name: e.target.value })}
              placeholder="Nazwa posiłku"
              className="flex-1 min-w-0 bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-3 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base"
            />
            <select
              value={m.type}
              onChange={(e) => onUpdateMeal(m.id, { type: e.target.value as MealType })}
              className="bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-2 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base shrink-0"
            >
              {MEAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemoveMeal(m.id)}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[var(--surface)] hover:bg-red-600/50 text-[var(--muted)] hover:text-red-400 rounded-lg transition-colors shrink-0"
              aria-label="Usuń posiłek"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">kcal</label>
              <input
                type="number"
                min="0"
                value={m.calories || ''}
                onChange={(e) => onUpdateMeal(m.id, { calories: Number(e.target.value) || 0 })}
                className="w-full bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-2 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base"
              />
            </div>
            <div>
              <label className="text-xs text-blue-400 mb-1 block">Białko (g)</label>
              <input
                type="number"
                min="0"
                value={m.protein || ''}
                onChange={(e) => onUpdateMeal(m.id, { protein: Number(e.target.value) || 0 })}
                className="w-full bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-2 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base"
              />
            </div>
            <div>
              <label className="text-xs text-yellow-400 mb-1 block">Węgle (g)</label>
              <input
                type="number"
                min="0"
                value={m.carbs || ''}
                onChange={(e) => onUpdateMeal(m.id, { carbs: Number(e.target.value) || 0 })}
                className="w-full bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-2 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base"
              />
            </div>
            <div>
              <label className="text-xs text-red-400 mb-1 block">Tłuszcz (g)</label>
              <input
                type="number"
                min="0"
                value={m.fat || ''}
                onChange={(e) => onUpdateMeal(m.id, { fat: Number(e.target.value) || 0 })}
                className="w-full bg-[var(--card-bg)] text-[var(--foreground)] rounded-lg px-2 py-2 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-base"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onAddMeal}
          className="flex-1 py-2 px-4 bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--foreground)] rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-amber-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj posiłek
        </button>
        {showImportButton && (
          <button
            type="button"
            onClick={onOpenImport}
            disabled={importLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold rounded-full bg-[#1d9bf0]/10 text-[#1d9bf0] hover:bg-[#1d9bf0]/20 transition-colors duration-150 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Importuj
          </button>
        )}
      </div>
      {showImportPicker && (
        <MealImportPicker
          availableMeals={availableMealPlans}
          selectedMealIds={selectedImports}
          onToggleMeal={onToggleImport}
          onImport={onImportSelected}
          onCancel={onCancelImport}
          isMealAlreadyImported={isMealAlreadyImported}
        />
      )}
    </div>
  );
}
