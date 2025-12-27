"use client";

import { useState } from "react";
import { Home, Plus, Check, Trash2, ChevronLeft, ChevronRight, Loader2, Calendar, ListChecks } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SyncIndicator from "../shared/SyncIndicator";
import { usePlanner, formatDateStr } from "./usePlanner";
import { Task } from "./types";

interface PlannerModeProps {
  onBack: () => void;
}

export default function PlannerMode({ onBack }: PlannerModeProps) {
  const { user, signOut } = useAuth();
  const {
    tasks,
    isLoading,
    isSyncing,
    syncError,
    addTask,
    toggleTask,
    deleteTask,
    getTasksForDate,
    getCompletedCountForDate
  } = usePlanner(user?.id);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const dateStr = formatDateStr(selectedDate);
  const dayTasks = getTasksForDate(dateStr);
  const { completed, total } = getCompletedCountForDate(dateStr);

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsAdding(true);
    await addTask(dateStr, newTaskTitle);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  const isToday = formatDateStr(new Date()) === dateStr;
  const dayName = selectedDate.toLocaleDateString('pl-PL', { weekday: 'long' });
  const dateDisplay = selectedDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Ładowanie planera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Planer</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors text-sm">
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Date Navigation */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className={`text-lg font-bold ${isToday ? 'text-violet-400' : 'text-white'}`}>
                {isToday ? 'Dzisiaj' : dayName}
              </div>
              <div className="text-sm text-slate-400">{dateDisplay}</div>
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="w-full mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              ← Wróć do dzisiaj
            </button>
          )}
        </div>

        {/* Progress Summary */}
        {total > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-400">
                <ListChecks className="w-4 h-4" />
                <span className="text-sm">Postęp dnia</span>
              </div>
              <span className={`text-sm font-bold ${completed === total ? 'text-emerald-400' : 'text-slate-300'}`}>
                {completed}/{total}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${completed === total ? 'bg-emerald-500' : 'bg-violet-500'}`}
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
            </div>
            {completed === total && total > 0 && (
              <p className="text-emerald-400 text-sm mt-2 text-center">Wszystko zrobione!</p>
            )}
          </div>
        )}

        {/* Add Task */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Dodaj nowe zadanie..."
              className="flex-1 bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim() || isAdding}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {dayTasks.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Brak zadań</h3>
              <p className="text-slate-400">Dodaj swoje pierwsze zadanie na ten dzień!</p>
            </div>
          ) : (
            dayTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={`bg-slate-800/50 rounded-xl border p-4 transition-all ${
        task.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            task.completed
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-slate-600 hover:border-violet-500'
          }`}
        >
          {task.completed && <Check className="w-4 h-4" />}
        </button>

        <span className={`flex-1 ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
          {task.title}
        </span>

        <button
          onClick={onDelete}
          className={`p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ${
            showDelete ? 'opacity-100' : 'opacity-0 sm:opacity-0'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
