"use client";

import { useRef, useEffect } from "react";
import { Check, Plus, Info } from "lucide-react";
import { isToday } from "../shared/Calendar";
import { Challenge } from "./index";
import { formatDate, DAY_NAMES_MEDIUM } from "./utils/dateUtils";

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

export default function MonthlyMatrix({
  challenges,
  monthData,
  month,
  monthlyStats,
  onChallengeClick,
  onToggleDay,
  onCreateClick
}: MonthlyMatrixProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today's column on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const todayCell = container.querySelector('[data-today="true"]');
      if (todayCell) {
        const containerRect = container.getBoundingClientRect();
        const cellRect = todayCell.getBoundingClientRect();

        // Calculate scroll position to put today's cell at the right edge with some padding
        const scrollLeft = cellRect.left - containerRect.left + container.scrollLeft - containerRect.width + cellRect.width + 60;

        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'auto'
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [month]);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <table className="w-full border-collapse">
          <thead>
            {/* Week headers */}
            <tr className="bg-[var(--surface)] border-b border-[var(--card-border)]">
              <th className="text-left px-3 py-2 text-sm font-medium text-[var(--foreground)] min-w-[140px] sticky left-0 bg-[var(--surface)] z-10">
                Moje Nawyki
              </th>
              {monthData.weeks.map((week, weekIdx) => (
                <th
                  key={weekIdx}
                  colSpan={week.length}
                  className="text-center px-1 py-2 text-xs font-medium text-[var(--muted)] border-l border-[var(--card-border)]"
                >
                  Tydzień {weekIdx + 1}
                </th>
              ))}
              <th className="text-center px-2 py-2 text-sm font-medium text-[var(--foreground)] min-w-[120px] border-l border-[var(--card-border)]">
                Analiza
              </th>
            </tr>
            {/* Day names row */}
            <tr className="bg-[var(--surface)] border-b border-[var(--card-border)]">
              <th className="sticky left-0 bg-[var(--surface)] z-10"></th>
              {monthData.weeks.map((week, weekIdx) => {
                const weekOffset = monthData.weekDayOffsets[weekIdx] ?? 0;
                return week.map((day, dayIdx) => {
                  const dayNameIdx = (weekOffset + dayIdx) % 7;
                  const isCurrentDay = isToday(day.getDate(), day.getMonth(), day.getFullYear());
                  return (
                    <th
                      key={`${weekIdx}-${dayIdx}`}
                      data-today={isCurrentDay ? "true" : undefined}
                      className={`text-center px-0.5 py-1 min-w-[32px] ${
                        dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                      } ${isCurrentDay ? 'bg-amber-500/20' : ''}`}
                    >
                      <div className="text-[10px] text-[var(--muted)]">
                        {DAY_NAMES_MEDIUM[dayNameIdx]}
                      </div>
                      <div className={`text-xs font-medium ${
                        isCurrentDay ? 'text-amber-400' : 'text-[var(--foreground)]'
                      }`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                });
              })}
              <th className="border-l border-[var(--card-border)]">
                <div className="flex text-[10px] text-[var(--muted)]">
                  <span className="flex-1 text-center">Cel</span>
                  <span className="flex-1 text-center">Wynik</span>
                  <span className="flex-1 text-center">Progres</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {monthlyStats.challengeAnalysis.map(({ challenge, goal, result, progress }) => (
              <tr key={challenge.id} className="hover:bg-[var(--surface)]/20 transition-colors">
                {/* Challenge name */}
                <td className="px-3 py-2 sticky left-0 bg-[var(--card-bg)] z-10">
                  <button
                    onClick={() => onChallengeClick(challenge)}
                    className="flex items-center gap-2 group text-left w-full"
                  >
                    <span className="font-medium text-[var(--foreground)] group-hover:text-amber-400 transition-colors text-sm truncate max-w-[120px]">
                      {challenge.name}
                    </span>
                    <Info className="w-3 h-3 text-[var(--muted)] group-hover:text-amber-400 flex-shrink-0" />
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
                            dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                          } ${isCurrentDay ? 'bg-amber-500/10' : ''}`}
                        >
                          <div className="w-6 h-6 mx-auto rounded bg-[var(--card-bg)] opacity-30" />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${weekIdx}-${dayIdx}`}
                        className={`text-center px-0.5 py-1.5 ${
                          dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                        } ${isCurrentDay ? 'bg-amber-500/10' : ''}`}
                      >
                        <button
                          onClick={() => onToggleDay(challenge, dateStr)}
                          className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                            completed
                              ? 'bg-emerald-600 text-white'
                              : 'border border-[var(--card-border)] hover:border-[var(--card-border)]'
                          }`}
                        >
                          {completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })
                ))}

                {/* Analysis column */}
                <td className="px-2 py-2 border-l border-[var(--card-border)]">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-8 text-center text-[var(--muted)]">{goal}</span>
                    <span className="w-8 text-center text-white font-medium">{result}</span>
                    <div className="flex-1 min-w-[50px]">
                      <div className="h-3 bg-[var(--surface)] rounded overflow-hidden">
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
          {/* Bottom stats rows */}
          <tfoot>
            <tr className="bg-[var(--surface)] border-t border-[var(--card-border)]">
              <td className="px-3 py-2 text-xs text-[var(--muted)] sticky left-0 bg-[var(--surface)] z-10">
                Progres
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`prog-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                    }`}>
                      <span className={`text-[10px] font-medium ${
                        (stats?.progress ?? 0) >= 70 ? 'text-[var(--accent)]' :
                        (stats?.progress ?? 0) >= 40 ? 'text-amber-400' :
                        'text-[var(--muted)]'
                      }`}>
                        {stats?.progress || 0}%
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-[var(--card-border)]"></td>
            </tr>
            <tr className="bg-[var(--surface)]">
              <td className="px-3 py-1 text-xs text-[var(--accent)] sticky left-0 bg-[var(--surface)] z-10">
                Zrobione
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`done-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                    }`}>
                      <span className="text-[10px] text-[var(--accent)]">
                        {stats?.done || 0}
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-[var(--card-border)]"></td>
            </tr>
            <tr className="bg-[var(--surface)]">
              <td className="px-3 py-1 text-xs text-[var(--muted)] sticky left-0 bg-[var(--surface)] z-10">
                Nie zrobione
              </td>
              {monthData.weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const stats = monthlyStats.dailyStats[dateStr];

                  return (
                    <td key={`notdone-${weekIdx}-${dayIdx}`} className={`text-center px-0.5 py-1 ${
                      dayIdx === 0 ? 'border-l border-[var(--card-border)]' : ''
                    }`}>
                      <span className="text-[10px] text-[var(--muted)]">
                        {stats?.notDone || 0}
                      </span>
                    </td>
                  );
                })
              ))}
              <td className="border-l border-[var(--card-border)]"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add new habit button */}
      <div className="border-t border-[var(--card-border)] p-3">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2 text-[var(--muted)] hover:text-amber-400 hover:bg-[var(--surface)] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Dodaj nawyk</span>
        </button>
      </div>
    </div>
  );
}
