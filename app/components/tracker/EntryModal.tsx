"use client";

import { useState } from 'react';
import { X, Scale, Flame, Footprints, Dumbbell } from 'lucide-react';
import { Entry, Goal, formatDate } from './types';

interface EntryModalProps {
  isOpen: boolean;
  entry?: Entry | null;
  selectedDate?: string;
  goal?: Goal | null;
  onSave: (entry: Omit<Entry, 'id'>, editingId?: string) => Promise<boolean>;
  onClose: () => void;
}

export default function EntryModal({
  isOpen,
  entry,
  selectedDate,
  goal,
  onSave,
  onClose
}: EntryModalProps) {
  const [weight, setWeight] = useState(entry?.weight.toString() || '');
  const [calories, setCalories] = useState(entry?.calories?.toString() || '');
  const [steps, setSteps] = useState(entry?.steps?.toString() || '');
  const [workout, setWorkout] = useState(entry?.workout || '');
  const [workoutDuration, setWorkoutDuration] = useState(entry?.workout_duration?.toString() || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [date, setDate] = useState(entry?.date || selectedDate || formatDate(new Date()));
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (w > 0 && date) {
      setSaving(true);
      const success = await onSave({
        date,
        weight: w,
        calories: calories ? parseInt(calories) : undefined,
        steps: steps ? parseInt(steps) : undefined,
        workout: workout || undefined,
        workout_duration: workoutDuration ? parseInt(workoutDuration) : undefined,
        notes: notes || undefined,
      }, entry?.id);
      setSaving(false);
      if (success) onClose();
    }
  };

  const getTargetForDate = () => {
    if (!goal?.start_date || !goal?.target_date) return null;
    const start = new Date(goal.start_date);
    const end = new Date(goal.target_date);
    const current = new Date(date);
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysFromStart = (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const dailyLoss = (goal.current_weight - goal.target_weight) / totalDays;
    return Math.max(goal.target_weight, goal.current_weight - (dailyLoss * daysFromStart));
  };

  const targetWeight = getTargetForDate();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border-2 border-emerald-500/20 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {entry ? 'Edytuj wpis' : 'Dodaj wpis'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {targetWeight && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-400 text-sm">
              <Scale className="w-4 h-4 inline mr-2" />
              Waga docelowa na {new Date(date).toLocaleDateString('pl-PL')}: <strong>{targetWeight.toFixed(1)} kg</strong>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Data *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Waga (kg) *</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Flame className="w-4 h-4 text-orange-400" />
              Kalorie {goal?.daily_calories_limit && <span className="text-slate-500 font-normal">(cel: {goal.daily_calories_limit})</span>}
            </label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Footprints className="w-4 h-4 text-blue-400" />
              Kroki {goal?.daily_steps_goal && <span className="text-slate-500 font-normal">(cel: {goal.daily_steps_goal.toLocaleString()})</span>}
            </label>
            <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Dumbbell className="w-4 h-4 text-purple-400" />
              Trening
            </label>
            <select value={workout} onChange={(e) => setWorkout(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none">
              <option value="">Brak</option>
              <option value="Cardio">Cardio</option>
              <option value="Siłowy">Siłowy</option>
              <option value="Yoga">Yoga</option>
              <option value="Bieganie">Bieganie</option>
              <option value="Pływanie">Pływanie</option>
              <option value="Rower">Rower</option>
              <option value="HIIT">HIIT</option>
              <option value="Inny">Inny</option>
            </select>
          </div>

          {workout && (
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Czas treningu (min)</label>
              <input type="number" value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Notatki</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none resize-none" />
          </div>

          <button onClick={handleSave} disabled={!weight || parseFloat(weight) <= 0 || saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (entry ? 'Zapisz zmiany' : 'Dodaj wpis')}
          </button>
        </div>
      </div>
    </div>
  );
}
