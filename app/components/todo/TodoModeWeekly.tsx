"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ListTodo,
  Plus,
  GripVertical,
  Check,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTasks } from "./useTasks";
import { Task, TaskFormData, PRIORITY_CONFIG, CATEGORY_CONFIG } from "./types";
import TaskFormModal from "./TaskFormModal";

interface TodoModeWeeklyProps {
  onBack: () => void;
}

// Get week start (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Format date to YYYY-MM-DD (local timezone, not UTC)
function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format duration to display string
function formatDuration(minutes: number | undefined): string {
  if (!minutes) return "";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// Day names in Polish
const DAY_NAMES = ["PON", "WT", "SR", "CZW", "PT", "SOB", "ND"];

// Task tile component
function TaskTile({
  task,
  onToggle,
  onDelete,
  onEdit,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const categoryConfig = CATEGORY_CONFIG[task.category];
  const isCompleted = task.completed || task.status === "done";
  const isCancelled = task.status === "cancelled";

  return (
    <div
      draggable={!isCancelled}
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`
        group relative bg-slate-800/80 rounded-lg p-2.5 mb-2 border transition-all
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "border-emerald-500/30 bg-emerald-950/20" : "border-slate-700/50"}
        ${isCancelled ? "opacity-50 cursor-not-allowed" : "cursor-grab hover:border-slate-600 hover:bg-slate-800"}
        active:cursor-grabbing
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div className="text-slate-600 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCancelled) onToggle();
          }}
          disabled={isCancelled}
          className={`
            w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all mt-0.5
            ${
              isCompleted
                ? "bg-emerald-500 text-white"
                : "border-2 border-slate-500 hover:border-emerald-400"
            }
            ${isCancelled ? "cursor-not-allowed" : ""}
          `}
        >
          {isCompleted && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${
              isCompleted ? "text-slate-500 line-through" : "text-white"
            }`}
            title={task.title}
          >
            {task.title}
          </div>

          {/* Duration, time, and category */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.duration && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(task.duration)}
              </span>
            )}
            {task.time && (
              <span className="text-xs text-cyan-400 font-mono">
                {task.time}
              </span>
            )}
            {/* Category */}
            <span className={`text-xs ${categoryConfig.color}`}>
              {categoryConfig.emoji}
            </span>
            {/* Priority dot */}
            <span
              className={`w-2 h-2 rounded-full ${priorityConfig.bgColor}`}
              title={priorityConfig.label}
            />
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Day column component
function DayColumn({
  date,
  dayName,
  dayNumber,
  isToday,
  tasks,
  totalHours,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onAddTask,
  onDropTask,
  draggingTaskId,
  setDraggingTaskId,
}: {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  tasks: Task[];
  totalHours: string;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
  onDropTask: (taskId: string, newDate: string) => void;
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onDropTask(taskId, date);
    }
    setIsDragOver(false);
    setDraggingTaskId(null);
  };

  return (
    <div
      className={`
        flex flex-col min-w-[140px] flex-1 rounded-xl transition-all
        ${isDragOver ? "bg-rose-900/30 border-2 border-rose-500/50 border-dashed" : "bg-slate-800/30 border border-slate-700/50"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Day header */}
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500 uppercase">{dayName}</span>
          <span
            className={`text-xl font-bold ${
              isToday ? "text-rose-400" : "text-white"
            }`}
          >
            {dayNumber}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks container */}
      <div className="flex-1 p-2 min-h-[200px] overflow-y-auto">
        {tasks.map((task) => (
          <TaskTile
            key={task.id}
            task={task}
            onToggle={() => onToggleComplete(task.id)}
            onDelete={() => onDeleteTask(task.id)}
            onEdit={() => onEditTask(task)}
            isDragging={draggingTaskId === task.id}
            onDragStart={() => setDraggingTaskId(task.id)}
            onDragEnd={() => setDraggingTaskId(null)}
          />
        ))}

        {tasks.length === 0 && !isDragOver && (
          <div className="text-center text-slate-600 text-xs py-8">
            Brak zadan
          </div>
        )}

        {isDragOver && (
          <div className="border-2 border-dashed border-rose-500/50 rounded-lg p-4 text-center text-rose-400 text-sm">
            Upusc tutaj
          </div>
        )}
      </div>

      {/* Total hours footer */}
      <div className="p-2 border-t border-slate-700/50 text-center">
        <span className="text-sm text-slate-400">{totalHours}</span>
      </div>
    </div>
  );
}

// Backlog task tile
function BacklogTaskTile({
  task,
  onToggle,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.completed || task.status === "done";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`
        group flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "bg-emerald-950/20 border-emerald-500/30" : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600"}
      `}
    >
      {/* Drag handle */}
      <div className="text-slate-600">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted ? "bg-emerald-500 text-white" : "border-2 border-slate-500 hover:border-emerald-400"}
        `}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          isCompleted ? "text-slate-500 line-through" : "text-white"
        }`}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConfig.bgColor}`}
        title={priorityConfig.label}
      />
    </div>
  );
}

