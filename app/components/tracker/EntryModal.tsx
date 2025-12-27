"use client";

import { useState, useEffect } from 'react';
import { X, Scale, Flame, Footprints, Dumbbell, Trash2, AlertTriangle } from 'lucide-react';
import { Entry, Goal, formatDate } from './types';

interface EntryModalProps {
  isOpen: boolean;
  entry?: Entry | null;
  selectedDate?: string;
  goal?: Goal | null;
  onSave: (entry: Omit<Entry, 'id'>, editingId?: string) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onClose: () => void;
}

export default function EntryModal({
  isOpen,
  entry,
  selectedDate,
  goal,
  onSave,
  onDelete,
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
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form when entry or selectedDate changes
  useEffect(() => {
    setWeight(entry?.weight.toString() || '');
    setCalories(entry?.calories?.toString() || '');
    setSteps(entry?.steps?.toString() || '');
    setWorkout(entry?.workout || '');
    setWorkoutDuration(entry?.workout_duration?.toString() || '');
    setNotes(entry?.notes || '');
    setDate(entry?.date || selectedDate || formatDate(new Date()));
    setError(null);
    setShowDeleteConfirm(false);
  }, [entry, selectedDate]);

  const MIN_WEIGHT = 30;
  const MAX_WEIGHT = 300;

  if (!isOpen) return null;

  const validateWeight = (w: number): string | null => {
    if (isNaN(w) || w <= 0) return 'Podaj prawidłową wagę';
    if (w < MIN_WEIGHT) return `Waga musi być większa niż ${MIN_WEIGHT} kg`;
    if (w > MAX_WEIGHT) return `Waga musi być mniejsza niż ${MAX_WEIGHT} kg`;
    return null;
  };

  const handleSave = async () => {
    const w = parseFloat(weight);
    const validationError = validateWeight(w);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!date) {
      setError('Wybierz datę');
      return;
    }

    // Prevent future dates
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      setError('Nie można dodać wpisu z przyszłą datą');
      return;
    }

    setError(null);
    setSaving(true);

    // Parse and validate numeric fields
    const parsedCalories = calories ? parseInt(calories) : undefined;
    const parsedSteps = steps ? parseInt(steps) : undefined;
    const parsedDuration = workoutDuration ? parseInt(workoutDuration) : undefined;

    const success = await onSave({
      date,
      weight: w,
      calories: parsedCalories && !isNaN(parsedCalories) ? parsedCalories : undefined,
      steps: parsedSteps && !isNaN(parsedSteps) ? parsedSteps : undefined,
      workout: workout || undefined,
      workout_duration: parsedDuration && !isNaN(parsedDuration) ? parsedDuration : undefined,
      notes: notes || undefined,
    }, entry?.id);
    setSaving(false);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!entry?.id || !onDelete) return;
    setDeleting(true);
    const success = await onDelete(entry.id);
    setDeleting(false);
    if (success) {
      setShowDeleteConfirm(false);
      onClose();
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border-2 border-emerald-500/20 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 id="entry-modal-title" className="text-2xl font-bold text-white">
            {entry ? 'Edytuj wpis' : 'Dodaj wpis'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Zamknij">
            <X className="w-6 h-6" aria-hidden="true" />
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
            <label htmlFor="entry-date" className="block text-slate-300 mb-2 font-semibold">Data *</label>
            <input
              id="entry-date"
              type="date"
              value={date}
              max={formatDate(new Date())}
              onChange={(e) => { setDate(e.target.value); setError(null); }}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="entry-weight" className="block text-slate-300 mb-2 font-semibold">Waga (kg) *</label>
            <input
              id="entry-weight"
              type="number"
              step="0.1"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setError(null); }}
              placeholder={`${MIN_WEIGHT}-${MAX_WEIGHT} kg`}
              className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 outline-none ${
                error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'
              }`}
            />
            {error && (
              <p className="text-red-400 text-sm mt-1">{error}</p>
            )}
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

          {/* Buttons */}
          <div className="flex gap-3">
            {entry && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
                aria-label="Usuń wpis"
              >
                <Trash2 className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!weight || parseFloat(weight) <= 0 || saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (entry ? 'Zapisz zmiany' : 'Dodaj wpis')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-desc"
        >
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border-2 border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" aria-hidden="true" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-lg font-bold text-white">Usuń wpis</h3>
                <p className="text-sm text-slate-400">
                  {new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <p id="delete-modal-desc" className="text-slate-300 mb-6">
              Czy na pewno chcesz usunąć ten wpis? Ta operacja jest nieodwracalna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Usuń
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
