"use client";

import { formatDate } from "./utils/dateUtils";

interface ProgressChartProps {
  dailyStats: { [date: string]: { done: number; notDone: number; progress: number } };
  month: number;
  monthData: { weeks: Date[][]; weekDayOffsets: number[] };
}

export default function ProgressChart({ dailyStats, monthData }: ProgressChartProps) {
  // Collect all days in month in order
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
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
      <h3 className="text-sm font-medium text-[var(--foreground)] mb-4">Dzienny postęp</h3>

      <div className="relative h-[140px]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-[var(--muted)]">
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
                className="absolute w-full border-t border-[var(--card-border)]"
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
