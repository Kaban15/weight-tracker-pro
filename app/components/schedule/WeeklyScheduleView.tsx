"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  Check,
  Trash2,
  Clock,
} from "lucide-react";
import { Task, PRIORITY_CONFIG } from "../todo/types";

interface WeeklyScheduleViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTaskDate: (taskId: string, newDate: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (date: string) => void;
}

// Get week start (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Format date to YYYY-MM-DD
function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
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

// Get day names in Polish
const DAY_NAMES = ["PON", "WT", "SR", "CZW", "PT", "SOB", "ND"];
const DAY_NAMES_FULL = [
  "Poniedzialek",
  "Wtorek",
  "Sroda",
  "Czwartek",
  "Piatek",
  "Sobota",
  "Niedziela",
];

// Task tile component
function TaskTile({
  task,
  onToggle,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
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
      className={`
        group relative bg-slate-800/80 rounded-lg p-2.5 mb-2 border transition-all
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "border-emerald-500/30 bg-emerald-950/20" : "border-slate-700/50"}
        ${isCancelled ? "opacity-50 cursor-not-allowed" : "cursor-grab hover:border-slate-600"}
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

          {/* Duration and time */}
          <div className="flex items-center gap-2 mt-1">
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
  onAddTask: () => void;
  onDropTask: (taskId: string, newDate: string) => void;
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("taskId");
      if (taskId) {
        onDropTask(taskId, date);
      }
      setIsDragOver(false);
      setDraggingTaskId(null);
    },
    [date, onDropTask, setDraggingTaskId]
  );

  return (
    <div
      className={`
        flex flex-col min-w-[140px] flex-1 rounded-xl transition-all snap-start
        ${isDragOver ? "bg-cyan-900/30 border-2 border-cyan-500/50 border-dashed" : "bg-slate-800/30 border border-slate-700/50"}
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
              isToday ? "text-cyan-400" : "text-white"
            }`}
          >
            {dayNumber}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 rounded transition-colors"
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
          <div className="border-2 border-dashed border-cyan-500/50 rounded-lg p-4 text-center text-cyan-400 text-sm">
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

export default function WeeklyScheduleView({
  tasks,
  onToggleComplete,
  onUpdateTaskDate,
  onDeleteTask,
  onAddTask,
}: WeeklyScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  );
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
          // Sort by time if both have time, otherwise by completion status
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

  // Navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

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

  // Handle drop
  const handleDropTask = useCallback(
    (taskId: string, newDate: string) => {
      onUpdateTaskDate(taskId, newDate);
    },
    [onUpdateTaskDate]
  );

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex gap-2 flex-1 overflow-x-auto pb-4 snap-x snap-mandatory">
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
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onAddTask={() => onAddTask(dateStr)}
              onDropTask={handleDropTask}
              draggingTaskId={draggingTaskId}
              setDraggingTaskId={setDraggingTaskId}
            />
          );
        })}
      </div>
    </div>
  );
}
