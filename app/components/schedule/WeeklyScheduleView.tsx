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
import { formatDate as formatDateStr, getWeekStart, getWeekDaysFrom } from "../shared/dateUtils";

interface WeeklyScheduleViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTaskDate: (taskId: string, newDate: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (date: string) => void;
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
        group relative bg-[var(--card-bg)] rounded-lg p-2.5 mb-2 border transition-all
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "border-cyan-500/30 bg-cyan-950/20" : "border-[var(--card-border)]"}
        ${isCancelled ? "opacity-50 cursor-not-allowed" : "cursor-grab hover:border-[var(--card-border)]"}
        active:cursor-grabbing
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div className="text-[var(--muted)] pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                ? "bg-cyan-600 text-white"
                : "border-2 border-[var(--card-border)] hover:border-cyan-400"
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
              isCompleted ? "text-[var(--muted)] line-through" : "text-white"
            }`}
            title={task.title}
          >
            {task.title}
          </div>

          {/* Duration and time */}
          <div className="flex items-center gap-2 mt-1">
            {task.duration && (
              <span className="text-xs text-[var(--muted)] flex items-center gap-1">
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
          className="p-1 text-[var(--muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
        ${isDragOver ? "bg-cyan-900/30 border-2 border-cyan-500/50 border-dashed" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Day header */}
      <div className="p-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-[var(--muted)] uppercase">{dayName}</span>
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
          className="p-1 text-[var(--muted)] hover:text-cyan-400 hover:bg-[var(--surface)] rounded transition-colors"
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
          <div className="text-center text-[var(--muted)] text-xs py-8">
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
      <div className="p-2 border-t border-[var(--card-border)] text-center">
        <span className="text-sm text-[var(--muted)]">{totalHours}</span>
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

  const weekDates = useMemo(() => getWeekDaysFrom(currentWeekStart), [currentWeekStart]);

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
          className="p-2 text-[var(--muted)] hover:text-white hover:bg-[var(--surface)] rounded-lg transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-white min-w-[180px] text-center capitalize">
          {weekRangeDisplay}
        </h2>

        <button
          onClick={goToNextWeek}
          className="p-2 text-[var(--muted)] hover:text-white hover:bg-[var(--surface)] rounded-lg transition-all"
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
              dayName={DAY_NAMES[index] ?? ""}
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
