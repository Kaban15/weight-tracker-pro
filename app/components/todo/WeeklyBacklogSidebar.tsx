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
        ${isCompleted ? "bg-emerald-950/20 border-emerald-500/30" : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600"}
      `}
    >
      {/* Uchwyt przeciagania */}
      <div className="text-slate-600">
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
          ${isCompleted ? "bg-emerald-500 text-white" : "border-2 border-slate-500 hover:border-emerald-400"}
        `}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Tytul */}
      <span
        className={`flex-1 text-sm truncate ${
          isCompleted ? "text-slate-500 line-through" : "text-white"
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
    <div className="w-64 sm:w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Backlog
          </h2>
          <button
            onClick={onAddTask}
            className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Przeciagnij zadania na kalendarz
        </p>
      </div>

      {/* Lista zadan backlogu */}
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
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-400 hover:text-rose-400 py-2.5 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Nowe zadanie
        </button>
      </div>
    </div>
  );
}
