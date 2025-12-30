"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Check,
  Pencil,
  AlertTriangle,
  Trash2,
  Calendar,
  ListTodo,
  Clock,
  AlertCircle,
  X,
  Circle,
  Filter,
  LayoutDashboard,
  List,
  ChevronDown,
  FileText,
  Ban,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTasks } from "./useTasks";
import TaskFormModal from "./TaskFormModal";
import { ModuleTooltip, useModuleOnboarding } from "../onboarding";
import {
  Task,
  TaskFormData,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
  Priority,
  TaskStatus,
  Category,
} from "./types";

interface TodoModeProps {
  onBack: () => void;
}

type ViewMode = "list" | "dashboard";
type FilterType = "all" | Priority | TaskStatus | Category;

const TODO_TOOLTIPS = [
  {
    id: "add-task",
    content: "Kliknij tutaj, aby dodać swoje pierwsze zadanie. Możesz ustawić priorytet, kategorię i termin.",
    position: "bottom" as const,
  },
  {
    id: "view-toggle",
    content: "Przełączaj między widokiem listy a dashboardem ze statystykami.",
    position: "bottom" as const,
  },
  {
    id: "filters",
    content: "Filtruj zadania według priorytetu, statusu lub kategorii.",
    position: "bottom" as const,
  },
];

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

  const onboarding = useModuleOnboarding("todo", TODO_TOOLTIPS);

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

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, priorityFilter, statusFilter, categoryFilter]);

  const hasActiveFilters = priorityFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all";

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

  const isOverdue = (deadline: string, completed: boolean, status: TaskStatus) => {
    if (completed || status === 'cancelled') return false;
    return deadline < today.toISOString().split("T")[0];
  };

  const isToday = (deadline: string) => {
    return deadline === today.toISOString().split("T")[0];
  };

  // Dashboard stats calculations
  const dashboardStats = useMemo(() => {
    const priorityDistribution = Object.keys(PRIORITY_CONFIG).map((key) => ({
      key: key as Priority,
      label: PRIORITY_CONFIG[key as Priority].label,
      count: tasks.filter((t) => t.priority === key && !t.completed && t.status !== 'cancelled').length,
      color: PRIORITY_CONFIG[key as Priority].bgColor,
    }));

    const statusDistribution = Object.keys(STATUS_CONFIG).map((key) => ({
      key: key as TaskStatus,
      label: STATUS_CONFIG[key as TaskStatus].label,
      count: tasks.filter((t) => t.status === key).length,
      color: key === 'done' ? 'bg-emerald-500' : key === 'in_progress' ? 'bg-amber-500' : key === 'cancelled' ? 'bg-red-500' : 'bg-slate-500',
    }));

    const categoryDistribution = Object.keys(CATEGORY_CONFIG).map((key) => ({
      key: key as Category,
      label: CATEGORY_CONFIG[key as Category].label,
      emoji: CATEGORY_CONFIG[key as Category].emoji,
      count: tasks.filter((t) => t.category === key).length,
      color: CATEGORY_CONFIG[key as Category].color,
    }));

    return { priorityDistribution, statusDistribution, categoryDistribution };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const renderStatusIcon = (status: TaskStatus) => {
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
  };

  const renderPieChart = (data: { label: string; count: number; color: string }[], title: string) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
      return (
        <div className="text-center text-slate-400 py-8">
          Brak danych
        </div>
      );
    }

    let currentAngle = 0;
    const segments = data.filter(item => item.count > 0).map((item) => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { ...item, percentage, startAngle, angle };
    });

    return (
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-semibold text-slate-300 mb-4">{title}</h4>
        <div className="relative w-32 h-32 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((segment, index) => {
              const startAngle = segment.startAngle * (Math.PI / 180);
              const endAngle = (segment.startAngle + segment.angle) * (Math.PI / 180);
              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);
              const largeArc = segment.angle > 180 ? 1 : 0;

              const colorClass = segment.color.replace('bg-', '');
              const fillColor = colorClass.includes('red') ? '#ef4444' :
                               colorClass.includes('yellow') ? '#eab308' :
                               colorClass.includes('blue') ? '#3b82f6' :
                               colorClass.includes('slate') ? '#64748b' :
                               colorClass.includes('emerald') ? '#10b981' :
                               colorClass.includes('amber') ? '#f59e0b' :
                               colorClass.includes('violet') ? '#8b5cf6' :
                               colorClass.includes('pink') ? '#ec4899' :
                               colorClass.includes('cyan') ? '#06b6d4' :
                               colorClass.includes('purple') ? '#a855f7' :
                               colorClass.includes('orange') ? '#f97316' :
                               colorClass.includes('green') ? '#22c55e' : '#64748b';

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={fillColor}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{total}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${segment.color}`} />
              <span className="text-slate-400">{segment.label}: {segment.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
              <p className="text-slate-400 text-sm">
                Zarządzaj swoimi zadaniami
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <ModuleTooltip {...onboarding.getTooltipProps("view-toggle")}>
              <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "list" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("dashboard")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "dashboard" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
              </div>
            </ModuleTooltip>
            <ModuleTooltip {...onboarding.getTooltipProps("add-task")}>
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
            </ModuleTooltip>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>Data</span>
            </div>
            <div className="text-lg font-bold text-white">{formattedDate}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
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

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Circle className="w-4 h-4 text-slate-400" />
              <span>Nie Ukończone</span>
            </div>
            <div className="text-2xl font-bold text-slate-300">{stats.notCompleted}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Ukończone</span>
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

        {/* Dashboard View */}
        {viewMode === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              {renderPieChart(dashboardStats.priorityDistribution, "Wg Priorytetu")}
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              {renderPieChart(dashboardStats.statusDistribution, "Wg Statusu")}
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              {renderPieChart(
                dashboardStats.categoryDistribution.map((c) => ({
                  label: `${c.emoji} ${c.label}`,
                  count: c.count,
                  color: c.color.replace('text-', 'bg-'),
                })),
                "Wg Kategorii"
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        {viewMode === "list" && (
          <div className="mb-4">
            <ModuleTooltip {...onboarding.getTooltipProps("filters")}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  hasActiveFilters
                    ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtry</span>
                {hasActiveFilters && (
                  <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {[priorityFilter !== "all", statusFilter !== "all", categoryFilter !== "all"].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </ModuleTooltip>

            {showFilters && (
              <div className="mt-3 bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
                {/* Priority Filter */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Priorytet</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPriorityFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        priorityFilter === "all"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Wszystkie
                    </button>
                    {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                          priorityFilter === p
                            ? "bg-rose-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].bgColor}`} />
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        statusFilter === "all"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Wszystkie
                    </button>
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                          statusFilter === s
                            ? "bg-rose-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Kategoria</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        categoryFilter === "all"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Wszystkie
                    </button>
                    {(Object.keys(CATEGORY_CONFIG) as Category[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategoryFilter(c)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                          categoryFilter === c
                            ? "bg-rose-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        <span>{CATEGORY_CONFIG[c].emoji}</span>
                        {CATEGORY_CONFIG[c].label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-rose-400 hover:text-rose-300 text-sm flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Wyczyść filtry
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tasks Table */}
        {viewMode === "list" && (
          <>
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                <ListTodo className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {hasActiveFilters ? "Brak zadań spełniających kryteria" : "Brak zadań"}
                </h3>
                <p className="text-slate-400 mb-6">
                  {hasActiveFilters
                    ? "Zmień filtry lub dodaj nowe zadanie"
                    : "Dodaj swoje pierwsze zadanie, aby rozpocząć"
                  }
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Wyczyść filtry
                  </button>
                ) : (
                  <button
                    onClick={() => setShowFormModal(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Dodaj zadanie
                  </button>
                )}
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
                      {filteredTasks.map((task) => {
                        const overdueTask = isOverdue(task.deadline, task.completed, task.status);
                        const todayTask = isToday(task.deadline);
                        const isCancelled = task.status === 'cancelled';

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
                                onClick={() => toggleComplete(task.id)}
                                disabled={isCancelled}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                  task.completed
                                    ? "bg-emerald-600 border-emerald-600"
                                    : isCancelled
                                    ? "bg-slate-700 border-slate-600 cursor-not-allowed"
                                    : "border-slate-500 hover:border-emerald-500"
                                }`}
                              >
                                {task.completed && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                                {isCancelled && (
                                  <X className="w-4 h-4 text-slate-500" />
                                )}
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
