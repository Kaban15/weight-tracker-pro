"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { isRateLimited, RATE_LIMITS } from "@/lib/rateLimiter";
import { Task, TaskFormData, TaskStats, DEFAULT_TASK_FORM, Category, TaskStatus, CATEGORY_CONFIG, STATUS_CONFIG, formatLocalDate } from "./types";

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  deadline: string;
  priority: 'high' | 'medium' | 'low' | 'optional';
  status: TaskStatus;
  category: Category;
  completed: boolean;
  duration: number | null;
  time: string | null;
  created_at: string;
  updated_at: string;
}

// Re-use formatLocalDate from types.ts for consistent local date formatting
const formatDate = formatLocalDate;

// Migrate old task data to new format
function migrateTask(task: Record<string, unknown>): Task {
  const categoryMap: Record<string, Category> = {
    'other': 'duties',
    'work': 'work',
    'money': 'money',
    'ideas': 'ideas',
    'duties': 'duties',
    'spirituality': 'spirituality',
    'health': 'health',
    'family': 'family',
    'personal_growth': 'personal_growth',
    'free_time': 'free_time',
  };

  let category = task.category as string;
  if (!category || !CATEGORY_CONFIG[category as Category]) {
    category = categoryMap[category] || 'duties';
  }

  let status = task.status as string;
  if (!status || !STATUS_CONFIG[status as TaskStatus]) {
    status = task.completed ? 'done' : 'not_started';
  }

  return {
    id: task.id as string,
    title: task.title as string,
    notes: task.notes as string | undefined,
    deadline: task.deadline as string,
    priority: task.priority as Task['priority'],
    status: status as TaskStatus,
    category: category as Category,
    completed: task.completed as boolean,
    createdAt: task.createdAt as string,
    updatedAt: task.updatedAt as string,
    duration: task.duration as number | undefined,
    time: task.time as string | undefined,
  };
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Ref to always have access to latest tasks
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const localStorageKey = `todo_items_v1_${userId}`;
  const oldLocalStorageKey = `tasks_v1_${userId}`;
  const migrationKey = `tasks_migrated_to_supabase_${userId}`;

  const rowToTask = (row: TaskRow): Task => ({
    id: row.id,
    title: row.title,
    notes: row.notes || undefined,
    deadline: row.deadline,
    priority: row.priority,
    status: row.status,
    category: row.category,
    completed: row.completed,
    duration: row.duration || undefined,
    time: row.time || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  // Load from localStorage (for migration)
  const loadFromLocalStorage = useCallback((): Task[] => {
    if (typeof window === "undefined" || !userId) return [];
    try {
      let saved = localStorage.getItem(localStorageKey);
      if (!saved) {
        saved = localStorage.getItem(oldLocalStorageKey);
      }
      if (!saved) return [];
      const rawTasks = JSON.parse(saved) as Record<string, unknown>[];
      return rawTasks.map(task => migrateTask(task));
    } catch {
      return [];
    }
  }, [localStorageKey, oldLocalStorageKey, userId]);

  // Load tasks from Supabase
  const loadTasks = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Check if we're in browser
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setSyncError(null);

      // If supabase is not available, just use localStorage
      if (!supabase) {
        const localTasks = loadFromLocalStorage();
        setTasks(localTasks);
        setIsLoading(false);
        return;
      }

      // Check if we need to migrate from localStorage
      const hasMigrated = localStorage.getItem(migrationKey);
      if (!hasMigrated) {
        const localTasks = loadFromLocalStorage();
        if (localTasks.length > 0) {
          // Migrate local tasks to Supabase
          for (const task of localTasks) {
            try {
              await supabase.from('tasks').upsert({
                id: task.id,
                user_id: userId,
                title: task.title,
                notes: task.notes || null,
                deadline: task.deadline,
                priority: task.priority,
                status: task.status,
                category: task.category,
                completed: task.completed,
                duration: task.duration || null,
                time: task.time || null,
                created_at: task.createdAt,
                updated_at: task.updatedAt,
              });
            } catch {
              // Ignore individual task migration errors
            }
          }
        }
        localStorage.setItem(migrationKey, 'true');
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('deadline', { ascending: true });

      if (error) throw error;

      const loaded = (data || []).map(rowToTask);
      console.log('[Tasks] Loaded from Supabase:', loaded.length, 'tasks');
      if (loaded.length === 0 && !error) {
        console.warn('[Tasks] Supabase returned 0 tasks. If you expect data, check RLS policies on the tasks table.');
      }
      setTasks(loaded);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('[Tasks] Error loading tasks:', { message: e.message, details: e.details, hint: e.hint, code: e.code, raw: err });
      setSyncError(`Błąd ładowania zadań: ${e.message || 'nieznany błąd'}`);
      // Fallback to localStorage
      const localTasks = loadFromLocalStorage();
      setTasks(localTasks);
    } finally {
      setIsLoading(false);
    }
  }, [userId, migrationKey, loadFromLocalStorage]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Add task
  const addTask = useCallback(async (formData: TaskFormData): Promise<Task | null> => {
    if (!userId || !supabase) return null;

    if (isRateLimited('task:create', RATE_LIMITS.create)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return null;
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(),
      ...formData,
      completed: formData.status === 'done',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setTasks(prev => [...prev, newTask]);

    const insertPayload = {
      id: newTask.id,
      user_id: userId,
      title: newTask.title,
      notes: newTask.notes || null,
      deadline: newTask.deadline,
      priority: newTask.priority,
      status: newTask.status,
      category: newTask.category,
      completed: newTask.completed,
      duration: newTask.duration || null,
      time: newTask.time || null,
    };

    try {
      setIsSyncing(true);
      console.log('[Tasks] Inserting task:', insertPayload);
      const { error } = await supabase.from('tasks').insert(insertPayload);

      if (error) throw error;
      setSyncError(null);
      return newTask;
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('[Tasks] Error adding task:', { message: e.message, details: e.details, hint: e.hint, code: e.code, payload: insertPayload, raw: err });
      setSyncError(`Błąd dodawania zadania: ${e.message || 'nieznany błąd'}`);
      // Revert optimistic update - task was not saved to DB
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!supabase) return;

    if (isRateLimited('task:update', RATE_LIMITS.write)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    const now = new Date().toISOString();

    // Optimistic update
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, ...updates, updatedAt: now }
        : task
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('tasks')
        .update({
          title: updates.title,
          notes: updates.notes || null,
          deadline: updates.deadline,
          priority: updates.priority,
          status: updates.status,
          category: updates.category,
          completed: updates.completed,
          duration: updates.duration || null,
          time: updates.time || null,
        })
        .eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('[Tasks] Error updating task:', { message: e.message, details: e.details, hint: e.hint, code: e.code, raw: err });
      setSyncError(`Błąd aktualizacji zadania: ${e.message || 'nieznany błąd'}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    if (!supabase) return;

    if (isRateLimited('task:delete', RATE_LIMITS.delete)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    // Optimistic update
    setTasks(prev => prev.filter(task => task.id !== taskId));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('[Tasks] Error deleting task:', { message: e.message, details: e.details, hint: e.hint, code: e.code, raw: err });
      setSyncError(`Błąd usuwania zadania: ${e.message || 'nieznany błąd'}`);
      loadTasks(); // Reload on error
    } finally {
      setIsSyncing(false);
    }
  }, [loadTasks]);

  // Toggle task completion
  const toggleComplete = useCallback(async (taskId: string) => {
    if (!supabase) return;

    if (isRateLimited('task:toggle', RATE_LIMITS.toggle)) {
      setSyncError('Zbyt wiele operacji. Poczekaj chwilę.');
      return;
    }

    const currentTask = tasksRef.current.find(t => t.id === taskId);
    if (!currentTask) return;

    const newCompleted = !currentTask.completed;
    const newStatus = newCompleted ? 'done' : 'not_started';

    // Optimistic update
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, completed: newCompleted, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    ));

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('tasks')
        .update({
          completed: newCompleted,
          status: newStatus,
        })
        .eq('id', taskId);

      if (error) throw error;
      setSyncError(null);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('[Tasks] Error toggling task:', { message: e.message, details: e.details, hint: e.hint, code: e.code, raw: err });
      setSyncError(`Błąd synchronizacji: ${e.message || 'nieznany błąd'}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Calculate stats
  const stats: TaskStats = useMemo(() => {
    const today = formatDate(new Date());
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed || t.status === 'done').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const notCompleted = tasks.filter(t => !t.completed && t.status !== 'done' && t.status !== 'cancelled').length;
    const todayTasks = tasks.filter(t => t.deadline && t.deadline === today && !t.completed && t.status !== 'cancelled').length;
    const overdue = tasks.filter(t => t.deadline && t.deadline < today && !t.completed && t.status !== 'cancelled').length;
    const activeTotal = total - cancelled;
    const percentComplete = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

    return { total, today: todayTasks, overdue, completed, notCompleted, cancelled, percentComplete };
  }, [tasks]);

  // Sort tasks: active first (by deadline), then completed/cancelled at bottom
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aInactive = a.completed || a.status === 'cancelled';
      const bInactive = b.completed || b.status === 'cancelled';
      if (aInactive !== bInactive) {
        return aInactive ? 1 : -1;
      }
      // Handle null/undefined deadlines
      const aDeadline = a.deadline || '';
      const bDeadline = b.deadline || '';
      return aDeadline.localeCompare(bDeadline);
    });
  }, [tasks]);

  return {
    tasks: sortedTasks,
    stats,
    isLoading,
    isSyncing,
    syncError,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    reloadTasks: loadTasks,
    DEFAULT_TASK_FORM,
  };
}
