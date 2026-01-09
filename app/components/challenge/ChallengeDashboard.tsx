"use client";

import { useState, useMemo } from "react";
import { Check, ArrowLeft, Plus, ChevronLeft, ChevronRight, History, Zap, Trophy, Info } from "lucide-react";
import { isToday } from "../shared/Calendar";
import SyncIndicator from "../shared/SyncIndicator";
import { Challenge, getChallengeProgress } from "./index";
import { formatDate, DAY_NAMES_MEDIUM, MONTH_NAMES } from "./utils/dateUtils";

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

// Get all days of a month organized by weeks
// First week starts from day 1 (no previous month days)
// Middle weeks are Mon-Sun
// Last week ends on last day of month
function getMonthDays(year: number, month: number): { weeks: Date[][]; weekDayOffsets: number[] } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  const weekDayOffsets: number[] = []; // Which day of week each week starts on (0=Mon, 6=Sun)

  let currentDate = new Date(firstDay);

  // First week: starts from day 1, ends on Sunday
  const firstWeek: Date[] = [];
  const firstDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Convert to Monday-based index (0 = Monday, 6 = Sunday)
  const mondayBasedIndex = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  weekDayOffsets.push(mondayBasedIndex);

  // Add days until Sunday (or end of month)
  while (true) {
    firstWeek.push(new Date(currentDate));
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() + 1);

    // Stop if we reached Sunday or end of month
    if (dayOfWeek === 0 || currentDate.getMonth() !== month) {
      break;
    }
  }
  weeks.push(firstWeek);

  // Middle and last weeks: Mon-Sun (or until end of month)
  while (currentDate.getMonth() === month) {
    const week: Date[] = [];
    weekDayOffsets.push(0); // These weeks always start on Monday

    for (let i = 0; i < 7 && currentDate.getMonth() === month; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  return { weeks, weekDayOffsets };
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

    // For each day in month
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

    // Per-challenge analysis (goal = days in month, result = completions)
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
  }, [activeChallenges, monthData.weeks, month]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedChallenges.map(challenge => (
                <HistoryItem
                  key={challenge.id}
                  challenge={challenge}
                  onClick={() => onChallengeClick(challenge)}
                />
              ))}
            </div>
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
            {/* Monthly Matrix */}
            <MonthlyMatrix
              challenges={activeChallenges}
              monthData={monthData}
              month={month}
              monthlyStats={monthlyStats}
              onChallengeClick={onChallengeClick}
              onToggleDay={onToggleDay}
              onCreateClick={onCreateClick}
            />

            {/* Progress Chart */}
            <ProgressChart
              dailyStats={monthlyStats.dailyStats}
              month={month}
              monthData={monthData}
            />
          </div>
        )}

        {/* Today button */}
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

// Sub-components

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-8 text-center">
      <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 mb-4">{description}</p>
      {action}
    </div>
  );
}

interface HistoryItemProps {
  challenge: Challenge;
  onClick: () => void;
}

