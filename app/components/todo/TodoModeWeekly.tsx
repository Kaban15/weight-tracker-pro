"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTasks } from "./useTasks";
import { Task, TaskFormData } from "./types";
import { formatDate as formatDateStr, getWeekStart, getWeekDaysFrom } from "../shared/dateUtils";
import TaskFormModal from "./TaskFormModal";
import WeeklyHeader from "./WeeklyHeader";
import WeeklyBacklogSidebar from "./WeeklyBacklogSidebar";
import WeeklyDayColumn from "./WeeklyDayColumn";

interface TodoModeWeeklyProps {
  onBack: () => void;
}

// Nazwy dni tygodnia po polsku
const DAY_NAMES = ["PON", "WT", "SR", "CZW", "PT", "SOB", "ND"];

export default function TodoModeWeekly({ onBack }: TodoModeWeeklyProps) {
  const { user } = useAuth();
  const {
    tasks,
    stats,
    isLoading,
    syncError,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    reloadTasks,
  } = useTasks(user?.id);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  );
  const [showBacklog, setShowBacklog] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDaysFrom(currentWeekStart), [currentWeekStart]);

  // Grupowanie zadan wedlug daty
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    weekDates.forEach((date) => {
      const dateStr = formatDateStr(date);
      grouped[dateStr] = tasks
        .filter((task) => task.deadline === dateStr && task.status !== "cancelled")
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return 0;
        });
    });
    return grouped;
  }, [tasks, weekDates]);

  // Laczna liczba godzin dla kazdego dnia
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

  // Zadania backlogu — aktywne, spoza biezacego tygodnia
  const backlogTasks = useMemo(() => {
    const weekDateStrings = weekDates.map(formatDateStr);
    return tasks.filter(
      (task) =>
        task.status !== "cancelled" &&
        !task.completed &&
        !weekDateStrings.includes(task.deadline)
    );
  }, [tasks, weekDates]);

  // Nawigacja tygodniowa
  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Wyswietlany zakres tygodnia
  const weekRangeDisplay = useMemo(() => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);

    const startMonth = currentWeekStart.toLocaleDateString("pl-PL", { month: "short" });
    const endMonth = endDate.toLocaleDateString("pl-PL", { month: "short" });
    const startDay = currentWeekStart.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }, [currentWeekStart]);

  const today = formatDateStr(new Date());

  const handleAddTask = (date: string) => {
    setSelectedDateForNewTask(date);
    setEditingTask(null);
    setShowFormModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedDateForNewTask(null);
    setShowFormModal(true);
  };

  const handleSaveTask = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    } else {
      addTask({ ...data, deadline: selectedDateForNewTask || data.deadline });
    }
    setShowFormModal(false);
    setSelectedDateForNewTask(null);
  };

  const handleUpdateTaskDate = (taskId: string, newDate: string) => {
    updateTask(taskId, { deadline: newDate });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Czy na pewno chcesz usunac to zadanie?")) {
      deleteTask(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex flex-col">
      <WeeklyHeader
        stats={stats}
        syncError={syncError}
        showBacklog={showBacklog}
        onBack={onBack}
        onToggleBacklog={() => setShowBacklog(!showBacklog)}
        onReload={reloadTasks}
      />

      {/* Glowna tresc */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pasek boczny backlogu */}
        {showBacklog && (
          <WeeklyBacklogSidebar
            backlogTasks={backlogTasks}
            draggingTaskId={draggingTaskId}
            setDraggingTaskId={setDraggingTaskId}
            onToggleComplete={toggleComplete}
            onEditTask={handleEditTask}
            onAddTask={() => handleAddTask(today)}
          />
        )}

        {/* Widok kalendarza tygodniowego */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          {/* Nawigacja tygodniowa */}
          <div className="flex items-center justify-center gap-4 mb-4 py-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold text-white min-w-[180px] text-center capitalize">
              {weekRangeDisplay}
            </h2>

            <button
              onClick={goToNextWeek}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Siatka tygodnia */}
          <div className="flex gap-2 flex-1 overflow-x-auto pb-4 snap-x snap-mandatory">
            {weekDates.map((date, index) => {
              const dateStr = formatDateStr(date);
              return (
                <WeeklyDayColumn
                  key={dateStr}
                  date={dateStr}
                  dayName={DAY_NAMES[index]}
                  dayNumber={date.getDate()}
                  isToday={dateStr === today}
                  tasks={tasksByDate[dateStr] || []}
                  totalHours={totalHoursByDate[dateStr] || "0h"}
                  onToggleComplete={toggleComplete}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onAddTask={() => handleAddTask(dateStr)}
                  onDropTask={handleUpdateTaskDate}
                  draggingTaskId={draggingTaskId}
                  setDraggingTaskId={setDraggingTaskId}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal formularza zadania */}
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
