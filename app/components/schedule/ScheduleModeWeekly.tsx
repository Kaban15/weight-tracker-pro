"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Plus,
  GripVertical,
  Check,
  Settings,
  Trash2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import SyncIndicator from "../shared/SyncIndicator";
import { useTasks } from "../todo/useTasks";
import { Task, TaskFormData, PRIORITY_CONFIG, DURATION_OPTIONS } from "../todo/types";
import WeeklyScheduleView from "./WeeklyScheduleView";
import TaskFormModal from "../todo/TaskFormModal";

interface ScheduleModeWeeklyProps {
  onBack?: () => void;
}

// Backlog task tile
function BacklogTaskTile({
  task,
  onToggle,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.completed || task.status === "done";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.setData("fromBacklog", "true");
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`
        group flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? "opacity-50 scale-95" : "opacity-100"}
        ${isCompleted ? "bg-cyan-950/20 border-cyan-500/30" : "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border)]"}
      `}
    >
      {/* Drag handle */}
      <div className="text-[var(--muted)]">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted ? "bg-cyan-600 text-white" : "border-2 border-[var(--card-border)] hover:border-cyan-400"}
        `}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          isCompleted ? "text-[var(--muted)] line-through" : "text-white"
        }`}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConfig.bgColor}`}
        title={priorityConfig.label}
      />
    </div>
  );
}

export default function ScheduleModeWeekly({ onBack }: ScheduleModeWeeklyProps) {
  const { user, signOut } = useAuth();
  const { goHome } = useNavigation();
  const {
    tasks,
    stats,
    isLoading,
    isSyncing,
    syncError,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
  } = useTasks(user?.id);

  const [showBacklog, setShowBacklog] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingFromBacklog, setDraggingFromBacklog] = useState<string | null>(null);

  // Backlog tasks - tasks without a deadline set far in future (or we could use a special flag)
  // For now, we'll show all active tasks in backlog that user can drag to calendar
  const backlogTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    // Show tasks that are not scheduled (deadline is today or no specific time set)
    // or all active tasks for easy drag-drop
    return tasks.filter(
      (task) =>
        task.status !== "cancelled" &&
        task.status !== "done" &&
        !task.completed
    );
  }, [tasks]);

  // Handle adding new task
  const handleAddTask = (date: string) => {
    setSelectedDateForNewTask(date);
    setEditingTask(null);
    setShowFormModal(true);
  };

  // Handle saving task
  const handleSaveTask = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    } else {
      const taskData = {
        ...data,
        deadline: selectedDateForNewTask || data.deadline,
      };
      addTask(taskData);
    }
    setShowFormModal(false);
    setSelectedDateForNewTask(null);
  };

  // Handle updating task date (for drag-drop)
  const handleUpdateTaskDate = (taskId: string, newDate: string) => {
    updateTask(taskId, { deadline: newDate });
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    if (confirm("Czy na pewno chcesz usunac to zadanie?")) {
      deleteTask(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--card-border)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { if (onBack) onBack(); else goHome(); }}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Powrot</span>
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Harmonogram</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBacklog(!showBacklog)}
              className={`p-2 rounded-lg transition-colors ${
                showBacklog ? "bg-cyan-600 text-white" : "text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]"
              }`}
              title="Pokaz/Ukryj backlog"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="text-[var(--muted)] hover:text-white transition-colors text-sm"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Backlog sidebar */}
        {showBacklog && (
          <div className="w-64 sm:w-72 bg-[var(--background)] border-r border-[var(--card-border)] flex flex-col">
            <div className="p-4 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Backlog
                </h2>
                <button
                  onClick={() => handleAddTask(new Date().toISOString().split("T")[0])}
                  className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Przeciagnij zadania na kalendarz
              </p>
            </div>

            {/* Backlog tasks section */}
            <div className="p-3 border-b border-[var(--card-border)]">
              <h3 className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">
                Zadania ({backlogTasks.length})
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {backlogTasks.length === 0 ? (
                  <p className="text-sm text-[var(--muted)] text-center py-4">
                    Brak zadan
                  </p>
                ) : (
                  backlogTasks.map((task) => (
                    <BacklogTaskTile
                      key={task.id}
                      task={task}
                      onToggle={() => toggleComplete(task.id)}
                      onDragStart={() => setDraggingFromBacklog(task.id)}
                      onDragEnd={() => setDraggingFromBacklog(null)}
                      isDragging={draggingFromBacklog === task.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Quick add section */}
            <div className="p-3 mt-auto">
              <button
                onClick={() => handleAddTask(new Date().toISOString().split("T")[0])}
                className="w-full flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--surface)] border border-[var(--card-border)] text-[var(--muted)] hover:text-cyan-400 py-2.5 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Nowe zadanie
              </button>
            </div>
          </div>
        )}

        {/* Weekly calendar view */}
        <div className="flex-1 p-4 overflow-hidden">
          <WeeklyScheduleView
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onUpdateTaskDate={handleUpdateTaskDate}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        </div>
      </div>

      {/* Task form modal */}
      {showFormModal && (
        <TaskFormModal
          isOpen={showFormModal}
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowFormModal(false);
            setEditingTask(null);
            setSelectedDateForNewTask(null);
          }}
          defaultDate={selectedDateForNewTask || undefined}
        />
      )}
    </div>
  );
}