function HistoryItem({ challenge, onClick }: HistoryItemProps) {
  const progress = getChallengeProgress(challenge);

  return (
    <button
      onClick={onClick}
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
        </div>
      </div>
      <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${progress.percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </button>
  );
}

interface MonthlyMatrixProps {
  challenges: Challenge[];
  monthData: { weeks: Date[][]; weekDayOffsets: number[] };
  month: number;
  monthlyStats: {
    dailyStats: { [date: string]: { done: number; notDone: number; progress: number } };
    challengeAnalysis: { challenge: Challenge; goal: number; result: number; progress: number }[];
  };
  onChallengeClick: (challenge: Challenge) => void;
  onToggleDay: (challenge: Challenge, dateStr: string) => void;
  onCreateClick: () => void;
}

function MonthlyMatrix({
  challenges,
  monthData,
  month,
  monthlyStats,
  onChallengeClick,
  onToggleDay,
  onCreateClick
}: MonthlyMatrixProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Week headers */}
            <tr className="bg-slate-700/50 border-b border-slate-600">
              <th className="text-left px-3 py-2 text-sm font-medium text-slate-300 min-w-[140px] sticky left-0 bg-slate-700/50 z-10">
                Moje Nawyki
              </th>
              {monthData.weeks.map((week, weekIdx) => (
                <th
                  key={weekIdx}
                  colSpan={week.length}
                  className="text-center px-1 py-2 text-xs font-medium text-slate-400 border-l border-slate-600"
                >
                  Tydzień {weekIdx + 1}
                </th>
              ))}
              <th className="text-center px-2 py-2 text-sm font-medium text-slate-300 min-w-[120px] border-l border-slate-600">
                Analiza
              </th>
            </tr>
            {/* Day names row */}
            <tr className="bg-slate-700/30 border-b border-slate-600">
              <th className="sticky left-0 bg-slate-700/30 z-10"></th>
              {monthData.weeks.map((week, weekIdx) => {
                const weekOffset = monthData.weekDayOffsets[weekIdx];
                return week.map((day, dayIdx) => {
                  const dayNameIdx = (weekOffset + dayIdx) % 7;
                  const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());
                  return (
                    <th
                      key={`${weekIdx}-${dayIdx}`}
                      className={`text-center px-0.5 py-1 min-w-[32px] ${
                        dayIdx === 0 ? 'border-l border-slate-600' : ''
                      } ${isCurrentDay ? 'bg-amber-500/20' : ''}`}
                    >
                      <div className="text-[10px] text-slate-400">
                        {DAY_NAMES_MEDIUM[dayNameIdx]}
                      </div>
                      <div className={`text-xs font-medium ${
                        isCurrentDay ? 'text-amber-400' : 'text-slate-300'
                      }`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                });
              })}
              <th className="border-l border-slate-600">
                <div className="flex text-[10px] text-slate-400">
                  <span className="flex-1 text-center">Cel</span>
                  <span className="flex-1 text-center">Wynik</span>
                  <span className="flex-1 text-center">Progres</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {monthlyStats.challengeAnalysis.map(({ challenge, goal, result, progress }) => (
              <tr key={challenge.id} className="hover:bg-slate-700/20 transition-colors">
                {/* Challenge name */}
                <td className="px-3 py-2 sticky left-0 bg-slate-800/90 z-10">
                  <button
                    onClick={() => onChallengeClick(challenge)}
                    className="flex items-center gap-2 group text-left w-full"
                  >
                    <span className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors text-sm truncate max-w-[120px]">
                      {challenge.name}
                    </span>
                    <Info className="w-3 h-3 text-slate-500 group-hover:text-amber-400 flex-shrink-0" />
                  </button>
                </td>

                {/* Day cells */}
                {monthData.weeks.map((week, weekIdx) => (
                  week.map((day, dayIdx) => {
                    const dateStr = formatDate(day);
                    const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
                    const completed = !!challenge.completedDays[dateStr];
                    const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());

                    if (!inChallenge) {
                      return (
                        <td
                          key={`${weekIdx}-${dayIdx}`}
                          className={`text-center px-0.5 py-1.5 ${
                            dayIdx === 0 ? 'border-l border-slate-600' : ''
                          } ${isCurrentDay ? 'bg-amber-500/10' : ''}`}
                        >
                          <div className="w-6 h-6 mx-auto rounded bg-slate-800/30 opacity-30" />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${weekIdx}-${dayIdx}`}
                        className={`text-center px-0.5 py-1.5 ${
                          dayIdx === 0 ? 'border-l border-slate-600' : ''
                        } ${isCurrentDay ? 'bg-amber-500/10' : ''}`}
                      >
                        <button
                          onClick={() => onToggleDay(challenge, dateStr)}
                          className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                            completed
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-500 hover:border-slate-400'
                          }`}
                        >
                          {completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })
                ))}

                {/* Analysis column */}
                <td className="px-2 py-2 border-l border-slate-600">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-8 text-center text-slate-400">{goal}</span>
                    <span className="w-8 text-center text-white font-medium">{result}</span>
                    <div className="flex-1 min-w-[50px]">
                      <div className="h-3 bg-slate-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Bottom stats row */}
          <tfoot>
            <tr className="bg-slate-700/30 border-t border-slate-600">
              <td className="px-3 py-2 text-xs text-slate-400 sticky left-0 bg-slate-700/30 z-10">
                Progres
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`prog-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-slate-600' : ''
                    }`}>
                      <span className={`text-[10px] font-medium ${
                        stats?.progress >= 70 ? 'text-emerald-400' :
                        stats?.progress >= 40 ? 'text-amber-400' :
                        'text-slate-400'
                      }`}>
                        {stats?.progress || 0}%
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-slate-600"></td>
            </tr>
            <tr className="bg-slate-700/20">
              <td className="px-3 py-1 text-xs text-emerald-400 sticky left-0 bg-slate-700/20 z-10">
                Zrobione
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`done-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-slate-600' : ''
                    }`}>
                      <span className="text-[10px] text-emerald-400">
                        {stats?.done || 0}
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-slate-600"></td>
            </tr>
            <tr className="bg-slate-700/10">
              <td className="px-3 py-1 text-xs text-slate-400 sticky left-0 bg-slate-700/10 z-10">
                Nie zrobione
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`notdone-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-slate-600' : ''
                    }`}>
                      <span className="text-[10px] text-slate-500">
                        {stats?.notDone || 0}
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-slate-600"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add new habit button */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Dodaj nawyk</span>
        </button>
      </div>
    </div>
  );
}

interface ProgressChartProps {
  dailyStats: { [date: string]: { done: number; notDone: number; progress: number } };
  month: number;
  monthData: { weeks: Date[][]; weekDayOffsets: number[] };
}

function ProgressChart({ dailyStats, month, monthData }: ProgressChartProps) {
  // Collect all days in month in order (all days in weeks are now from current month)
  const daysInMonth: { date: string; progress: number }[] = [];
  monthData.weeks.forEach(week => {
    week.forEach(day => {
      const dateStr = formatDate(day);
      daysInMonth.push({
        date: dateStr,
        progress: dailyStats[dateStr]?.progress || 0
      });
    });
  });

  // Sort by date
  daysInMonth.sort((a, b) => a.date.localeCompare(b.date));

  const maxProgress = 100;
  const chartHeight = 120;
  const chartWidth = daysInMonth.length * 20;

  // Create SVG path for the line
  const points = daysInMonth.map((d, i) => {
    const x = (i / (daysInMonth.length - 1)) * 100;
    const y = 100 - (d.progress / maxProgress) * 100;
    return `${x},${y}`;
  });

  const linePath = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaPath = points.length > 0
    ? `M 0,100 L ${points.join(' L ')} L 100,100 Z`
    : '';

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Dzienny postęp</h3>

      <div className="relative h-[140px]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-slate-500">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-[120px] relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 25, 50, 75, 100].map(val => (
              <div
                key={val}
                className="absolute w-full border-t border-slate-700/50"
                style={{ top: `${100 - val}%` }}
              />
            ))}
          </div>

          {/* SVG Chart */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#gradient)"
              opacity="0.3"
            />
            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
