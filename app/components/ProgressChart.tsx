"use client";

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import type { BodyMeasurement } from './tracker/types';

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

type MetricKey = 'weight' | 'waist' | 'hips' | 'chest' | 'arm' | 'thigh';

interface MetricConfig {
  key: MetricKey;
  label: string;
  trendLabel: string;
  unit: string;
  color: string;
  extractValue: (m: BodyMeasurement) => number | undefined;
}

function avgOf(...values: (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => v !== undefined);
  if (nums.length === 0) return undefined;
  return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}

const METRICS: MetricConfig[] = [
  { key: 'weight', label: 'Waga', trendLabel: 'Wykres postępów', unit: 'kg', color: '#10b981', extractValue: () => undefined },
  { key: 'waist', label: 'Talia', trendLabel: 'Trend obwodu talii', unit: 'cm', color: '#8b5cf6', extractValue: m => m.waist },
  { key: 'hips', label: 'Biodra', trendLabel: 'Trend obwodu bioder', unit: 'cm', color: '#f59e0b', extractValue: m => m.hips },
  { key: 'chest', label: 'Klatka', trendLabel: 'Trend klatki piersiowej', unit: 'cm', color: '#3b82f6', extractValue: m => m.chest },
  { key: 'arm', label: 'Ramię', trendLabel: 'Trend obwodu ramion', unit: 'cm', color: '#ec4899', extractValue: m => avgOf(m.arm_left, m.arm_right) },
  { key: 'thigh', label: 'Udo', trendLabel: 'Trend obwodu ud', unit: 'cm', color: '#f97316', extractValue: m => avgOf(m.thigh_left, m.thigh_right) },
];

interface ProgressChartProps {
  entries: Entry[];
  goal: Goal | null;
  startDate?: string;
  endDate?: string;
  measurements?: BodyMeasurement[];
}

