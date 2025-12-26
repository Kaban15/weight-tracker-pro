"use client";

import React, { useState } from 'react';
import { Calendar, Target, Activity, LogOut, Table, LineChart, Home, TrendingDown, TrendingUp, Flame, Scale, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import ProgressChart from './ProgressChart';
import ProgressTable from './ProgressTable';
import {
  Entry,
  formatDate,
  useWeightTracker,
  EntryModal,
  GoalWizard,
  StatsView,
  CalendarView
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
    stats,
    currentWeight,
    progress,
    saveProfile,
    saveGoal,
    resetPlan,
    saveEntry,
    deleteEntry,
    getEntryForDate,
  } = useWeightTracker(user?.id);

  const [view, setView] = useState<'calendar' | 'stats' | 'table' | 'chart'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

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

  // Show goal setup if no goal
  if (!goal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Weight Tracker Pro</h1>
            <p className="text-slate-400">Śledź wagę, kalorie, kroki i treningi</p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Ustal swój plan
          </button>
          <button
            onClick={signOut}
            className="w-full mt-4 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />Wyloguj się
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
                <Home className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Progress Tracker</h1>
              <p className="text-slate-400 text-sm">Kompleksowe śledzenie postępów</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowGoalModal(true)} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
              Edytuj plan
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

            {/* Progress */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Target className="w-4 h-4" />
                <span>Postęp</span>
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

            {/* Days Remaining */}
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
                        Zostało {weightLeft} kg
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border-2 border-slate-700 overflow-x-auto">
          {[
            { id: 'calendar', icon: Calendar, label: 'Kalendarz' },
            { id: 'table', icon: Table, label: 'Tabela' },
            { id: 'chart', icon: LineChart, label: 'Wykres' },
            { id: 'stats', icon: Activity, label: 'Statystyki' },
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
        <CalendarView
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          getEntryForDate={getEntryForDate}
          onDayClick={handleDayClick}
          onAddClick={() => { setSelectedDate(formatDate(new Date())); setShowAddModal(true); }}
        />
      )}
      {view === 'table' && (
        <div className="max-w-6xl mx-auto">
          <ProgressTable entries={entries} goal={goal} />
        </div>
      )}
      {view === 'chart' && (
        <div className="max-w-6xl mx-auto">
          <ProgressChart entries={entries} goal={goal} />
        </div>
      )}
      {view === 'stats' && (
        <StatsView
          stats={stats}
          goal={goal}
          currentWeight={currentWeight}
          progress={progress}
          onEditGoal={() => setShowGoalModal(true)}
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
    </div>
  );
}
