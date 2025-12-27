"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Task, TaskFormData, TaskStats, DEFAULT_TASK_FORM } from "./types";

function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use a unique localStorage key that won't conflict with Planner
  const localStorageKey = `todo_items_v1_${userId}`;
  const oldLocalStorageKey = `tasks_v1_${userId}`; // Old key for migration

  // Migrate data from old key to new key
  const migrateOldData = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    try {
      const oldData = localStorage.getItem(oldLocalStorageKey);
      const newData = localStorage.getItem(localStorageKey);

      // Only migrate if old data exists and new data doesn't
      if (oldData && !newData) {
        localStorage.setItem(localStorageKey, oldData);
        // Don't delete old data, just keep both for safety
      }
    } catch {
      // Migration error - ignore
    }
  }, [localStorageKey, oldLocalStorageKey, userId]);

  // Load tasks from localStorage (try new key first, then old key)
  const loadFromLocalStorage = useCallback((): Task[] => {
    if (typeof window === "undefined" || !userId) return [];
    try {
      // Try new key first
      let saved = localStorage.getItem(localStorageKey);
      // If not found, try old key
      if (!saved) {
        saved = localStorage.getItem(oldLocalStorageKey);
      }
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [localStorageKey, oldLocalStorageKey, userId]);

  // Save tasks to localStorage (save to both keys for safety)
  const saveToLocalStorage = useCallback((data: Task[]) => {
    if (typeof window === "undefined" || !userId) return;
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(localStorageKey, json);
      // Also save to old key as backup
      localStorage.setItem(oldLocalStorageKey, json);
    } catch {
      // localStorage error
    }
  }, [localStorageKey, oldLocalStorageKey, userId]);

  // Initial load from localStorage only (no Supabase to avoid conflicts with Planner)
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // First, migrate any old data
    migrateOldData();

    // Then load from new key
    const localTasks = loadFromLocalStorage();
    setTasks(localTasks);
    setIsLoading(false);
  }, [userId, migrateOldData, loadFromLocalStorage]);

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
      return updated;
    });

    return newTask;
  }, [saveToLocalStorage]);

  // Update task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === taskId
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      );
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  // Delete task
  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== taskId);
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

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
      return updated;
    });
  }, [saveToLocalStorage]);

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
    isSyncing: false,
    syncError: null,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    DEFAULT_TASK_FORM,
  };
}
