"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Plus, List, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTasks } from "./useTasks";
import TaskFormModal from "./TaskFormModal";
import TodoStatsBar from "./TodoStatsBar";
import TodoFilters from "./TodoFilters";
import TodoTaskTable from "./TodoTaskTable";
import TodoDashboard from "./TodoDashboard";
import TodoDeleteConfirmModal from "./TodoDeleteConfirmModal";
import {
  Task,
  TaskFormData,
  Priority,
  TaskStatus,
  Category,
  formatLocalDate,
} from "./types";

interface TodoModeProps {
  onBack: () => void;
}

type ViewMode = "list" | "dashboard";

export default function TodoMode({ onBack }: TodoModeProps) {
  const { user } = useAuth();
  const { tasks, stats, isLoading, addTask, updateTask, deleteTask, toggleComplete } =
    useTasks(user?.id);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, priorityFilter, statusFilter, categoryFilter]);

  const hasActiveFilters =
    priorityFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all";

  const clearFilters = () => {
    setPriorityFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

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

  const isOverdue = (
    deadline: string | undefined,
    completed: boolean,
    status: TaskStatus
  ) => {
    if (!deadline || completed || status === "cancelled") return false;
    return deadline < formatLocalDate(today);
  };

  const isToday = (deadline: string | undefined) => {
    if (!deadline) return false;
    return deadline === formatLocalDate(today);
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
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Lista Zadań</h1>
              <p className="text-slate-400 text-sm">Zarządzaj swoimi zadaniami</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-rose-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("dashboard")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "dashboard"
                    ? "bg-rose-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
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
        </div>

        {/* Stats + Progress */}
        <TodoStatsBar stats={stats} formattedDate={formattedDate} />

        {/* Dashboard View */}
        {viewMode === "dashboard" && <TodoDashboard tasks={tasks} />}

        {/* List View */}
        {viewMode === "list" && (
          <>
            <TodoFilters
              priorityFilter={priorityFilter}
              statusFilter={statusFilter}
              categoryFilter={categoryFilter}
              showFilters={showFilters}
              hasActiveFilters={hasActiveFilters}
              onPriorityChange={setPriorityFilter}
              onStatusChange={setStatusFilter}
              onCategoryChange={setCategoryFilter}
              onToggleFilters={() => setShowFilters((v) => !v)}
              onClearFilters={clearFilters}
            />
            <TodoTaskTable
              tasks={filteredTasks}
              hasActiveFilters={hasActiveFilters}
              isOverdue={isOverdue}
              isToday={isToday}
              onToggleComplete={toggleComplete}
              onEdit={(task) => {
                setEditingTask(task);
                setShowFormModal(true);
              }}
              onDeleteRequest={setShowDeleteConfirm}
              onClearFilters={clearFilters}
              onAddTask={() => setShowFormModal(true)}
            />
          </>
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
        <TodoDeleteConfirmModal
          onConfirm={() => handleDeleteTask(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
