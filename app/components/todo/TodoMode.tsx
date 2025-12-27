"use client";

import { useState } from "react";
import {
  Home,
  Plus,
  Check,
  Pencil,
  AlertTriangle,
  Trash2,
  Calendar,
  ListTodo,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTasks } from "./useTasks";
import TaskFormModal from "./TaskFormModal";
import {
  Task,
  TaskFormData,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from "./types";

interface TodoModeProps {
  onBack: () => void;
}

export default function TodoMode({ onBack }: TodoModeProps) {
  const { user } = useAuth();
  const {
    tasks,
    stats,
    isLoading,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
  } = useTasks(user?.id);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleAddTask = (data: TaskFormData) => {
    addTask(data);
  };

  const handleEditTask = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    setShowDeleteConfirm(null);
  };

  const isOverdue = (deadline: string, completed: boolean) => {
    if (completed) return false;
    return deadline < today.toISOString().split("T")[0];
  };

  const isToday = (deadline: string) => {
    return deadline === today.toISOString().split("T")[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Lista Zadań</h1>
              <p className="text-slate-400 text-sm">
                Zarządzaj swoimi zadaniami
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setShowFormModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nowe zadanie</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>Data</span>
            </div>
            <div className="text-xl font-bold text-white">{formattedDate}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Dziś</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.today}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <ListTodo className="w-4 h-4" />
              <span>Wszystkie</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-rose-500/30">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Spóźnione</span>
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.overdue}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/30 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Zrobione</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Postęp</span>
            <span className="text-white font-bold">{stats.percentComplete}%</span>
          </div>
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${stats.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Tasks Table */}
        {tasks.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
            <ListTodo className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Brak zadań
            </h3>
            <p className="text-slate-400 mb-6">
              Dodaj swoje pierwsze zadanie, aby rozpocząć
            </p>
            <button
              onClick={() => setShowFormModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Dodaj zadanie
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 w-10">

                    </th>
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
                    const overdueTask = isOverdue(task.deadline, task.completed);
                    const todayTask = isToday(task.deadline);

                    return (
                      <tr
                        key={task.id}
                        className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                          task.completed ? "opacity-60" : ""
                        } ${overdueTask ? "bg-rose-950/20" : ""} ${
                          todayTask && !task.completed ? "bg-amber-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleComplete(task.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed
                                ? "bg-emerald-600 border-emerald-600"
                                : "border-slate-500 hover:border-emerald-500"
                            }`}
                          >
                            {task.completed && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </td>

                        {/* Title */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-white ${
                              task.completed ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                        </td>

                        {/* Deadline */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${
                              overdueTask
                                ? "text-rose-400 font-semibold"
                                : todayTask
                                ? "text-amber-400 font-semibold"
                                : "text-slate-400"
                            } ${task.completed ? "line-through" : ""}`}
                          >
                            {new Date(task.deadline).toLocaleDateString("pl-PL")}
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
                            {task.status === "done" && (
                              <Check className="w-4 h-4" />
                            )}
                            {task.status === "in_progress" && (
                              <Pencil className="w-4 h-4" />
                            )}
                            {task.status === "not_started" && (
                              <AlertTriangle className="w-4 h-4" />
                            )}
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
                              onClick={() => {
                                setEditingTask(task);
                                setShowFormModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(task.id)}
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
        )}
      </div>

      {/* Form Modal */}
      <TaskFormModal
        isOpen={showFormModal}
        task={editingTask}
        onSave={editingTask ? handleEditTask : handleAddTask}
        onClose={() => {
          setShowFormModal(false);
          setEditingTask(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border-2 border-rose-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Usuń zadanie</h3>
                <p className="text-sm text-slate-400">
                  Ta operacja jest nieodwracalna
                </p>
              </div>
            </div>
            <p className="text-slate-300 mb-6">
              Czy na pewno chcesz usunąć to zadanie?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDeleteTask(showDeleteConfirm)}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
