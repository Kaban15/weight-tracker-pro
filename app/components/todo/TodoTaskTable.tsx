"use client";

import {
  Check,
  Pencil,
  Trash2,
  ListTodo,
  X,
  Plus,
  Circle,
  FileText,
} from "lucide-react";
import {
  Task,
  TaskStatus,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from "./types";

interface TodoTaskTableProps {
  tasks: Task[];
  hasActiveFilters: boolean;
  isOverdue: (deadline: string | undefined, completed: boolean, status: TaskStatus) => boolean;
  isToday: (deadline: string | undefined) => boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDeleteRequest: (id: string) => void;
  onClearFilters: () => void;
  onAddTask: () => void;
}

function renderStatusIcon(status: TaskStatus) {
  switch (status) {
    case "done":
      return <Check className="w-4 h-4" />;
    case "in_progress":
      return <Pencil className="w-4 h-4" />;
    case "cancelled":
      return <X className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
}

export default function TodoTaskTable({
  tasks,
  hasActiveFilters,
  isOverdue,
  isToday,
  onToggleComplete,
  onEdit,
  onDeleteRequest,
  onClearFilters,
  onAddTask,
}: TodoTaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
        <ListTodo className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {hasActiveFilters ? "Brak zadań spełniających kryteria" : "Brak zadań"}
        </h3>
        <p className="text-slate-400 mb-6">
          {hasActiveFilters
            ? "Zmień filtry lub dodaj nowe zadanie"
            : "Dodaj swoje pierwsze zadanie, aby rozpocząć"}
        </p>
        {hasActiveFilters ? (
          <button
            onClick={onClearFilters}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Wyczyść filtry
          </button>
        ) : (
          <button
            onClick={onAddTask}
            className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Dodaj zadanie
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-10" />
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                Zadanie
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-32">
                Termin
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-36">
                Priorytet
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-40">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-36">
                Kategoria
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300 w-20">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const overdueTask = isOverdue(task.deadline, task.completed, task.status);
              const todayTask = isToday(task.deadline);
              const isCancelled = task.status === "cancelled";

              return (
                <tr
                  key={task.id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    task.completed || isCancelled ? "opacity-60" : ""
                  } ${overdueTask ? "bg-rose-950/20" : ""} ${
                    todayTask && !task.completed && !isCancelled ? "bg-amber-950/20" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleComplete(task.id)}
                      disabled={isCancelled}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        task.completed
                          ? "bg-emerald-600 border-emerald-600"
                          : isCancelled
                          ? "bg-slate-700 border-slate-600 cursor-not-allowed"
                          : "border-slate-500 hover:border-emerald-500"
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4 text-white" />}
                      {isCancelled && <X className="w-4 h-4 text-slate-500" />}
                    </button>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span
                        className={`text-white ${
                          task.completed || isCancelled ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.notes && (
                        <span className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {task.notes.length > 50 ? task.notes.substring(0, 50) + "..." : task.notes}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Deadline */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        overdueTask
                          ? "text-rose-400 font-semibold bg-rose-500/20 px-2 py-1 rounded"
                          : todayTask && !isCancelled
                          ? "text-amber-400 font-semibold"
                          : "text-slate-400"
                      } ${task.completed || isCancelled ? "line-through" : ""}`}
                    >
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString("pl-PL")
                        : "—"}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${
                        PRIORITY_CONFIG[task.priority].color
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          PRIORITY_CONFIG[task.priority].bgColor
                        }`}
                      />
                      {PRIORITY_CONFIG[task.priority].label}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${
                        STATUS_CONFIG[task.status].color
                      }`}
                    >
                      {renderStatusIcon(task.status)}
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${
                        CATEGORY_CONFIG[task.category].color
                      }`}
                    >
                      <span>{CATEGORY_CONFIG[task.category].emoji}</span>
                      {CATEGORY_CONFIG[task.category].label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(task)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRequest(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
