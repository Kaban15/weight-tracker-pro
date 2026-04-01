"use client";

import { Calendar, Check, GripVertical, Plus } from "lucide-react";
import { Task, PRIORITY_CONFIG } from "./types";

interface BacklogTaskTileProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function BacklogTaskTile({
  task,
  onToggle,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: BacklogTaskTileProps) {
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
        ${isCompleted ? "bg-[var(--accent)]/10 border-[var(--accent)]/30" : "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border)]"}
      `}
    >
      {/* Uchwyt przeciagania */}
      <div className="text-[var(--muted)]">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Pole wyboru */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted ? "bg-[var(--accent)] text-[var(--foreground)]" : "border-2 border-[var(--card-border)] hover:border-[var(--accent)]"}
        `}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Tytul */}
      <span
        className={`flex-1 text-sm truncate ${
          isCompleted ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
        }`}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Kropka priorytetu */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConfig.bgColor}`}
        title={priorityConfig.label}
      />
    </div>
  );
}

interface WeeklyBacklogSidebarProps {
  backlogTasks: Task[];
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
}

export default function WeeklyBacklogSidebar({
  backlogTasks,
  draggingTaskId,
  setDraggingTaskId,
  onToggleComplete,
  onEditTask,
  onAddTask,
}: WeeklyBacklogSidebarProps) {
  return (
    <div className="w-64 sm:w-72 bg-[var(--background)] border-r border-[var(--card-border)] flex flex-col">
      <div className="p-4 border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Backlog
          </h2>
          <button
            onClick={onAddTask}
            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Przeciagnij zadania na kalendarz
        </p>
      </div>

      {/* Lista zadan backlogu */}
      <div className="p-3 flex-1 overflow-y-auto">
        <h3 className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">
          Zadania ({backlogTasks.length})
        </h3>
        <div className="space-y-2">
          {backlogTasks.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">
              Brak zadan w backlogu
            </p>
          ) : (
            backlogTasks.map((task) => (
              <BacklogTaskTile
                key={task.id}
                task={task}
                onToggle={() => onToggleComplete(task.id)}
                onEdit={() => onEditTask(task)}
                onDragStart={() => setDraggingTaskId(task.id)}
                onDragEnd={() => setDraggingTaskId(null)}
                isDragging={draggingTaskId === task.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Szybkie dodawanie */}
      <div className="p-3 border-t border-[var(--card-border)]">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--surface)] border border-[var(--card-border)] text-[var(--muted)] hover:text-blue-400 py-2.5 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Nowe zadanie
        </button>
      </div>
    </div>
  );
}
