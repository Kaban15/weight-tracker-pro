"use client";

import { useState } from "react";
import { Home, Plus, Check, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SyncIndicator from "../shared/SyncIndicator";
import { usePlanner, formatDateStr } from "./usePlanner";
import { Task } from "./types";

interface PlannerModeProps {
  onBack: () => void;
}

// Circular Progress Ring Component
function ProgressRing({ percentage, size = 80 }: { percentage: number; size?: number }) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-700">{percentage}%</span>
      </div>
    </div>
  );
}

// Bar Chart Component for weekly overview
function WeeklyBarChart({ weekDays, getCompletedCountForDate }: {
  weekDays: Date[];
  getCompletedCountForDate: (date: string) => { completed: number; total: number };
}) {
  const dayLabels = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];
  const maxHeight = 60;

  return (
    <div className="flex items-end gap-1 h-20">
      {weekDays.map((date, index) => {
        const dateStr = formatDateStr(date);
        const { completed, total } = getCompletedCountForDate(dateStr);
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        const height = total > 0 ? Math.max((percentage / 100) * maxHeight, 4) : 4;

        return (
          <div key={dateStr} className="flex flex-col items-center gap-1">
            <div
              className="w-6 rounded-t transition-all duration-300"
              style={{
                height: `${height}px`,
                backgroundColor: percentage > 0 ? '#22c55e' : '#d1d5db'
              }}
            />
            <span className="text-[10px] text-slate-500">{dayLabels[index]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Day Card Component
function DayCard({
  date,
  tasks,
  onToggle,
  onDelete,
  onAdd,
  isToday
}: {
  date: Date;
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAdd: (date: string, title: string) => Promise<Task | null>;
  isToday: boolean;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const dateStr = formatDateStr(date);
  const dayName = date.toLocaleDateString('pl-PL', { weekday: 'long' });
  const dateDisplay = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newTaskTitle.trim()) return;
    setIsAdding(true);
    await onAdd(dateStr, newTaskTitle);
    setNewTaskTitle('');
    setIsAdding(false);
    setShowInput(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md border-2 ${isToday ? 'border-green-500' : 'border-gray-200'} flex flex-col min-w-[200px] w-[200px]`}>
      {/* Day Header */}
      <div className={`text-center py-3 rounded-t-lg ${isToday ? 'bg-green-500' : 'bg-green-600'}`}>
        <div className="text-white font-semibold capitalize">{dayName}</div>
        <div className="text-green-100 text-sm">{dateDisplay}</div>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-4 bg-gray-50">
        <ProgressRing percentage={percentage} size={70} />
      </div>

      {/* Tasks Header */}
      <div className="bg-green-600 text-white text-center py-2 text-sm font-semibold">
        Zadania
      </div>

      {/* Tasks List */}
      <div className="flex-1 p-2 space-y-1 min-h-[150px] max-h-[250px] overflow-y-auto">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded group"
          >
            <button
              onClick={() => onToggle(task.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                task.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-500'
              }`}
            >
              {task.completed && <Check className="w-3 h-3" />}
            </button>
            <span className={`flex-1 text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {task.title}
            </span>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add Task Input */}
        {showInput ? (
          <div className="flex items-center gap-1 p-1">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nowe zadanie..."
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:border-green-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newTaskTitle.trim() || isAdding}
              className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-300"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 p-1 w-full"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj zadanie</span>
          </button>
        )}
      </div>
    </div>
  );
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

  const [weekOffset, setWeekOffset] = useState(0);

  // Get week days starting from Monday
  const getWeekDays = (offset: number): Date[] => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    // Adjust to Monday (day 1), if Sunday (0) go back 6 days
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    monday.setDate(today.getDate() - daysToMonday + (offset * 7));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(weekOffset);
  const todayStr = formatDateStr(new Date());

  // Calculate weekly totals
  const weeklyStats = weekDays.reduce(
    (acc, date) => {
      const { completed, total } = getCompletedCountForDate(formatDateStr(date));
      return {
        completed: acc.completed + completed,
        total: acc.total + total
      };
    },
    { completed: 0, total: 0 }
  );
  const weeklyPercentage = weeklyStats.total > 0
    ? Math.round((weeklyStats.completed / weeklyStats.total) * 100)
    : 0;

  // Week label
  const weekStart = weekDays[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const weekEnd = weekDays[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie planera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">Tygodniowy Planer</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <button onClick={signOut} className="text-gray-600 hover:text-green-600 transition-colors text-sm">
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Week Navigation & Overall Progress */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center min-w-[200px]">
                <div className="text-lg font-semibold text-gray-800">
                  {weekStart} - {weekEnd}
                </div>
                {weekOffset === 0 && (
                  <div className="text-sm text-green-600">Ten tydzień</div>
                )}
              </div>
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-sm text-green-600 hover:text-green-700 ml-2"
                >
                  Dziś
                </button>
              )}
            </div>

            {/* Overall Progress */}
            <div className="flex items-center gap-6 bg-gray-50 rounded-lg p-4">
              <div>
                <div className="text-sm font-semibold text-green-700 mb-2">Ogólny Progres</div>
                <WeeklyBarChart weekDays={weekDays} getCompletedCountForDate={getCompletedCountForDate} />
              </div>
              <div className="text-center">
                <ProgressRing percentage={weeklyPercentage} size={80} />
                <div className="text-sm text-gray-600 mt-1">
                  {weeklyStats.completed} / {weeklyStats.total} Ukończono
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Day Cards */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {weekDays.map(date => {
              const dateStr = formatDateStr(date);
              const dayTasks = getTasksForDate(dateStr);
              const isToday = dateStr === todayStr;

              return (
                <DayCard
                  key={dateStr}
                  date={date}
                  tasks={dayTasks}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onAdd={addTask}
                  isToday={isToday}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
