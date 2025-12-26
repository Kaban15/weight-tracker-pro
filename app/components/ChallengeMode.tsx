"use client";

import { useState, useEffect } from "react";
import { Check, Flame, Home, Plus, Trophy, Edit2, Trash2, ArrowLeft, Loader2, Grid3X3, BarChart3, ChevronLeft, ChevronRight, Info, History, Zap } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isToday } from "./shared/Calendar";
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
  const [detailView, setDetailView] = useState<'grid' | 'table'>('grid');
  const [dashboardTab, setDashboardTab] = useState<'active' | 'history'>('active');
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
    await createChallenge(formData);
    setShowCreateModal(false);
    resetForm();
    // Stay on dashboard - user can click challenge name to see details
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
      goalUnit: challenge.goalUnit || 'powtórzeń',
      defaultGoal: 0
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

  // Handler for matrix cell clicks (from dashboard view) - simple toggle only
  const handleMatrixCellClick = (challenge: Challenge, dateStr: string) => {
    const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
    if (!inChallenge) return;

    // Simple toggle for all challenges (no modal)
    const newCompletedDays = challenge.completedDays[dateStr]
      ? Object.fromEntries(Object.entries(challenge.completedDays).filter(([d]) => d !== dateStr))
      : { ...challenge.completedDays, [dateStr]: 1 };
    updateCompletedDays(challenge.id, newCompletedDays);
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
          {/* Week Navigation - only show for active tab */}
          {dashboardTab === 'active' && (
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
          )}

          {/* Tab Toggle */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const activeChallenges = challenges.filter(c => new Date(c.endDate) >= today);
            const completedChallenges = challenges.filter(c => new Date(c.endDate) < today);

            return (
              <>
                <div className="flex gap-2 mb-4 bg-slate-800/50 p-1 rounded-lg">
                  <button
                    onClick={() => setDashboardTab('active')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all ${
                      dashboardTab === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Aktywne</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${dashboardTab === 'active' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      {activeChallenges.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setDashboardTab('history')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all ${
                      dashboardTab === 'history' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span className="text-sm font-medium">Historia</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${dashboardTab === 'history' ? 'bg-slate-500' : 'bg-slate-700'}`}>
                      {completedChallenges.length}
                    </span>
                  </button>
                </div>

                {/* History View */}
                {dashboardTab === 'history' && (
                  completedChallenges.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-8 text-center">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Brak historii</h3>
                      <p className="text-slate-400">Ukończone wyzwania pojawią się tutaj</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedChallenges.map(challenge => {
                        const progress = getChallengeProgress(challenge);
                        return (
                          <button
                            key={challenge.id}
                            onClick={() => { setActiveChallenge(challenge); setView('detail'); }}
                            className="w-full bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:bg-slate-700/50 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white truncate">{challenge.name}</h3>
                                <p className="text-xs text-slate-500">
                                  {challenge.startDate} - {challenge.endDate}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {progress.percentage >= 100 ? (
                                  <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg">
                                    <Trophy className="w-4 h-4" />
                                    <span className="text-sm font-medium">100%</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">
                                    <span className="text-sm font-medium">{progress.percentage}%</span>
                                  </div>
                                )}
                                <Info className="w-4 h-4 text-slate-500" />
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span>{progress.completedCount}/{progress.totalDays} dni</span>
                              {challenge.trackReps && progress.totalReps > 0 && (
                                <span className="text-amber-400">{progress.totalReps} {challenge.goalUnit}</span>
                              )}
                            </div>
                            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${progress.percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </>
            );
          })()}

          {dashboardTab === 'active' && challenges.filter(c => new Date(c.endDate) >= new Date(new Date().setHours(0, 0, 0, 0))).length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-8 text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Brak aktywnych wyzwań</h3>
              <p className="text-slate-400 mb-4">Utwórz nowe wyzwanie lub sprawdź historię!</p>
              <button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Nowe wyzwanie
              </button>
            </div>
          ) : dashboardTab === 'active' && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              {/* Matrix Header */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-600">
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 min-w-[140px]">
                        Wyzwanie
                      </th>
                      {weekDays.map((day, idx) => {
                        const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());
                        return (
                          <th
                            key={idx}
                            className={`text-center px-2 py-3 min-w-[44px] ${isCurrentDay ? 'bg-emerald-500/20' : ''}`}
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
                      <th className="text-center px-3 py-3 text-sm font-medium text-slate-300 min-w-[80px]">
                        Postęp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {challenges.filter(c => new Date(c.endDate) >= new Date(new Date().setHours(0, 0, 0, 0))).map(challenge => {
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
                                    completed ? 'bg-emerald-600 text-white hover:bg-emerald-500' :
                                    'border-2 border-slate-600 hover:border-slate-500'
                                  }`}
                                >
                                  {completed && <Check className="w-4 h-4" />}
                                </button>
                              </td>
                            );
                          })}

                          {/* Progress bar cell */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    progress.percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${
                                progress.percentage >= 100 ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                {progress.percentage}%
                              </span>
                            </div>
                          </td>
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

          {/* Today button - only show for active tab */}
          {dashboardTab === 'active' && weekOffset !== 0 && (
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
                {progress.streak > 0 && (
                  <p className="flex items-center gap-1 text-orange-400 text-sm mt-1">
                    <Flame className="w-4 h-4" /> {progress.streak} dni z rzędu
                  </p>
                )}
              </div>
              <div className="text-right">
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

            {/* Total Reps Summary - for trackReps challenges */}
            {activeChallenge.trackReps && (
              <div className="mb-3 p-3 bg-gradient-to-r from-amber-600/20 to-amber-500/10 rounded-lg border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 text-sm font-medium">
                    {progress.isCompleted ? 'Suma wykonanych' : 'Wykonano łącznie'}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{progress.totalReps}</span>
                    <span className="text-amber-400 text-sm">{activeChallenge.goalUnit || 'powtórzeń'}</span>
                  </div>
                </div>
                {activeChallenge.dailyGoals && Object.keys(activeChallenge.dailyGoals).length > 0 && (() => {
                  const totalGoal = Object.values(activeChallenge.dailyGoals).reduce((sum, g) => sum + g, 0);
                  const goalPercentage = totalGoal > 0 ? Math.round((progress.totalReps / totalGoal) * 100) : 0;
                  return (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Cel łączny: {totalGoal} {activeChallenge.goalUnit}</span>
                        <span className={goalPercentage >= 100 ? 'text-emerald-400' : ''}>{goalPercentage}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${goalPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, goalPercentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.isCompleted && (
              <div className="mt-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                <p className="text-emerald-400 font-semibold">
                  Wyzwanie zakończone!
                  {activeChallenge.trackReps && progress.totalReps > 0 && (
                    <span className="block text-sm mt-1">
                      Łącznie: {progress.totalReps} {activeChallenge.goalUnit || 'powtórzeń'}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
            <button
              onClick={() => setDetailView('grid')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
                detailView === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">Siatka</span>
            </button>
            <button
              onClick={() => setDetailView('table')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
                detailView === 'table' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Analiza</span>
            </button>
          </div>

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

          {/* Table/Analysis View */}
          {detailView === 'table' && (
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
                  return days.map((day) => {
                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                    const dayGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
                    const reps = activeChallenge.completedDays[dateStr] || 0;
                    const completed = reps > 0;
                    const progress = dayGoal > 0 ? Math.min(100, Math.round((reps / dayGoal) * 100)) : (completed ? 100 : 0);
                    const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());

                    const handleClick = () => {
                      if (activeChallenge.trackReps) {
                        setRepsDay(day.getDate());
                        setRepsValue(reps > 0 ? reps.toString() : '');
                        setGoalValue(dayGoal > 0 ? dayGoal.toString() : '');
                        setCurrentDateStr(dateStr);
                        setCurrentDate(day);
                        setShowRepsModal(true);
                      } else {
                        // Toggle completion for simple challenges
                        const newCompletedDays = completed
                          ? Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== dateStr))
                          : { ...activeChallenge.completedDays, [dateStr]: 1 };
                        updateCompletedDays(activeChallenge.id, newCompletedDays);
                      }
                    };

                    return (
                      <button
                        key={dateStr}
                        onClick={handleClick}
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
                              {activeChallenge.trackReps
                                ? (dayGoal > 0 ? `Cel: ${dayGoal}` : 'Brak celu')
                                : (completed ? 'Wykonane' : 'Nie wykonane')
                              }
                            </span>
                            <span className={`text-sm font-bold ${
                              completed ? (progress >= 100 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-500'
                            }`}>
                              {activeChallenge.trackReps ? (reps > 0 ? reps : '-') : ''}
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
                          {(dayGoal > 0 || !activeChallenge.trackReps) && (
                            <span className={`text-sm font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {activeChallenge.trackReps ? `${progress}%` : ''}
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
