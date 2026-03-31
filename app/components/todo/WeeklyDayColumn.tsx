"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Task } from "./types";
import WeeklyTaskTile from "./WeeklyTaskTile";

interface WeeklyDayColumnProps {
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
}

export default function WeeklyDayColumn({
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
}: WeeklyDayColumnProps) {
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
        flex flex-col min-w-[140px] flex-1 rounded-xl transition-all snap-start
        ${isDragOver ? "bg-rose-900/30 border-2 border-rose-500/50 border-dashed" : "bg-slate-800/30 border border-slate-700/50"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Naglowek dnia */}
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

      {/* Kontener zadan */}
      <div className="flex-1 p-2 min-h-[200px] overflow-y-auto">
        {tasks.map((task) => (
          <WeeklyTaskTile
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

      {/* Stopka z laczna liczba godzin */}
      <div className="p-2 border-t border-slate-700/50 text-center">
        <span className="text-sm text-slate-400">{totalHours}</span>
      </div>
    </div>
  );
}
