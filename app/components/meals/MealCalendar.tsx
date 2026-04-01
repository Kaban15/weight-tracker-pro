"use client";

import { useState } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Calendar from '../shared/Calendar';
import { MealPlan, DaySummary } from './types';
import MealDaySummary from './MealDaySummary';

interface MealCalendarProps {
  mealPlans: MealPlan[];
  getDaySummary: (date: string) => DaySummary;
  targetCalories: number;
  onNavigateToCharts: () => void;
  onBack: () => void;
}

export default function MealCalendar({ mealPlans, getDaySummary, targetCalories, onNavigateToCharts, onBack }: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selectedSummary = selectedDay ? getDaySummary(selectedDay) : null;

  const renderDay = (day: number, dateStr: string) => {
    const dayMeals = mealPlans.filter(m => m.date === dateStr);
    const hasMeals = dayMeals.length > 0;
    const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
    const percent = targetCalories > 0 ? Math.round((totalCal / targetCalories) * 100) : 0;

    return (
      <button onClick={() => setSelectedDay(dateStr)}
        className="w-full h-full flex flex-col items-center justify-center gap-0.5 hover:bg-[var(--surface)] rounded-lg transition-colors p-1">
        <span className="text-sm text-[var(--foreground)]">{day}</span>
        {hasMeals && (
          <div className={`w-1.5 h-1.5 rounded-full ${
            percent > 110 ? 'bg-red-400' : percent > 80 ? 'bg-violet-400' : 'bg-amber-400'
          }`} />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
        <button onClick={onNavigateToCharts}
          className="flex items-center gap-1 px-3 py-2 bg-violet-600/20 text-violet-400 text-sm rounded-lg hover:bg-violet-600/30">
          <BarChart3 className="w-4 h-4" /> Podsumowania
        </button>
      </div>

      <Calendar currentDate={currentDate} onDateChange={setCurrentDate} renderDay={renderDay} />

      {selectedSummary && (
        <MealDaySummary
          summary={selectedSummary}
          targetCalories={targetCalories}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
