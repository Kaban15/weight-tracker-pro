"use client";

import { useState, useEffect } from "react";
import { Check, Flame, Home, Plus, Trophy, Edit2, Trash2, ArrowLeft, Loader2 } from "lucide-react";
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
    updateCompletedDays
  } = useChallenges(user?.id);

  // View state
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

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
      dailyGoal: challenge.dailyGoal || 0,
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

    if (activeChallenge.trackReps) {
      const currentReps = activeChallenge.completedDays[dateStr] || 0;
      setRepsDay(day);
      setRepsValue(currentReps > 0 ? currentReps.toString() : '');
      setShowRepsModal(true);
    } else {
      const newCompletedDays = activeChallenge.completedDays[dateStr]
        ? Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== dateStr))
        : { ...activeChallenge.completedDays, [dateStr]: 1 };
      updateCompletedDays(activeChallenge.id, newCompletedDays);
    }
  };

  const saveReps = () => {
    if (!activeChallenge) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(repsDay).padStart(2, '0')}`;
    const reps = parseInt(repsValue) || 0;

    const newCompletedDays = reps > 0
      ? { ...activeChallenge.completedDays, [dateStr]: reps }
      : Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== dateStr));

    updateCompletedDays(activeChallenge.id, newCompletedDays);
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
              {challenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  progress={getChallengeProgress(challenge)}
                  onClick={() => { setActiveChallenge(challenge); setView('detail'); }}
                  onEdit={() => openEditModal(challenge)}
                  onDelete={() => openDeleteConfirm(challenge.id)}
                />
              ))}
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

    const renderDay = (day: number, dateStr: string) => {
      const completed = !!activeChallenge.completedDays[dateStr];
      const inChallenge = dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
      const reps = activeChallenge.completedDays[dateStr] || 0;
      const today = isToday(day, month, year);
      const hasGoal = activeChallenge.dailyGoal && activeChallenge.dailyGoal > 0;
      const goalReached = hasGoal && reps >= activeChallenge.dailyGoal!;

      return (
        <button
          onClick={() => handleDayClick(day, dateStr)}
          disabled={!inChallenge}
          className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative
            ${today ? 'ring-2 ring-emerald-500' : ''}
            ${goalReached ? 'bg-emerald-500/40' : completed ? 'bg-amber-500/30' : inChallenge ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-slate-900/30 opacity-40'}
            ${inChallenge ? 'cursor-pointer' : 'cursor-not-allowed'}
          `}
        >
          {completed && !activeChallenge.trackReps && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          )}
          <span className={`text-sm ${goalReached ? 'text-emerald-300' : completed ? 'text-amber-300' : today ? 'text-emerald-400 font-bold' : inChallenge ? 'text-amber-200' : 'text-slate-500'}`}>
            {day}
          </span>
          {completed && activeChallenge.trackReps && reps > 0 && (
            <span className={`text-xs font-bold ${goalReached ? 'text-emerald-400' : 'text-amber-400'}`}>{reps}</span>
          )}
          {goalReached && (
            <Check className="w-3 h-3 text-emerald-400 absolute top-1 right-1" />
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
                {activeChallenge.dailyGoal && activeChallenge.dailyGoal > 0 && (
                  <p className="text-amber-400 text-sm mt-1">
                    Cel: {activeChallenge.dailyGoal} {activeChallenge.goalUnit}/dzień
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
                {activeChallenge.dailyGoal && activeChallenge.dailyGoal > 0 && (
                  <p className="text-emerald-400 text-xs">
                    {Object.values(activeChallenge.completedDays).filter(r => r >= activeChallenge.dailyGoal!).length} dni z celem
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

          {/* Calendar */}
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
        </main>

        <RepsModal
          isOpen={showRepsModal}
          day={repsDay}
          month={month}
          value={repsValue}
          dailyGoal={activeChallenge.dailyGoal}
          goalUnit={activeChallenge.goalUnit}
          onChange={setRepsValue}
          onSave={saveReps}
          onDelete={() => { setRepsValue('0'); saveReps(); }}
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
