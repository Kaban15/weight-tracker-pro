"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Check, Trash2, ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SyncIndicator from "../shared/SyncIndicator";
import { usePlanner, formatDateStr } from "./usePlanner";
import { Task } from "./types";

interface PlannerModeProps {
  onBack: () => void;
}

// Circular Progress Ring Component
function ProgressRing({ percentage, size = 80, isToday = false, label }: { percentage: number; size?: number; isToday?: boolean; label?: string }) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage === 100) return '#10b981'; // emerald
    if (percentage >= 50) return '#8b5cf6'; // violet
    if (percentage > 0) return '#f59e0b'; // amber
    return '#475569'; // slate
  };

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Postęp: ${percentage}%`}
    >
      <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: 'drop-shadow(0 0 6px ' + getColor() + '40)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className={`font-bold ${size > 60 ? 'text-lg' : 'text-sm'} ${isToday ? 'text-white' : 'text-slate-300'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// Mini Bar Chart for weekly overview
function WeeklyMiniChart({ weekDays, getCompletedCountForDate }: {
  weekDays: Date[];
  getCompletedCountForDate: (date: string) => { completed: number; total: number };
}) {
  const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  const todayStr = formatDateStr(new Date());

  return (
    <div className="flex items-end gap-2" role="img" aria-label="Wykres postępu tygodnia">
      {weekDays.map((date, index) => {
        const dateStr = formatDateStr(date);
        const { completed, total } = getCompletedCountForDate(dateStr);
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        const isToday = dateStr === todayStr;

        return (
          <div
            key={dateStr}
            className="flex flex-col items-center gap-1"
            role="presentation"
            aria-label={`${dayLabels[index]}: ${Math.round(percentage)}% ukończono`}
          >
            <div className="h-16 w-5 bg-slate-700/50 rounded-full overflow-hidden flex flex-col-reverse" aria-hidden="true">
              <div
                className="w-full rounded-full transition-all duration-500"
                style={{
                  height: `${percentage}%`,
                  background: percentage === 100
                    ? 'linear-gradient(to top, #10b981, #34d399)'
                    : percentage > 0
                      ? 'linear-gradient(to top, #8b5cf6, #a78bfa)'
                      : 'transparent'
                }}
              />
            </div>
            <span className={`text-[10px] font-medium ${isToday ? 'text-violet-400' : 'text-slate-500'}`} aria-hidden="true">
              {dayLabels[index]}
            </span>
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
  const dayName = date.toLocaleDateString('pl-PL', { weekday: 'short' });
  const dayNumber = date.getDate();

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
    <div className={`
      rounded-2xl flex flex-col min-w-[180px] w-[180px] overflow-hidden transition-all duration-300
      ${isToday
        ? 'bg-gradient-to-b from-violet-600/30 to-slate-800/80 ring-2 ring-violet-500 shadow-lg shadow-violet-500/20'
        : 'bg-slate-800/60 hover:bg-slate-800/80'}
    `}>
      {/* Day Header */}
      <div className={`text-center py-3 ${isToday ? 'bg-violet-600/40' : 'bg-slate-700/50'}`}>
        <div className={`text-2xl font-bold ${isToday ? 'text-white' : 'text-slate-300'}`}>
          {dayNumber}
        </div>
        <div className={`text-xs uppercase tracking-wider ${isToday ? 'text-violet-300' : 'text-slate-500'}`}>
          {dayName}
        </div>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-3">
        <ProgressRing percentage={percentage} size={56} isToday={isToday} />
      </div>

      {/* Tasks List */}
      <div className="flex-1 px-2 space-y-1 min-h-[80px] max-h-[160px] overflow-y-auto scrollbar-thin">
        {tasks.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-xs">
            Brak zadań
          </div>
        )}

        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-start gap-2 p-1.5 hover:bg-slate-700/30 rounded-lg group"
          >
            <span className={`flex-1 text-xs leading-tight ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
              {task.title}
            </span>
            <button
              onClick={() => onDelete(task.id)}
              className="p-0.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onToggle(task.id)}
              className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                task.completed
                  ? 'bg-emerald-500 text-white'
                  : 'border border-slate-500 hover:border-violet-400'
              }`}
            >
              {task.completed && <Check className="w-3 h-3" />}
            </button>
          </div>
        ))}
      </div>

      {/* Add Task - Always Visible */}
      <div className="px-2 pb-2 pt-1">
        {showInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => !newTaskTitle && setShowInput(false)}
              placeholder="Zadanie..."
              className="min-w-0 flex-1 text-xs bg-slate-700/50 border border-slate-600 rounded px-2 py-1.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newTaskTitle.trim() || isAdding}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded-md transition-colors flex-shrink-0"
            >
              {isAdding ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Check className="w-5 h-5 text-white" />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center justify-center gap-1 text-xs text-white bg-violet-600 hover:bg-violet-500 p-2 w-full rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj</span>
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

  const getWeekDays = (offset: number): Date[] => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
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

  const weeklyStats = weekDays.reduce(
    (acc, date) => {
      const { completed, total } = getCompletedCountForDate(formatDateStr(date));
      return { completed: acc.completed + completed, total: acc.total + total };
    },
    { completed: 0, total: 0 }
  );
  const weeklyPercentage = weeklyStats.total > 0
    ? Math.round((weeklyStats.completed / weeklyStats.total) * 100)
    : 0;

  const weekStart = weekDays[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const weekEnd = weekDays[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold text-white">Planer Tygodnia</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors text-sm">
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Week Navigation & Stats */}
        <div className="bg-slate-800/40 backdrop-blur rounded-2xl border border-slate-700/50 p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center min-w-[160px]">
                <div className="text-lg font-semibold text-white">
                  {weekStart} - {weekEnd}
                </div>
                {weekOffset === 0 ? (
                  <div className="text-xs text-violet-400 font-medium">Ten tydzień</div>
                ) : (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                  >
                    Wróć do dziś
                  </button>
                )}
              </div>

              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekly Stats */}
            <div className="flex items-center gap-8">
              <WeeklyMiniChart weekDays={weekDays} getCompletedCountForDate={getCompletedCountForDate} />

              <div className="flex items-center gap-4">
                <ProgressRing percentage={weeklyPercentage} size={70} />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {weeklyStats.completed}<span className="text-slate-500">/{weeklyStats.total}</span>
                  </div>
                  <div className="text-xs text-slate-500">ukończono</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Day Cards */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
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
