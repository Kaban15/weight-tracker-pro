"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Entry, Stats, formatDate } from './types';
import { useProfile } from './useProfile';
import { useGoals } from './useGoals';

// Load last N days of entries initially for better performance
const INITIAL_DAYS_TO_LOAD = 365;
const ENTRIES_PER_PAGE = 100;

export function useWeightTracker(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<string | null>(null);

  const { profile, setProfile, saveProfile } = useProfile(userId);

  // Memoize sorted entries
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries],
  );

  // Memoize derived weights (before useGoals, which needs them)
  const currentWeight = useMemo(
    () => (sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].weight : 0),
    [sortedEntries],
  );

  const startWeight = useMemo(
    () => (sortedEntries.length > 0 ? sortedEntries[0].weight : 0),
    [sortedEntries],
  );

  // Memoize stats (needed before useGoals to pass in)
  const statsBase = useMemo((): Stats => {
    if (entries.length === 0) {
      return {
        totalEntries: 0, avgWeight: 0, avgCalories: 0, avgSteps: 0,
        totalWorkouts: 0, currentStreak: 0, bestWeight: 0, totalWeightChange: 0,
      };
    }
    const entriesWithCalories = sortedEntries.filter(e => e.calories);
    const entriesWithSteps = sortedEntries.filter(e => e.steps);
    const countWorkouts = (entry: Entry): number => {
      if (entry.workouts && entry.workouts.length > 0) return entry.workouts.filter(w => w.type).length;
      return entry.workout ? 1 : 0;
    };
    const totalWorkoutsCount = sortedEntries.reduce((sum, e) => sum + countWorkouts(e), 0);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      if (entries.some(e => e.date === formatDate(checkDate))) {
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
      totalWorkouts: totalWorkoutsCount,
      currentStreak: streak,
      bestWeight: currentWeight, // placeholder; overridden below with goal context
      totalWeightChange: currentWeight - startWeight,
    };
  }, [entries, sortedEntries, currentWeight, startWeight]);

  const clearEntries = useCallback(() => setEntries([]), []);

  const {
    goal,
    setGoal,
    goalHistory,
    completionData,
    saveGoal,
    resetPlan,
    fetchGoalHistory,
    archiveGoalToHistory,
    clearCompletionData,
  } = useGoals(userId, loading, currentWeight, statsBase, entries.length, clearEntries);

  // Full stats with goal-dependent bestWeight
  const stats = useMemo((): Stats => {
    if (entries.length === 0) return statsBase;
    return {
      ...statsBase,
      bestWeight: goal && goal.target_weight < startWeight
        ? Math.min(...sortedEntries.map(e => e.weight))
        : Math.max(...sortedEntries.map(e => e.weight)),
    };
  }, [statsBase, goal, startWeight, sortedEntries, entries.length]);

  // currentWeight / startWeight with goal fallback (for display when no entries)
  const currentWeightFinal = useMemo(
    () => (sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].weight : goal?.current_weight || 0),
    [sortedEntries, goal?.current_weight],
  );

  const startWeightFinal = useMemo(
    () => (sortedEntries.length > 0 ? sortedEntries[0].weight : goal?.current_weight || 0),
    [sortedEntries, goal?.current_weight],
  );

  const progress = useMemo(() => {
    if (!goal) return 0;
    const weightDiff = startWeightFinal - goal.target_weight;
    if (weightDiff === 0) return currentWeightFinal === goal.target_weight ? 100 : 0;
    return ((startWeightFinal - currentWeightFinal) / weightDiff) * 100;
  }, [goal, startWeightFinal, currentWeightFinal]);

  const fetchData = useCallback(async () => {
    if (!userId || !supabase) return;
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - INITIAL_DAYS_TO_LOAD);
      const cutoffDateStr = formatDate(cutoffDate);
      // Parallel fetch for better performance
      const [goalResult, entriesResult, profileResult, countResult] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', userId).single(),
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', userId)
          .gte('date', cutoffDateStr)
          .order('date', { ascending: true })
          .limit(ENTRIES_PER_PAGE * 4),
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase
          .from('entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .lt('date', cutoffDateStr),
      ]);
      if (goalResult.data) setGoal(goalResult.data);
      if (profileResult.data) setProfile(profileResult.data);
      if (entriesResult.data) {
        setEntries(entriesResult.data);
        if (entriesResult.data.length > 0) setOldestLoadedDate(entriesResult.data[0].date);
      }
      setHasMoreEntries((countResult.count ?? 0) > 0);
      // goalHistory state lives in useGoals — seed it
      await fetchGoalHistory();
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [userId, setGoal, setProfile, fetchGoalHistory]);

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
        if (data.length > 0) setOldestLoadedDate(data[0].date);
        return data;
      }
      return entries;
    } catch {
      return entries;
    } finally {
      setLoadingMore(false);
    }
  }, [userId, hasMoreEntries, entries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        if (data) setEntries(entries.map(e => (e.id === entryId ? data : e)));
      } else {
        const { data, error } = await supabase
          .from('entries')
          .insert({ ...entry, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        if (data) setEntries([...entries, data]);
      }
      return true;
    } catch {
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  const getEntryForDate = useCallback(
    (date: string): Entry | undefined => entries.find(e => e.date === date),
    [entries],
  );

  return {
    entries,
    sortedEntries,
    goal,
    profile,
    loading,
    loadingMore,
    hasMoreEntries,
    stats,
    currentWeight: currentWeightFinal,
    startWeight: startWeightFinal,
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
