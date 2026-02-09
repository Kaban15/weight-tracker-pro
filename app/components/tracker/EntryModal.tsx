"use client";

import { useState, useEffect, useMemo } from 'react';
import { X, Scale, Flame, Footprints, Dumbbell, UtensilsCrossed, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { Entry, Goal, Workout, Meal, MealType, formatDate } from './types';

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
  // Convert legacy single workout to workouts array
  const getInitialWorkouts = (): Workout[] => {
    if (entry?.workouts && entry.workouts.length > 0) {
      return entry.workouts;
    }
    if (entry?.workout) {
      return [{ type: entry.workout, duration: entry.workout_duration }];
    }
    return [];
  };

  const [weight, setWeight] = useState(entry?.weight.toString() || '');
  const [calories, setCalories] = useState(entry?.calories?.toString() || '');
  const [steps, setSteps] = useState(entry?.steps?.toString() || '');
  const [workouts, setWorkouts] = useState<Workout[]>(getInitialWorkouts());
  const [meals, setMeals] = useState<Meal[]>(entry?.meals || []);
  const [notes, setNotes] = useState(entry?.notes || '');
  const [date, setDate] = useState(entry?.date || selectedDate || formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addWorkout = () => {
    setWorkouts([...workouts, { type: '', duration: undefined }]);
  };

  const updateWorkout = (index: number, field: 'type' | 'duration', value: string | number | undefined) => {
    const updated = [...workouts];
    if (field === 'type') {
      updated[index].type = value as string;
    } else {
      updated[index].duration = value ? Number(value) : undefined;
    }
    setWorkouts(updated);
  };

  const removeWorkout = (index: number) => {
    setWorkouts(workouts.filter((_, i) => i !== index));
  };

  const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];

  const addMeal = () => {
    setMeals([...meals, {
      id: crypto.randomUUID(),
      name: '',
      type: 'Śniadanie',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }]);
  };

  const updateMeal = (id: string, updates: Partial<Meal>) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const macroSummary = useMemo(() => ({
    calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
    fat: meals.reduce((s, m) => s + (m.fat || 0), 0),
  }), [meals]);

  // Reset form when entry or selectedDate changes
  useEffect(() => {
    setWeight(entry?.weight.toString() || '');
    setCalories(entry?.calories?.toString() || '');
    setSteps(entry?.steps?.toString() || '');
    // Convert legacy workout to workouts array
    if (entry?.workouts && entry.workouts.length > 0) {
      setWorkouts(entry.workouts);
    } else if (entry?.workout) {
      setWorkouts([{ type: entry.workout, duration: entry.workout_duration }]);
    } else {
      setWorkouts([]);
    }
    setMeals(entry?.meals || []);
    setNotes(entry?.notes || '');
    setDate(entry?.date || selectedDate || formatDate(new Date()));
    setError(null);
    setShowDeleteConfirm(false);
  }, [entry, selectedDate]);

  // Auto-update calories from meals
  useEffect(() => {
    if (meals.length > 0) {
      const totalCal = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      setCalories(totalCal > 0 ? totalCal.toString() : '');
    }
  }, [meals]);

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

    // Filter out empty workouts and prepare workouts array
    const validWorkouts = workouts.filter(w => w.type);

    // Filter out meals with empty name
    const validMeals = meals.filter(m => m.name.trim());

    const success = await onSave({
      date,
      weight: w,
      calories: parsedCalories && !isNaN(parsedCalories) ? parsedCalories : undefined,
      steps: parsedSteps && !isNaN(parsedSteps) ? parsedSteps : undefined,
      workouts: validWorkouts.length > 0 ? validWorkouts : undefined,
      meals: validMeals.length > 0 ? validMeals : undefined,
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
      <div className="bg-slate-900 rounded-2xl max-w-md w-full border-2 border-emerald-500/20 my-8 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 pb-0 mb-6">
          <h2 id="entry-modal-title" className="text-2xl font-bold text-white">
            {entry ? 'Edytuj wpis' : 'Dodaj wpis'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Zamknij">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex-1">
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
              {meals.length > 0 && <span className="text-emerald-500/70 text-xs font-normal ml-auto">auto z posiłków</span>}
            </label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
              readOnly={meals.length > 0}
              className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none ${meals.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              Posiłki
            </label>

            {meals.length > 0 && (
              <div className="sticky top-0 z-10 mb-3 p-3 bg-slate-900 rounded-xl border border-slate-700/50 shadow-lg shadow-slate-950/50">
                <div className="text-xs text-slate-500 mb-1">Suma dnia</div>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="text-orange-400 font-semibold">{macroSummary.calories} kcal</span>
                  <span className="text-blue-400">B: {macroSummary.protein}g</span>
                  <span className="text-yellow-400">W: {macroSummary.carbs}g</span>
                  <span className="text-red-400">T: {macroSummary.fat}g</span>
                </div>
              </div>
            )}

            {meals.map((m) => (
              <div key={m.id} className="mb-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex flex-wrap gap-2 mb-2">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMeal(m.id, { name: e.target.value })}
                    placeholder="Nazwa posiłku"
                    className="flex-1 min-w-0 bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                  />
                  <select
                    value={m.type}
                    onChange={(e) => updateMeal(m.id, { type: e.target.value as MealType })}
                    className="bg-slate-800 text-white rounded-lg px-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm shrink-0"
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMeal(m.id)}
                    className="p-2 bg-slate-700 hover:bg-red-600/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors shrink-0"
                    aria-label="Usuń posiłek"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">kcal</label>
                    <input
                      type="number"
                      min="0"
                      value={m.calories || ''}
                      onChange={(e) => updateMeal(m.id, { calories: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-white rounded-lg px-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 mb-1 block">Białko (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={m.protein || ''}
                      onChange={(e) => updateMeal(m.id, { protein: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-white rounded-lg px-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-yellow-400 mb-1 block">Węgle (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={m.carbs || ''}
                      onChange={(e) => updateMeal(m.id, { carbs: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-white rounded-lg px-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-red-400 mb-1 block">Tłuszcz (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={m.fat || ''}
                      onChange={(e) => updateMeal(m.id, { fat: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-800 text-white rounded-lg px-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addMeal}
              className="w-full mt-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj posiłek
            </button>
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
              Treningi
            </label>

            {workouts.map((w, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={w.type}
                  onChange={(e) => updateWorkout(index, 'type', e.target.value)}
                  className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
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
                  onChange={(e) => updateWorkout(index, 'duration', e.target.value)}
                  placeholder="min"
                  className="w-20 bg-slate-800 text-white rounded-xl px-3 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeWorkout(index)}
                  className="p-3 bg-slate-700 hover:bg-red-600/50 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                  aria-label="Usuń trening"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addWorkout}
              className="w-full mt-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border-2 border-dashed border-slate-600 hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj trening
            </button>
          </div>

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
