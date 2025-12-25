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

interface Challenge {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  completedDays: string[]; // Array of completed dates YYYY-MM-DD
}

interface ChallengeModeProps {
  onBack: () => void;
}

export default function ChallengeMode({ onBack }: ChallengeModeProps) {
  const { user, signOut } = useAuth();

  // Main state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDateMode, setFormDateMode] = useState<'duration' | 'dates'>('duration');
  const [formDurationType, setFormDurationType] = useState<'days' | 'weeks' | 'months' | 'year'>('days');
  const [formDurationValue, setFormDurationValue] = useState(30);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const storageKey = `challenges_v2_${user?.id}`;

  // Load from localStorage
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

  // Sync activeChallenge with challenges
  useEffect(() => {
    if (activeChallenge) {
      const updated = challenges.find(c => c.id === activeChallenge.id);
      if (updated) setActiveChallenge(updated);
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

  const formatDateStr = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const calculateEndDate = (startDate: Date, durationType: string, durationValue: number): Date => {
    const endDate = new Date(startDate);
    switch (durationType) {
      case 'days': endDate.setDate(endDate.getDate() + durationValue - 1); break;
      case 'weeks': endDate.setDate(endDate.getDate() + (durationValue * 7) - 1); break;
      case 'months': endDate.setMonth(endDate.getMonth() + durationValue); endDate.setDate(endDate.getDate() - 1); break;
      case 'year': endDate.setFullYear(endDate.getFullYear() + 1); endDate.setDate(endDate.getDate() - 1); break;
    }
    return endDate;
  };

  const resetForm = () => {
    setFormName('');
    setFormDateMode('duration');
    setFormDurationType('days');
    setFormDurationValue(30);
    setFormStartDate('');
    setFormEndDate('');
  };

  const createChallenge = () => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (formDateMode === 'dates') {
      startDate = formStartDate || formatDateStr(today);
      endDate = formEndDate || formatDateStr(today);
    } else {
      const startDateObj = formStartDate ? new Date(formStartDate) : today;
      startDate = formatDateStr(startDateObj);
      endDate = formatDateStr(calculateEndDate(startDateObj, formDurationType, formDurationValue));
    }

    const newChallenge: Challenge = {
      id: Date.now().toString(),
      name: formName.trim() || 'Nowe wyzwanie',
      startDate,
      endDate,
      completedDays: []
    };

    setChallenges(prev => [...prev, newChallenge]);
    resetForm();
    setShowCreateModal(false);
    setActiveChallenge(newChallenge);
    setView('detail');
  };

  const updateChallenge = () => {
    if (!editingChallenge) return;

    let endDate: string;
    if (formDateMode === 'dates') {
      endDate = formEndDate;
    } else {
      const startDateObj = new Date(formStartDate);
      endDate = formatDateStr(calculateEndDate(startDateObj, formDurationType, formDurationValue));
    }

    setChallenges(prev => prev.map(c =>
      c.id === editingChallenge.id
        ? { ...c, name: formName.trim() || c.name, startDate: formStartDate, endDate }
        : c
    ));

    setShowEditModal(false);
    setEditingChallenge(null);
    resetForm();
  };

  const deleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
    if (activeChallenge?.id === id) {
      setActiveChallenge(null);
      setView('list');
    }
    setShowDeleteConfirm(false);
    setEditingChallenge(null);
  };

  const openEditModal = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormName(challenge.name);
    setFormDateMode('dates');
    setFormStartDate(challenge.startDate);
    setFormEndDate(challenge.endDate);
    setShowEditModal(true);
  };

  // Toggle day completion for active challenge
  const toggleDay = (day: number) => {
    if (!activeChallenge) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setChallenges(prev => prev.map(c =>
      c.id === activeChallenge.id
        ? {
            ...c,
            completedDays: c.completedDays.includes(dateStr)
              ? c.completedDays.filter(d => d !== dateStr)
              : [...c.completedDays, dateStr]
          }
        : c
    ));
  };

  const isDayCompleted = (day: number): boolean => {
    if (!activeChallenge) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activeChallenge.completedDays.includes(dateStr);
  };

  const isWithinChallenge = (day: number): boolean => {
    if (!activeChallenge) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const getChallengeProgress = (challenge: Challenge) => {
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const completedCount = challenge.completedDays.length;
    const percentage = Math.round((completedCount / totalDays) * 100);
    const isCompleted = today > end;

    // Calculate streak
    let streak = 0;
    let checkDate = new Date(today);
    while (true) {
      const dateStr = formatDateStr(checkDate);
      if (challenge.completedDays.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streak === 0 && checkDate.toDateString() === today.toDateString()) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalDays, completedCount, percentage, isCompleted, streak };
  };

  // LIST VIEW
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
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors text-sm">Wyloguj</button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Twoje wyzwania</h2>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
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
              <p className="text-slate-400">Utwórz swoje pierwsze wyzwanie!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map(challenge => {
                const progress = getChallengeProgress(challenge);
                return (
                  <div
                    key={challenge.id}
                    className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
                    onClick={() => { setActiveChallenge(challenge); setView('detail'); }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{challenge.name}</h3>
                        <p className="text-slate-400 text-sm">{challenge.startDate} - {challenge.endDate}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditModal(challenge)} className="text-slate-400 hover:text-amber-400 p-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingChallenge(challenge); setShowDeleteConfirm(true); }} className="text-slate-400 hover:text-rose-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress.percentage}%` }} />
                    </div>

                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{progress.completedCount}/{progress.totalDays} dni</span>
                        {progress.streak > 0 && (
                          <span className="flex items-center gap-1 text-orange-400">
                            <Flame className="w-3 h-3" /> {progress.streak}
                          </span>
                        )}
                      </div>
                      <span className={progress.isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                        {progress.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Create Modal */}
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
                    placeholder="np. Pompki codziennie"
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Sposób ustalenia terminu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormDateMode('duration')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formDateMode === 'duration' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      Czas trwania
                    </button>
                    <button
                      onClick={() => setFormDateMode('dates')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formDateMode === 'dates' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      Własne daty
                    </button>
                  </div>
                </div>

                {formDateMode === 'dates' ? (
                  <>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                      <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Data zakończenia</label>
                      <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Typ okresu</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ value: 'days', label: 'Dni' }, { value: 'weeks', label: 'Tyg.' }, { value: 'months', label: 'Mies.' }, { value: 'year', label: 'Rok' }].map(option => (
                          <button
                            key={option.value}
                            onClick={() => { setFormDurationType(option.value as typeof formDurationType); if (option.value === 'year') setFormDurationValue(1); }}
                            className={`py-2 rounded-lg text-sm font-medium transition-all ${formDurationType === option.value ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
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
                          <input type="range" min={1} max={formDurationType === 'days' ? 90 : 12} value={formDurationValue}
                            onChange={(e) => setFormDurationValue(Number(e.target.value))} className="flex-1 accent-amber-500" />
                          <span className="text-2xl font-bold text-white w-12 text-center">{formDurationValue}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button onClick={createChallenge} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold">
                  Utwórz wyzwanie
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
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Sposób ustalenia terminu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFormDateMode('duration')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formDateMode === 'duration' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      Czas trwania
                    </button>
                    <button onClick={() => setFormDateMode('dates')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formDateMode === 'dates' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      Własne daty
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                  <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                </div>

                {formDateMode === 'dates' ? (
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Data zakończenia</label>
                    <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Typ okresu</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ value: 'days', label: 'Dni' }, { value: 'weeks', label: 'Tyg.' }, { value: 'months', label: 'Mies.' }, { value: 'year', label: 'Rok' }].map(option => (
                          <button key={option.value}
                            onClick={() => { setFormDurationType(option.value as typeof formDurationType); if (option.value === 'year') setFormDurationValue(1); }}
                            className={`py-2 rounded-lg text-sm font-medium transition-all ${formDurationType === option.value ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
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
                          <input type="range" min={1} max={formDurationType === 'days' ? 90 : 12} value={formDurationValue}
                            onChange={(e) => setFormDurationValue(Number(e.target.value))} className="flex-1 accent-amber-500" />
                          <span className="text-2xl font-bold text-white w-12 text-center">{formDurationValue}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">Anuluj</button>
                  <button onClick={updateChallenge} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg">Zapisz</button>
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
                <button onClick={() => { setShowDeleteConfirm(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">Anuluj</button>
                <button onClick={() => deleteChallenge(editingChallenge.id)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg">Usuń</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DETAIL VIEW
  if (view === 'detail' && activeChallenge) {
    const progress = getChallengeProgress(activeChallenge);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => { setView('list'); setActiveChallenge(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Wyzwania</span>
            </button>
            <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{activeChallenge.name}</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => openEditModal(activeChallenge)} className="text-slate-400 hover:text-amber-400 p-1">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingChallenge(activeChallenge); setShowDeleteConfirm(true); }} className="text-slate-400 hover:text-rose-400 p-1">
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
                {progress.streak > 0 && (
                  <p className="flex items-center gap-1 text-orange-400 text-sm mt-1">
                    <Flame className="w-4 h-4" /> {progress.streak} dni z rzędu
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-400">{progress.percentage}%</p>
                <p className="text-slate-400 text-xs">{progress.completedCount}/{progress.totalDays} dni</p>
              </div>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                style={{ width: `${progress.percentage}%` }} />
            </div>
            {progress.isCompleted && (
              <div className="mt-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                <p className="text-emerald-400 font-semibold">Wyzwanie zakończone!</p>
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
                const completed = isDayCompleted(day);
                const inChallenge = isWithinChallenge(day);

                return (
                  <button
                    key={day}
                    onClick={() => inChallenge && toggleDay(day)}
                    disabled={!inChallenge}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-all relative
                      ${isToday(day) ? 'ring-2 ring-emerald-500' : ''}
                      ${completed ? 'bg-emerald-500/30' : inChallenge ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-slate-900/30 opacity-40'}
                      ${inChallenge ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    {completed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                    <span className={`text-sm ${completed ? 'text-emerald-300' : isToday(day) ? 'text-emerald-400 font-bold' : inChallenge ? 'text-amber-200' : 'text-slate-500'}`}>
                      {day}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-slate-400 text-xs text-center mt-4">
              Kliknij na dzień w zakresie wyzwania, aby oznaczyć jako wykonane
            </p>
          </div>
        </main>

        {/* Edit Modal (reused) */}
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
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                  <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Data zakończenia</label>
                  <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">Anuluj</button>
                  <button onClick={updateChallenge} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg">Zapisz</button>
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
                <button onClick={() => { setShowDeleteConfirm(false); setEditingChallenge(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">Anuluj</button>
                <button onClick={() => deleteChallenge(editingChallenge.id)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg">Usuń</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
