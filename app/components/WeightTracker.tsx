"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Target, LogOut, Table, ArrowLeft, Bell, History, Ruler } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { initializeNotifications, cancelScheduledReminders } from '@/lib/notifications';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/useKeyboardShortcuts';
import { useChallenges } from './challenge';
import { syncStepsToChallenges } from '@/lib/stepsChallengeSync';
import Toast from './ui/Toast';
import ProgressChart from './ProgressChart';
import ProgressTable from './ProgressTable';
import NotificationSettings from './shared/NotificationSettings';
import {
  Entry,
  Stats,
  formatDate,
  useWeightTracker,
  useMeasurements,
  calculateStatsForEntries,
  EntryModal,
  GoalWizard,
  CalendarView,
  CompletionModal,
  GoalHistoryList,
  MeasurementsView
} from './tracker';
import type { ChartRange } from './tracker/types';
import TrendAnalysis from './tracker/TrendAnalysis';
import ExportActions from './tracker/ExportActions';
import DashboardSummary from './tracker/DashboardSummary';
import { ChartControls } from './tracker/ChartControls';
import { StatsGrid } from './tracker/StatsGrid';
import { GoalProgressSection } from './tracker/GoalProgressSection';

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

  const { measurements: bodyMeasurements } = useMeasurements(user?.id);
  const { challenges, updateCompletedDay } = useChallenges(user?.id);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [view, setView] = useState<'calendar' | 'table' | 'measurements' | 'history'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [chartDateRange, setChartDateRange] = useState<{ start: string; end: string } | null>(null);
  const [chartMode, setChartMode] = useState<'all' | 'current-goal'>('all');
  const [chartRange, setChartRange] = useState<ChartRange>('month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => formatDate(new Date()));

  // Calculate filtered entries and stats based on chartMode
  const filteredEntries = useMemo(() => {
    if (chartMode === 'current-goal' && goal?.start_date) {
      return entries.filter(e => e.date >= goal.start_date!);
    }
    return entries;
  }, [entries, chartMode, goal?.start_date]);

  const filteredStats = useMemo(() => {
    return calculateStatsForEntries(filteredEntries, goal?.target_weight);
  }, [filteredEntries, goal?.target_weight]);

  // Compute effective chart date range based on chartRange selector
  const effectiveChartDates = useMemo(() => {
    const now = new Date();
    switch (chartRange) {
      case 'week': {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: formatDate(monday), end: formatDate(sunday) };
      }
      case 'month': {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return {
          start: formatDate(new Date(year, month, 1)),
          end: formatDate(new Date(year, month + 1, 0)),
        };
      }
      case 'year':
        return {
          start: formatDate(new Date(now.getFullYear(), 0, 1)),
          end: formatDate(now),
        };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
    }
  }, [chartRange, currentMonth, customStartDate, customEndDate]);

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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
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

      // Sync steps to matching challenges
      if (entry.steps && entry.steps > 0) {
        const synced = await syncStepsToChallenges(entry.steps, entry.date, challenges, updateCompletedDay);
        if (synced.length > 0) {
          setToast({ message: `Kroki zsynchronizowane z: ${synced.join(', ')}`, type: 'success' });
        }
      }
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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="bg-[var(--card-bg)] backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-[var(--accent)]/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[var(--accent)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-[var(--accent)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Weight Tracker Pro</h1>
            <p className="text-[var(--muted)]">Sledz wage, kalorie, kroki i treningi</p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Ustal swoj plan
          </button>
          <button
            onClick={signOut}
            className="w-full mt-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Progress Tracker</h1>
              <p className="text-[var(--muted)] text-sm">Kompleksowe śledzenie postępów</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowGoalModal(true)} className="text-[var(--accent)] hover:text-[var(--accent-dark)] text-sm font-medium">
              {goal ? 'Edytuj plan' : 'Ustal cel'}
            </button>
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors p-2"
              aria-label="Ustawienia powiadomień"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* Dashboard Summary */}
        {entries.length > 0 && (
          <DashboardSummary
            currentWeight={currentWeight}
            stats={stats}
            goal={goal}
            progress={progress}
            goalHistory={goalHistory}
            onSetGoal={() => setShowGoalModal(true)}
            onViewHistory={() => setView('history')}
          />
        )}

        {/* View Toggle */}
        <div className="flex gap-1 bg-[var(--card-bg)] p-1 rounded-xl border-2 border-[var(--card-border)] overflow-x-auto">
            {[
              { id: 'calendar', icon: Calendar, label: 'Kalendarz' },
              { id: 'table', icon: Table, label: 'Tabela' },
              { id: 'measurements', icon: Ruler, label: 'Pomiary' },
              ...(goalHistory.length > 0 ? [{ id: 'history', icon: History, label: 'Historia' }] : []),
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id as typeof view)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-lg transition-all min-w-[100px]
                  ${view === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{label}</span>
              </button>
            ))}
        </div>
      </div>

      {view === 'calendar' && (
        <>
          {/* Chart Controls - above chart */}
          <ChartControls
            chartRange={chartRange}
            onChartRangeChange={setChartRange}
            chartMode={chartMode}
            onChartModeChange={setChartMode}
            hasGoalStartDate={!!goal?.start_date}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
          <div className="max-w-6xl mx-auto mb-6">
            <ProgressChart
              entries={filteredEntries}
              goal={goal}
              startDate={effectiveChartDates.start}
              endDate={effectiveChartDates.end}
              measurements={bodyMeasurements}
              chartRange={chartRange}
            />
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

          {/* Stats Section - below chart */}
          {filteredEntries.length > 0 && (
            <div className="max-w-6xl mx-auto mt-6 space-y-6">
              <StatsGrid
                filteredStats={filteredStats}
                chartMode={chartMode}
                goal={goal}
              />

              <GoalProgressSection
                chartMode={chartMode}
                goal={goal}
                progress={progress}
                filteredStats={filteredStats}
                goalHistory={goalHistory}
                onEditGoal={() => setShowGoalModal(true)}
                onViewHistory={() => setView('history')}
              />

              {/* Trend Analysis */}
              <TrendAnalysis
                entries={filteredEntries}
                goal={goal}
                currentWeight={filteredStats.currentWeight}
              />

              {/* Export Section - always exports all entries */}
              <ExportActions
                entries={entries}
                goal={goal}
                hasMoreEntries={hasMoreEntries}
                loadAllEntries={loadAllEntries}
                loadingMore={loadingMore}
              />
            </div>
          )}
        </>
      )}
      {view === 'table' && (
        <div className="max-w-6xl mx-auto">
          <ProgressTable entries={entries} goal={goal} />
        </div>
      )}
      {view === 'measurements' && (
        <MeasurementsView userId={user?.id} />
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
        userId={user?.id}
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