export default function ProgressChart({ entries, goal, startDate, endDate, measurements }: ProgressChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight');

  const activeMetric = METRICS.find(m => m.key === selectedMetric)!;
  const isWeightMetric = selectedMetric === 'weight';
  const hasMeasurements = measurements && measurements.length > 0;

  // Filter weight entries by date range
  const filteredEntries = useMemo(() => {
    if (!startDate || !endDate) return entries;
    return entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }, [entries, startDate, endDate]);

  const isHistoricalView = !!(startDate && endDate);
  const isCurrentGoalView = !!(startDate && !endDate);

  // Show goal line only for weight metric with active goal
  const showGoalLine = useMemo(() => {
    if (!goal || !isWeightMetric) return false;
    if (isHistoricalView || isCurrentGoalView) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(goal.target_date) >= today;
  }, [goal, isWeightMetric, isHistoricalView, isCurrentGoalView]);

  // Sort weight entries by date
  const sortedEntries = useMemo(() =>
    [...filteredEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filteredEntries]
  );

  // Goal trajectory calculation
  const { goalStartDate, goalEndDate, dailyWeightLoss } = useMemo(() => {
    if (!showGoalLine || !goal) return { goalStartDate: null, goalEndDate: null, dailyWeightLoss: 0 };

    const gStart = goal.start_date
      ? new Date(goal.start_date)
      : (sortedEntries.length > 0 ? new Date(sortedEntries[0].date) : null);
    const gEnd = new Date(goal.target_date);
    let dwl = 0;

    if (gStart) {
      const totalDays = Math.ceil((gEnd.getTime() - gStart.getTime()) / (1000 * 60 * 60 * 24));
      const totalWeightLoss = goal.current_weight - goal.target_weight;
      dwl = totalDays > 0 ? totalWeightLoss / totalDays : 0;
    }

    return { goalStartDate: gStart, goalEndDate: gEnd, dailyWeightLoss: dwl };
  }, [showGoalLine, goal, sortedEntries]);

  // Build weight chart data
  const weightChartData = useMemo(() => {
    if (sortedEntries.length === 0) return [];

    const data: Array<{ date: string; fullDate: string; value: number | null; target?: number }> =
      sortedEntries.map(entry => {
        const point: { date: string; fullDate: string; value: number | null; target?: number } = {
          date: new Date(entry.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
          fullDate: entry.date,
          value: entry.weight,
        };

        if (showGoalLine && goal && goalStartDate) {
          const entryDate = new Date(entry.date);
          const daysFromStart = Math.ceil((entryDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysFromStart >= 0) {
            point.target = parseFloat(Math.max(
              goal.target_weight,
              goal.current_weight - (dailyWeightLoss * daysFromStart)
            ).toFixed(1));
          }
        }

        return point;
      });

    // Add future target point
    if (showGoalLine && goal && goalEndDate) {
      const lastEntryDate = new Date(sortedEntries[sortedEntries.length - 1].date);
      if (!startDate && !endDate && lastEntryDate < goalEndDate) {
        data.push({
          date: goalEndDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
          fullDate: goal.target_date,
          value: null,
          target: goal.target_weight,
        });
      }
    }

    return data;
  }, [sortedEntries, showGoalLine, goal, goalStartDate, goalEndDate, dailyWeightLoss, startDate, endDate]);

  // Build measurement chart data
  const measurementChartData = useMemo(() => {
    if (!measurements || isWeightMetric) return [];

    return measurements
      .map(m => {
        const val = activeMetric.extractValue(m);
        if (val === undefined) return null;
        return {
          date: new Date(m.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
          fullDate: m.date,
          value: val,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [measurements, isWeightMetric, activeMetric]);

  // Active chart data
  const chartData = isWeightMetric ? weightChartData : measurementChartData;

  // Y-axis domain with auto-scaling
  const [minY, maxY] = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const values = chartData.map(d => d.value).filter((v): v is number => v !== null && v !== undefined);

    if (isWeightMetric && showGoalLine) {
      const targetValues = chartData
        .map(d => (d as { target?: number }).target)
        .filter((v): v is number => v !== undefined);
      values.push(...targetValues);
    }

    if (values.length === 0) return [0, 100];

    const min = Math.min(...values);
    const max = Math.max(...values);
    // More padding for measurements so 1-2 cm changes are clearly visible
    const padding = isWeightMetric ? 2 : Math.max(1, (max - min) * 0.15);

    return [
      parseFloat((min - padding).toFixed(1)),
      parseFloat((max + padding).toFixed(1)),
    ];
  }, [chartData, isWeightMetric, showGoalLine]);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border-2 border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {isWeightMetric ? (
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        ) : (
          <Activity className="w-5 h-5" style={{ color: activeMetric.color }} />
        )}
        <h3 className="text-xl font-bold text-white">{activeMetric.trendLabel}</h3>
      </div>

      {/* Metric selector — horizontal scroll on mobile */}
      {hasMeasurements && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          {METRICS.map(metric => {
            const isActive = selectedMetric === metric.key;
            const hasData = metric.key === 'weight'
              ? filteredEntries.length > 0
              : (measurements || []).some(m => metric.extractValue(m) !== undefined);

            return (
              <button
                key={metric.key}
                onClick={() => hasData && setSelectedMetric(metric.key)}
                disabled={!hasData}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white shadow-lg'
                    : hasData
                      ? 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                      : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                }`}
                style={isActive ? { backgroundColor: metric.color } : undefined}
              >
                {metric.label}
                <span className="text-xs opacity-60">({metric.unit})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chart or empty state */}
      {chartData.length === 0 ? (
        <p className="text-slate-400 text-center py-12">
          {isWeightMetric
            ? entries.length === 0
              ? 'Dodaj wpisy, aby zobaczyć wykres postępów.'
              : 'Brak wpisów w wybranym okresie.'
            : 'Brak danych pomiarowych dla wybranego parametru.'
          }
        </p>
      ) : (
        <>
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  domain={[minY, maxY]}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => `${Math.round(v * 10) / 10}${activeMetric.unit}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'value') return [`${value} ${activeMetric.unit}`, activeMetric.label];
                    if (name === 'target') return [`${value} kg`, 'Waga docelowa'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                />

                {/* Goal reference line — weight only */}
                {showGoalLine && goal && (
                  <ReferenceLine
                    y={goal.target_weight}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    label={{ value: `Cel: ${goal.target_weight}kg`, fill: '#10b981', fontSize: 12 }}
                  />
                )}
                {/* Goal trajectory line — weight only */}
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

                {/* Main data line — changes color & animates on metric switch */}
                <Line
                  key={selectedMetric}
                  type="monotone"
                  dataKey="value"
                  stroke={activeMetric.color}
                  strokeWidth={3}
                  dot={{ fill: activeMetric.color, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: activeMetric.color }}
                  connectNulls
                  name="value"
                  animationDuration={500}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded" style={{ backgroundColor: activeMetric.color }} />
              <span className="text-slate-400">{isWeightMetric ? 'Twoja waga' : activeMetric.label}</span>
            </div>
            {showGoalLine && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }} />
                  <span className="text-slate-400">Waga wzorcowa (plan)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ borderStyle: 'dashed' }} />
                  <span className="text-slate-400">Cel koncowy</span>
                </div>
              </>
            )}
            {isWeightMetric && !showGoalLine && !isHistoricalView && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 italic">Tryb wolny - brak aktywnego celu</span>
              </div>
            )}
            {!isWeightMetric && chartData.length > 1 && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span>
                  {chartData.length} {chartData.length === 1 ? 'pomiar' : chartData.length < 5 ? 'pomiary' : 'pomiarów'}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
