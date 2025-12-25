"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Flame,
  Home,
  Trash2
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface Habit {
  id: string;
  name: string;
  color: string;
}

interface CompletedHabit {
  date: string; // YYYY-MM-DD
  habitId: string;
}

interface ChallengeModeProps {
  onBack: () => void;
}

const COLORS = [
  "emerald",
  "amber",
  "rose",
  "violet",
  "blue",
  "orange",
];

const getColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500" },
    amber: { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500" },
    rose: { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500" },
    violet: { bg: "bg-violet-500", text: "text-violet-400", border: "border-violet-500" },
    blue: { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500" },
    orange: { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500" },
  };
  return colorMap[color] || colorMap.emerald;
};

export default function ChallengeMode({ onBack }: ChallengeModeProps) {
  const { user, signOut } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<CompletedHabit[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedColor, setSelectedColor] = useState("emerald");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const storageKey = `habits_${user?.id}`;
  const completedKey = `completed_habits_${user?.id}`;

  // Load data from localStorage
  useEffect(() => {
    if (user) {
      const savedHabits = localStorage.getItem(storageKey);
      const savedCompleted = localStorage.getItem(completedKey);

      if (savedHabits) {
        setHabits(JSON.parse(savedHabits));
      }
      if (savedCompleted) {
        setCompletedHabits(JSON.parse(savedCompleted));
      }
    }
  }, [user, storageKey, completedKey]);

  // Save habits to localStorage
  useEffect(() => {
    if (user && habits.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(habits));
    }
  }, [habits, user, storageKey]);

  // Save completed habits to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(completedKey, JSON.stringify(completedHabits));
    }
  }, [completedHabits, user, completedKey]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];

  const dayNames = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const formatDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getCompletedForDay = (day: number) => {
    const dateStr = formatDate(day);
    return completedHabits.filter(ch => ch.date === dateStr);
  };

  const isHabitCompleted = (day: number, habitId: string) => {
    const dateStr = formatDate(day);
    return completedHabits.some(ch => ch.date === dateStr && ch.habitId === habitId);
  };

  const toggleHabit = (day: number, habitId: string) => {
    const dateStr = formatDate(day);
    const exists = completedHabits.find(ch => ch.date === dateStr && ch.habitId === habitId);

    if (exists) {
      setCompletedHabits(prev => prev.filter(ch => !(ch.date === dateStr && ch.habitId === habitId)));
    } else {
      setCompletedHabits(prev => [...prev, { date: dateStr, habitId }]);
    }
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      color: selectedColor,
    };

    setHabits(prev => [...prev, newHabit]);
    setNewHabitName("");
    setSelectedColor("emerald");
    setShowAddModal(false);
  };

  const removeHabit = (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setCompletedHabits(prev => prev.filter(ch => ch.habitId !== habitId));
  };

  const calculateStreak = (habitId: string) => {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      const isCompleted = completedHabits.some(ch => ch.date === dateStr && ch.habitId === habitId);

      if (isCompleted) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streak === 0 && checkDate.toDateString() === today.toDateString()) {
        // Today not completed yet, check from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === month &&
           today.getFullYear() === year;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>

          <h1 className="text-xl font-bold text-white">Challenge</h1>

          <button
            onClick={signOut}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Habits List */}
        <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Twoje nawyki</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj
            </button>
          </div>

          {habits.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              Brak nawyków. Dodaj swój pierwszy nawyk!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {habits.map(habit => {
                const colors = getColorClasses(habit.color);
                const streak = calculateStreak(habit.id);

                return (
                  <div
                    key={habit.id}
                    className={`bg-slate-900/50 rounded-lg p-3 border-l-4 ${colors.border} flex items-center justify-between`}
                  >
                    <div>
                      <p className="text-white font-medium">{habit.name}</p>
                      {streak > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-xs text-orange-400">{streak} dni</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeHabit(habit.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const completed = getCompletedForDay(day);
              const allCompleted = habits.length > 0 && completed.length === habits.length;
              const someCompleted = completed.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative
                    ${isToday(day) ? 'ring-2 ring-emerald-500' : ''}
                    ${selectedDay === day ? 'bg-slate-700' : 'hover:bg-slate-700/50'}
                    ${allCompleted ? 'bg-emerald-500/20' : someCompleted ? 'bg-amber-500/10' : 'bg-slate-900/30'}
                  `}
                >
                  <span className={`text-sm ${isToday(day) ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {day}
                  </span>
                  {someCompleted && (
                    <div className="flex gap-0.5 mt-1">
                      {completed.slice(0, 3).map((ch, idx) => {
                        const habit = habits.find(h => h.id === ch.habitId);
                        if (!habit) return null;
                        const colors = getColorClasses(habit.color);
                        return (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${colors.bg}`}
                          />
                        );
                      })}
                      {completed.length > 3 && (
                        <span className="text-[8px] text-slate-400">+{completed.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDay && habits.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
            <h3 className="text-white font-semibold mb-3">
              {selectedDay} {monthNames[month]} {year}
            </h3>
            <div className="space-y-2">
              {habits.map(habit => {
                const colors = getColorClasses(habit.color);
                const completed = isHabitCompleted(selectedDay, habit.id);

                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(selectedDay, habit.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all
                      ${completed ? 'bg-slate-700' : 'bg-slate-900/50 hover:bg-slate-900'}
                    `}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                      ${completed ? `${colors.bg} ${colors.border}` : `border-slate-600`}
                    `}>
                      {completed && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`${completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {habit.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Dodaj nawyk</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Nazwa nawyku
                </label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="np. 20 pompek"
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Kolor
                </label>
                <div className="flex gap-2">
                  {COLORS.map(color => {
                    const colors = getColorClasses(color);
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full ${colors.bg} transition-transform
                          ${selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-800' : 'opacity-60 hover:opacity-100'}
                        `}
                      />
                    );
                  })}
                </div>
              </div>

              <button
                onClick={addHabit}
                disabled={!newHabitName.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg transition-colors font-medium"
              >
                Dodaj nawyk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
