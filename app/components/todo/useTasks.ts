"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Task, TaskFormData, TaskStats, DEFAULT_TASK_FORM } from "./types";

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const localStorageKey = `tasks_v1_${userId}`;

  // Load tasks from localStorage
  const loadFromLocalStorage = useCallback((): Task[] => {
    if (typeof window === "undefined" || !userId) return [];
    try {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [localStorageKey, userId]);

  // Save tasks to localStorage
  const saveToLocalStorage = useCallback((data: Task[]) => {
    if (typeof window === "undefined" || !userId) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
    } catch {
      // localStorage error
    }
  }, [localStorageKey, userId]);

  // Load tasks from Supabase
  const loadFromSupabase = useCallback(async (): Promise<Task[]> => {
    if (!supabase || !userId) return [];
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("deadline", { ascending: true });

      if (error) throw error;
      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        deadline: row.deadline as string,
        priority: row.priority as Task["priority"],
        status: row.status as Task["status"],
        category: row.category as Task["category"],
        completed: row.completed as boolean,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));
    } catch {
      return [];
    }
  }, [userId]);

  // Sync tasks to Supabase
  const syncToSupabase = useCallback(async (data: Task[]) => {
    if (!supabase || !userId) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      // Delete all existing tasks for user
      await supabase.from("tasks").delete().eq("user_id", userId);

      // Insert all current tasks
      if (data.length > 0) {
        const rows = data.map(task => ({
          id: task.id,
          user_id: userId,
          title: task.title,
          deadline: task.deadline,
          priority: task.priority,
          status: task.status,
          category: task.category,
          completed: task.completed,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
        }));

        const { error } = await supabase.from("tasks").insert(rows);
        if (error) throw error;
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync error");
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);

      // Try to load from Supabase first
      const supabaseTasks = await loadFromSupabase();

      if (supabaseTasks.length > 0) {
        setTasks(supabaseTasks);
        saveToLocalStorage(supabaseTasks);
      } else {
        // Fall back to localStorage
        const localTasks = loadFromLocalStorage();
        setTasks(localTasks);

        // Sync local tasks to Supabase
        if (localTasks.length > 0) {
          syncToSupabase(localTasks);
        }
      }

      setIsLoading(false);
    };

    load();
  }, [userId, loadFromSupabase, loadFromLocalStorage, saveToLocalStorage, syncToSupabase]);

  // Add task
  const addTask = useCallback((formData: TaskFormData): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateId(),
      ...formData,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => {
      const updated = [...prev, newTask];
      saveToLocalStorage(updated);
      syncToSupabase(updated);
      return updated;
    });

    return newTask;
  }, [saveToLocalStorage, syncToSupabase]);

  // Update task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === taskId
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      );
      saveToLocalStorage(updated);
      syncToSupabase(updated);
      return updated;
    });
  }, [saveToLocalStorage, syncToSupabase]);

  // Delete task
  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== taskId);
      saveToLocalStorage(updated);
      syncToSupabase(updated);
      return updated;
    });
  }, [saveToLocalStorage, syncToSupabase]);

  // Toggle task completion
  const toggleComplete = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              status: !task.completed ? 'done' : 'not_started',
              updatedAt: new Date().toISOString(),
            } as Task
          : task
      );
      saveToLocalStorage(updated);
      syncToSupabase(updated);
      return updated;
    });
  }, [saveToLocalStorage, syncToSupabase]);

  // Calculate stats
  const stats: TaskStats = useMemo(() => {
    const today = formatDate(new Date());
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const todayTasks = tasks.filter(t => t.deadline === today && !t.completed).length;
    const overdue = tasks.filter(t => t.deadline < today && !t.completed).length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, today: todayTasks, overdue, completed, percentComplete };
  }, [tasks]);

  // Sort tasks: incomplete first (by deadline), then completed
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Completed tasks go to the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Sort by deadline
      return a.deadline.localeCompare(b.deadline);
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
    DEFAULT_TASK_FORM,
  };
}
