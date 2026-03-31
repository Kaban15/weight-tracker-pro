"use client";

import { useState, useMemo } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MealPlan, DaySummary, formatDate } from './types';

interface MealSummaryChartsProps {
  mealPlans: MealPlan[];
  getDaySummary: (date: string) => DaySummary;
  targetCalories: number;
  onBack: () => void;
}

type Period = 'week' | 'month';

const COLORS = { protein: '#60a5fa', carbs: '#fbbf24', fat: '#f87171' };

export default function MealSummaryCharts({ mealPlans, getDaySummary, targetCalories, onBack }: MealSummaryChartsProps) {
  const [period, setPeriod] = useState<Period>('week');

  const days = useMemo(() => {
    const count = period === 'week' ? 7 : 30;
    const result: DaySummary[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(getDaySummary(formatDate(d)));
    }
    return result;
  }, [period, getDaySummary]);

  const totals = useMemo(() => ({
    calories: days.reduce((s, d) => s + d.totalCalories, 0),
    protein: days.reduce((s, d) => s + d.totalProtein, 0),
    carbs: days.reduce((s, d) => s + d.totalCarbs, 0),
    fat: days.reduce((s, d) => s + d.totalFat, 0),
    cost: days.reduce((s, d) => s + d.totalCost, 0),
    avgCalories: Math.round(days.reduce((s, d) => s + d.totalCalories, 0) / days.length),
    avgCost: days.reduce((s, d) => s + d.totalCost, 0) / days.length,
  }), [days]);

  const macroData = [
    { name: 'Białko', value: Math.round(totals.protein), color: COLORS.protein },
    { name: 'Węgle', value: Math.round(totals.carbs), color: COLORS.carbs },
    { name: 'Tłuszcze', value: Math.round(totals.fat), color: COLORS.fat },
  ];

  const topMeals = useMemo(() => {
    const rated = mealPlans.filter(m => m.rating !== null).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return rated.slice(0, 5);
  }, [mealPlans]);

  const calorieData = days.map(d => ({
    date: d.date.slice(5), // MM-DD
    kcal: Math.round(d.totalCalories),
    cel: Math.round(targetCalories),
  }));

  const costData = days.map(d => ({
    date: d.date.slice(5),
    koszt: Math.round(d.totalCost * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
        <div className="flex gap-1">
          {(['week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === p ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
              {p === 'week' ? 'Tydzień' : 'Miesiąc'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Śr. kalorie/dzień</p>
          <p className="text-lg font-bold text-emerald-400">{totals.avgCalories}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Śr. koszt/dzień</p>
          <p className="text-lg font-bold text-white">{totals.avgCost.toFixed(2)} zł</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Łączny koszt</p>
          <p className="text-lg font-bold text-white">{totals.cost.toFixed(2)} zł</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">% celu kcal</p>
          <p className="text-lg font-bold text-violet-400">
            {Math.round((totals.avgCalories / targetCalories) * 100)}%
          </p>
        </div>
      </div>

      {/* Calorie trend chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Trend kaloryczny</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={calorieData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="kcal" stroke="#a78bfa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cel" stroke="#475569" strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Macro pie chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Rozkład makroskładników</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={macroData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}g`}>
              {macroData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Cost per day bar chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Koszt dzienny (zł)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
            <Bar dataKey="koszt" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top rated meals */}
      {topMeals.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Najlepiej ocenione posiłki</h3>
          <div className="space-y-2">
            {topMeals.map(meal => (
              <div key={meal.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{meal.name}</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" /> {meal.rating}/10
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
