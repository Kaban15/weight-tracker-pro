"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Entry, Goal, Stats, Profile, formatDate } from './types';

export function useWeightTracker(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (goalData) setGoal(goalData);

      const { data: entriesData } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (entriesData) setEntries(entriesData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) setProfile(profileData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveProfile = async (newProfile: Omit<Profile, 'id'>) => {
    if (!userId) return;

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
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const saveGoal = async (newGoal: Omit<Goal, 'id'>): Promise<boolean> => {
    if (!userId) return false;

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
    } catch (error) {
      console.error('Error saving goal:', error);
      return false;
    }
  };

  const resetPlan = async (deleteEntries: boolean = false): Promise<boolean> => {
    if (!userId || !goal?.id) return false;

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
    } catch (error) {
      console.error('Error resetting plan:', error);
      return false;
    }
  };

  const saveEntry = async (entry: Omit<Entry, 'id'>, editingEntryId?: string): Promise<boolean> => {
    if (!userId) return false;

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
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  };

  const getEntryForDate = (date: string): Entry | undefined => {
    return entries.find(e => e.date === date);
  };

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

  const currentWeight = sortedEntries.length > 0
    ? sortedEntries[sortedEntries.length - 1].weight
    : goal?.current_weight || 0;

  const startWeight = sortedEntries.length > 0
    ? sortedEntries[0].weight
    : goal?.current_weight || 0;

  const progress = goal
    ? ((startWeight - currentWeight) / (startWeight - goal.target_weight)) * 100
    : 0;

  return {
    entries,
    sortedEntries,
    goal,
    profile,
    loading,
    stats: calculateStats(),
    currentWeight,
    startWeight,
    progress,
    saveProfile,
    saveGoal,
    resetPlan,
    saveEntry,
    deleteEntry,
    getEntryForDate,
  };
}
