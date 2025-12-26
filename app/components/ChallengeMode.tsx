"use client";

import { useState, useEffect } from "react";
import { Check, Flame, Home, Plus, Trophy, Edit2, Trash2, ArrowLeft, Loader2, Calendar as CalendarIcon, List, Grid3X3, LayoutList, BarChart3, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import Calendar, { isToday } from "./shared/Calendar";
import SyncIndicator from "./shared/SyncIndicator";
import {
  Challenge,
  ChallengeFormData,
  DEFAULT_FORM_DATA,
  useChallenges,
  getChallengeProgress,
  ChallengeFormModal,
  ChallengeCard,
  DeleteConfirmModal,
  RepsModal
} from "./challenge";

interface ChallengeModeProps {
  onBack: () => void;
}

export default function ChallengeMode({ onBack }: ChallengeModeProps) {
  const { user, signOut } = useAuth();
  const {
    challenges,
    isLoading,
    isSyncing,
    syncError,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    updateCompletedDays,
    updateDailyGoals
  } = useChallenges(user?.id);

  // View state
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [detailView, setDetailView] = useState<'calendar' | 'grid' | 'checklist' | 'table'>('calendar');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  // Helper: get week days for given offset
  const getWeekDays = (offset: number): Date[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  // Helper: format date to YYYY-MM-DD
  const formatDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Helper: get week number
  const getWeekNumber = (d: Date): number => {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil((diff / oneWeek) + 1);
  };

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ChallengeFormData>(DEFAULT_FORM_DATA);

  // Reps modal state
  const [showRepsModal, setShowRepsModal] = useState(false);
  const [repsDay, setRepsDay] = useState<number>(0);
  const [repsValue, setRepsValue] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Sync activeChallenge with challenges
  useEffect(() => {
    if (activeChallenge) {
      const updated = challenges.find(c => c.id === activeChallenge.id);
      if (updated) setActiveChallenge(updated);
    }
  }, [challenges, activeChallenge?.id]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const resetForm = () => setFormData(DEFAULT_FORM_DATA);

  const handleCreate = async () => {
    const newChallenge = await createChallenge(formData);
    if (newChallenge) {
      setActiveChallenge(newChallenge);
      setView('detail');
    }
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (editingChallengeId) {
      await updateChallenge(editingChallengeId, formData);
    }
    setShowEditModal(false);
    setEditingChallengeId(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (editingChallengeId) {
      await deleteChallenge(editingChallengeId);
      if (activeChallenge?.id === editingChallengeId) {
        setActiveChallenge(null);
        setView('list');
      }
    }
    setShowDeleteConfirm(false);
    setEditingChallengeId(null);
  };

  const openEditModal = (challenge: Challenge) => {
    setEditingChallengeId(challenge.id);
    setFormData({
      name: challenge.name,
      dateMode: 'dates',
      durationType: 'days',
      durationValue: 30,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      trackReps: challenge.trackReps,
      goalUnit: challenge.goalUnit || 'powtórzeń'
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (challengeId: string) => {
    setEditingChallengeId(challengeId);
    setShowDeleteConfirm(true);
  };

  const handleDayClick = (day: number, dateStr: string) => {
    if (!activeChallenge) return;
    const inChallenge = dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
    if (!inChallenge) return;

    // Parse month from dateStr for modal display
    const dateParts = dateStr.split('-');
    const clickedMonth = parseInt(dateParts[1]) - 1; // 0-indexed month

    if (activeChallenge.trackReps) {
      const currentReps = activeChallenge.completedDays[dateStr] || 0;
      const currentGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
      setRepsDay(day);
      setRepsValue(currentReps > 0 ? currentReps.toString() : '');
      setGoalValue(currentGoal > 0 ? currentGoal.toString() : '');
      setCurrentDateStr(dateStr);
      setCurrentDate(new Date(parseInt(dateParts[0]), clickedMonth, day));
      setShowRepsModal(true);
    } else {
      const newCompletedDays = activeChallenge.completedDays[dateStr]
        ? Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== dateStr))
        : { ...activeChallenge.completedDays, [dateStr]: 1 };
      updateCompletedDays(activeChallenge.id, newCompletedDays);
    }
  };

  // Handler for matrix cell clicks (from dashboard view)
  const handleMatrixCellClick = (challenge: Challenge, dateStr: string) => {
    const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
    if (!inChallenge) return;

    const dateParts = dateStr.split('-');
    const day = parseInt(dateParts[2]);
    const clickedMonth = parseInt(dateParts[1]) - 1;

    if (challenge.trackReps) {
      // For reps tracking, set active challenge and open modal
      setActiveChallenge(challenge);
      const currentReps = challenge.completedDays[dateStr] || 0;
      const currentGoal = challenge.dailyGoals?.[dateStr] || 0;
      setRepsDay(day);
      setRepsValue(currentReps > 0 ? currentReps.toString() : '');
      setGoalValue(currentGoal > 0 ? currentGoal.toString() : '');
      setCurrentDateStr(dateStr);
      setCurrentDate(new Date(parseInt(dateParts[0]), clickedMonth, day));
      setShowRepsModal(true);
    } else {
      // For simple tracking, toggle directly
      const newCompletedDays = challenge.completedDays[dateStr]
        ? Object.fromEntries(Object.entries(challenge.completedDays).filter(([d]) => d !== dateStr))
        : { ...challenge.completedDays, [dateStr]: 1 };
      updateCompletedDays(challenge.id, newCompletedDays);
    }
  };

  const saveReps = () => {
    if (!activeChallenge || !currentDateStr) return;
    const reps = parseInt(repsValue) || 0;
    const goal = parseInt(goalValue) || 0;

    // Zapisz wykonane powtórzenia
    const newCompletedDays = reps > 0
      ? { ...activeChallenge.completedDays, [currentDateStr]: reps }
      : Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== currentDateStr));

    updateCompletedDays(activeChallenge.id, newCompletedDays);

    // Zapisz cel na ten dzień
    const newDailyGoals = goal > 0
      ? { ...(activeChallenge.dailyGoals || {}), [currentDateStr]: goal }
      : Object.fromEntries(Object.entries(activeChallenge.dailyGoals || {}).filter(([d]) => d !== currentDateStr));

    updateDailyGoals(activeChallenge.id, newDailyGoals);
    setShowRepsModal(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Ładowanie wyzwań...</p>
        </div>
      </div>
    );
  }

  // DASHBOARD MATRIX VIEW
  if (view === 'list') {
    const weekDays = getWeekDays(weekOffset);
    const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
    const weekNum = getWeekNumber(weekDays[0]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Powrót</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Wyzwania</h1>
              <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
            </div>
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors text-sm">
              Wyloguj
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Tydzień {weekNum}</h2>
              <p className="text-xs text-slate-500">
                {weekDays[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-8 text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Brak wyzwań</h3>
              <p className="text-slate-400 mb-4">Utwórz swoje pierwsze wyzwanie!</p>
              <button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Nowe wyzwanie
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              {/* Matrix Header */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-600">
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 min-w-[160px]">
                        Wyzwanie
                      </th>
                      {weekDays.map((day, idx) => {
                        const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());
                        return (
                          <th
                            key={idx}
                            className={`text-center px-2 py-3 min-w-[48px] ${isCurrentDay ? 'bg-emerald-500/20' : ''}`}
                          >
                            <div className={`text-xs font-medium ${isCurrentDay ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {dayNames[idx]}
                            </div>
                            <div className={`text-sm font-bold ${isCurrentDay ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {day.getDate()}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {challenges.map(challenge => {
                      const progress = getChallengeProgress(challenge);
                      return (
                        <tr key={challenge.id} className="hover:bg-slate-700/30 transition-colors">
                          {/* Challenge name - click to go to details */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setActiveChallenge(challenge); setView('detail'); }}
                              className="flex items-center gap-2 group text-left w-full"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors truncate">
                                  {challenge.name}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <span>{progress.completedCount}/{progress.totalDays}</span>
                                  {challenge.trackReps && challenge.goalUnit && (
                                    <span className="text-amber-500/70">{challenge.goalUnit}</span>
                                  )}
                                  {progress.streak > 0 && (
                                    <span className="flex items-center gap-0.5 text-orange-400">
                                      <Flame className="w-3 h-3" />{progress.streak}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Info className="w-4 h-4 text-slate-500 group-hover:text-amber-400 flex-shrink-0" />
                            </button>
                          </td>

                          {/* Day cells */}
                          {weekDays.map((day, dayIdx) => {
                            const dateStr = formatDate(day);
                            const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
                            const completed = !!challenge.completedDays[dateStr];
                            const reps = challenge.completedDays[dateStr] || 0;
                            const dayGoal = challenge.dailyGoals?.[dateStr] || 0;
                            const goalReached = dayGoal > 0 && reps >= dayGoal;
                            const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());

                            if (!inChallenge) {
                              return (
                                <td key={dayIdx} className={`text-center px-2 py-3 ${isCurrentDay ? 'bg-emerald-500/10' : ''}`}>
                                  <div className="w-8 h-8 mx-auto rounded-lg bg-slate-800/30 opacity-30" />
                                </td>
                              );
                            }

                            return (
                              <td key={dayIdx} className={`text-center px-2 py-3 ${isCurrentDay ? 'bg-emerald-500/10' : ''}`}>
                                <button
                                  onClick={() => handleMatrixCellClick(challenge, dateStr)}
                                  className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all ${
                                    goalReached ? 'bg-emerald-600 text-white hover:bg-emerald-500' :
                                    completed ? 'bg-amber-600 text-white hover:bg-amber-500' :
                                    dayGoal > 0 ? 'border-2 border-dashed border-amber-500/50 hover:border-amber-400 text-slate-400' :
                                    'border-2 border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300'
                                  } ${isCurrentDay ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-800' : ''}`}
                                >
                                  {goalReached || (completed && !challenge.trackReps) ? (
                                    <Check className="w-4 h-4" />
                                  ) : challenge.trackReps && reps > 0 ? (
                                    <span className="text-xs font-bold">{reps > 99 ? '99' : reps}</span>
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add new challenge button */}
              <div className="border-t border-slate-700 p-3">
                <button
                  onClick={() => { resetForm(); setShowCreateModal(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Dodaj wyzwanie</span>
                </button>
              </div>
            </div>
          )}

          {/* Today button */}
          {weekOffset !== 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setWeekOffset(0)}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                ← Wróć do bieżącego tygodnia
              </button>
            </div>
          )}
        </main>

        <ChallengeFormModal
          isOpen={showCreateModal}
          formData={formData}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />

        <ChallengeFormModal
          isOpen={showEditModal}
          isEdit
          formData={formData}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleUpdate}
          onClose={() => { setShowEditModal(false); setEditingChallengeId(null); }}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setEditingChallengeId(null); }}
        />

        {/* RepsModal for matrix view */}
        {activeChallenge && (
          <RepsModal
            isOpen={showRepsModal}
            day={repsDay}
            month={currentDate.getMonth()}
            value={repsValue}
            goalValue={goalValue}
            goalUnit={activeChallenge.goalUnit}
            onGoalChange={setGoalValue}
            onChange={setRepsValue}
            onSave={saveReps}
            onDelete={() => { setRepsValue('0'); setGoalValue('0'); saveReps(); }}
            onClose={() => { setShowRepsModal(false); setActiveChallenge(null); }}
          />
        )}
      </div>
    );
  }

  // DETAIL VIEW
  if (view === 'detail' && activeChallenge) {
    const progress = getChallengeProgress(activeChallenge);

    const renderDay = (day: number, dateStr: string) => {
      const completed = !!activeChallenge.completedDays[dateStr];
      const inChallenge = dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
      const reps = activeChallenge.completedDays[dateStr] || 0;
      const dayGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
      const today = isToday(day, month, year);
      const hasGoal = dayGoal > 0;
      const goalReached = hasGoal && reps >= dayGoal;

      // Określ styl tła
      let bgClass = 'bg-slate-900/30 opacity-40'; // poza wyzwaniem
      if (inChallenge) {
        if (goalReached) {
          bgClass = 'bg-emerald-600/40 border-2 border-emerald-500';
        } else if (reps > 0 && hasGoal) {
          bgClass = 'bg-amber-600/30 border-2 border-amber-500/50';
        } else if (reps > 0) {
          bgClass = 'bg-amber-500/30';
        } else if (hasGoal) {
          bgClass = 'bg-slate-700/50 border border-dashed border-amber-500/30 hover:bg-slate-700';
        } else {
          bgClass = 'bg-slate-800/50 hover:bg-slate-700';
        }
      }

      return (
        <button
          onClick={() => handleDayClick(day, dateStr)}
          disabled={!inChallenge}
          className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative p-1
            ${today ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}
            ${bgClass}
            ${inChallenge ? 'cursor-pointer' : 'cursor-not-allowed'}
          `}
        >
          {completed && !activeChallenge.trackReps && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <span className={`text-base font-medium ${goalReached ? 'text-emerald-300' : completed ? 'text-amber-300' : today ? 'text-emerald-400 font-bold' : inChallenge ? 'text-slate-200' : 'text-slate-600'}`}>
            {day}
          </span>
          {activeChallenge.trackReps && (
            <>
              {hasGoal && reps > 0 && (
                <span className={`text-xs font-bold ${goalReached ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {reps}/{dayGoal}
                </span>
              )}
              {hasGoal && reps === 0 && (
                <span className="text-xs text-slate-500">cel: {dayGoal}</span>
              )}
              {!hasGoal && reps > 0 && (
                <span className="text-xs font-bold text-amber-400">{reps}</span>
              )}
            </>
          )}
          {goalReached && (
            <Check className="w-4 h-4 text-emerald-400 absolute top-0.5 right-0.5" />
          )}
        </button>
      );
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <header className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => { setView('list'); setActiveChallenge(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Wyzwania</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{activeChallenge.name}</h1>
              <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEditModal(activeChallenge)} className="text-slate-400 hover:text-amber-400 p-1">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => openDeleteConfirm(activeChallenge.id)} className="text-slate-400 hover:text-rose-400 p-1">
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
                {activeChallenge.trackReps && activeChallenge.goalUnit && (
                  <p className="text-amber-400 text-sm mt-1">
                    Jednostka: {activeChallenge.goalUnit}
                  </p>
                )}
                {progress.streak > 0 && (
                  <p className="flex items-center gap-1 text-orange-400 text-sm mt-1">
                    <Flame className="w-4 h-4" /> {progress.streak} dni z rzędu
                  </p>
                )}
              </div>
              <div className="text-right">
                {activeChallenge.trackReps && progress.totalReps > 0 && (
                  <p className="text-2xl font-bold text-amber-400">{progress.totalReps}</p>
                )}
                {!activeChallenge.trackReps && (
                  <p className="text-2xl font-bold text-amber-400">{progress.percentage}%</p>
                )}
                <p className="text-slate-400 text-xs">{progress.completedCount}/{progress.totalDays} dni</p>
                {activeChallenge.dailyGoals && Object.keys(activeChallenge.dailyGoals).length > 0 && (
                  <p className="text-emerald-400 text-xs">
                    {Object.entries(activeChallenge.completedDays).filter(([date, reps]) =>
                      activeChallenge.dailyGoals?.[date] && reps >= activeChallenge.dailyGoals[date]
                    ).length} dni z celem
                  </p>
                )}
              </div>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.isCompleted && (
              <div className="mt-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                <p className="text-emerald-400 font-semibold">Wyzwanie zakończone!</p>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setDetailView('calendar')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
                detailView === 'calendar' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Miesiąc</span>
            </button>
            <button
              onClick={() => setDetailView('grid')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
                detailView === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">Siatka</span>
            </button>
            <button
              onClick={() => setDetailView('checklist')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
                detailView === 'checklist' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span className="text-sm font-medium">Lista</span>
            </button>
            {activeChallenge.trackReps && (
              <button
                onClick={() => setDetailView('table')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
                  detailView === 'table' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Analiza</span>
              </button>
            )}
          </div>

          {/* Calendar View */}
          {detailView === 'calendar' && (
            <>
              <Calendar
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                renderDay={renderDay}
              />
              <p className="text-slate-400 text-xs text-center">
                {activeChallenge.trackReps
                  ? 'Kliknij na dzień aby wpisać liczbę powtórzeń'
                  : 'Kliknij na dzień w zakresie wyzwania, aby oznaczyć jako wykonane'}
              </p>
            </>
          )}

          {/* Weekly Grid View */}
          {detailView === 'grid' && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              {(() => {
                const start = new Date(activeChallenge.startDate);
                const end = new Date(activeChallenge.endDate);
                const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

                // Find the Monday of the first week
                const firstDay = new Date(start);
                const dayOfWeek = firstDay.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                firstDay.setDate(firstDay.getDate() + mondayOffset);

                // Build weeks array
                const weeks: Date[][] = [];
                let currentWeek: Date[] = [];
                let current = new Date(firstDay);

                while (current <= end || currentWeek.length > 0) {
                  currentWeek.push(new Date(current));
                  if (currentWeek.length === 7) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                  }
                  current.setDate(current.getDate() + 1);
                  if (current > end && currentWeek.length === 0) break;
                }

                return (
                  <>
                    {/* Header */}
                    <div className="grid grid-cols-8 bg-slate-700/50 border-b border-slate-600">
                      <div className="p-2 text-center text-xs text-slate-400 font-medium">Tydz.</div>
                      {dayNames.map(day => (
                        <div key={day} className="p-2 text-center text-xs text-slate-400 font-medium">{day}</div>
                      ))}
                    </div>
                    {/* Weeks */}
                    <div className="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto">
                      {weeks.map((week, weekIdx) => {
                        const weekNum = weekIdx + 1;
                        return (
                          <div key={weekIdx} className="grid grid-cols-8">
                            <div className="p-2 flex items-center justify-center text-xs text-slate-500 bg-slate-800/30">
                              {weekNum}
                            </div>
                            {week.map((day, dayIdx) => {
                              const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                              const inChallenge = dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
                              const completed = !!activeChallenge.completedDays[dateStr];
                              const reps = activeChallenge.completedDays[dateStr] || 0;
                              const dayGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
                              const goalReached = dayGoal > 0 && reps >= dayGoal;
                              const todayCheck = isToday(day.getDate(), day.getMonth(), day.getFullYear());

                              if (!inChallenge) {
                                return (
                                  <div key={dayIdx} className="p-1.5 flex items-center justify-center">
                                    <div className="w-8 h-8 flex items-center justify-center text-xs text-slate-600">
                                      {day.getDate()}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={dayIdx}
                                  onClick={() => handleDayClick(day.getDate(), dateStr)}
                                  className={`p-1.5 flex items-center justify-center transition-colors ${todayCheck ? 'bg-emerald-500/10' : 'hover:bg-slate-700/50'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    goalReached ? 'bg-emerald-600 text-white' :
                                    completed ? 'bg-amber-600 text-white' :
                                    dayGoal > 0 ? 'border-2 border-dashed border-amber-500/50 text-slate-300' :
                                    'border-2 border-slate-600 text-slate-300'
                                  } ${todayCheck ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-800' : ''}`}>
                                    {goalReached || (completed && !activeChallenge.trackReps) ? (
                                      <Check className="w-4 h-4" />
                                    ) : activeChallenge.trackReps && reps > 0 ? (
                                      <span className="text-xs font-bold">{reps}</span>
                                    ) : (
                                      <span className="text-xs">{day.getDate()}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Checklist View */}
          {detailView === 'checklist' && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
                {(() => {
                  const start = new Date(activeChallenge.startDate);
                  const end = new Date(activeChallenge.endDate);
                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                  }
                  const dayLabels = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

                  return days.map((day) => {
                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                    const completed = !!activeChallenge.completedDays[dateStr];
                    const reps = activeChallenge.completedDays[dateStr] || 0;
                    const dayGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
                    const goalReached = dayGoal > 0 && reps >= dayGoal;
                    const todayCheck = isToday(day.getDate(), day.getMonth(), day.getFullYear());

                    return (
                      <button
                        key={dateStr}
                        onClick={() => handleDayClick(day.getDate(), dateStr)}
                        className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700/50 transition-colors ${
                          todayCheck ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                          goalReached ? 'bg-emerald-600 text-white' :
                          completed ? 'bg-amber-600 text-white' :
                          dayGoal > 0 ? 'border-2 border-dashed border-amber-500/50' :
                          'border-2 border-slate-600'
                        }`}>
                          {(goalReached || (completed && !activeChallenge.trackReps)) && (
                            <Check className="w-4 h-4" />
                          )}
                          {activeChallenge.trackReps && reps > 0 && !goalReached && (
                            <span className="text-xs font-bold">{reps > 99 ? '99+' : reps}</span>
                          )}
                        </div>

                        {/* Day info */}
                        <div className="flex-1 text-left">
                          <div className={`font-medium ${todayCheck ? 'text-emerald-400' : goalReached ? 'text-emerald-300' : completed ? 'text-amber-300' : 'text-slate-200'}`}>
                            {day.getDate()} {day.toLocaleDateString('pl-PL', { month: 'long' })}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dayLabels[day.getDay()]}
                          </div>
                        </div>

                        {/* Progress info */}
                        {activeChallenge.trackReps && (
                          <div className="text-right flex-shrink-0">
                            {dayGoal > 0 ? (
                              <>
                                <div className={`text-sm font-bold ${goalReached ? 'text-emerald-400' : reps > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {reps}/{dayGoal}
                                </div>
                                <div className="text-xs text-slate-500">{activeChallenge.goalUnit}</div>
                              </>
                            ) : reps > 0 ? (
                              <div className="text-sm font-bold text-amber-400">{reps}</div>
                            ) : null}
                          </div>
                        )}

                        {todayCheck && (
                          <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex-shrink-0">
                            dziś
                          </div>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Table/Analysis View */}
          {detailView === 'table' && activeChallenge.trackReps && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600">
                <h3 className="text-white font-semibold text-center">Analiza postępów</h3>
              </div>
              <div className="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto">
                {(() => {
                  const start = new Date(activeChallenge.startDate);
                  const end = new Date(activeChallenge.endDate);
                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                  }
                  return days.map((day, idx) => {
                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                    const dayGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
                    const reps = activeChallenge.completedDays[dateStr] || 0;
                    const progress = dayGoal > 0 ? Math.min(100, Math.round((reps / dayGoal) * 100)) : 0;
                    const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());
                    const isPast = day < new Date(new Date().setHours(0,0,0,0));

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          setRepsDay(day.getDate());
                          setRepsValue(reps > 0 ? reps.toString() : '');
                          setGoalValue(dayGoal > 0 ? dayGoal.toString() : '');
                          setCurrentDateStr(dateStr);
                          setCurrentDate(day);
                          setShowRepsModal(true);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700/50 transition-colors ${
                          isCurrentDay ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <div className="w-12 text-center">
                          <div className={`text-lg font-bold ${isCurrentDay ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {day.getDate()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {day.toLocaleDateString('pl-PL', { weekday: 'short' })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-400">
                              {dayGoal > 0 ? `Cel: ${dayGoal}` : 'Brak celu'}
                            </span>
                            <span className={`text-sm font-bold ${
                              reps >= dayGoal && dayGoal > 0 ? 'text-emerald-400' : reps > 0 ? 'text-amber-400' : 'text-slate-500'
                            }`}>
                              {reps > 0 ? reps : '-'}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progress >= 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-amber-500' : 'bg-slate-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right">
                          {dayGoal > 0 && (
                            <span className={`text-sm font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {progress}%
                            </span>
                          )}
                          {progress >= 100 && <Check className="w-4 h-4 text-emerald-400 inline ml-1" />}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </main>

        <RepsModal
          isOpen={showRepsModal}
          day={repsDay}
          month={month}
          value={repsValue}
          goalValue={goalValue}
          goalUnit={activeChallenge.goalUnit}
          onGoalChange={setGoalValue}
          onChange={setRepsValue}
          onSave={saveReps}
          onDelete={() => { setRepsValue('0'); setGoalValue('0'); saveReps(); }}
          onClose={() => setShowRepsModal(false)}
        />

        <ChallengeFormModal
          isOpen={showEditModal}
          isEdit
          formData={formData}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleUpdate}
          onClose={() => { setShowEditModal(false); setEditingChallengeId(null); }}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setEditingChallengeId(null); }}
        />
      </div>
    );
  }

  return null;
}
