"use client";

import { useState } from "react";
import { Check, Flame, Home, Plus, Trophy, ChevronLeft, ChevronRight, Info, History, Zap } from "lucide-react";
import { isToday } from "../shared/Calendar";
import SyncIndicator from "../shared/SyncIndicator";
import { Challenge, getChallengeProgress } from "./index";
import { formatDate, getWeekDays, getWeekNumber, DAY_NAMES_SHORT } from "./utils/dateUtils";

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<'active' | 'history'>('active');

  const weekDays = getWeekDays(weekOffset);
  const weekNum = getWeekNumber(weekDays[0]);

  // Split challenges into active and completed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeChallenges = challenges.filter(c => new Date(c.endDate) >= today);
  const completedChallenges = challenges.filter(c => new Date(c.endDate) < today);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Wróć do menu głównego"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Wyzwania</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <button
            onClick={onSignOut}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
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
              aria-label="Poprzedni tydzień"
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
              aria-label="Następny tydzień"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-4 bg-slate-800/50 p-1 rounded-lg" role="tablist">
          <button
            role="tab"
            aria-selected={dashboardTab === 'active'}
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
            role="tab"
            aria-selected={dashboardTab === 'history'}
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
            <EmptyState
              icon={<History className="w-8 h-8 text-slate-500" />}
              title="Brak historii"
              description="Ukończone wyzwania pojawią się tutaj"
            />
          ) : (
            <div className="space-y-3">
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

        {/* Active Challenges Matrix */}
        {dashboardTab === 'active' && activeChallenges.length === 0 && (
          <EmptyState
            icon={<Trophy className="w-8 h-8 text-amber-400" />}
            title="Brak aktywnych wyzwań"
            description="Utwórz nowe wyzwanie lub sprawdź historię!"
            action={
              <button
                onClick={onCreateClick}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Nowe wyzwanie
              </button>
            }
          />
        )}

        {dashboardTab === 'active' && activeChallenges.length > 0 && (
          <ChallengeMatrix
            challenges={activeChallenges}
            weekDays={weekDays}
            onChallengeClick={onChallengeClick}
            onToggleDay={onToggleDay}
            onCreateClick={onCreateClick}
          />
        )}

        {/* Today button */}
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
}

interface ChallengeMatrixProps {
  challenges: Challenge[];
  weekDays: Date[];
  onChallengeClick: (challenge: Challenge) => void;
  onToggleDay: (challenge: Challenge, dateStr: string) => void;
  onCreateClick: () => void;
}

function ChallengeMatrix({ challenges, weekDays, onChallengeClick, onToggleDay, onCreateClick }: ChallengeMatrixProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
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
                      {DAY_NAMES_SHORT[idx]}
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
            {challenges.map(challenge => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                weekDays={weekDays}
                onChallengeClick={onChallengeClick}
                onToggleDay={onToggleDay}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new challenge button */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Dodaj wyzwanie</span>
        </button>
      </div>
    </div>
  );
}

interface ChallengeRowProps {
  challenge: Challenge;
  weekDays: Date[];
  onChallengeClick: (challenge: Challenge) => void;
  onToggleDay: (challenge: Challenge, dateStr: string) => void;
}

function ChallengeRow({ challenge, weekDays, onChallengeClick, onToggleDay }: ChallengeRowProps) {
  const progress = getChallengeProgress(challenge);

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      {/* Challenge name */}
      <td className="px-4 py-3">
        <button
          onClick={() => onChallengeClick(challenge)}
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
              onClick={() => onToggleDay(challenge, dateStr)}
              className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all ${
                completed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'border-2 border-slate-600 hover:border-slate-500'
              }`}
              aria-label={`${completed ? 'Odznacz' : 'Zaznacz'} dzień ${day.getDate()}`}
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
}
