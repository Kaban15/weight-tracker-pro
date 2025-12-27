"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  renderDay: (day: number, dateStr: string) => React.ReactNode;
  className?: string;
}

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

export function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isToday(day: number, month: number, year: number): boolean;
export function isToday(date: Date): boolean;
export function isToday(dayOrDate: number | Date, month?: number, year?: number): boolean {
  const today = new Date();
  if (dayOrDate instanceof Date) {
    return dayOrDate.toDateString() === today.toDateString();
  }
  return today.getDate() === dayOrDate && today.getMonth() === month && today.getFullYear() === year;
}

export default function Calendar({ currentDate, onDateChange, renderDay, className = "" }: CalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const goToPrevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const goToNextMonth = () => onDateChange(new Date(year, month + 1, 1));

  return (
    <div className={`bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map(day => (
          <div key={day} className="text-center text-xs text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Actual days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return (
            <div key={day}>
              {renderDay(day, dateStr)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MONTH_NAMES, DAY_NAMES };
