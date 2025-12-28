"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays } from 'lucide-react';
import { Entry, getDaysInMonth, formatDate } from './types';
import { isToday } from '../shared/Calendar';

interface CalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  getEntryForDate: (date: string) => Entry | undefined;
  onDayClick: (date: string, entry?: Entry) => void;
  onAddClick: () => void;
  onDateRangeChange?: (start: string, end: string) => void;
}

type ViewMode = 'week' | 'month';

const DAY_NAMES_SHORT = ['NIEDZ.', 'PON.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SOB.'];

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(date);
  monday.setDate(diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const days = getWeekDays(date);
  return { start: days[0], end: days[6] };
}

function formatWeekRange(start: Date, end: Date): string {
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('pl-PL', { month: 'short' });
  const endMonth = end.toLocaleDateString('pl-PL', { month: 'short' });

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function isCurrentWeek(date: Date): boolean {
  const today = new Date();
  const weekDays = getWeekDays(date);
  const todayStr = formatDate(today);
  return weekDays.some(d => formatDate(d) === todayStr);
}

export default function CalendarView({
  currentMonth,
  onMonthChange,
  getEntryForDate,
  onDayClick,
  onAddClick,
  onDateRangeChange
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Notify parent about date range changes
  useEffect(() => {
    if (onDateRangeChange) {
      if (viewMode === 'week') {
        const { start, end } = getWeekRange(currentWeek);
        onDateRangeChange(formatDate(start), formatDate(end));
      } else {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        onDateRangeChange(formatDate(start), formatDate(end));
      }
    }
  }, [viewMode, currentWeek, currentMonth, onDateRangeChange]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const weekDays = getWeekDays(currentWeek);
  const { start: weekStart, end: weekEnd } = getWeekRange(currentWeek);
  const monthDays = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with navigation and view toggle */}
      <div className="bg-slate-800/50 rounded-2xl border-2 border-slate-700 p-4 mb-4">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={viewMode === 'week' ? handlePrevWeek : () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="text-center min-w-[180px]">
              <h2 className="text-xl font-bold text-white">
                {viewMode === 'week' ? formatWeekRange(weekStart, weekEnd) : monthName}
              </h2>
              {viewMode === 'week' && isCurrentWeek(currentWeek) && (
                <span className="text-sm text-emerald-400">Ten tydzień</span>
              )}
            </div>
            <button
              onClick={viewMode === 'week' ? handleNextWeek : () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Tydzień
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Miesiąc
            </button>
          </div>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const entry = getEntryForDate(dateStr);
            const isTodayDate = isToday(day);
            const dayOfWeek = day.getDay();

            return (
              <button
                key={dateStr}
                onClick={() => onDayClick(dateStr, entry)}
                className={`relative rounded-2xl p-4 transition-all min-h-[140px] flex flex-col
                  ${isTodayDate
                    ? 'bg-emerald-600/30 ring-2 ring-emerald-500'
                    : entry
                      ? 'bg-slate-800 border-2 border-emerald-500/50'
                      : 'bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600'
                  }`}
              >
                {/* Day number */}
                <div className={`text-3xl font-bold mb-1 ${isTodayDate ? 'text-emerald-400' : 'text-white'}`}>
                  {day.getDate()}
                </div>

                {/* Day name */}
                <div className={`text-xs font-semibold mb-3 ${isTodayDate ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {DAY_NAMES_SHORT[dayOfWeek]}
                </div>

                {/* Weight entry */}
                <div className="mt-auto">
                  {entry ? (
                    <div className="text-lg font-bold text-emerald-400">
                      {entry.weight} kg
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      —
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-slate-800/30 rounded-2xl border-2 border-slate-700 p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'].map(day => (
              <div key={day} className="text-center text-slate-400 font-semibold py-2 text-sm">
                {day}
              </div>
            ))}

            {monthDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              const dateStr = formatDate(day);
              const entry = getEntryForDate(dateStr);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => onDayClick(dateStr, entry)}
                  className={`min-h-[80px] rounded-xl p-2 transition-all flex flex-col
                    ${isTodayDate ? 'ring-2 ring-emerald-500' : ''}
                    ${entry
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30'
                      : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                    }`}
                >
                  <span className={`text-sm mb-1 ${isTodayDate ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {day.getDate()}
                  </span>
                  {entry && (
                    <div className="mt-auto text-xs font-semibold text-emerald-400">
                      {entry.weight} kg
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={onAddClick}
        className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg transition-colors z-50"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
