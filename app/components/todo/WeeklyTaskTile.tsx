"use client";

import { Check, Clock, GripVertical, Trash2 } from "lucide-react";
import { Task, PRIORITY_CONFIG, CATEGORY_CONFIG } from "./types";

function formatDuration(minutes: number | undefined): string {
  if (!minutes) return "";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

interface WeeklyTaskTileProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function WeeklyTaskTile({
  task,
  onToggle,
  onDelete,
  onEdit,
  isDragging,
  onDragStart,
  onDragEnd,
}: WeeklyTaskTileProps) {
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
        group relative bg-[var(--card-bg)] rounded-lg p-2.5 mb-2 border transition-all
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "border-blue-500/30 bg-blue-950/20" : "border-[var(--card-border)]"}
        ${isCancelled ? "opacity-50 cursor-not-allowed" : "cursor-grab hover:border-[var(--card-border)] hover:bg-[var(--card-bg)]"}
        active:cursor-grabbing
      `}
    >
      <div className="flex items-start gap-2">
        {/* Uchwyt przeciagania */}
        <div className="text-[var(--muted)] pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Pole wyboru */}
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
                ? "bg-blue-500 text-white"
                : "border-2 border-[var(--card-border)] hover:border-blue-400"
            }
            ${isCancelled ? "cursor-not-allowed" : ""}
          `}
        >
          {isCompleted && <Check className="w-3 h-3" />}
        </button>

        {/* Tresc */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${
              isCompleted ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
            }`}
            title={task.title}
          >
            {task.title}
          </div>

          {/* Czas trwania, godzina i kategoria */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            {/* Kategoria */}
            <span className={`text-xs ${categoryConfig.color}`}>
              {categoryConfig.emoji}
            </span>
            {/* Kropka priorytetu */}
            <span
              className={`w-2 h-2 rounded-full ${priorityConfig.bgColor}`}
              title={priorityConfig.label}
            />
          </div>
        </div>

        {/* Przycisk usuwania */}
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
