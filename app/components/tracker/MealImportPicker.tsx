"use client";

import { Check as CheckIcon } from 'lucide-react';
import type { MealPlan } from '@/app/components/meals/types';

interface MealImportPickerProps {
  readonly availableMeals: MealPlan[];
  readonly selectedMealIds: Set<string>;
  readonly onToggleMeal: (id: string) => void;
  readonly onImport: () => void;
  readonly onCancel: () => void;
  readonly isMealAlreadyImported: (mealPlan: MealPlan) => boolean;
}

export function MealImportPicker({
  availableMeals,
  selectedMealIds,
  onToggleMeal,
  onImport,
  onCancel,
  isMealAlreadyImported,
}: MealImportPickerProps) {
  return (
    <div className="mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      {availableMeals.length === 0 ? (
        <p className="p-4 text-sm text-[var(--muted)] text-center">Brak posiłków na ten dzień</p>
      ) : (
        <>
          {availableMeals.map(mp => {
            const alreadyImported = isMealAlreadyImported(mp);
            const isSelected = selectedMealIds.has(mp.id);
            return (
              <button
                key={mp.id}
                type="button"
                disabled={alreadyImported}
                onClick={() => onToggleMeal(mp.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  alreadyImported ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  alreadyImported
                    ? 'border-[var(--muted)]/30 bg-[var(--muted)]/10'
                    : isSelected
                      ? 'border-[#1d9bf0] bg-[#1d9bf0]'
                      : 'border-[var(--card-border)]'
                }`}>
                  {(isSelected || alreadyImported) && (
                    <CheckIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted)] uppercase">{mp.meal_slot}</span>
                    {alreadyImported && <span className="text-[10px] text-green-500">Dodano</span>}
                  </div>
                  <p className="text-sm text-white font-medium truncate">{mp.name}</p>
                </div>
                <span className="text-xs text-[var(--muted)] shrink-0">{Math.round(mp.calories)} kcal</span>
              </button>
            );
          })}
          <div className="flex gap-2 p-3 border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 text-sm text-[var(--foreground)] bg-[var(--surface)] rounded-full hover:bg-[var(--card-border)] transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={selectedMealIds.size === 0}
              className="flex-1 py-2 text-sm font-bold text-white bg-[#1d9bf0] rounded-full hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Importuj ({selectedMealIds.size})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
