"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Entry, Goal, Stats, Profile, GoalHistory, GoalCompletionData, CompletionType, formatDate } from './types';

// Load last N days of entries initially for better performance
const INITIAL_DAYS_TO_LOAD = 365;
const ENTRIES_PER_PAGE = 100;

export function useWeightTracker(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<string | null>(null);

  // Goal completion and history state
  const [completionData, setCompletionData] = useState<GoalCompletionData | null>(null);
  const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);
  const [completionHandled, setCompletionHandled] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !supabase) return;

    try {
      // Calculate date range - load last year initially
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - INITIAL_DAYS_TO_LOAD);
      const cutoffDateStr = formatDate(cutoffDate);

      // Parallel fetch for better performance
      const [goalResult, entriesResult, profileResult, countResult, historyResult] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', userId)
          .gte('date', cutoffDateStr)
          .order('date', { ascending: true })
          .limit(ENTRIES_PER_PAGE * 4), // Max 400 entries initially
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        // Check if there are older entries
        supabase
          .from('entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .lt('date', cutoffDateStr),
        // Fetch goal history
        supabase
          .from('goal_history')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
      ]);

      if (goalResult.data) setGoal(goalResult.data);
      if (profileResult.data) setProfile(profileResult.data);
      if (historyResult.data) setGoalHistory(historyResult.data);

      if (entriesResult.data) {
        setEntries(entriesResult.data);
        if (entriesResult.data.length > 0) {
          setOldestLoadedDate(entriesResult.data[0].date);
        }
      }

      // Check if there are more entries to load
      setHasMoreEntries((countResult.count ?? 0) > 0);
    } catch {
      // Error handled silently - data will be empty
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load older entries on demand
  const loadMoreEntries = useCallback(async () => {
    if (!userId || !supabase || !oldestLoadedDate || loadingMore) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .lt('date', oldestLoadedDate)
        .order('date', { ascending: false })
        .limit(ENTRIES_PER_PAGE);

      if (error) throw error;

      if (data && data.length > 0) {
        // Reverse to maintain ascending order and prepend
        const olderEntries = data.reverse();
        setEntries(prev => [...olderEntries, ...prev]);
        setOldestLoadedDate(olderEntries[0].date);
        setHasMoreEntries(data.length === ENTRIES_PER_PAGE);
      } else {
        setHasMoreEntries(false);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoadingMore(false);
    }
  }, [userId, oldestLoadedDate, loadingMore]);

  // Load all entries at once (for export, etc.)
  const loadAllEntries = useCallback(async (): Promise<Entry[]> => {
    if (!userId || !supabase || !hasMoreEntries) return entries;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        setEntries(data);
        setHasMoreEntries(false);
        if (data.length > 0) {
          setOldestLoadedDate(data[0].date);
        }
        return data;
      }
      return entries;
    } catch {
      // Error handled silently
      return entries;
    } finally {
      setLoadingMore(false);
    }
  }, [userId, hasMoreEntries, entries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveProfile = async (newProfile: Omit<Profile, 'id'>) => {
    if (!userId || !supabase) return;

    try {
      if (profile?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ ...newProfile, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({ ...newProfile, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      }
    } catch {
      // Error handled silently
    }
  };

  const saveGoal = async (newGoal: Omit<Goal, 'id'>): Promise<boolean> => {
    if (!userId || !supabase) return false;

    try {
      if (goal?.id) {
        const { data, error } = await supabase
          .from('goals')
          .update({ ...newGoal, updated_at: new Date().toISOString() })
          .eq('id', goal.id)
          .select()
          .single();

        if (error) throw error;
        if (data) setGoal(data);
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert({ ...newGoal, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        if (data) setGoal(data);
      }
      return true;
    } catch {
      return false;
    }
  };

  const resetPlan = async (deleteEntries: boolean = false): Promise<boolean> => {
    if (!userId || !supabase || !goal?.id) return false;

    const confirmMessage = deleteEntries
      ? 'Czy na pewno chcesz usunąć plan i WSZYSTKIE wpisy? Ta operacja jest nieodwracalna!'
      : 'Czy na pewno chcesz zresetować plan? Wpisy zostaną zachowane.';

    if (!confirm(confirmMessage)) return false;

    try {
      const { error: goalError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goal.id);

      if (goalError) throw goalError;

      if (deleteEntries) {
        const { error: entriesError } = await supabase
          .from('entries')
          .delete()
          .eq('user_id', userId);

        if (entriesError) throw entriesError;
        setEntries([]);
      }

      setGoal(null);
      return true;
    } catch {
      return false;
    }
  };

  const saveEntry = async (entry: Omit<Entry, 'id'>, editingEntryId?: string): Promise<boolean> => {
    if (!userId || !supabase) return false;

    try {
      const existingEntry = entries.find(e => e.date === entry.date);

      if (editingEntryId || existingEntry) {
        const entryId = editingEntryId || existingEntry?.id;
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
        const { data, error } = await supabase
          .from('entries')
          .insert({ ...entry, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setEntries([...entries, data]);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  const getEntryForDate = useCallback((date: string): Entry | undefined => {
    return entries.find(e => e.date === date);
  }, [entries]);

  // Refresh goal history
  const fetchGoalHistory = useCallback(async () => {
    if (!userId || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('goal_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (data) setGoalHistory(data);
    } catch {
      // Error handled silently
    }
  }, [userId]);

  // Clear completion data after handling
  const clearCompletionData = useCallback(() => {
    setCompletionData(null);
    setCompletionHandled(true);
  }, []);

  // Memoize sorted entries to avoid recalculation on every render
  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries]
  );

  // Memoize stats calculation
  const stats = useMemo((): Stats => {
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
  }, [entries, sortedEntries, goal]);

  // Memoize derived values
  const currentWeight = useMemo(() =>
    sortedEntries.length > 0
      ? sortedEntries[sortedEntries.length - 1].weight
      : goal?.current_weight || 0,
    [sortedEntries, goal?.current_weight]
  );

  const startWeight = useMemo(() =>
    sortedEntries.length > 0
      ? sortedEntries[0].weight
      : goal?.current_weight || 0,
    [sortedEntries, goal?.current_weight]
  );

  const progress = useMemo(() => {
    if (!goal) return 0;
    const weightDiff = startWeight - goal.target_weight;
    // Avoid division by zero when startWeight equals target
    if (weightDiff === 0) return currentWeight === goal.target_weight ? 100 : 0;
    return ((startWeight - currentWeight) / weightDiff) * 100;
  }, [goal, startWeight, currentWeight]);

  // Archive goal to history
  const archiveGoalToHistory = useCallback(async (completion: GoalCompletionData): Promise<boolean> => {
    console.log('[Archive] Starting archive...', { userId, hasSupabase: !!supabase, goalId: completion.goal.id });
    if (!userId || !supabase || !completion.goal.id) {
      console.log('[Archive] Missing required data');
      return false;
    }

    try {
      // Calculate duration in days
      const startDate = new Date(completion.goal.start_date || completion.goal.target_date);
      const completedAt = new Date();
      const durationDays = Math.ceil((completedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate progress percentage
      const weightDiff = completion.goal.current_weight - completion.goal.target_weight;
      const progressPct = weightDiff > 0
        ? ((completion.goal.current_weight - completion.finalWeight) / weightDiff) * 100
        : 100;

      const historyRecord = {
        user_id: userId,
        original_goal_id: completion.goal.id,
        current_weight: completion.goal.current_weight,
        target_weight: completion.goal.target_weight,
        start_date: completion.goal.start_date || formatDate(new Date()),
        target_date: completion.goal.target_date,
        weekly_weight_loss: completion.goal.weekly_weight_loss,
        daily_calories_limit: completion.goal.daily_calories_limit,
        daily_steps_goal: completion.goal.daily_steps_goal,
        weekly_training_hours: completion.goal.weekly_training_hours,
        monitoring_method: completion.goal.monitoring_method,
        completion_type: completion.completionType,
        completed_at: completedAt.toISOString(),
        final_weight: completion.finalWeight,
        weight_lost: completion.goal.current_weight - completion.finalWeight,
        progress_percentage: Math.max(0, Math.min(100, progressPct)),
        total_entries: completion.stats.totalEntries,
        total_workouts: completion.stats.totalWorkouts,
        avg_calories: completion.stats.avgCalories || null,
        avg_steps: completion.stats.avgSteps ? Math.round(completion.stats.avgSteps) : null,
        best_weight: completion.stats.bestWeight,
        current_streak: completion.stats.currentStreak,
        duration_days: Math.max(1, durationDays),
      };

      // Insert into history
      console.log('[Archive] Inserting into goal_history...', historyRecord);
      const { error: historyError } = await supabase
        .from('goal_history')
        .insert(historyRecord);

      if (historyError) {
        console.error('[Archive] Insert failed:', historyError);
        throw historyError;
      }
      console.log('[Archive] Insert successful');

      // Delete the current goal
      console.log('[Archive] Deleting goal...');
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('id', completion.goal.id);

      if (deleteError) {
        console.error('[Archive] Delete failed:', deleteError);
        throw deleteError;
      }
      console.log('[Archive] Delete successful');

      setGoal(null);
      await fetchGoalHistory();
      console.log('[Archive] Complete!');
      return true;
    } catch (error) {
      console.error('[Archive] Failed to archive goal:', error);
      return false;
    }
  }, [userId, fetchGoalHistory]);

  // Check for goal completion
  useEffect(() => {
    // Debug logging
    console.log('[GoalCompletion] Check:', {
      loading,
      hasGoal: !!goal,
      goalTargetDate: goal?.target_date,
      completionHandled,
      entriesCount: entries.length,
      currentWeight
    });

    if (loading || !goal || completionHandled || entries.length === 0) {
      console.log('[GoalCompletion] Skipping - conditions not met');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(goal.target_date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if target weight reached (with small margin)
    const targetReached = currentWeight <= goal.target_weight + 0.05;

    // Check if target date passed
    const datePassed = today > targetDate;

    console.log('[GoalCompletion] Evaluation:', {
      today: today.toISOString(),
      targetDate: targetDate.toISOString(),
      targetWeight: goal.target_weight,
      currentWeight,
      targetReached,
      datePassed
    });

    if (targetReached || datePassed) {
      const completionType: CompletionType = targetReached ? 'target_reached' : 'date_passed';
      console.log('[GoalCompletion] TRIGGERED!', completionType);
      setCompletionData({
        goal,
        stats,
        completionType,
        finalWeight: currentWeight
      });
    }
  }, [loading, goal, currentWeight, stats, entries.length, completionHandled]);

  return {
    entries,
    sortedEntries,
    goal,
    profile,
    loading,
    loadingMore,
    hasMoreEntries,
    stats,
    currentWeight,
    startWeight,
    progress,
    saveProfile,
    saveGoal,
    resetPlan,
    saveEntry,
    deleteEntry,
    getEntryForDate,
    loadMoreEntries,
    loadAllEntries,
    // Goal completion and history
    completionData,
    goalHistory,
    archiveGoalToHistory,
    fetchGoalHistory,
    clearCompletionData,
  };
}