export default function TodoModeWeekly({ onBack }: TodoModeWeeklyProps) {
  const { user } = useAuth();
  const {
    tasks,
    stats,
    isLoading,
    syncError,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    reloadTasks,
  } = useTasks(user?.id);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  );
  const [showBacklog, setShowBacklog] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Generate array of dates for current week
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    weekDates.forEach((date) => {
      const dateStr = formatDateStr(date);
      grouped[dateStr] = tasks
        .filter((task) => task.deadline === dateStr && task.status !== "cancelled")
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return 0;
        });
    });
    return grouped;
  }, [tasks, weekDates]);

  // Calculate total hours for each day
  const totalHoursByDate = useMemo(() => {
    const totals: Record<string, string> = {};
    Object.entries(tasksByDate).forEach(([dateStr, dayTasks]) => {
      const totalMinutes = dayTasks.reduce(
        (sum, task) => sum + (task.duration || 0),
        0
      );
      if (totalMinutes === 0) {
        totals[dateStr] = "0h";
      } else if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totals[dateStr] = mins > 0 ? `${hours}.${Math.round(mins / 6)}h` : `${hours}h`;
      } else {
        totals[dateStr] = `${totalMinutes}m`;
      }
    });
    return totals;
  }, [tasksByDate]);

  // Backlog tasks - active tasks not in this week
  const backlogTasks = useMemo(() => {
    const weekDateStrings = weekDates.map(formatDateStr);
    return tasks.filter(
      (task) =>
        task.status !== "cancelled" &&
        !task.completed &&
        !weekDateStrings.includes(task.deadline)
    );
  }, [tasks, weekDates]);

  // Navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Week range display
  const weekRangeDisplay = useMemo(() => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);

    const startMonth = currentWeekStart.toLocaleDateString("pl-PL", {
      month: "short",
    });
    const endMonth = endDate.toLocaleDateString("pl-PL", { month: "short" });

    const startDay = currentWeekStart.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }, [currentWeekStart]);

  const today = formatDateStr(new Date());

  // Handle adding new task
  const handleAddTask = (date: string) => {
    setSelectedDateForNewTask(date);
    setEditingTask(null);
    setShowFormModal(true);
  };

  // Handle editing task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedDateForNewTask(null);
    setShowFormModal(true);
  };

  // Handle saving task
  const handleSaveTask = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    } else {
      const taskData = {
        ...data,
        deadline: selectedDateForNewTask || data.deadline,
      };
      addTask(taskData);
    }
    setShowFormModal(false);
    setSelectedDateForNewTask(null);
  };

  // Handle updating task date (for drag-drop)
  const handleUpdateTaskDate = (taskId: string, newDate: string) => {
    updateTask(taskId, { deadline: newDate });
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    if (confirm("Czy na pewno chcesz usunac to zadanie?")) {
      deleteTask(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Powrot</span>
          </button>
          <div className="flex items-center gap-3">
            <ListTodo className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl font-bold text-white">Lista Zadan</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBacklog(!showBacklog)}
              className={`p-2 rounded-lg transition-colors ${
                showBacklog ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Pokaz/Ukryj backlog"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-slate-800/30 border-b border-slate-800 px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Wszystkie:</span>
            <span className="text-white font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Dzis:</span>
            <span className="text-amber-400 font-semibold">{stats.today}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-500">Spoznione:</span>
            <span className="text-rose-400 font-semibold">{stats.overdue}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">Ukonczone:</span>
            <span className="text-emerald-400 font-semibold">{stats.completed}</span>
          </div>
          <div className="w-32 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
              style={{ width: `${stats.percentComplete}%` }}
            />
          </div>
          <span className="text-white font-semibold">{stats.percentComplete}%</span>
        </div>
      </div>

      {/* Sync error banner */}
      {syncError && (
        <div className="bg-red-900/30 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{syncError}</span>
          </div>
          <button
            onClick={reloadTasks}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-semibold px-3 py-1 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ponów
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Backlog sidebar */}
        {showBacklog && (
          <div className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Backlog
                </h2>
                <button
                  onClick={() => handleAddTask(today)}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Przeciagnij zadania na kalendarz
              </p>
            </div>

            {/* Backlog tasks section */}
            <div className="p-3 flex-1 overflow-y-auto">
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                Zadania ({backlogTasks.length})
              </h3>
              <div className="space-y-2">
                {backlogTasks.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-4">
                    Brak zadan w backlogu
                  </p>
                ) : (
                  backlogTasks.map((task) => (
                    <BacklogTaskTile
                      key={task.id}
                      task={task}
                      onToggle={() => toggleComplete(task.id)}
                      onEdit={() => handleEditTask(task)}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Quick add section */}
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={() => handleAddTask(today)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-400 hover:text-rose-400 py-2.5 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Nowe zadanie
              </button>
            </div>
          </div>
        )}

        {/* Weekly calendar view */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          {/* Week navigation header */}
          <div className="flex items-center justify-center gap-4 mb-4 py-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold text-white min-w-[180px] text-center capitalize">
              {weekRangeDisplay}
            </h2>

            <button
              onClick={goToNextWeek}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week grid */}
          <div className="flex gap-2 flex-1 overflow-x-auto pb-4">
            {weekDates.map((date, index) => {
              const dateStr = formatDateStr(date);
              return (
                <DayColumn
                  key={dateStr}
                  date={dateStr}
                  dayName={DAY_NAMES[index]}
                  dayNumber={date.getDate()}
                  isToday={dateStr === today}
                  tasks={tasksByDate[dateStr] || []}
                  totalHours={totalHoursByDate[dateStr] || "0h"}
                  onToggleComplete={toggleComplete}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onAddTask={() => handleAddTask(dateStr)}
                  onDropTask={handleUpdateTaskDate}
                  draggingTaskId={draggingTaskId}
                  setDraggingTaskId={setDraggingTaskId}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Task form modal */}
      {showFormModal && (
        <TaskFormModal
          isOpen={showFormModal}
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowFormModal(false);
            setEditingTask(null);
            setSelectedDateForNewTask(null);
          }}
          defaultDate={selectedDateForNewTask || undefined}
        />
      )}
    </div>
  );
}
