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
  Trash2,
  Calendar,
  Trophy,
  RotateCcw,
  Edit2,
  AlertTriangle
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

interface Challenge {
  startDate: string; // YYYY-MM-DD
  durationType: 'days' | 'weeks' | 'months' | 'year';
  durationValue: number;
  endDate: string; // YYYY-MM-DD
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
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedColor, setSelectedColor] = useState("emerald");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Challenge setup state
  const [setupDurationType, setSetupDurationType] = useState<'days' | 'weeks' | 'months' | 'year'>('days');
  const [setupDurationValue, setSetupDurationValue] = useState(30);

  // Edit and delete modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editDurationType, setEditDurationType] = useState<'days' | 'weeks' | 'months' | 'year'>('days');
  const [editDurationValue, setEditDurationValue] = useState(30);
  const [editStartDate, setEditStartDate] = useState('');

  const storageKey = `habits_${user?.id}`;
  const completedKey = `completed_habits_${user?.id}`;
  const challengeKey = `challenge_${user?.id}`;

  // Load data from localStorage
  useEffect(() => {
    if (user) {
      const savedHabits = localStorage.getItem(storageKey);
      const savedCompleted = localStorage.getItem(completedKey);
      const savedChallenge = localStorage.getItem(challengeKey);

      if (savedHabits) {
        setHabits(JSON.parse(savedHabits));
      }
      if (savedCompleted) {
        setCompletedHabits(JSON.parse(savedCompleted));
      }
      if (savedChallenge) {
        setChallenge(JSON.parse(savedChallenge));
      }
    }
  }, [user, storageKey, completedKey, challengeKey]);

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

  // Save challenge to localStorage
  useEffect(() => {
    if (user && challenge) {
      localStorage.setItem(challengeKey, JSON.stringify(challenge));
    }
  }, [challenge, user, challengeKey]);

  // Calculate end date based on duration
  const calculateEndDate = (startDate: Date, durationType: string, durationValue: number): Date => {
    const endDate = new Date(startDate);
    switch (durationType) {
      case 'days':
        endDate.setDate(endDate.getDate() + durationValue - 1);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + (durationValue * 7) - 1);
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + durationValue);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
    }
    return endDate;
  };

  // Start a new challenge
  const startChallenge = () => {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const endDateObj = calculateEndDate(today, setupDurationType, setupDurationValue);
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    setChallenge({
      startDate,
      durationType: setupDurationType,
      durationValue: setupDurationValue,
      endDate
    });
  };

  // Reset challenge
  const resetChallenge = () => {
    setChallenge(null);
    setCompletedHabits([]);
    if (user) {
      localStorage.removeItem(challengeKey);
      localStorage.removeItem(completedKey);
    }
  };

  // Delete challenge (keeps habits, removes challenge and completed data)
  const deleteChallenge = () => {
    setChallenge(null);
    setCompletedHabits([]);
    if (user) {
      localStorage.removeItem(challengeKey);
      localStorage.removeItem(completedKey);
    }
    setShowDeleteConfirm(false);
  };

  // Open edit modal with current challenge values
  const openEditModal = () => {
    if (challenge) {
      setEditDurationType(challenge.durationType);
      setEditDurationValue(challenge.durationValue);
      setEditStartDate(challenge.startDate);
      setShowEditModal(true);
    }
  };

  // Save edited challenge
  const saveEditedChallenge = () => {
    const startDate = new Date(editStartDate);
    const endDateObj = calculateEndDate(startDate, editDurationType, editDurationValue);
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    setChallenge({
      startDate: editStartDate,
      durationType: editDurationType,
      durationValue: editDurationValue,
      endDate
    });
    setShowEditModal(false);
  };

  // Get challenge progress
  const getChallengeProgress = () => {
    if (!challenge) return { daysCompleted: 0, totalDays: 0, percentage: 0, daysRemaining: 0 };

    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysCompleted = Math.min(
      Math.max(Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 0),
      totalDays
    );
    const daysRemaining = Math.max(totalDays - daysCompleted, 0);
    const percentage = Math.round((daysCompleted / totalDays) * 100);

    return { daysCompleted, totalDays, percentage, daysRemaining };
  };

  // Check if a date is within the challenge period
  const isWithinChallenge = (day: number) => {
    if (!challenge) return false;
    const dateStr = formatDate(day);
    return dateStr >= challenge.startDate && dateStr <= challenge.endDate;
  };

  // Check if challenge is completed
  const isChallengeCompleted = () => {
    if (!challenge) return false;
    const today = new Date();
    const endDate = new Date(challenge.endDate);
    return today > endDate;
  };

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

  // Challenge Setup Screen
  if (!challenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Powrót</span>
            </button>
            <h1 className="text-xl font-bold text-white">Nowe Wyzwanie</h1>
            <button
              onClick={signOut}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Wyloguj
            </button>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Rozpocznij Wyzwanie</h2>
              <p className="text-slate-400">Wybierz jak długo ma trwać Twoje wyzwanie</p>
            </div>

            <div className="space-y-4">
              {/* Duration Type Selection */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Typ okresu</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'days', label: 'Dni' },
                    { value: 'weeks', label: 'Tygodnie' },
                    { value: 'months', label: 'Miesiące' },
                    { value: 'year', label: 'Rok' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSetupDurationType(option.value as typeof setupDurationType);
                        if (option.value === 'year') setSetupDurationValue(1);
                        else if (option.value === 'months') setSetupDurationValue(1);
                        else if (option.value === 'weeks') setSetupDurationValue(4);
                        else setSetupDurationValue(30);
                      }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all
                        ${setupDurationType === option.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Value */}
              {setupDurationType !== 'year' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Liczba {setupDurationType === 'days' ? 'dni' : setupDurationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={setupDurationType === 'days' ? 90 : setupDurationType === 'weeks' ? 12 : 12}
                      value={setupDurationValue}
                      onChange={(e) => setSetupDurationValue(Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-2xl font-bold text-white w-12 text-center">
                      {setupDurationValue}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Select */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Szybki wybór</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '7 dni' },
                    { days: 14, label: '2 tygodnie' },
                    { days: 30, label: '30 dni' },
                    { days: 60, label: '60 dni' },
                    { days: 90, label: '90 dni' },
                    { days: 365, label: '1 rok' },
                  ].map(option => (
                    <button
                      key={option.days}
                      onClick={() => {
                        if (option.days === 365) {
                          setSetupDurationType('year');
                          setSetupDurationValue(1);
                        } else if (option.days % 30 === 0 && option.days >= 30) {
                          setSetupDurationType('days');
                          setSetupDurationValue(option.days);
                        } else if (option.days % 7 === 0) {
                          setSetupDurationType('weeks');
                          setSetupDurationValue(option.days / 7);
                        } else {
                          setSetupDurationType('days');
                          setSetupDurationValue(option.days);
                        }
                      }}
                      className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
                <p className="text-slate-400 text-sm">Twoje wyzwanie będzie trwać:</p>
                <p className="text-xl font-bold text-amber-400">
                  {setupDurationType === 'year'
                    ? '1 rok'
                    : `${setupDurationValue} ${
                        setupDurationType === 'days'
                          ? (setupDurationValue === 1 ? 'dzień' : 'dni')
                          : setupDurationType === 'weeks'
                            ? (setupDurationValue === 1 ? 'tydzień' : 'tygodni')
                            : (setupDurationValue === 1 ? 'miesiąc' : 'miesięcy')
                      }`
                  }
                </p>
              </div>

              {/* Start Button */}
              <button
                onClick={startChallenge}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg transition-colors font-bold text-lg mt-4"
              >
                Rozpocznij Wyzwanie
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const progress = getChallengeProgress();

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

          <div className="flex items-center gap-3">
            <button
              onClick={openEditModal}
              className="text-slate-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-1"
              title="Edytuj wyzwanie"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-slate-400 hover:text-rose-400 transition-colors text-sm flex items-center gap-1"
              title="Usuń wyzwanie"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={signOut}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Challenge Progress */}
        <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Twoje Wyzwanie</h2>
                <p className="text-slate-400 text-sm">
                  {challenge.startDate} - {challenge.endDate}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-400">{progress.percentage}%</p>
              <p className="text-slate-400 text-xs">ukończone</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Dzień <span className="text-white font-medium">{progress.daysCompleted}</span> z {progress.totalDays}
            </span>
            <span className="text-slate-400">
              Pozostało: <span className="text-amber-400 font-medium">{progress.daysRemaining} dni</span>
            </span>
          </div>

          {isChallengeCompleted() && (
            <div className="mt-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3 text-center">
              <p className="text-emerald-400 font-semibold">Gratulacje! Wyzwanie ukończone!</p>
            </div>
          )}
        </div>

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
              const inChallenge = isWithinChallenge(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative
                    ${isToday(day) ? 'ring-2 ring-emerald-500' : ''}
                    ${selectedDay === day ? 'bg-slate-700' : 'hover:bg-slate-700/50'}
                    ${allCompleted ? 'bg-emerald-500/20' : someCompleted ? 'bg-amber-500/10' : inChallenge ? 'bg-amber-500/5' : 'bg-slate-900/30'}
                    ${inChallenge && !allCompleted && !someCompleted ? 'border border-amber-500/30' : ''}
                  `}
                >
                  <span className={`text-sm ${isToday(day) ? 'text-emerald-400 font-bold' : inChallenge ? 'text-amber-200' : 'text-slate-300'}`}>
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

      {/* Edit Challenge Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edytuj wyzwanie</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Data rozpoczęcia
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Duration Type */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Typ okresu</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'days', label: 'Dni' },
                    { value: 'weeks', label: 'Tyg.' },
                    { value: 'months', label: 'Mies.' },
                    { value: 'year', label: 'Rok' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setEditDurationType(option.value as typeof editDurationType);
                        if (option.value === 'year') setEditDurationValue(1);
                      }}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-all
                        ${editDurationType === option.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Value */}
              {editDurationType !== 'year' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Liczba {editDurationType === 'days' ? 'dni' : editDurationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={editDurationType === 'days' ? 90 : 12}
                      value={editDurationValue}
                      onChange={(e) => setEditDurationValue(Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-2xl font-bold text-white w-12 text-center">
                      {editDurationValue}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors font-medium"
                >
                  Anuluj
                </button>
                <button
                  onClick={saveEditedChallenge}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg transition-colors font-medium"
                >
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Usuń wyzwanie?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Czy na pewno chcesz usunąć to wyzwanie? Wszystkie postępy zostaną utracone. Nawyki pozostaną zachowane.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors font-medium"
                >
                  Anuluj
                </button>
                <button
                  onClick={deleteChallenge}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg transition-colors font-medium"
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
