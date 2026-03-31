"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Goal, GoalHistory, GoalCompletionData, CompletionType, Stats, formatDate,
} from './types';

export function useGoals(
  userId: string | undefined,
  loading: boolean,
  currentWeight: number,
  stats: Stats,
  entriesLength: number,
  clearEntries: () => void,
) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);
  const [completionData, setCompletionData] = useState<GoalCompletionData | null>(null);
  const [completionHandled, setCompletionHandled] = useState(false);

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
        clearEntries();
      }

      setGoal(null);
      return true;
    } catch {
      return false;
    }
  };

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

  const archiveGoalToHistory = useCallback(async (completion: GoalCompletionData): Promise<boolean> => {
    if (!userId || !supabase || !completion.goal.id) {
      return false;
    }

    try {
      const startDate = new Date(completion.goal.start_date || completion.goal.target_date);
      const completedAt = new Date();
      const durationDays = Math.ceil((completedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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

      const { error: historyError } = await supabase
        .from('goal_history')
        .insert(historyRecord);

      if (historyError) throw historyError;

      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('id', completion.goal.id);

      if (deleteError) throw deleteError;

      setGoal(null);
      await fetchGoalHistory();
      return true;
    } catch {
      return false;
    }
  }, [userId, fetchGoalHistory]);

  const clearCompletionData = useCallback(() => {
    setCompletionData(null);
    setCompletionHandled(true);
  }, []);

  // Check for goal completion
  useEffect(() => {
    if (loading || !goal || completionHandled || entriesLength === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(goal.target_date);
    targetDate.setHours(0, 0, 0, 0);

    const targetReached = currentWeight <= goal.target_weight + 0.05;
    const datePassed = today > targetDate;

    if (targetReached || datePassed) {
      const completionType: CompletionType = targetReached ? 'target_reached' : 'date_passed';
      setCompletionData({
        goal,
        stats,
        completionType,
        finalWeight: currentWeight,
      });
    }
  }, [loading, goal, currentWeight, stats, entriesLength, completionHandled]);

  return {
    goal,
    setGoal,
    goalHistory,
    completionData,
    saveGoal,
    resetPlan,
    fetchGoalHistory,
    archiveGoalToHistory,
    clearCompletionData,
  };
}
