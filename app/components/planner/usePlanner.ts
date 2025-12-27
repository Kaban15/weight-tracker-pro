"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { isRateLimited, RATE_LIMITS } from "@/lib/rateLimiter";
import { withRetry, RETRY_PRESETS } from "@/lib/retry";
import { Task } from "./types";

// Re-export from shared for backwards compatibility
export { formatDate as formatDateStr } from "../shared/dateUtils";

export function usePlanner(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!userId || !supabase) return;

    try {
      setIsLoading(true);
      setSyncError(null);

      const { data, error } = await withRetry(
        async () => {
          const result = await supabase!
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
          if (result.error) throw result.error;
          return result;
        },
        RETRY_PRESETS.standard
      );

      setTasks(data || []);
    } catch {
      setSyncError('Błąd ładowania zadań');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (date: string, title: string): Promise<Task | null> => {
    if (!userId || !supabase || !title.trim()) return null;

    // Rate limit check
    if (isRateLimited('planner:create', RATE_LIMITS.create)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return null;
    }

    const newTask: Omit<Task, 'id'> = {
      user_id: userId,
      date,
      title: title.trim(),
      completed: false
    };

    // Optimistic update
    const tempId = crypto.randomUUID();
    const tempTask = { ...newTask, id: tempId };
    setTasks(prev => [...prev, tempTask]);

    try {
      setIsSyncing(true);
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;

      // Replace temp task with real one
      setTasks(prev => prev.map(t => t.id === tempId ? data : t));
      setSyncError(null);
      return data;
    } catch {
      setSyncError('Błąd dodawania zadania');
      // Rollback
      setTasks(prev => prev.filter(t => t.id !== tempId));
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTask = async (taskId: string): Promise<void> => {
    if (!supabase) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Rate limit check
    if (isRateLimited('planner:toggle', RATE_LIMITS.toggle)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch {
      setSyncError('Błąd aktualizacji');
      // Rollback
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: task.completed } : t
      ));
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!supabase) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Rate limit check
    if (isRateLimited('planner:delete', RATE_LIMITS.delete)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch {
      setSyncError('Błąd usuwania');
      // Rollback
      setTasks(prev => [...prev, task]);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateTask = async (taskId: string, title: string): Promise<void> => {
    if (!supabase) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !title.trim()) return;

    // Rate limit check
    if (isRateLimited('planner:write', RATE_LIMITS.write)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    const oldTitle = task.title;

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, title: title.trim() } : t
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('tasks')
        .update({ title: title.trim() })
        .eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch {
      setSyncError('Błąd aktualizacji');
      // Rollback
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, title: oldTitle } : t
      ));
    } finally {
      setIsSyncing(false);
    }
  };

  // Memoize tasks grouped by date for efficient lookup
  const tasksByDate = useMemo(() => {
    const grouped: { [date: string]: Task[] } = {};
    tasks.forEach(task => {
      if (!grouped[task.date]) grouped[task.date] = [];
      grouped[task.date].push(task);
    });
    return grouped;
  }, [tasks]);

  const getTasksForDate = useCallback((date: string): Task[] => {
    return tasksByDate[date] || [];
  }, [tasksByDate]);

  const getCompletedCountForDate = useCallback((date: string): { completed: number; total: number } => {
    const dateTasks = tasksByDate[date] || [];
    return {
      completed: dateTasks.filter(t => t.completed).length,
      total: dateTasks.length
    };
  }, [tasksByDate]);

  return {
    tasks,
    isLoading,
    isSyncing,
    syncError,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    getTasksForDate,
    getCompletedCountForDate
  };
}
