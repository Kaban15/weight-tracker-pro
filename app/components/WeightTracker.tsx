"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Target, LogOut, Table, ArrowLeft, Flame, Bell, History, Footprints, Dumbbell, Award, LineChart, Trophy, ChevronRight, Ruler, CalendarDays, Settings2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { initializeNotifications, cancelScheduledReminders } from '@/lib/notifications';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/useKeyboardShortcuts';
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
          <div className="max-w-6xl mx-auto mb-4 space-y-3">
            {/* Row: Range selector (left) + Data filter (right), stacked on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Chart time range selector */}
              <div className="flex bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)] self-center sm:self-auto">
                {([
                  { id: 'week' as ChartRange, icon: Calendar, label: 'Tydzień' },
                  { id: 'month' as ChartRange, icon: Calendar, label: 'Miesiąc' },
                  { id: 'year' as ChartRange, icon: CalendarDays, label: 'Rok' },
                  { id: 'custom' as ChartRange, icon: Settings2, label: 'Zakres' },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setChartRange(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      chartRange === id
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Data filter (all / current-goal) */}
              <div className="flex bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)] self-center sm:self-auto">
                <button
                  onClick={() => setChartMode('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'all'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Wszystkie wpisy
                </button>
                <button
                  onClick={() => setChartMode('current-goal')}
                  disabled={!goal?.start_date}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'current-goal'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  } ${!goal?.start_date ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Biezacy cel
                </button>
              </div>
            </div>

            {/* Custom date range inputs - own row below */}
            {chartRange === 'custom' && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[var(--card-bg)] border border-[var(--card-border)] text-white rounded-lg px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none [color-scheme:dark]"
                />
                <span className="text-[var(--muted)] text-sm">—</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[var(--card-bg)] border border-[var(--card-border)] text-white rounded-lg px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none [color-scheme:dark]"
                />
              </div>
            )}
          </div>
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
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  Statystyki {chartMode === 'current-goal' ? 'bieżącego celu' : 'ogólne'}
                </h3>
                <span className="text-[var(--muted)] text-sm">
                  {filteredStats.totalEntries} {filteredStats.totalEntries === 1 ? 'wpis' : filteredStats.totalEntries < 5 ? 'wpisy' : 'wpisów'}
                </span>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[var(--accent)]/10 rounded-xl p-6 border-2 border-[var(--accent)]/20">
                  <div className="text-[var(--accent)] text-sm mb-2 font-semibold">Aktualna waga</div>
                  <div className="text-3xl font-bold text-[var(--foreground)]">{filteredStats.currentWeight.toFixed(1)} kg</div>
                  <div className="text-[var(--muted)] text-xs mt-1">
                    {filteredStats.totalWeightChange > 0 ? '+' : ''}{filteredStats.totalWeightChange.toFixed(1)}kg od startu
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/10 rounded-xl p-6 border-2 border-orange-500/20">
                  <div className="flex items-center gap-2 text-orange-400 text-sm mb-2 font-semibold">
                    <Flame className="w-4 h-4" />Śr. kalorie
                  </div>
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {filteredStats.avgCalories > 0 ? Math.round(filteredStats.avgCalories) : '—'}
                  </div>
                  {goal?.daily_calories_limit && (
                    <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.daily_calories_limit}/dzień</div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-xl p-6 border-2 border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-2 font-semibold">
                    <Footprints className="w-4 h-4" />Śr. kroki
                  </div>
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {filteredStats.avgSteps > 0 ? Math.round(filteredStats.avgSteps).toLocaleString() : '—'}
                  </div>
                  {goal?.daily_steps_goal && (
                    <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.daily_steps_goal.toLocaleString()}/dzień</div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl p-6 border-2 border-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-400 text-sm mb-2 font-semibold">
                    <Dumbbell className="w-4 h-4" />Treningi
                  </div>
                  <div className="text-3xl font-bold text-[var(--foreground)]">{filteredStats.totalWorkouts}</div>
                  {goal?.weekly_training_hours && (
                    <div className="text-[var(--muted)] text-xs mt-1">Cel: {goal.weekly_training_hours}h/tydz.</div>
                  )}
                </div>
              </div>

              {/* Streak and Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
                  <div className="flex items-center gap-2 text-[var(--accent)] text-sm mb-2 font-semibold">
                    <Award className="w-5 h-5" />Seria
                  </div>
                  <div className="text-5xl font-bold text-[var(--foreground)] mb-2">{filteredStats.currentStreak}</div>
                  <div className="text-[var(--muted)]">dni z rzędu!</div>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
                  <div className="flex items-center gap-2 text-[var(--accent)] text-sm mb-2 font-semibold">
                    <LineChart className="w-5 h-5" />Podsumowanie
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Wszystkie wpisy:</span>
                      <span className="text-white font-semibold">{filteredStats.totalEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Najlepsza waga:</span>
                      <span className="text-white font-semibold">{filteredStats.bestWeight.toFixed(1)}kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Średnia waga:</span>
                      <span className="text-white font-semibold">{filteredStats.avgWeight.toFixed(1)}kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal Progress - only in current-goal mode */}
              {chartMode === 'current-goal' && goal && (
                <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[var(--foreground)]">Postęp celu</h3>
                    <button onClick={() => setShowGoalModal(true)} className="text-[var(--accent)] hover:text-[var(--accent-dark)] text-sm">
                      Edytuj
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">
                        Cel: {goal.target_weight}kg do {new Date(goal.target_date).toLocaleDateString('pl-PL')}
                      </span>
                      <span className="text-[var(--accent)] font-semibold">
                        {Math.max(0, Math.min(100, progress)).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-4 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-[var(--muted)]">
                      <span>Start: {goal.current_weight}kg</span>
                      <span>Teraz: {filteredStats.currentWeight.toFixed(1)}kg</span>
                      <span>Cel: {goal.target_weight}kg</span>
                    </div>
                  </div>
                  {goal.monitoring_method && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                      <p className="text-[var(--muted)] text-sm">
                        <strong>Metoda monitorowania:</strong> {goal.monitoring_method}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Goal History Button - only in 'all' mode */}
              {chartMode === 'all' && goalHistory.length > 0 && (
                <button
                  onClick={() => setView('history')}
                  className="w-full bg-[var(--card-bg)] hover:bg-[var(--surface)] rounded-xl p-6 border-2 border-[var(--card-border)] hover:border-[var(--accent)]/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[var(--surface)] rounded-xl flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                        <History className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--foreground)]">Historia celów</h3>
                        <p className="text-[var(--muted)] text-sm">
                          {goalHistory.length} {goalHistory.length === 1 ? 'zakończony cel' :
                            goalHistory.length < 5 ? 'zakończone cele' : 'zakończonych celów'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {goalHistory.filter(g => g.completion_type === 'target_reached').length > 0 && (
                        <div className="flex items-center gap-1 bg-[var(--accent)]/20 px-3 py-1 rounded-full">
                          <Trophy className="w-4 h-4 text-[var(--accent)]" />
                          <span className="text-[var(--accent)] text-sm font-medium">
                            {goalHistory.filter(g => g.completion_type === 'target_reached').length}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                  </div>
                </button>
              )}

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
