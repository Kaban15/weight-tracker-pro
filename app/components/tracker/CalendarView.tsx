"use client";

import { ChevronLeft, ChevronRight, Plus, Flame, Footprints, Dumbbell } from 'lucide-react';
import { Entry, getDaysInMonth, formatDate } from './types';
import { isToday } from '../shared/Calendar';

interface CalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  getEntryForDate: (date: string) => Entry | undefined;
  onDayClick: (date: string, entry?: Entry) => void;
  onAddClick: () => void;
}

export default function CalendarView({
  currentMonth,
  onMonthChange,
  getEntryForDate,
  onDayClick,
  onAddClick
}: CalendarViewProps) {
  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
        <button
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'].map(day => (
          <div key={day} className="text-center text-slate-400 font-semibold py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;
          const dateStr = formatDate(day);
          const entry = getEntryForDate(dateStr);
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr, entry)}
              className={`min-h-[100px] rounded-xl p-2 transition-all
                ${isTodayDate ? 'ring-2 ring-emerald-500' : ''}
                ${entry ? 'bg-emerald-600/20 hover:bg-emerald-600/30' : 'bg-slate-800/50 hover:bg-slate-800'}`}
            >
              <div className="flex flex-col items-start h-full">
                <span className={`text-sm mb-1 ${isTodayDate ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                  {day.getDate()}
                </span>
                {entry && (
                  <div className="text-xs space-y-1 w-full">
                    <div className="text-emerald-400 font-semibold">{entry.weight}kg</div>
                    {entry.calories && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-3 h-3" />
                        <span>{entry.calories}</span>
                      </div>
                    )}
                    {entry.steps && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <Footprints className="w-3 h-3" />
                        <span>{(entry.steps / 1000).toFixed(0)}k</span>
                      </div>
                    )}
                    {entry.workout && (
                      <div className="flex items-center gap-1 text-purple-400">
                        <Dumbbell className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onAddClick}
        className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
