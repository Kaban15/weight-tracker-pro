"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Challenge, ChallengeRow, ChallengeProgress, ChallengeFormData, DEFAULT_FORM_DATA } from "./types";
import { formatDate } from "./utils/dateUtils";

export function calculateEndDate(startDate: Date, durationType: string, durationValue: number): Date {
  const endDate = new Date(startDate);
  switch (durationType) {
    case 'days': endDate.setDate(endDate.getDate() + durationValue - 1); break;
    case 'weeks': endDate.setDate(endDate.getDate() + (durationValue * 7) - 1); break;
    case 'months': endDate.setMonth(endDate.getMonth() + durationValue); endDate.setDate(endDate.getDate() - 1); break;
    case 'year': endDate.setFullYear(endDate.getFullYear() + 1); endDate.setDate(endDate.getDate() - 1); break;
  }
  return endDate;
}

export function getChallengeProgress(challenge: Challenge): ChallengeProgress {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const completedCount = Object.keys(challenge.completedDays).length;
  const totalReps = Object.values(challenge.completedDays).reduce((sum, r) => sum + r, 0);
  const percentage = Math.round((completedCount / totalDays) * 100);
  const isCompleted = today > end;

  // Calculate streak (create new Date objects to avoid mutation bugs)
  let streak = 0;
  let checkDate = new Date(today);
  while (true) {
    const dateStr = formatDate(checkDate);
    if (challenge.completedDays[dateStr]) {
      streak++;
      checkDate = new Date(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (streak === 0 && checkDate.toDateString() === today.toDateString()) {
      checkDate = new Date(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { totalDays, completedCount, totalReps, percentage, isCompleted, streak };
}

export function useChallenges(userId: string | undefined) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const localStorageKey = `challenges_v3_${userId}`;
  const migrationKey = `challenges_migrated_${userId}`;

  const rowToChallenge = (row: ChallengeRow): Challenge => ({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    trackReps: row.track_reps,
    dailyGoals: row.daily_goals || {},
    goalUnit: row.goal_unit,
    completedDays: row.completed_days || {}
  });

  const loadChallenges = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setSyncError(null);

      // Check if we need to migrate from localStorage
      const hasMigrated = localStorage.getItem(migrationKey);
      if (!hasMigrated) {
        const localData = localStorage.getItem(localStorageKey);
        if (localData) {
          const localChallenges: Challenge[] = JSON.parse(localData);
          if (localChallenges.length > 0) {
            for (const challenge of localChallenges) {
              await supabase.from('challenges').upsert({
                id: challenge.id,
                user_id: userId,
                name: challenge.name,
                start_date: challenge.startDate,
                end_date: challenge.endDate,
                track_reps: challenge.trackReps,
                completed_days: challenge.completedDays
              });
            }
          }
        }
        localStorage.setItem(migrationKey, 'true');
      }

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChallenges((data || []).map(rowToChallenge));
    } catch (error) {
      console.error('Error loading challenges:', error);
      setSyncError('Błąd ładowania danych');
      const localData = localStorage.getItem(localStorageKey);
      if (localData) {
        setChallenges(JSON.parse(localData));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, localStorageKey, migrationKey]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const createChallenge = async (formData: ChallengeFormData): Promise<Challenge | null> => {
    if (!userId) return null;

    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (formData.dateMode === 'dates') {
      startDate = formData.startDate || formatDate(today);
      endDate = formData.endDate || formatDate(today);
    } else {
      const startDateObj = formData.startDate ? new Date(formData.startDate) : today;
      startDate = formatDate(startDateObj);
      endDate = formatDate(calculateEndDate(startDateObj, formData.durationType, formData.durationValue));
    }

    // Populate dailyGoals with default goal for each day if defaultGoal > 0
    const dailyGoals: { [date: string]: number } = {};
    if (formData.trackReps && formData.defaultGoal > 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Create new Date object in each iteration to avoid mutation bugs
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
        dailyGoals[formatDate(d)] = formData.defaultGoal;
      }
    }

    const newChallenge: Challenge = {
      id: crypto.randomUUID(),
      name: formData.name.trim() || 'Nowe wyzwanie',
      startDate,
      endDate,
      trackReps: formData.trackReps,
      dailyGoals,
      goalUnit: formData.trackReps ? formData.goalUnit : undefined,
      completedDays: {}
    };

    setChallenges(prev => [newChallenge, ...prev]);

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('challenges').insert({
        id: newChallenge.id,
        user_id: userId,
        name: newChallenge.name,
        start_date: newChallenge.startDate,
        end_date: newChallenge.endDate,
        track_reps: newChallenge.trackReps,
        daily_goals: newChallenge.dailyGoals,
        goal_unit: newChallenge.goalUnit,
        completed_days: newChallenge.completedDays
      });

      if (error) throw error;
      setSyncError(null);
      return newChallenge;
    } catch (error) {
      console.error('Error creating challenge:', error);
      setSyncError('Błąd zapisu');
      return newChallenge;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateChallenge = async (challengeId: string, formData: ChallengeFormData): Promise<void> => {
    if (!userId) return;

    let endDate: string;
    if (formData.dateMode === 'dates') {
      endDate = formData.endDate;
    } else {
      const startDateObj = new Date(formData.startDate);
      endDate = formatDate(calculateEndDate(startDateObj, formData.durationType, formData.durationValue));
    }

    const existingChallenge = challenges.find(c => c.id === challengeId);
    if (!existingChallenge) return;

    const updatedChallenge = {
      ...existingChallenge,
      name: formData.name.trim() || existingChallenge.name,
      startDate: formData.startDate,
      endDate,
      trackReps: formData.trackReps,
      goalUnit: formData.trackReps ? formData.goalUnit : undefined
    };

    setChallenges(prev => prev.map(c => c.id === challengeId ? updatedChallenge : c));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('challenges')
        .update({
          name: updatedChallenge.name,
          start_date: updatedChallenge.startDate,
          end_date: updatedChallenge.endDate,
          track_reps: updatedChallenge.trackReps,
          goal_unit: updatedChallenge.goalUnit
        })
        .eq('id', challengeId);

      if (error) throw error;
      setSyncError(null);
    } catch (error) {
      console.error('Error updating challenge:', error);
      setSyncError('Błąd zapisu');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteChallenge = async (id: string): Promise<void> => {
    setChallenges(prev => prev.filter(c => c.id !== id));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('challenges').delete().eq('id', id);

      if (error) throw error;
      setSyncError(null);
    } catch (error) {
      console.error('Error deleting challenge:', error);
      setSyncError('Błąd usuwania');
      loadChallenges();
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCompletedDays = async (challengeId: string, completedDays: { [date: string]: number }): Promise<void> => {
    setChallenges(prev => prev.map(c =>
      c.id === challengeId ? { ...c, completedDays } : c
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('challenges')
        .update({ completed_days: completedDays })
        .eq('id', challengeId);

      if (error) throw error;
      setSyncError(null);
    } catch (error) {
      console.error('Error syncing completed days:', error);
      setSyncError('Błąd synchronizacji');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateDailyGoals = async (challengeId: string, dailyGoals: { [date: string]: number }): Promise<void> => {
    setChallenges(prev => prev.map(c =>
      c.id === challengeId ? { ...c, dailyGoals } : c
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('challenges')
        .update({ daily_goals: dailyGoals })
        .eq('id', challengeId);

      if (error) throw error;
      setSyncError(null);
    } catch (error) {
      console.error('Error syncing daily goals:', error);
      setSyncError('Błąd synchronizacji');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    challenges,
    isLoading,
    isSyncing,
    syncError,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    updateCompletedDays,
    updateDailyGoals
  };
}
