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
  Trophy,
  Edit2,
  AlertTriangle,
  ArrowLeft
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
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  durationType: 'days' | 'weeks' | 'months' | 'year';
  durationValue: number;
  endDate: string; // YYYY-MM-DD
  habits: Habit[];
  completedHabits: CompletedHabit[];
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

  // Main state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Create/Edit challenge state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDurationType, setFormDurationType] = useState<'days' | 'weeks' | 'months' | 'year'>('days');
  const [formDurationValue, setFormDurationValue] = useState(30);
  const [formStartDate, setFormStartDate] = useState('');

  // Add habit state
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('emerald');

  const storageKey = `challenges_${user?.id}`;

  // Load data from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setChallenges(JSON.parse(saved));
      }
    }
  }, [user, storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(storageKey, JSON.stringify(challenges));
    }
  }, [challenges, user, storageKey]);

  // Update activeChallenge when challenges change
  useEffect(() => {
    if (activeChallenge) {
      const updated = challenges.find(c => c.id === activeChallenge.id);
      if (updated) {
        setActiveChallenge(updated);
      }
    }
  }, [challenges, activeChallenge?.id]);

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

  // Calculate end date
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

  // Format date for storage
  const formatDateStr = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Create new challenge
  const createChallenge = () => {
    const today = new Date();
    const startDateObj = formStartDate ? new Date(formStartDate) : today;
    const startDate = formatDateStr(startDateObj);
    const endDateObj = calculateEndDate(startDateObj, formDurationType, formDurationValue);
    const endDate = formatDateStr(endDateObj);

    const newChallenge: Challenge = {
      id: Date.now().toString(),
      name: formName.trim() || 'Nowe wyzwanie',
      startDate,
      durationType: formDurationType,
      durationValue: formDurationValue,
      endDate,
      habits: [],
      completedHabits: []
    };

    setChallenges(prev => [...prev, newChallenge]);
    resetForm();
    setShowCreateModal(false);
    setActiveChallenge(newChallenge);
    setView('detail');
  };

  // Update challenge
  const updateChallenge = () => {
    if (!editingChallenge) return;

    const startDateObj = new Date(formStartDate);
    const endDateObj = calculateEndDate(startDateObj, formDurationType, formDurationValue);

    setChallenges(prev => prev.map(c =>
      c.id === editingChallenge.id
        ? {
            ...c,
            name: formName.trim() || c.name,
            startDate: formStartDate,
            durationType: formDurationType,
            durationValue: formDurationValue,
            endDate: formatDateStr(endDateObj)
          }
        : c
    ));

    setShowEditModal(false);
    setEditingChallenge(null);
    resetForm();
  };

  // Delete challenge
  const deleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
    if (activeChallenge?.id === id) {
      setActiveChallenge(null);
      setView('list');
    }
    setShowDeleteConfirm(false);
    setEditingChallenge(null);
  };

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormDurationType('days');
    setFormDurationValue(30);
    setFormStartDate('');
  };

  // Open edit modal
  const openEditModal = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormName(challenge.name);
    setFormDurationType(challenge.durationType);
    setFormDurationValue(challenge.durationValue);
    setFormStartDate(challenge.startDate);
    setShowEditModal(true);
  };

  // Add habit to active challenge
  const addHabit = () => {
    if (!activeChallenge || !newHabitName.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      color: selectedColor
    };

    setChallenges(prev => prev.map(c =>
      c.id === activeChallenge.id
        ? { ...c, habits: [...c.habits, newHabit] }
        : c
    ));

    setNewHabitName('');
    setSelectedColor('emerald');
    setShowAddHabitModal(false);
  };

  // Remove habit from active challenge
  const removeHabit = (habitId: string) => {
    if (!activeChallenge) return;

    setChallenges(prev => prev.map(c =>
      c.id === activeChallenge.id
        ? {
            ...c,
            habits: c.habits.filter(h => h.id !== habitId),
            completedHabits: c.completedHabits.filter(ch => ch.habitId !== habitId)
          }
        : c
    ));
  };

  // Toggle habit completion
  const toggleHabit = (day: number, habitId: string) => {
    if (!activeChallenge) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const exists = activeChallenge.completedHabits.find(
      ch => ch.date === dateStr && ch.habitId === habitId
    );

    setChallenges(prev => prev.map(c =>
      c.id === activeChallenge.id
        ? {
            ...c,
            completedHabits: exists
              ? c.completedHabits.filter(ch => !(ch.date === dateStr && ch.habitId === habitId))
              : [...c.completedHabits, { date: dateStr, habitId }]
          }
        : c
    ));
  };

  // Get completed for day
  const getCompletedForDay = (day: number) => {
    if (!activeChallenge) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activeChallenge.completedHabits.filter(ch => ch.date === dateStr);
  };

  // Check if habit completed
  const isHabitCompleted = (day: number, habitId: string) => {
    if (!activeChallenge) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activeChallenge.completedHabits.some(ch => ch.date === dateStr && ch.habitId === habitId);
  };

  // Check if within challenge
  const isWithinChallenge = (day: number) => {
    if (!activeChallenge) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
  };

  // Is today
  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  // Get challenge progress
  const getChallengeProgress = (challenge: Challenge) => {
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
    const isCompleted = today > end;

    return { daysCompleted, totalDays, percentage, daysRemaining, isCompleted };
  };

  // Calculate streak
  const calculateStreak = (challenge: Challenge, habitId: string) => {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dateStr = formatDateStr(checkDate);
      const isCompleted = challenge.completedHabits.some(ch => ch.date === dateStr && ch.habitId === habitId);

      if (isCompleted) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streak === 0 && checkDate.toDateString() === today.toDateString()) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // RENDER: Challenge List View
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Powrót</span>
            </button>
            <h1 className="text-xl font-bold text-white">Wyzwania</h1>
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors text-sm">
              Wyloguj
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Twoje wyzwania</h2>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nowe wyzwanie
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-8 text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Brak wyzwań</h3>
              <p className="text-slate-400 mb-4">Utwórz swoje pierwsze wyzwanie!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map(challenge => {
                const progress = getChallengeProgress(challenge);
                return (
                  <div
                    key={challenge.id}
                    className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => { setActiveChallenge(challenge); setView('detail'); }}>
                        <h3 className="text-lg font-semibold text-white">{challenge.name}</h3>
                        <p className="text-slate-400 text-sm">
                          {challenge.startDate} - {challenge.endDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(challenge); }}
                          className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingChallenge(challenge); setShowDeleteConfirm(true); }}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {challenge.habits.length} {challenge.habits.length === 1 ? 'nawyk' : 'nawyków'}
                      </span>
                      <span className={progress.isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                        {progress.isCompleted ? 'Ukończone!' : `${progress.daysRemaining} dni pozostało`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Create Challenge Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Nowe wyzwanie</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nazwa wyzwania</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="np. 30 dni pompek"
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

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
                          setFormDurationType(option.value as typeof formDurationType);
                          if (option.value === 'year') setFormDurationValue(1);
                        }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all
                          ${formDurationType === option.value ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formDurationType !== 'year' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Liczba {formDurationType === 'days' ? 'dni' : formDurationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={formDurationType === 'days' ? 90 : 12}
                        value={formDurationValue}
                        onChange={(e) => setFormDurationValue(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-2xl font-bold text-white w-12 text-center">{formDurationValue}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={createChallenge}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg transition-colors font-bold"
                >
                  Utwórz wyzwanie
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Challenge Modal */}
        {showEditModal && editingChallenge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Edytuj wyzwanie</h3>
                <button onClick={() => { setShowEditModal(false); setEditingChallenge(null); }} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nazwa</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

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
                          setFormDurationType(option.value as typeof formDurationType);
                          if (option.value === 'year') setFormDurationValue(1);
                        }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all
                          ${formDurationType === option.value ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formDurationType !== 'year' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Liczba {formDurationType === 'days' ? 'dni' : formDurationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={formDurationType === 'days' ? 90 : 12}
                        value={formDurationValue}
                        onChange={(e) => setFormDurationValue(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-2xl font-bold text-white w-12 text-center">{formDurationValue}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowEditModal(false); setEditingChallenge(null); }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={updateChallenge}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && editingChallenge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Usuń wyzwanie?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Czy na pewno chcesz usunąć "{editingChallenge.name}"? Wszystkie postępy zostaną utracone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setEditingChallenge(null); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => deleteChallenge(editingChallenge.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg"
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER: Challenge Detail View
  if (view === 'detail' && activeChallenge) {
    const progress = getChallengeProgress(activeChallenge);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => { setView('list'); setActiveChallenge(null); setSelectedDay(null); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Wyzwania</span>
            </button>
            <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{activeChallenge.name}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(activeChallenge)}
                className="text-slate-400 hover:text-amber-400 transition-colors p-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditingChallenge(activeChallenge); setShowDeleteConfirm(true); }}
                className="text-slate-400 hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Progress */}
          <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-400 text-sm">{activeChallenge.startDate} - {activeChallenge.endDate}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-400">{progress.percentage}%</p>
              </div>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Dzień {progress.daysCompleted} z {progress.totalDays}</span>
              <span className="text-amber-400">{progress.daysRemaining} dni pozostało</span>
            </div>
            {progress.isCompleted && (
              <div className="mt-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                <p className="text-emerald-400 font-semibold">Wyzwanie ukończone!</p>
              </div>
            )}
          </div>

          {/* Habits */}
          <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nawyki</h2>
              <button
                onClick={() => setShowAddHabitModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Dodaj
              </button>
            </div>

            {activeChallenge.habits.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Brak nawyków. Dodaj pierwszy!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeChallenge.habits.map(habit => {
                  const colors = getColorClasses(habit.color);
                  const streak = calculateStreak(activeChallenge, habit.id);
                  return (
                    <div key={habit.id} className={`bg-slate-900/50 rounded-lg p-3 border-l-4 ${colors.border} flex items-center justify-between`}>
                      <div>
                        <p className="text-white font-medium">{habit.name}</p>
                        {streak > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-xs text-orange-400">{streak} dni</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeHabit(habit.id)} className="text-slate-500 hover:text-rose-400 p-1">
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
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-700 rounded-lg">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <h2 className="text-lg font-semibold text-white">{monthNames[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-700 rounded-lg">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs text-slate-500 py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const completed = getCompletedForDay(day);
                const allCompleted = activeChallenge.habits.length > 0 && completed.length === activeChallenge.habits.length;
                const someCompleted = completed.length > 0;
                const inChallenge = isWithinChallenge(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all
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
                          const habit = activeChallenge.habits.find(h => h.id === ch.habitId);
                          if (!habit) return null;
                          const colors = getColorClasses(habit.color);
                          return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />;
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day */}
          {selectedDay && activeChallenge.habits.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
              <h3 className="text-white font-semibold mb-3">{selectedDay} {monthNames[month]} {year}</h3>
              <div className="space-y-2">
                {activeChallenge.habits.map(habit => {
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
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center
                        ${completed ? `${colors.bg} ${colors.border}` : 'border-slate-600'}
                      `}>
                        {completed && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={completed ? 'text-slate-400 line-through' : 'text-white'}>{habit.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Add Habit Modal */}
        {showAddHabitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Dodaj nawyk</h3>
                <button onClick={() => setShowAddHabitModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nazwa</label>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="np. 20 pompek"
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Kolor</label>
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg font-medium"
                >
                  Dodaj nawyk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingChallenge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Edytuj wyzwanie</h3>
                <button onClick={() => { setShowEditModal(false); setEditingChallenge(null); }} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nazwa</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
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
                          setFormDurationType(option.value as typeof formDurationType);
                          if (option.value === 'year') setFormDurationValue(1);
                        }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all
                          ${formDurationType === option.value ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formDurationType !== 'year' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Liczba {formDurationType === 'days' ? 'dni' : formDurationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={formDurationType === 'days' ? 90 : 12}
                        value={formDurationValue}
                        onChange={(e) => setFormDurationValue(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-2xl font-bold text-white w-12 text-center">{formDurationValue}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">
                    Anuluj
                  </button>
                  <button onClick={updateChallenge} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg">
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && editingChallenge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Usuń wyzwanie?</h3>
              <p className="text-slate-400 text-sm mb-6">Wszystkie postępy zostaną utracone.</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">
                  Anuluj
                </button>
                <button onClick={() => deleteChallenge(editingChallenge.id)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg">
                  Usuń
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
