"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, History, Zap, Trophy } from "lucide-react";
import SyncIndicator from "../shared/SyncIndicator";
import { Challenge } from "./index";
import { formatDate, MONTH_NAMES } from "./utils/dateUtils";
import { getMonthDays } from "./utils/monthUtils";
import EmptyState from "./EmptyState";
import ChallengeHistoryList from "./ChallengeHistoryList";
import MonthlyMatrix from "./MonthlyMatrix";
import ProgressChart from "./ProgressChart";

interface ChallengeDashboardProps {
  challenges: Challenge[];
  isSyncing: boolean;
  syncError: string | null;
  onBack: () => void;
  onSignOut: () => void;
  onChallengeClick: (challenge: Challenge) => void;
  onCreateClick: () => void;
  onToggleDay: (challenge: Challenge, dateStr: string) => void;
}

export default function ChallengeDashboard({
  challenges,
  isSyncing,
  syncError,
  onBack,
  onSignOut,
  onChallengeClick,
  onCreateClick,
  onToggleDay
}: ChallengeDashboardProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<'active' | 'history'>('active');

  // Current month based on offset
  const currentDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); // Set to first day to avoid month overflow (e.g., Jan 31 -> Feb 31 -> Mar 3)
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthData = useMemo(() => getMonthDays(year, month), [year, month]);

  // Split challenges into active and completed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeChallenges = challenges.filter(c => new Date(c.endDate) >= today);
  const completedChallenges = challenges.filter(c => new Date(c.endDate) < today);

  // Calculate monthly stats for all challenges
  const monthlyStats = useMemo(() => {
    const allDaysInMonth: string[] = [];
    monthData.weeks.forEach(week => {
      week.forEach(day => {
        allDaysInMonth.push(formatDate(day));
      });
    });

    let totalCompletions = 0;
    let totalPossible = 0;

    const dailyStats: { [date: string]: { done: number; notDone: number; progress: number } } = {};

    allDaysInMonth.forEach(dateStr => {
      const activeOnDay = activeChallenges.filter(c =>
        dateStr >= c.startDate && dateStr <= c.endDate
      );

      const done = activeOnDay.filter(c => !!c.completedDays[dateStr]).length;
      const notDone = activeOnDay.length - done;
      const progress = activeOnDay.length > 0 ? Math.round((done / activeOnDay.length) * 100) : 0;

      dailyStats[dateStr] = { done, notDone, progress };
      totalCompletions += done;
      totalPossible += activeOnDay.length;
    });

    const challengeAnalysis = activeChallenges.map(challenge => {
      const daysInMonth = allDaysInMonth.filter(d =>
        d >= challenge.startDate && d <= challenge.endDate
      );
      const completedInMonth = daysInMonth.filter(d => !!challenge.completedDays[d]).length;
      const goal = daysInMonth.length;
      const result = completedInMonth;
      const progress = goal > 0 ? Math.round((result / goal) * 100) : 0;

      return { challenge, goal, result, progress };
    });

    return {
      totalHabits: activeChallenges.length,
      totalCompletions,
      totalPossible,
      progressPercent: totalPossible > 0 ? ((totalCompletions / totalPossible) * 100).toFixed(2) : '0.00',
      dailyStats,
      challengeAnalysis
    };
  }, [activeChallenges, monthData.weeks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header with stats */}
      <header className="bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Powrót</span>
            </button>
            <div className="flex items-center gap-2">
              <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
            </div>
            <button
              onClick={onSignOut}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Wyloguj
            </button>
          </div>

          {/* Month navigation and stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Month selector */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white min-w-[150px] text-center">
                {MONTH_NAMES[month]}
              </h1>
              <button
                onClick={() => setMonthOffset(prev => prev + 1)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 bg-slate-800/50 rounded-xl px-6 py-3 border border-slate-700">
              <div className="text-center">
                <div className="text-xs text-slate-400">Ilość Nawyków</div>
                <div className="text-xl font-bold text-white">{monthlyStats.totalHabits}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Ukończone Nawyki</div>
                <div className="text-xl font-bold text-emerald-400">{monthlyStats.totalCompletions}</div>
              </div>
              <div className="flex-1 min-w-[100px]">
                <div className="text-xs text-slate-400 mb-1">Progress</div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${parseFloat(monthlyStats.progressPercent)}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Progres w %</div>
                <div className="text-xl font-bold text-white">{monthlyStats.progressPercent}%</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Toggle */}
        <div className="flex gap-2 mb-4 bg-slate-800/50 p-1 rounded-lg max-w-md">
          <button
            onClick={() => setDashboardTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all ${
              dashboardTab === 'active' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Aktywne</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${dashboardTab === 'active' ? 'bg-amber-500' : 'bg-slate-700'}`}>
              {activeChallenges.length}
            </span>
          </button>
          <button
            onClick={() => setDashboardTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all ${
              dashboardTab === 'history' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
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
            <EmptyState
              icon={<History className="w-8 h-8 text-slate-500" />}
              title="Brak historii"
              description="Ukończone nawyki pojawią się tutaj"
            />
          ) : (
            <ChallengeHistoryList
              challenges={completedChallenges}
              onChallengeClick={onChallengeClick}
            />
          )
        )}

        {/* Active View - Monthly Matrix */}
        {dashboardTab === 'active' && activeChallenges.length === 0 && (
          <EmptyState
            icon={<Trophy className="w-8 h-8 text-amber-400" />}
            title="Brak aktywnych nawyków"
            description="Dodaj swój pierwszy nawyk, który chcesz wprowadzić do życia!"
            action={
              <button
                onClick={onCreateClick}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Nowy nawyk
              </button>
            }
          />
        )}

        {dashboardTab === 'active' && activeChallenges.length > 0 && (
          <div className="space-y-6">
            <MonthlyMatrix
              challenges={activeChallenges}
              monthData={monthData}
              month={month}
              monthlyStats={monthlyStats}
              onChallengeClick={onChallengeClick}
              onToggleDay={onToggleDay}
              onCreateClick={onCreateClick}
            />

            <ProgressChart
              dailyStats={monthlyStats.dailyStats}
              month={month}
              monthData={monthData}
            />
          </div>
        )}

        {/* Back to current month button */}
        {dashboardTab === 'active' && monthOffset !== 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setMonthOffset(0)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              ← Wróć do bieżącego miesiąca
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
