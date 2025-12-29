"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  Challenge,
  ChallengeFormData,
  DEFAULT_FORM_DATA,
  useChallenges,
  ChallengeFormModal,
  DeleteConfirmModal,
  RepsModal,
  ChallengeDashboard,
  ChallengeDetail,
  formatDate
} from "./challenge";
import { ModuleTooltip, useModuleOnboarding } from "./onboarding";

interface ChallengeModeProps {
  onBack: () => void;
}

const CHALLENGE_TOOLTIPS = [
  {
    id: "create-challenge",
    content: "Stwórz swoje pierwsze wyzwanie - np. 10 pompek dziennie przez 30 dni.",
    position: "bottom" as const,
  },
  {
    id: "challenge-matrix",
    content: "Kliknij na dzień w kalendarzu, aby oznaczyć wyzwanie jako wykonane.",
    position: "top" as const,
  },
];

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
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const onboarding = useModuleOnboarding("challenge", CHALLENGE_TOOLTIPS);

  // Sync activeChallenge with challenges
  useEffect(() => {
    if (activeChallenge) {
      const updated = challenges.find(c => c.id === activeChallenge.id);
      if (updated) setActiveChallenge(updated);
    }
  }, [challenges, activeChallenge?.id]);

  // Form handlers
  const resetForm = () => setFormData(DEFAULT_FORM_DATA);

  const handleCreate = async () => {
    await createChallenge(formData);
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
      goalUnit: challenge.goalUnit || 'powtórzeń',
      defaultGoal: 0
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (challengeId: string) => {
    setEditingChallengeId(challengeId);
    setShowDeleteConfirm(true);
  };

  // Day click handler for detail view (opens reps modal for trackReps challenges)
  const handleDayClick = (day: number, dateStr: string) => {
    if (!activeChallenge) return;
    const inChallenge = dateStr >= activeChallenge.startDate && dateStr <= activeChallenge.endDate;
    if (!inChallenge) return;

    const dateParts = dateStr.split('-');
    const clickedMonth = parseInt(dateParts[1]) - 1;

    if (activeChallenge.trackReps) {
      const currentReps = activeChallenge.completedDays[dateStr] || 0;
      const currentGoal = activeChallenge.dailyGoals?.[dateStr] || 0;
      setRepsDay(day);
      setRepsValue(currentReps > 0 ? currentReps.toString() : '');
      setGoalValue(currentGoal > 0 ? currentGoal.toString() : '');
      setCurrentDateStr(dateStr);
      setCurrentMonth(clickedMonth);
      setShowRepsModal(true);
    } else {
      toggleSimpleDay(dateStr, !!activeChallenge.completedDays[dateStr]);
    }
  };

  // Toggle for simple (non-trackReps) challenges
  const toggleSimpleDay = (dateStr: string, currentlyCompleted: boolean) => {
    if (!activeChallenge) return;
    const newCompletedDays = currentlyCompleted
      ? Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== dateStr))
      : { ...activeChallenge.completedDays, [dateStr]: 1 };
    updateCompletedDays(activeChallenge.id, newCompletedDays);
  };

  // Matrix cell click handler (from dashboard) - simple toggle
  const handleMatrixCellClick = (challenge: Challenge, dateStr: string) => {
    const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
    if (!inChallenge) return;

    const dailyGoal = challenge.dailyGoals?.[dateStr] || 1;
    const newCompletedDays = challenge.completedDays[dateStr]
      ? Object.fromEntries(Object.entries(challenge.completedDays).filter(([d]) => d !== dateStr))
      : { ...challenge.completedDays, [dateStr]: dailyGoal };
    updateCompletedDays(challenge.id, newCompletedDays);
  };

  // Save reps from modal (accepts optional override values for delete case)
  const saveReps = (overrideReps?: number, overrideGoal?: number) => {
    if (!activeChallenge || !currentDateStr) return;
    const reps = overrideReps !== undefined ? overrideReps : (parseInt(repsValue) || 0);
    const goal = overrideGoal !== undefined ? overrideGoal : (parseInt(goalValue) || 0);

    const newCompletedDays = reps > 0
      ? { ...activeChallenge.completedDays, [currentDateStr]: reps }
      : Object.fromEntries(Object.entries(activeChallenge.completedDays).filter(([d]) => d !== currentDateStr));

    updateCompletedDays(activeChallenge.id, newCompletedDays);

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

  // Dashboard view
  if (view === 'list') {
    return (
      <>
        <ChallengeDashboard
          challenges={challenges}
          isSyncing={isSyncing}
          syncError={syncError}
          onBack={onBack}
          onSignOut={signOut}
          onChallengeClick={(challenge) => {
            setActiveChallenge(challenge);
            setView('detail');
          }}
          onCreateClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          onToggleDay={handleMatrixCellClick}
        />

        <ChallengeFormModal
          isOpen={showCreateModal}
          formData={formData}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      </>
    );
  }

  // Detail view
  if (view === 'detail' && activeChallenge) {
    return (
      <>
        <ChallengeDetail
          challenge={activeChallenge}
          isSyncing={isSyncing}
          syncError={syncError}
          onBack={() => {
            setView('list');
            setActiveChallenge(null);
          }}
          onEdit={() => openEditModal(activeChallenge)}
          onDelete={() => openDeleteConfirm(activeChallenge.id)}
          onDayClick={handleDayClick}
          onToggleSimpleDay={toggleSimpleDay}
        />

        <RepsModal
          isOpen={showRepsModal}
          day={repsDay}
          month={currentMonth}
          value={repsValue}
          goalValue={goalValue}
          goalUnit={activeChallenge.goalUnit}
          onGoalChange={setGoalValue}
          onChange={setRepsValue}
          onSave={saveReps}
          onDelete={() => {
            setRepsValue('0');
            setGoalValue('0');
            saveReps(0, 0);
          }}
          onClose={() => setShowRepsModal(false)}
        />

        <ChallengeFormModal
          isOpen={showEditModal}
          isEdit
          formData={formData}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            setEditingChallengeId(null);
          }}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setEditingChallengeId(null);
          }}
        />
      </>
    );
  }

  return null;
}
