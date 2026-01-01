"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Entry {
  id: string;
  date: string;
  weight: number;
}

interface Goal {
  current_weight: number;
  target_weight: number;
  target_date: string;
  start_date?: string;
  weekly_weight_loss?: number;
}

interface ProgressChartProps {
  entries: Entry[];
  goal: Goal | null;
  startDate?: string;
  endDate?: string;
}

export default function ProgressChart({ entries, goal, startDate, endDate }: ProgressChartProps) {
  // Filter entries by date range if provided
  let filteredEntries = entries;
  if (startDate && endDate) {
    filteredEntries = entries.filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });
  }

  // Show empty state only if no entries
  if (filteredEntries.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Wykres postępów</h3>
        <p className="text-slate-400 text-center py-12">
          {entries.length === 0
            ? "Dodaj wpisy, aby zobaczyć wykres postępów."
            : "Brak wpisów w wybranym okresie."
          }
        </p>
      </div>
    );
  }

  // Check if we should show goal line:
  // - For historical view (startDate/endDate provided): always show if goal exists
  // - For current goal view (only startDate): always show if goal exists
  // - For main view: only show if goal is active (target date not passed)
  const isHistoricalView = startDate && endDate;
  const isCurrentGoalView = startDate && !endDate;
  const [showGoalLine, setShowGoalLine] = useState(goal !== null);

  useEffect(() => {
    if (!goal) {
      setShowGoalLine(false);
    } else if (isHistoricalView || isCurrentGoalView) {
      // Historical or current goal view - always show goal line
      setShowGoalLine(true);
    } else {
      // Main view - only show if target date not passed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setShowGoalLine(new Date(goal.target_date) >= today);
    }
  }, [goal, isHistoricalView, isCurrentGoalView]);

  // Sort entries by date
  const sortedEntries = [...filteredEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate target weight for each date (only if goal exists)
  let goalStartDate: Date | null = null;
  let goalEndDate: Date | null = null;
  let dailyWeightLoss = 0;

  if (showGoalLine && goal) {
    goalStartDate = goal.start_date ? new Date(goal.start_date) : new Date(sortedEntries[0].date);
    goalEndDate = new Date(goal.target_date);
    const totalDays = Math.ceil((goalEndDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeightLoss = goal.current_weight - goal.target_weight;
    dailyWeightLoss = totalDays > 0 ? totalWeightLoss / totalDays : 0;
  }

  // Create chart data
  const chartData = sortedEntries.map(entry => {
    const result: {
      date: string;
      fullDate: string;
      actual: number;
      target?: number;
      difference?: number;
    } = {
      date: new Date(entry.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      fullDate: entry.date,
      actual: entry.weight,
    };

    // Add target data only if goal exists and entry is within goal period
    if (showGoalLine && goal && goalStartDate) {
      const entryDate = new Date(entry.date);
      const daysFromStart = Math.ceil((entryDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only show target weight for entries on or after goal start date
      if (daysFromStart >= 0) {
        const targetWeight = Math.max(
          goal.target_weight,
          goal.current_weight - (dailyWeightLoss * daysFromStart)
        );
        result.target = parseFloat(targetWeight.toFixed(1));
        result.difference = parseFloat((entry.weight - targetWeight).toFixed(1));
      }
    }

    return result;
  });

  // Add future target points if we haven't reached the goal date (only if goal exists and not filtering by date range)
  if (showGoalLine && goal && goalEndDate) {
    const lastEntryDate = new Date(sortedEntries[sortedEntries.length - 1].date);
    if (!startDate && !endDate && lastEntryDate < goalEndDate) {
      const targetPoint = {
        date: goalEndDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        fullDate: goal.target_date,
        actual: null as number | null,
        target: goal.target_weight,
        difference: null as number | null,
      };
      chartData.push(targetPoint as any);
    }
  }

  // Calculate min/max weight for chart domain
  const actualWeights = chartData.map(d => d.actual).filter((w): w is number => w !== null);
  const targetWeights = showGoalLine ? chartData.map(d => d.target).filter((w): w is number => w !== undefined) : [];
  const allWeights = [...actualWeights, ...targetWeights];

  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">Wykres postępów</h3>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              domain={[minWeight, maxWeight]}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${value}kg`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'actual') return [`${value} kg`, 'Waga rzeczywista'];
                if (name === 'target') return [`${value} kg`, 'Waga docelowa'];
                return [value, name];
              }}
              labelFormatter={(label) => `Data: ${label}`}
            />
            {showGoalLine && (
              <Legend
                formatter={(value) => {
                  if (value === 'actual') return <span style={{ color: '#10b981' }}>Waga rzeczywista</span>;
                  if (value === 'target') return <span style={{ color: '#f59e0b' }}>Waga docelowa</span>;
                  return value;
                }}
              />
            )}
            {showGoalLine && goal && (
              <ReferenceLine
                y={goal.target_weight}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: `Cel: ${goal.target_weight}kg`, fill: '#10b981', fontSize: 12 }}
              />
            )}
            {showGoalLine && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                connectNulls
                name="target"
              />
            )}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, fill: '#10b981' }}
              connectNulls
              name="actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-emerald-500 rounded"></div>
          <span className="text-slate-400">Twoja waga</span>
        </div>
        {showGoalLine && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-slate-400">Waga wzorcowa (plan)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-slate-400">Cel koncowy</span>
            </div>
          </>
        )}
        {!showGoalLine && !isHistoricalView && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 italic">Tryb wolny - brak aktywnego celu</span>
          </div>
        )}
      </div>
    </div>
  );
}
