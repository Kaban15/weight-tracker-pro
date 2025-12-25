"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Target, Plus, X, Edit2, Trash2,
  ChevronLeft, ChevronRight, Activity, Flame, Footprints,
  Dumbbell, LineChart, Award, LogOut, Table, TrendingDown,
  Scale, Clock, FileText, RotateCcw, AlertTriangle, Home
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import ProgressChart from './ProgressChart';
import ProgressTable from './ProgressTable';

// Types
interface Entry {
  id: string;
  date: string;
  weight: number;
  calories?: number;
  steps?: number;
  workout?: string;
  workout_duration?: number;
  notes?: string;
}

interface Goal {
  id?: string;
  current_weight: number;
  target_weight: number;
  target_date: string;
  start_date?: string;
  weekly_weight_loss?: number;
  daily_calories_limit?: number;
  daily_steps_goal?: number;
  weekly_training_hours?: number;
  monitoring_method?: string;
}

interface Stats {
  totalEntries: number;
  avgWeight: number;
  avgCalories: number;
  avgSteps: number;
  totalWorkouts: number;
  currentStreak: number;
  bestWeight: number;
  totalWeightChange: number;
}

interface Profile {
  id?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  activity_level?: number;
}

interface WeightTrackerProps {
  onBack?: () => void;
}

