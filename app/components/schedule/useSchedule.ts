"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTasks } from "../todo";
import { useChallenges, formatDate } from "../challenge";
import { ScheduleItem, ScheduleStats, CustomScheduleItem } from "./types";
import { supabase } from "@/lib/supabase";

export function useSchedule(userId: string | undefined) {
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [customItems, setCustomItems] = useState<CustomScheduleItem[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);

  // Get data from other modules
  const { tasks: todoTasks, toggleComplete: toggleTodo, isLoading: isLoadingTodo } = useTasks(userId);
  const {
    challenges,
    updateCompletedDay,
    isLoading: isLoadingChallenges,
    isSyncing: isSyncingChallenges,
    syncError: syncErrorChallenges
  } = useChallenges(userId);

  // Load custom items from Supabase
  const loadCustomItems = useCallback(async () => {
    if (!userId) {
      setIsLoadingCustom(false);
      return;
    }

    // Check if we're in browser
    if (typeof window === "undefined") {
      setIsLoadingCustom(false);
      return;
    }

    if (!supabase) {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(`schedule_custom_${userId}`);
        if (stored) {
          setCustomItems(JSON.parse(stored));
        }
      } catch {
        // Ignore
      }
      setIsLoadingCustom(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setCustomItems(data || []);
    } catch {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(`schedule_custom_${userId}`);
        if (stored) {
          setCustomItems(JSON.parse(stored));
        }
      } catch {
        // Ignore
      }
    } finally {
      setIsLoadingCustom(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCustomItems();
  }, [loadCustomItems]);

  // Save custom items
  const saveCustomItems = useCallback(async (items: CustomScheduleItem[]) => {
    if (!userId || typeof window === "undefined") return;

    // Save to localStorage as backup
    try {
      localStorage.setItem(`schedule_custom_${userId}`, JSON.stringify(items));
    } catch {
      // Ignore localStorage errors
    }

    // Try to save to Supabase
    if (supabase) {
      try {
        // This is a simplified approach - in production you'd want proper upsert
        await supabase.from('schedule_items').upsert(items);
      } catch {
        // Ignore Supabase errors, localStorage is our backup
      }
    }
  }, [userId]);

  // Convert todo tasks to schedule items
  const todoItems: ScheduleItem[] = useMemo(() => {
    return todoTasks
      .filter(task => task.deadline === selectedDate && task.status !== 'cancelled')
      .map(task => ({
        id: `todo_${task.id}`,
        title: task.title,
        type: 'todo' as const,
        completed: task.completed || task.status === 'done',
        date: task.deadline,
        sourceId: task.id,
        priority: task.priority,
        category: task.category,
        notes: task.notes,
      }));
  }, [todoTasks, selectedDate]);

  // Convert challenges to schedule items
  const challengeItems: ScheduleItem[] = useMemo(() => {
    return challenges
      .filter(challenge => {
        return selectedDate >= challenge.startDate && selectedDate <= challenge.endDate;
      })
      .map(challenge => {
        const reps = challenge.completedDays[selectedDate] || 0;
        const goalReps = challenge.dailyGoals?.[selectedDate] || 0;
        const completed = challenge.trackReps
          ? (goalReps > 0 ? reps >= goalReps : reps > 0)
          : reps > 0;

        return {
          id: `challenge_${challenge.id}`,
          title: challenge.name,
          type: 'challenge' as const,
          completed,
          date: selectedDate,
          sourceId: challenge.id,
          reps,
          goalReps,
          goalUnit: challenge.goalUnit,
          trackReps: challenge.trackReps,
        };
      });
  }, [challenges, selectedDate]);

  // Convert custom items to schedule items
  const customScheduleItems: ScheduleItem[] = useMemo(() => {
    return customItems
      .filter(item => item.date === selectedDate)
      .map(item => ({
        id: `custom_${item.id}`,
        title: item.title,
        type: 'custom' as const,
        completed: item.completed,
        date: item.date,
        sourceId: item.id,
      }));
  }, [customItems, selectedDate]);

  // Combine all items
  const allItems: ScheduleItem[] = useMemo(() => {
    return [...todoItems, ...challengeItems, ...customScheduleItems];
  }, [todoItems, challengeItems, customScheduleItems]);

  // Calculate stats
  const stats: ScheduleStats = useMemo(() => {
    return {
      total: allItems.length,
      completed: allItems.filter(i => i.completed).length,
      todos: todoItems.length,
      challenges: challengeItems.length,
      custom: customScheduleItems.length,
    };
  }, [allItems, todoItems, challengeItems, customScheduleItems]);

  // Toggle item completion
  const toggleItem = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'todo' && item.sourceId) {
      toggleTodo(item.sourceId);
    } else if (item.type === 'challenge' && item.sourceId) {
      // For challenges, toggle between 0 and 1 (or goalReps)
      const newReps = item.completed ? null : (item.goalReps || 1);
      await updateCompletedDay(item.sourceId, selectedDate, newReps);
    } else if (item.type === 'custom' && item.sourceId) {
      setCustomItems(prev => {
        const updated = prev.map(i =>
          i.id === item.sourceId
            ? { ...i, completed: !i.completed, updated_at: new Date().toISOString() }
            : i
        );
        saveCustomItems(updated);
        return updated;
      });
    }
  }, [toggleTodo, updateCompletedDay, selectedDate, saveCustomItems]);

  // Add custom item
  const addCustomItem = useCallback(async (title: string) => {
    if (!userId || !title.trim()) return;

    const newItem: CustomScheduleItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      date: selectedDate,
      title: title.trim(),
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCustomItems(prev => {
      const updated = [...prev, newItem];
      saveCustomItems(updated);
      return updated;
    });
  }, [userId, selectedDate, saveCustomItems]);

  // Delete custom item
  const deleteCustomItem = useCallback(async (itemId: string) => {
    const sourceId = itemId.replace('custom_', '');

    setCustomItems(prev => {
      const updated = prev.filter(i => i.id !== sourceId);
      saveCustomItems(updated);
      return updated;
    });

    // Try to delete from Supabase
    if (supabase) {
      try {
        await supabase.from('schedule_items').delete().eq('id', sourceId);
      } catch {
        // Ignore errors
      }
    }
  }, [saveCustomItems]);

  // Navigate to previous/next day
  const goToPreviousDay = useCallback(() => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(formatDate(current));
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(formatDate(current));
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(formatDate(new Date()));
  }, []);

  const isToday = selectedDate === formatDate(new Date());

  return {
    selectedDate,
    setSelectedDate,
    items: allItems,
    todoItems,
    challengeItems,
    customItems: customScheduleItems,
    stats,
    isLoading: isLoadingTodo || isLoadingChallenges || isLoadingCustom,
    isSyncing: isSyncingChallenges,
    syncError: syncErrorChallenges,
    toggleItem,
    addCustomItem,
    deleteCustomItem,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
  };
}
