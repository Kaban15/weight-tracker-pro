"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Target, Activity, LogOut, Table, ArrowLeft, TrendingDown, TrendingUp, Flame, Scale, Clock, Bell, History } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { initializeNotifications, cancelScheduledReminders } from '@/lib/notifications';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/useKeyboardShortcuts';
import ProgressChart from './ProgressChart';
import ProgressTable from './ProgressTable';
import NotificationSettings from './shared/NotificationSettings';
import {
  Entry,
  formatDate,
  useWeightTracker,
  EntryModal,
  GoalWizard,
  StatsView,
  CalendarView,
  CompletionModal,
  GoalHistoryList
} from './tracker';

interface WeightTrackerProps {
  onBack?: () => void;
}

export default function WeightTracker({ onBack }: WeightTrackerProps) {
  const { user, signOut } = useAuth();
  const {
    entries,
    goal,
    profile,
    loading,
    loadingMore,
    hasMoreEntries,
    stats,
    currentWeight,
    progress,
    saveProfile,
    saveGoal,
    resetPlan,
    saveEntry,
    deleteEntry,
    getEntryForDate,
    loadAllEntries,
    // Goal completion and history
    completionData,
    goalHistory,
    archiveGoalToHistory,
    clearCompletionData,
  } = useWeightTracker(user?.id);

  const [view, setView] = useState<'calendar' | 'stats' | 'table' | 'history'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [chartDateRange, setChartDateRange] = useState<{ start: string; end: string } | null>(null);
  const [chartMode, setChartMode] = useState<'all' | 'current-goal'>('all');

  // Switch to goal start date when entering current-goal mode
  useEffect(() => {
    if (chartMode === 'current-goal' && goal?.start_date) {
      const goalStartDate = new Date(goal.start_date);
      setCurrentMonth(new Date(goalStartDate.getFullYear(), goalStartDate.getMonth(), 1));
    }
  }, [chartMode, goal?.start_date]);

  // Show completion modal when goal is completed
  useEffect(() => {
    if (completionData && !showCompletionModal) {
      setShowCompletionModal(true);
    }
  }, [completionData, showCompletionModal]);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
    return () => cancelScheduledReminders();
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setView('calendar');
  }, []);

  // Navigate months
  const prevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  // Memoized callback for date range changes
  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setChartDateRange({ start, end });
  }, []);

  // Check if any modal is open
  const isModalOpen = showAddModal || showGoalModal || showNotificationSettings || showCompletionModal;

  // Keyboard shortcuts (memoized to prevent re-renders)
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    { key: 'n', description: 'Nowy wpis', action: () => {
      setSelectedDate(formatDate(new Date()));
      setEditingEntry(null);
      setShowAddModal(true);
    }},
    { key: 't', description: 'Idź do dziś', action: goToToday },
    { key: '1', description: 'Kalendarz', action: () => setView('calendar') },
    { key: '2', description: 'Tabela', action: () => setView('table') },
    { key: '3', description: 'Statystyki', action: () => setView('stats') },
    { key: 'ArrowLeft', alt: true, description: 'Poprzedni miesiąc', action: prevMonth },
    { key: 'ArrowRight', alt: true, description: 'Następny miesiąc', action: nextMonth },
    { key: 'Escape', description: 'Zamknij', action: () => {
      setShowAddModal(false);
      setShowGoalModal(false);
      setShowNotificationSettings(false);
    }},
  ], [goToToday, prevMonth, nextMonth]);

  useKeyboardShortcuts(shortcuts, !isModalOpen || shortcuts.find(s => s.key === 'Escape') !== undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const handleDayClick = (date: string, entry?: Entry) => {
    if (entry) {
      setEditingEntry(entry);
    } else {
      setSelectedDate(date);
    }
    setShowAddModal(true);
  };

  const handleSaveEntry = async (entry: Omit<Entry, 'id'>, editingId?: string): Promise<boolean> => {
    const success = await saveEntry(entry, editingId);
    if (success) {
      setShowAddModal(false);
      setEditingEntry(null);
    }
    return success;
  };

  const handleCloseEntryModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
  };

  const handleSaveGoal = async (newGoal: Omit<typeof goal, 'id'>): Promise<boolean> => {
    const success = await saveGoal(newGoal as Parameters<typeof saveGoal>[0]);
    if (success) {
      setShowGoalModal(false);
    }
    return success;
  };

  const handleResetPlan = async (deleteEntries: boolean): Promise<boolean> => {
    const success = await resetPlan(deleteEntries);
    if (success) {
      setShowGoalModal(false);
    }
    return success;
  };

  // Completion modal handlers
  const handleStartNewGoal = async () => {
    if (completionData) {
      const success = await archiveGoalToHistory(completionData);
      if (success) {
        clearCompletionData();
        setShowCompletionModal(false);
        setShowGoalModal(true);
      } else {
        alert('Nie udalo sie zapisac do historii. Sprawdz czy tabela goal_history istnieje w bazie danych.');
      }
    }
  };

  const handleContinueWithoutGoal = async () => {
    if (completionData) {
      const success = await archiveGoalToHistory(completionData);
      if (success) {
        clearCompletionData();
        setShowCompletionModal(false);
      } else {
        alert('Nie udalo sie zapisac do historii. Sprawdz czy tabela goal_history istnieje w bazie danych.');
      }
    }
  };

  // X button should do the same as continue - archive and close
  const handleCloseCompletionModal = async () => {
    if (completionData) {
      const success = await archiveGoalToHistory(completionData);
      if (success) {
        clearCompletionData();
        setShowCompletionModal(false);
      } else {
        alert('Nie udalo sie zapisac do historii. Sprawdz czy tabela goal_history istnieje w bazie danych.');
      }
    } else {
      setShowCompletionModal(false);
    }
  };

  // Show goal setup screen only if no goal AND no entries (first time user)
  // If user has entries but no goal, they're in free tracking mode - show main app
  if (!goal && entries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Weight Tracker Pro</h1>
            <p className="text-slate-400">Sledz wage, kalorie, kroki i treningi</p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Ustal swoj plan
          </button>
          <button
            onClick={signOut}
            className="w-full mt-4 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />Wyloguj sie
          </button>
        </div>

        <GoalWizard
          isOpen={showGoalModal}
          goal={goal}
          profile={profile}
          onSave={handleSaveGoal}
          onSaveProfile={saveProfile}
          onReset={handleResetPlan}
          onClose={() => setShowGoalModal(false)}
        />
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Progress Tracker</h1>
              <p className="text-slate-400 text-sm">Kompleksowe śledzenie postępów</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowGoalModal(true)} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
              {goal ? 'Edytuj plan' : 'Ustal cel'}
            </button>
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="text-slate-400 hover:text-emerald-400 transition-colors p-2"
              aria-label="Ustawienia powiadomień"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* Dashboard Summary */}
        {entries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Current Weight */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Scale className="w-4 h-4" />
                <span>Aktualna waga</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{currentWeight.toFixed(1)}</span>
                <span className="text-slate-400 text-sm">kg</span>
              </div>
              {stats.totalWeightChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${stats.totalWeightChange < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.totalWeightChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span>{stats.totalWeightChange > 0 ? '+' : ''}{stats.totalWeightChange.toFixed(1)} kg</span>
                </div>
              )}
            </div>

            {/* Progress - only show when goal exists */}
            {goal ? (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Target className="w-4 h-4" />
                  <span>Postep</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{Math.max(0, Math.min(100, progress)).toFixed(0)}</span>
                  <span className="text-slate-400 text-sm">%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Target className="w-4 h-4" />
                  <span>Tryb wolny</span>
                </div>
                <div className="text-white text-sm mt-2">
                  Sledzisz wage bez aktywnego celu
                </div>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm mt-2"
                >
                  Ustal cel &rarr;
                </button>
              </div>
            )}

            {/* Streak */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Seria dni</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
                <span className="text-slate-400 text-sm">dni</span>
              </div>
              {stats.currentStreak >= 7 && (
                <div className="text-orange-400 text-sm mt-1">Super! 🔥</div>
              )}
            </div>

            {/* Days Remaining / History */}
            {goal ? (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Do celu</span>
                </div>
                {(() => {
                  const daysLeft = goal?.target_date
                    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const weightLeft = goal ? (currentWeight - goal.target_weight).toFixed(1) : '0';
                  return (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{Math.max(0, daysLeft)}</span>
                        <span className="text-slate-400 text-sm">dni</span>
                      </div>
                      {parseFloat(weightLeft) > 0 && (
                        <div className="text-amber-400 text-sm mt-1">
                          Zostalo {weightLeft} kg
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Historia</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{goalHistory.length}</span>
                  <span className="text-slate-400 text-sm">celow</span>
                </div>
                {goalHistory.length > 0 && (
                  <button
                    onClick={() => setView('history')}
                    className="text-emerald-400 hover:text-emerald-300 text-sm mt-1"
                  >
                    Zobacz historie &rarr;
                  </button>
                )}
              </div>
            )}
            </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border-2 border-slate-700 overflow-x-auto">
            {[
              { id: 'calendar', icon: Calendar, label: 'Kalendarz' },
              { id: 'table', icon: Table, label: 'Tabela' },
              { id: 'stats', icon: Activity, label: 'Statystyki' },
              ...(goalHistory.length > 0 ? [{ id: 'history', icon: History, label: 'Historia' }] : []),
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id as typeof view)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all min-w-[100px]
                  ${view === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{label}</span>
              </button>
            ))}
        </div>
      </div>

      {view === 'calendar' && (
        <>
          {/* Chart Mode Toggle - above calendar */}
          <div className="max-w-6xl mx-auto mb-4">
            <div className="flex justify-end">
              <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setChartMode('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Wszystkie wpisy
                </button>
                <button
                  onClick={() => setChartMode('current-goal')}
                  disabled={!goal?.start_date}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'current-goal'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  } ${!goal?.start_date ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Biezacy cel
                </button>
              </div>
            </div>
          </div>
          <CalendarView
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            getEntryForDate={getEntryForDate}
            onDayClick={handleDayClick}
            onAddClick={() => { setSelectedDate(formatDate(new Date())); setShowAddModal(true); }}
            onDateRangeChange={handleDateRangeChange}
            goalStartDate={goal?.start_date}
            currentGoalMode={chartMode === 'current-goal'}
          />
          <div className="max-w-6xl mx-auto mt-6">
            <ProgressChart
              entries={
                chartMode === 'current-goal' && goal?.start_date
                  ? entries.filter(e => e.date >= goal.start_date!)
                  : entries
              }
              goal={goal}
              startDate={chartMode === 'current-goal' && goal?.start_date ? goal.start_date : chartDateRange?.start}
              endDate={chartDateRange?.end}
            />
          </div>
        </>
      )}
      {view === 'table' && (
        <div className="max-w-6xl mx-auto">
          <ProgressTable entries={entries} goal={goal} />
        </div>
      )}
      {view === 'stats' && (
        <StatsView
          stats={stats}
          goal={goal}
          entries={entries}
          currentWeight={currentWeight}
          progress={progress}
          onEditGoal={() => setShowGoalModal(true)}
          hasMoreEntries={hasMoreEntries}
          loadingMore={loadingMore}
          onLoadAllEntries={loadAllEntries}
          goalHistory={goalHistory}
          onViewHistory={() => setView('history')}
        />
      )}
      {view === 'history' && (
        <GoalHistoryList
          history={goalHistory}
          entries={entries}
          onClose={() => setView('calendar')}
        />
      )}

      <EntryModal
        isOpen={showAddModal}
        entry={editingEntry}
        selectedDate={selectedDate}
        goal={goal}
        onSave={handleSaveEntry}
        onDelete={deleteEntry}
        onClose={handleCloseEntryModal}
      />

      <GoalWizard
        isOpen={showGoalModal}
        goal={goal}
        profile={profile}
        onSave={handleSaveGoal}
        onSaveProfile={saveProfile}
        onReset={handleResetPlan}
        onClose={() => setShowGoalModal(false)}
      />

      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      <CompletionModal
        isOpen={showCompletionModal}
        completion={completionData}
        onStartNewGoal={handleStartNewGoal}
        onContinueWithoutGoal={handleContinueWithoutGoal}
        onClose={handleCloseCompletionModal}
      />
    </div>
  );
}
