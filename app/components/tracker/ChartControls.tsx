"use client";

import React from 'react';
import { Calendar, CalendarDays, Settings2 } from 'lucide-react';
import type { ChartRange } from './types';

interface ChartControlsProps {
  readonly chartRange: ChartRange;
  readonly onChartRangeChange: (range: ChartRange) => void;
  readonly chartMode: 'all' | 'current-goal';
  readonly onChartModeChange: (mode: 'all' | 'current-goal') => void;
  readonly hasGoalStartDate: boolean;
  readonly customStartDate: string;
  readonly customEndDate: string;
  readonly onCustomStartDateChange: (date: string) => void;
  readonly onCustomEndDateChange: (date: string) => void;
}

export function ChartControls({
  chartRange,
  onChartRangeChange,
  chartMode,
  onChartModeChange,
  hasGoalStartDate,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: ChartControlsProps) {
  return (
    <div className="max-w-6xl mx-auto mb-4 space-y-3">
      {/* Row: Range selector (left) + Data filter (right), stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Chart time range selector */}
        <div className="flex bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)] self-center sm:self-auto">
          {([
            { id: 'week' as ChartRange, icon: Calendar, label: 'Tydzień' },
            { id: 'month' as ChartRange, icon: Calendar, label: 'Miesiąc' },
            { id: 'year' as ChartRange, icon: CalendarDays, label: 'Rok' },
            { id: 'custom' as ChartRange, icon: Settings2, label: 'Zakres' },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onChartRangeChange(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartRange === id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Data filter (all / current-goal) */}
        <div className="flex bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)] self-center sm:self-auto">
          <button
            onClick={() => onChartModeChange('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              chartMode === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Wszystkie wpisy
          </button>
          <button
            onClick={() => onChartModeChange('current-goal')}
            disabled={!hasGoalStartDate}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              chartMode === 'current-goal'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            } ${!hasGoalStartDate ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Biezacy cel
          </button>
        </div>
      </div>

      {/* Custom date range inputs - own row below */}
      {chartRange === 'custom' && (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] text-white rounded-lg px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none [color-scheme:dark]"
          />
          <span className="text-[var(--muted)] text-sm">—</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndDateChange(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] text-white rounded-lg px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}