export default function WeightTracker({ onBack }: WeightTrackerProps) {
  const { user, signOut } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<'calendar' | 'stats' | 'table' | 'chart'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (goalData) {
        setGoal(goalData);
      }

      const { data: entriesData } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (entriesData) {
        setEntries(entriesData);
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save profile to Supabase
  const saveProfile = async (newProfile: Omit<Profile, 'id'>) => {
    if (!user) return;

    try {
      if (profile?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...newProfile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            ...newProfile,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save goal to Supabase
  const saveGoal = async (newGoal: Omit<Goal, 'id'>) => {
    if (!user) return;

    try {
      if (goal?.id) {
        const { data, error } = await supabase
          .from('goals')
          .update({
            ...newGoal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)
          .select()
          .single();

        if (error) throw error;
        if (data) setGoal(data);
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert({
            ...newGoal,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setGoal(data);
      }
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  // Reset plan (delete goal and optionally entries)
  const resetPlan = async (deleteEntries: boolean = false) => {
    if (!user || !goal?.id) return;

    const confirmMessage = deleteEntries
      ? 'Czy na pewno chcesz usunąć plan i WSZYSTKIE wpisy? Ta operacja jest nieodwracalna!'
      : 'Czy na pewno chcesz zresetować plan? Wpisy zostaną zachowane.';

    if (!confirm(confirmMessage)) return;

    try {
      // Delete goal
      const { error: goalError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goal.id);

      if (goalError) throw goalError;

      // Optionally delete all entries
      if (deleteEntries) {
        const { error: entriesError } = await supabase
          .from('entries')
          .delete()
          .eq('user_id', user.id);

        if (entriesError) throw entriesError;
        setEntries([]);
      }

      setGoal(null);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error resetting plan:', error);
    }
  };

  // Save entry to Supabase (one entry per day - update if exists)
  const saveEntry = async (entry: Omit<Entry, 'id'>) => {
    if (!user) return;

    try {
      // Check if entry for this date already exists
      const existingEntry = entries.find(e => e.date === entry.date);

      if (editingEntry || existingEntry) {
        // Update existing entry
        const entryId = editingEntry?.id || existingEntry?.id;
        const { data, error } = await supabase
          .from('entries')
          .update(entry)
          .eq('id', entryId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setEntries(entries.map(e => e.id === entryId ? data : e));
        }
      } else {
        // Insert new entry (only if no entry exists for this date)
        const { data, error } = await supabase
          .from('entries')
          .insert({
            ...entry,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setEntries([...entries, data]);
        }
      }
      setShowAddModal(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  // Delete entry
  const deleteEntry = async (id: string) => {
    if (confirm('Usunąć ten wpis?')) {
      try {
        const { error } = await supabase
          .from('entries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setEntries(entries.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const getEntryForDate = (date: string) => {
    return entries.find(e => e.date === date);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Stats calculations
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const calculateStats = (): Stats => {
    if (entries.length === 0) {
      return {
        totalEntries: 0, avgWeight: 0, avgCalories: 0, avgSteps: 0,
        totalWorkouts: 0, currentStreak: 0, bestWeight: 0, totalWeightChange: 0,
      };
    }

    const currentWeight = sortedEntries[sortedEntries.length - 1].weight;
    const startWeight = sortedEntries[0].weight;
    const entriesWithCalories = sortedEntries.filter(e => e.calories);
    const entriesWithSteps = sortedEntries.filter(e => e.steps);
    const entriesWithWorkout = sortedEntries.filter(e => e.workout);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = formatDate(checkDate);
      if (entries.some(e => e.date === dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalEntries: entries.length,
      avgWeight: sortedEntries.reduce((sum, e) => sum + e.weight, 0) / entries.length,
      avgCalories: entriesWithCalories.length > 0
        ? entriesWithCalories.reduce((sum, e) => sum + (e.calories || 0), 0) / entriesWithCalories.length : 0,
      avgSteps: entriesWithSteps.length > 0
        ? entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0) / entriesWithSteps.length : 0,
      totalWorkouts: entriesWithWorkout.length,
      currentStreak: streak,
      bestWeight: goal && goal.target_weight < startWeight
        ? Math.min(...sortedEntries.map(e => e.weight))
        : Math.max(...sortedEntries.map(e => e.weight)),
      totalWeightChange: currentWeight - startWeight,
    };
  };

  const stats = calculateStats();

  const currentWeight = sortedEntries.length > 0
    ? sortedEntries[sortedEntries.length - 1].weight
    : goal?.current_weight || 0;

  const startWeight = sortedEntries.length > 0
    ? sortedEntries[0].weight
    : goal?.current_weight || 0;

  const progress = goal
    ? ((startWeight - currentWeight) / (startWeight - goal.target_weight)) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Add Entry Modal
  const AddEntryModal = () => {
    const [weight, setWeight] = useState(editingEntry?.weight.toString() || '');
    const [calories, setCalories] = useState(editingEntry?.calories?.toString() || '');
    const [steps, setSteps] = useState(editingEntry?.steps?.toString() || '');
    const [workout, setWorkout] = useState(editingEntry?.workout || '');
    const [workoutDuration, setWorkoutDuration] = useState(editingEntry?.workout_duration?.toString() || '');
    const [notes, setNotes] = useState(editingEntry?.notes || '');
    const [date, setDate] = useState(editingEntry?.date || selectedDate || formatDate(new Date()));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      const w = parseFloat(weight);
      if (w > 0 && date) {
        setSaving(true);
        await saveEntry({
          date,
          weight: w,
          calories: calories ? parseInt(calories) : undefined,
          steps: steps ? parseInt(steps) : undefined,
          workout: workout || undefined,
          workout_duration: workoutDuration ? parseInt(workoutDuration) : undefined,
          notes: notes || undefined,
        });
        setSaving(false);
      }
    };

    // Calculate target weight for selected date
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
              {editingEntry ? 'Edytuj wpis' : 'Dodaj wpis'}
            </h2>
            <button onClick={() => { setShowAddModal(false); setEditingEntry(null); }} className="text-slate-400 hover:text-white">
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
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingEntry ? 'Zapisz zmiany' : 'Dodaj wpis')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Goal Modal
  const GoalModal = () => {
    const [step, setStep] = useState(1);
    const [currentWeightInput, setCurrentWeightInput] = useState(goal?.current_weight?.toString() || '');
    const [targetWeight, setTargetWeight] = useState(goal?.target_weight?.toString() || '');
    const [targetDate, setTargetDate] = useState(goal?.target_date || '');
    const [startDate, setStartDate] = useState(goal?.start_date || formatDate(new Date()));
    const [weeklyWeightLoss, setWeeklyWeightLoss] = useState(goal?.weekly_weight_loss?.toString() || '');
    const [dailyCalories, setDailyCalories] = useState(goal?.daily_calories_limit?.toString() || '');
    const [dailySteps, setDailySteps] = useState(goal?.daily_steps_goal?.toString() || '');
    const [weeklyTraining, setWeeklyTraining] = useState(goal?.weekly_training_hours?.toString() || '');
    const [monitoringMethod, setMonitoringMethod] = useState(goal?.monitoring_method || '');
    const [saving, setSaving] = useState(false);
    const [dateMode, setDateMode] = useState<'date' | 'days' | 'weeks' | 'months'>('date');
    const [durationValue, setDurationValue] = useState('');

    // User data for calorie calculation (load from profile if exists)
    const [age, setAge] = useState(profile?.age?.toString() || '');
    const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
    const [height, setHeight] = useState(profile?.height?.toString() || '');
    const [activityLevel, setActivityLevel] = useState(profile?.activity_level?.toString() || '1.2');

    // Calculate weekly loss and duration
    const cw = parseFloat(currentWeightInput) || 0;
    const tw = parseFloat(targetWeight) || 0;
    const totalLoss = cw - tw;

    // Calculate TDEE using Mifflin-St Jeor formula
    const calculateTDEE = () => {
      const w = cw; // current weight in kg
      const h = parseFloat(height) || 0; // height in cm
      const a = parseInt(age) || 0; // age in years
      const activity = parseFloat(activityLevel) || 1.2;
      const steps = parseInt(dailySteps) || 0;

      if (!w || !h || !a) return null;

      // BMR (Basal Metabolic Rate) - Mifflin-St Jeor
      let bmr: number;
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * a + 5;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * a - 161;
      }

      // TDEE with activity multiplier
      let tdee = bmr * activity;

      // Add calories from steps (approximately 0.04 kcal per step)
      const stepsCalories = steps * 0.04;
      tdee += stepsCalories;

      // Calculate deficit based on weekly weight loss goal
      const weeklyLoss = parseFloat(weeklyWeightLoss) || 0;
      // 1 kg of fat ≈ 7700 kcal, so weekly loss * 7700 / 7 days
      const dailyDeficit = (weeklyLoss * 7700) / 7;

      return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        stepsCalories: Math.round(stepsCalories),
        dailyDeficit: Math.round(dailyDeficit),
        targetCalories: Math.round(tdee - dailyDeficit),
      };
    };

    const calorieData = calculateTDEE();

    const calculateEndDate = () => {
      if (!weeklyWeightLoss || !startDate || totalLoss <= 0) return '';
      const weeks = totalLoss / parseFloat(weeklyWeightLoss);
      const end = new Date(startDate);
      end.setDate(end.getDate() + Math.ceil(weeks * 7));
      return formatDate(end);
    };

    const calculateWeeklyLoss = () => {
      if (!targetDate || !startDate || totalLoss <= 0) return '';
      const start = new Date(startDate);
      const end = new Date(targetDate);
      const weeks = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeks <= 0) return '';
      return (totalLoss / weeks).toFixed(2);
    };

    const calculateDateFromDuration = (value: string, mode: 'days' | 'weeks' | 'months') => {
      if (!value || !startDate || totalLoss <= 0) return;
      const num = parseInt(value);
      if (num <= 0) return;

      const start = new Date(startDate);
      const end = new Date(startDate);
      if (mode === 'days') {
        end.setDate(end.getDate() + num);
      } else if (mode === 'weeks') {
        end.setDate(end.getDate() + num * 7);
      } else if (mode === 'months') {
        end.setMonth(end.getMonth() + num);
      }

      setTargetDate(formatDate(end));

      // Calculate weekly loss using the new date directly (not stale state)
      const weeks = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeks > 0) {
        setWeeklyWeightLoss((totalLoss / weeks).toFixed(2));
      }
    };

    const handleSave = async () => {
      if (cw > 0 && tw > 0 && targetDate && startDate) {
        setSaving(true);

        // Save profile data if provided
        if (age || height) {
          await saveProfile({
            age: age ? parseInt(age) : undefined,
            gender: gender,
            height: height ? parseFloat(height) : undefined,
            activity_level: parseFloat(activityLevel),
          });
        }

        await saveGoal({
          current_weight: cw,
          target_weight: tw,
          target_date: targetDate,
          start_date: startDate,
          weekly_weight_loss: weeklyWeightLoss ? parseFloat(weeklyWeightLoss) : undefined,
          daily_calories_limit: dailyCalories ? parseInt(dailyCalories) : undefined,
          daily_steps_goal: dailySteps ? parseInt(dailySteps) : undefined,
          weekly_training_hours: weeklyTraining ? parseFloat(weeklyTraining) : undefined,
          monitoring_method: monitoringMethod || undefined,
        });
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border-2 border-emerald-500/20 my-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {step === 1 && 'Krok 1: Cel wagowy'}
              {step === 2 && 'Krok 2: Plan tygodniowy'}
              {step === 3 && 'Krok 3: Zasady dzienne'}
              {step === 4 && 'Krok 4: Monitorowanie'}
            </h2>
            <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  Aktualna waga (kg) *
                </label>
                <input type="number" step="0.1" value={currentWeightInput} onChange={(e) => setCurrentWeightInput(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                  <Target className="w-4 h-4 text-amber-400" />
                  Waga docelowa (kg) *
                </label>
                <input type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>

              {totalLoss > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-emerald-400">
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Do zrzucenia: <strong>{totalLoss.toFixed(1)} kg</strong>
                  </p>
                </div>
              )}

              <button onClick={() => setStep(2)} disabled={!currentWeightInput || !targetWeight || cw <= tw}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
                Dalej
              </button>

              {/* Reset options - only show when editing existing goal */}
              {goal?.id && (
                <div className="pt-4 mt-4 border-t border-slate-700">
                  <p className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Strefa niebezpieczna
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => resetPlan(false)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 px-4 rounded-xl transition-colors text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resetuj plan (zachowaj wpisy)
                    </button>
                    <button
                      onClick={() => resetPlan(true)}
                      className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2 px-4 rounded-xl transition-colors text-sm border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń plan i wszystkie wpisy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Data startu *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>

              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-3">Wybierz sposób planowania:</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 mb-2 font-semibold">
                      Tempo: kg na tydzień
                    </label>
                    <input type="number" step="0.1" value={weeklyWeightLoss}
                      onChange={(e) => {
                        setWeeklyWeightLoss(e.target.value);
                        if (e.target.value && startDate && totalLoss > 0) {
                          const weeks = totalLoss / parseFloat(e.target.value);
                          const end = new Date(startDate);
                          end.setDate(end.getDate() + Math.ceil(weeks * 7));
                          setTargetDate(formatDate(end));
                        }
                      }}
                      className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                  </div>

                  <p className="text-center text-slate-500">lub</p>

                  <div>
                    <label className="block text-slate-300 mb-2 font-semibold">
                      Data końcowa
                    </label>
                    <div className="flex gap-2 mb-3">
                      {[
                        { id: 'date', label: 'Data' },
                        { id: 'days', label: 'Dni' },
                        { id: 'weeks', label: 'Tygodnie' },
                        { id: 'months', label: 'Miesiące' },
                      ].map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setDateMode(id as typeof dateMode);
                            setDurationValue('');
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            dateMode === id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {dateMode === 'date' ? (
                      <input type="date" value={targetDate}
                        onChange={(e) => {
                          setTargetDate(e.target.value);
                          const calculated = calculateWeeklyLoss();
                          if (calculated) setWeeklyWeightLoss(calculated);
                        }}
                        className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                    ) : (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={durationValue}
                          onChange={(e) => {
                            setDurationValue(e.target.value);
                            if (e.target.value) {
                              calculateDateFromDuration(e.target.value, dateMode);
                            }
                          }}
                          className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
                        />
                        <span className="text-slate-400 text-sm min-w-[80px]">
                          {dateMode === 'days' && 'dni'}
                          {dateMode === 'weeks' && 'tygodni'}
                          {dateMode === 'months' && 'miesięcy'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {weeklyWeightLoss && targetDate && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-sm">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Plan: <strong>-{weeklyWeightLoss} kg/tydzień</strong> do {new Date(targetDate).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  Wstecz
                </button>
                <button onClick={() => setStep(3)} disabled={!targetDate || !startDate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
                  Dalej
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-2">Podaj dane do obliczenia zapotrzebowania kalorycznego:</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-2 font-semibold text-sm">Wiek (lata)</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 font-semibold text-sm">Wzrost (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold text-sm">Płeć</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setGender('male')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${gender === 'male' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    Mężczyzna
                  </button>
                  <button type="button" onClick={() => setGender('female')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${gender === 'female' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    Kobieta
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold text-sm">Poziom aktywności (bez kroków i treningu)</label>
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none">
                  <option value="1.2">Siedzący (praca biurowa)</option>
                  <option value="1.375">Lekko aktywny (1-2 treningi/tydz.)</option>
                  <option value="1.55">Umiarkowanie aktywny (3-4 treningi/tydz.)</option>
                  <option value="1.725">Bardzo aktywny (5-6 treningów/tydz.)</option>
                  <option value="1.9">Ekstremalnie aktywny (praca fizyczna + treningi)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                    <Footprints className="w-4 h-4 text-blue-400" />
                    Cel kroków/dzień
                  </label>
                  <input type="number" value={dailySteps} onChange={(e) => setDailySteps(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                    <Dumbbell className="w-4 h-4 text-purple-400" />
                    Trening h/tydz.
                  </label>
                  <input type="number" step="0.5" value={weeklyTraining} onChange={(e) => setWeeklyTraining(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
              </div>

              {calorieData && (
                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl space-y-3">
                  <p className="text-orange-400 font-semibold flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    Obliczone zapotrzebowanie
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">BMR (podstawowa przemiana):</div>
                    <div className="text-white font-medium">{calorieData.bmr} kcal</div>
                    <div className="text-slate-400">TDEE (całkowite spalanie):</div>
                    <div className="text-white font-medium">{calorieData.tdee} kcal</div>
                    {calorieData.stepsCalories > 0 && (
                      <>
                        <div className="text-slate-400">W tym z kroków:</div>
                        <div className="text-blue-400 font-medium">+{calorieData.stepsCalories} kcal</div>
                      </>
                    )}
                    <div className="text-slate-400">Deficyt do celu ({weeklyWeightLoss} kg/tydz.):</div>
                    <div className="text-red-400 font-medium">-{calorieData.dailyDeficit} kcal</div>
                  </div>
                  <div className="pt-3 border-t border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-400 font-bold">Twój dzienny limit:</span>
                      <span className="text-2xl font-bold text-white">{calorieData.targetCalories} kcal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDailyCalories(calorieData.targetCalories.toString())}
                      className="w-full mt-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 rounded-xl transition-colors text-sm"
                    >
                      Użyj tej wartości
                    </button>
                  </div>
                </div>
              )}

              {!calorieData && (
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <p className="text-slate-400 text-sm text-center">
                    Wypełnij wiek i wzrost, aby obliczyć zapotrzebowanie kaloryczne
                  </p>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Dzienny limit kalorii {dailyCalories && <span className="text-emerald-400">✓</span>}
                </label>
                <input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  Wstecz
                </button>
                <button onClick={() => setStep(4)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">
                  Dalej
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Metoda monitorowania
                </label>
                <textarea value={monitoringMethod} onChange={(e) => setMonitoringMethod(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none resize-none" />
              </div>

              {/* Summary */}
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2 text-sm">
                <p className="text-slate-400 font-semibold mb-2">Podsumowanie planu:</p>
                <p className="text-white">Cel: {currentWeightInput} kg → {targetWeight} kg</p>
                <p className="text-white">Tempo: -{weeklyWeightLoss || '?'} kg/tydzień</p>
                <p className="text-white">Data: {startDate && new Date(startDate).toLocaleDateString('pl-PL')} → {targetDate && new Date(targetDate).toLocaleDateString('pl-PL')}</p>
                {dailyCalories && <p className="text-orange-400">Kalorie: {dailyCalories}/dzień</p>}
                {dailySteps && <p className="text-blue-400">Kroki: {parseInt(dailySteps).toLocaleString()}/dzień</p>}
                {weeklyTraining && <p className="text-purple-400">Trening: {weeklyTraining}h/tydzień</p>}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  Wstecz
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center">
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Zapisz plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calendar View
  const CalendarView = () => {
    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronRight className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'].map(day => (
            <div key={day} className="text-center text-slate-400 font-semibold py-2">{day}</div>
          ))}

          {days.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;
            const dateStr = formatDate(day);
            const entry = getEntryForDate(dateStr);
            const isTodayDate = isToday(day);

            return (
              <button key={dateStr}
                onClick={() => {
                  if (entry) { setEditingEntry(entry); setShowAddModal(true); }
                  else { setSelectedDate(dateStr); setShowAddModal(true); }
                }}
                className={`min-h-[100px] rounded-xl p-2 transition-all
                  ${isTodayDate ? 'ring-2 ring-emerald-500' : ''}
                  ${entry ? 'bg-emerald-600/20 hover:bg-emerald-600/30' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                <div className="flex flex-col items-start h-full">
                  <span className={`text-sm mb-1 ${isTodayDate ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {day.getDate()}
                  </span>
                  {entry && (
                    <div className="text-xs space-y-1 w-full">
                      <div className="text-emerald-400 font-semibold">{entry.weight}kg</div>
                      {entry.calories && <div className="flex items-center gap-1 text-orange-400"><Flame className="w-3 h-3" /><span>{entry.calories}</span></div>}
                      {entry.steps && <div className="flex items-center gap-1 text-blue-400"><Footprints className="w-3 h-3" /><span>{(entry.steps / 1000).toFixed(0)}k</span></div>}
                      {entry.workout && <div className="flex items-center gap-1 text-purple-400"><Dumbbell className="w-3 h-3" /></div>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={() => { setSelectedDate(formatDate(new Date())); setShowAddModal(true); }}
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    );
  };

  // Stats View
  const StatsView = () => (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-xl p-6 border-2 border-emerald-500/20">
          <div className="text-emerald-400 text-sm mb-2 font-semibold">Aktualna waga</div>
          <div className="text-3xl font-bold text-white">{currentWeight.toFixed(1)} kg</div>
          <div className="text-slate-400 text-xs mt-1">{stats.totalWeightChange > 0 ? '+' : ''}{stats.totalWeightChange.toFixed(1)}kg od startu</div>
        </div>
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/10 rounded-xl p-6 border-2 border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400 text-sm mb-2 font-semibold"><Flame className="w-4 h-4" />Śr. kalorie</div>
          <div className="text-3xl font-bold text-white">{stats.avgCalories > 0 ? Math.round(stats.avgCalories) : '—'}</div>
          {goal?.daily_calories_limit && <div className="text-slate-400 text-xs mt-1">Cel: {goal.daily_calories_limit}/dzień</div>}
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-xl p-6 border-2 border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2 font-semibold"><Footprints className="w-4 h-4" />Śr. kroki</div>
          <div className="text-3xl font-bold text-white">{stats.avgSteps > 0 ? Math.round(stats.avgSteps).toLocaleString() : '—'}</div>
          {goal?.daily_steps_goal && <div className="text-slate-400 text-xs mt-1">Cel: {goal.daily_steps_goal.toLocaleString()}/dzień</div>}
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl p-6 border-2 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-2 font-semibold"><Dumbbell className="w-4 h-4" />Treningi</div>
          <div className="text-3xl font-bold text-white">{stats.totalWorkouts}</div>
          {goal?.weekly_training_hours && <div className="text-slate-400 text-xs mt-1">Cel: {goal.weekly_training_hours}h/tydz.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2 font-semibold"><Award className="w-5 h-5" />Seria</div>
          <div className="text-5xl font-bold text-white mb-2">{stats.currentStreak}</div>
          <div className="text-slate-400">dni z rzędu!</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2 font-semibold"><LineChart className="w-5 h-5" />Statystyki</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Wszystkie wpisy:</span><span className="text-white font-semibold">{stats.totalEntries}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Najlepsza waga:</span><span className="text-white font-semibold">{stats.bestWeight.toFixed(1)}kg</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Średnia waga:</span><span className="text-white font-semibold">{stats.avgWeight.toFixed(1)}kg</span></div>
          </div>
        </div>
      </div>

      {goal && (
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Postęp celu</h3>
            <button onClick={() => setShowGoalModal(true)} className="text-emerald-400 hover:text-emerald-300 text-sm">Edytuj</button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cel: {goal.target_weight}kg do {new Date(goal.target_date).toLocaleDateString('pl-PL')}</span>
              <span className="text-emerald-400 font-semibold">{Math.max(0, Math.min(100, progress)).toFixed(0)}%</span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Start: {goal.current_weight}kg</span>
              <span>Teraz: {currentWeight.toFixed(1)}kg</span>
              <span>Cel: {goal.target_weight}kg</span>
            </div>
          </div>
          {goal.monitoring_method && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm"><strong>Metoda monitorowania:</strong> {goal.monitoring_method}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Show goal setup if no goal
  if (!goal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Weight Tracker Pro</h1>
            <p className="text-slate-400">Śledź wagę, kalorie, kroki i treningi</p>
          </div>
          <button onClick={() => setShowGoalModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-colors">
            Ustal swój plan
          </button>
          <button onClick={signOut} className="w-full mt-4 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />Wyloguj się
          </button>
        </div>
        {showGoalModal && <GoalModal />}
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                <Home className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Progress Tracker</h1>
              <p className="text-slate-400 text-sm">Kompleksowe śledzenie postępów</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowGoalModal(true)} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">Edytuj plan</button>
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border-2 border-slate-700 overflow-x-auto">
          {[
            { id: 'calendar', icon: Calendar, label: 'Kalendarz' },
            { id: 'table', icon: Table, label: 'Tabela' },
            { id: 'chart', icon: LineChart, label: 'Wykres' },
            { id: 'stats', icon: Activity, label: 'Statystyki' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id as typeof view)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all min-w-[100px]
                ${view === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'calendar' && <CalendarView />}
      {view === 'table' && <div className="max-w-6xl mx-auto"><ProgressTable entries={entries} goal={goal} /></div>}
      {view === 'chart' && <div className="max-w-6xl mx-auto"><ProgressChart entries={entries} goal={goal} /></div>}
      {view === 'stats' && <StatsView />}

      {showAddModal && <AddEntryModal />}
      {showGoalModal && <GoalModal />}
    </div>
  );
}
