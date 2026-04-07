"use client";

import { Dumbbell, Trash2, Plus } from 'lucide-react';
import { Workout } from './types';

interface WorkoutsSectionProps {
  readonly workouts: Workout[];
  readonly onAddWorkout: () => void;
  readonly onRemoveWorkout: (index: number) => void;
  readonly onUpdateWorkout: (index: number, field: 'type' | 'duration', value: string | number | undefined) => void;
}

export function WorkoutsSection({
  workouts,
  onAddWorkout,
  onRemoveWorkout,
  onUpdateWorkout,
}: WorkoutsSectionProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[var(--foreground)] mb-2 font-semibold">
        <Dumbbell className="w-4 h-4 text-purple-400" />
        Treningi
      </label>

      {workouts.map((w, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={w.type}
            onChange={(e) => onUpdateWorkout(index, 'type', e.target.value)}
            className="flex-1 bg-[var(--card-bg)] text-[var(--foreground)] rounded-xl px-4 py-3 border-2 border-[var(--card-border)] focus:border-[var(--accent)] outline-none"
          >
            <option value="">Wybierz typ</option>
            <option value="Cardio">Cardio</option>
            <option value="Siłowy">Siłowy</option>
            <option value="Yoga">Yoga</option>
            <option value="Bieganie">Bieganie</option>
            <option value="Pływanie">Pływanie</option>
            <option value="Rower">Rower</option>
            <option value="HIIT">HIIT</option>
            <option value="Inny">Inny</option>
          </select>
          <input
            type="number"
            value={w.duration || ''}
            onChange={(e) => onUpdateWorkout(index, 'duration', e.target.value)}
            placeholder="min"
            className="w-20 bg-[var(--card-bg)] text-[var(--foreground)] rounded-xl px-3 py-3 border-2 border-[var(--card-border)] focus:border-[var(--accent)] outline-none"
          />
          <button
            type="button"
            onClick={() => onRemoveWorkout(index)}
            className="p-3 bg-[var(--surface)] hover:bg-red-600/50 text-[var(--muted)] hover:text-red-400 rounded-xl transition-colors"
            aria-label="Usuń trening"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddWorkout}
        className="w-full mt-2 py-2 px-4 bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--foreground)] rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Dodaj trening
      </button>
    </div>
  );
}
