"use client";

import { useState } from "react";
import { Check, Flame, Edit2, Trash2, ArrowLeft, Grid3X3, BarChart3 } from "lucide-react";
import { isToday } from "../shared/Calendar";
import SyncIndicator from "../shared/SyncIndicator";
import { Challenge, getChallengeProgress } from "./index";
import { formatDate, DAY_NAMES_MEDIUM } from "./utils/dateUtils";

interface ChallengeDetailProps {
  challenge: Challenge;
  isSyncing: boolean;
  syncError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDayClick: (day: number, dateStr: string) => void;
  onToggleSimpleDay: (dateStr: string, currentlyCompleted: boolean) => void;
}

export default function ChallengeDetail({
  challenge,
  isSyncing,
  syncError,
  onBack,
  onEdit,
  onDelete,
  onDayClick,
  onToggleSimpleDay
}: ChallengeDetailProps) {
  const [detailView, setDetailView] = useState<'grid' | 'table'>('grid');
  const progress = getChallengeProgress(challenge);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white"
            aria-label="Wróć do listy nawyków"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Nawyki</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{challenge.name}</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-slate-400 hover:text-amber-400 p-1"
              aria-label="Edytuj nawyk"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-slate-400 hover:text-rose-400 p-1"
              aria-label="Usuń nawyk"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Summary */}
        <ProgressSummary challenge={challenge} progress={progress} />

        {/* View Toggle */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg" role="tablist">
          <button
            role="tab"
            aria-selected={detailView === 'grid'}
            onClick={() => setDetailView('grid')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
              detailView === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="text-sm font-medium">Siatka</span>
          </button>
          <button
            role="tab"
            aria-selected={detailView === 'table'}
            onClick={() => setDetailView('table')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
              detailView === 'table' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Analiza</span>
          </button>
        </div>

        {/* Grid View */}
        {detailView === 'grid' && (
          <WeeklyGrid
            challenge={challenge}
            onDayClick={onDayClick}
          />
        )}

        {/* Table/Analysis View */}
        {detailView === 'table' && (
          <AnalysisView
            challenge={challenge}
            onDayClick={onDayClick}
            onToggleSimpleDay={onToggleSimpleDay}
          />
        )}
      </main>
    </div>
  );
}

// Sub-components

interface ProgressSummaryProps {
  challenge: Challenge;
  progress: ReturnType<typeof getChallengeProgress>;
}

function ProgressSummary({ challenge, progress }: ProgressSummaryProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-slate-400 text-sm">{challenge.startDate} - {challenge.endDate}</p>
          {progress.streak > 0 && (
            <p className="flex items-center gap-1 text-orange-400 text-sm mt-1">
              <Flame className="w-4 h-4" aria-hidden="true" /> {progress.streak} dni z rzędu
            </p>
          )}
        </div>
        <div className="text-right">
          {!challenge.trackReps && (
            <p className="text-2xl font-bold text-amber-400">{progress.percentage}%</p>
          )}
          <p className="text-slate-400 text-xs">{progress.completedCount}/{progress.totalDays} dni</p>
          {challenge.dailyGoals && Object.keys(challenge.dailyGoals).length > 0 && (
            <p className="text-emerald-400 text-xs">
              {Object.entries(challenge.completedDays).filter(([date, reps]) =>
                challenge.dailyGoals?.[date] && reps >= challenge.dailyGoals[date]
              ).length} dni z celem
            </p>
          )}
        </div>
      </div>

      {/* Total Reps Summary */}
      {challenge.trackReps && (
        <TotalRepsSummary challenge={challenge} progress={progress} />
      )}

      {/* Main Progress Bar */}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
          style={{ width: `${progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {progress.isCompleted && (
        <div className="mt-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
          <p className="text-emerald-400 font-semibold">
            Cel osiągnięty!
            {challenge.trackReps && progress.totalReps > 0 && (
              <span className="block text-sm mt-1">
                Łącznie: {progress.totalReps} {challenge.goalUnit || 'powtórzeń'}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

interface TotalRepsSummaryProps {
  challenge: Challenge;
  progress: ReturnType<typeof getChallengeProgress>;
}

function TotalRepsSummary({ challenge, progress }: TotalRepsSummaryProps) {
  const totalGoal = challenge.dailyGoals
    ? Object.values(challenge.dailyGoals).reduce((sum, g) => sum + g, 0)
    : 0;
  const goalPercentage = totalGoal > 0 ? Math.round((progress.totalReps / totalGoal) * 100) : 0;

  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-amber-600/20 to-amber-500/10 rounded-lg border border-amber-500/30">
      <div className="flex items-center justify-between">
        <div className="text-amber-400 text-sm font-medium">
          {progress.isCompleted ? 'Suma wykonanych' : 'Wykonano łącznie'}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{progress.totalReps}</span>
          <span className="text-amber-400 text-sm">{challenge.goalUnit || 'powtórzeń'}</span>
        </div>
      </div>
      {totalGoal > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Cel łączny: {totalGoal} {challenge.goalUnit}</span>
            <span className={goalPercentage >= 100 ? 'text-emerald-400' : ''}>{goalPercentage}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${goalPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, goalPercentage)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface WeeklyGridProps {
  challenge: Challenge;
  onDayClick: (day: number, dateStr: string) => void;
}

function WeeklyGrid({ challenge, onDayClick }: WeeklyGridProps) {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);

  // Find the Monday of the first week
  const firstDay = new Date(start);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  firstDay.setDate(firstDay.getDate() + mondayOffset);

  // Build weeks array
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  const current = new Date(firstDay);

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
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 bg-slate-700/50 border-b border-slate-600">
        <div className="p-2 text-center text-xs text-slate-400 font-medium">Tydz.</div>
        {DAY_NAMES_MEDIUM.map(day => (
          <div key={day} className="p-2 text-center text-xs text-slate-400 font-medium">{day}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-8">
            <div className="p-2 flex items-center justify-center text-xs text-slate-500 bg-slate-800/30">
              {weekIdx + 1}
            </div>
            {week.map((day, dayIdx) => (
              <GridCell
                key={dayIdx}
                day={day}
                challenge={challenge}
                onDayClick={onDayClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface GridCellProps {
  day: Date;
  challenge: Challenge;
  onDayClick: (day: number, dateStr: string) => void;
}

function GridCell({ day, challenge, onDayClick }: GridCellProps) {
  const dateStr = formatDate(day);
  const inChallenge = dateStr >= challenge.startDate && dateStr <= challenge.endDate;
  const completed = !!challenge.completedDays[dateStr];
  const reps = challenge.completedDays[dateStr] || 0;
  const dayGoal = challenge.dailyGoals?.[dateStr] || 0;
  const goalReached = dayGoal > 0 && reps >= dayGoal;
  const todayCheck = isToday(day.getDate(), day.getMonth(), day.getFullYear());

  if (!inChallenge) {
    return (
      <div className="p-1.5 flex items-center justify-center">
        <div className="w-8 h-8 flex items-center justify-center text-xs text-slate-600">
          {day.getDate()}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => onDayClick(day.getDate(), dateStr)}
      className={`p-1.5 flex items-center justify-center transition-colors ${todayCheck ? 'bg-emerald-500/10' : 'hover:bg-slate-700/50'}`}
      aria-label={`${day.getDate()} - ${completed ? 'wykonane' : 'nie wykonane'}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        goalReached ? 'bg-emerald-600 text-white' :
        completed ? 'bg-amber-600 text-white' :
        dayGoal > 0 ? 'border-2 border-dashed border-amber-500/50 text-slate-300' :
        'border-2 border-slate-600 text-slate-300'
      } ${todayCheck ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-800' : ''}`}>
        {goalReached || (completed && !challenge.trackReps) ? (
          <Check className="w-4 h-4" />
        ) : challenge.trackReps && reps > 0 ? (
          <span className="text-xs font-bold">{reps}</span>
        ) : (
          <span className="text-xs">{day.getDate()}</span>
        )}
      </div>
    </button>
  );
}

interface AnalysisViewProps {
  challenge: Challenge;
  onDayClick: (day: number, dateStr: string) => void;
  onToggleSimpleDay: (dateStr: string, currentlyCompleted: boolean) => void;
}

function AnalysisView({ challenge, onDayClick, onToggleSimpleDay }: AnalysisViewProps) {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const days: Date[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600">
        <h3 className="text-white font-semibold text-center">Analiza postępów</h3>
      </div>
      <div className="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto">
        {days.map((day) => (
          <AnalysisRow
            key={formatDate(day)}
            day={day}
            challenge={challenge}
            onDayClick={onDayClick}
            onToggleSimpleDay={onToggleSimpleDay}
          />
        ))}
      </div>
    </div>
  );
}

interface AnalysisRowProps {
  day: Date;
  challenge: Challenge;
  onDayClick: (day: number, dateStr: string) => void;
  onToggleSimpleDay: (dateStr: string, currentlyCompleted: boolean) => void;
}

function AnalysisRow({ day, challenge, onDayClick, onToggleSimpleDay }: AnalysisRowProps) {
  const dateStr = formatDate(day);
  const dayGoal = challenge.dailyGoals?.[dateStr] || 0;
  const reps = challenge.completedDays[dateStr] || 0;
  const completed = reps > 0;
  const progressPct = dayGoal > 0 ? Math.min(100, Math.round((reps / dayGoal) * 100)) : (completed ? 100 : 0);
  const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());

  const handleClick = () => {
    if (challenge.trackReps) {
      onDayClick(day.getDate(), dateStr);
    } else {
      onToggleSimpleDay(dateStr, completed);
    }
  };

  return (
    <button
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
            {challenge.trackReps
              ? (dayGoal > 0 ? `Cel: ${dayGoal}` : 'Brak celu')
              : (completed ? 'Wykonane' : 'Nie wykonane')
            }
          </span>
          <span className={`text-sm font-bold ${
            completed ? (progressPct >= 100 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-500'
          }`}>
            {challenge.trackReps ? (reps > 0 ? reps : '-') : ''}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              progressPct >= 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-amber-500' : 'bg-slate-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <div className="w-12 text-right">
        {(dayGoal > 0 || !challenge.trackReps) && (
          <span className={`text-sm font-bold ${progressPct >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {challenge.trackReps ? `${progressPct}%` : ''}
          </span>
        )}
        {progressPct >= 100 && <Check className="w-4 h-4 text-emerald-400 inline ml-1" />}
      </div>
    </button>
  );
}
