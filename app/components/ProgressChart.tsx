"use client";

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

  if (!goal || filteredEntries.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Wykres postępów</h3>
        <p className="text-slate-400 text-center py-12">
          {entries.length === 0
            ? "Dodaj wpisy i ustaw cel, aby zobaczyć wykres postępów."
            : "Brak wpisów w wybranym okresie."
          }
        </p>
      </div>
    );
  }

  // Sort entries by date
  const sortedEntries = [...filteredEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate target weight for each date
  const goalStartDate = goal.start_date ? new Date(goal.start_date) : new Date(sortedEntries[0].date);
  const goalEndDate = new Date(goal.target_date);
  const totalDays = Math.ceil((goalEndDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeightLoss = goal.current_weight - goal.target_weight;
  const dailyWeightLoss = totalWeightLoss / totalDays;

  // Create chart data with both actual and target weights
  const chartData = sortedEntries.map(entry => {
    const entryDate = new Date(entry.date);
    const daysFromStart = Math.ceil((entryDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const targetWeight = Math.max(
      goal.target_weight,
      goal.current_weight - (dailyWeightLoss * daysFromStart)
    );

    return {
      date: new Date(entry.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      fullDate: entry.date,
      actual: entry.weight,
      target: parseFloat(targetWeight.toFixed(1)),
      difference: parseFloat((entry.weight - targetWeight).toFixed(1)),
    };
  });

  // Add future target points if we haven't reached the goal date (only if not filtering by date range)
  const lastEntryDate = new Date(sortedEntries[sortedEntries.length - 1].date);
  if (!startDate && !endDate && lastEntryDate < goalEndDate) {
    // Add end point
    const targetPoint = {
      date: goalEndDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      fullDate: goal.target_date,
      actual: null as number | null,
      target: goal.target_weight,
      difference: null as number | null,
    };
    chartData.push(targetPoint as any);
  }

  const minWeight = Math.min(
    ...chartData.map(d => Math.min(d.actual || Infinity, d.target)).filter(w => w !== Infinity)
  ) - 2;
  const maxWeight = Math.max(
    ...chartData.map(d => Math.max(d.actual || 0, d.target))
  ) + 2;

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
            <Legend
              formatter={(value) => {
                if (value === 'actual') return <span style={{ color: '#10b981' }}>Waga rzeczywista</span>;
                if (value === 'target') return <span style={{ color: '#f59e0b' }}>Waga docelowa</span>;
                return value;
              }}
            />
            <ReferenceLine
              y={goal.target_weight}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{ value: `Cel: ${goal.target_weight}kg`, fill: '#10b981', fontSize: 12 }}
            />
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }}></div>
          <span className="text-slate-400">Waga wzorcowa (plan)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ borderStyle: 'dashed' }}></div>
          <span className="text-slate-400">Cel końcowy</span>
        </div>
      </div>
    </div>
  );
}
