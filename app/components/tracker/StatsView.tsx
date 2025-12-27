"use client";

import { useState } from 'react';
import { Flame, Footprints, Dumbbell, Award, LineChart, Download, FileJson, AlertCircle } from 'lucide-react';
import { Stats, Goal, Entry } from './types';
import TrendAnalysis from './TrendAnalysis';

interface StatsViewProps {
  stats: Stats;
  goal?: Goal | null;
  entries: Entry[];
  currentWeight: number;
  progress: number;
  onEditGoal: () => void;
  hasMoreEntries?: boolean;
  loadingMore?: boolean;
  onLoadAllEntries?: () => Promise<Entry[]>;
}

export default function StatsView({
  stats,
  goal,
  entries,
  currentWeight,
  progress,
  onEditGoal,
  hasMoreEntries = false,
  loadingMore = false,
  onLoadAllEntries
}: StatsViewProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    if (entries.length === 0) return;

    let entriesToExport = entries;

    // If there are more entries to load, load them first
    if (hasMoreEntries && onLoadAllEntries) {
      setExporting(true);
      try {
        entriesToExport = await onLoadAllEntries();
      } finally {
        setExporting(false);
      }
    }

    performCSVExport(entriesToExport);
  };

  const performCSVExport = (entriesToExport: Entry[]) => {
    if (entriesToExport.length === 0) return;

    // CSV header
    const headers = ['Data', 'Waga (kg)', 'Kalorie', 'Kroki', 'Trening', 'Czas treningu (min)', 'Notatki'];

    // CSV rows
    const rows = [...entriesToExport]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(entry => [
        entry.date,
        entry.weight.toString(),
        entry.calories?.toString() || '',
        entry.steps?.toString() || '',
        entry.workout || '',
        entry.workout_duration?.toString() || '',
        entry.notes?.replace(/"/g, '""') || ''
      ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for proper Polish characters in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    downloadFile(blob, `weight-tracker-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportToJSON = async () => {
    if (entries.length === 0) return;

    let entriesToExport = entries;

    // If there are more entries to load, load them first
    if (hasMoreEntries && onLoadAllEntries) {
      setExporting(true);
      try {
        entriesToExport = await onLoadAllEntries();
      } finally {
        setExporting(false);
      }
    }

    performJSONExport(entriesToExport);
  };

  const performJSONExport = (entriesToExport: Entry[]) => {
    if (entriesToExport.length === 0) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      entriesCount: entriesToExport.length,
      goal: goal || null,
      entries: entriesToExport.map(e => ({
        date: e.date,
        weight: e.weight,
        calories: e.calories || null,
        steps: e.steps || null,
        workout: e.workout || null,
        workout_duration: e.workout_duration || null,
        notes: e.notes || null,
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadFile(blob, `weight-tracker-${new Date().toISOString().split('T')[0]}.json`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-xl p-6 border-2 border-emerald-500/20">
          <div className="text-emerald-400 text-sm mb-2 font-semibold">Aktualna waga</div>
          <div className="text-3xl font-bold text-white">{currentWeight.toFixed(1)} kg</div>
          <div className="text-slate-400 text-xs mt-1">
            {stats.totalWeightChange > 0 ? '+' : ''}{stats.totalWeightChange.toFixed(1)}kg od startu
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/10 rounded-xl p-6 border-2 border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400 text-sm mb-2 font-semibold">
            <Flame className="w-4 h-4" />Śr. kalorie
          </div>
          <div className="text-3xl font-bold text-white">
            {stats.avgCalories > 0 ? Math.round(stats.avgCalories) : '—'}
          </div>
          {goal?.daily_calories_limit && (
            <div className="text-slate-400 text-xs mt-1">Cel: {goal.daily_calories_limit}/dzień</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-xl p-6 border-2 border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2 font-semibold">
            <Footprints className="w-4 h-4" />Śr. kroki
          </div>
          <div className="text-3xl font-bold text-white">
            {stats.avgSteps > 0 ? Math.round(stats.avgSteps).toLocaleString() : '—'}
          </div>
          {goal?.daily_steps_goal && (
            <div className="text-slate-400 text-xs mt-1">Cel: {goal.daily_steps_goal.toLocaleString()}/dzień</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl p-6 border-2 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-2 font-semibold">
            <Dumbbell className="w-4 h-4" />Treningi
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalWorkouts}</div>
          {goal?.weekly_training_hours && (
            <div className="text-slate-400 text-xs mt-1">Cel: {goal.weekly_training_hours}h/tydz.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2 font-semibold">
            <Award className="w-5 h-5" />Seria
          </div>
          <div className="text-5xl font-bold text-white mb-2">{stats.currentStreak}</div>
          <div className="text-slate-400">dni z rzędu!</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2 font-semibold">
            <LineChart className="w-5 h-5" />Statystyki
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Wszystkie wpisy:</span>
              <span className="text-white font-semibold">{stats.totalEntries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Najlepsza waga:</span>
              <span className="text-white font-semibold">{stats.bestWeight.toFixed(1)}kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Średnia waga:</span>
              <span className="text-white font-semibold">{stats.avgWeight.toFixed(1)}kg</span>
            </div>
          </div>
        </div>
      </div>

      {goal && (
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Postęp celu</h3>
            <button onClick={onEditGoal} className="text-emerald-400 hover:text-emerald-300 text-sm">
              Edytuj
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                Cel: {goal.target_weight}kg do {new Date(goal.target_date).toLocaleDateString('pl-PL')}
              </span>
              <span className="text-emerald-400 font-semibold">
                {Math.max(0, Math.min(100, progress)).toFixed(0)}%
              </span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Start: {goal.current_weight}kg</span>
              <span>Teraz: {currentWeight.toFixed(1)}kg</span>
              <span>Cel: {goal.target_weight}kg</span>
            </div>
          </div>
          {goal.monitoring_method && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm">
                <strong>Metoda monitorowania:</strong> {goal.monitoring_method}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trend Analysis */}
      <TrendAnalysis
        entries={entries}
        goal={goal}
        currentWeight={currentWeight}
      />

      {/* Export Section */}
      {entries.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Eksport danych</h3>
              <p className="text-slate-400 text-sm">
                {hasMoreEntries ? (
                  <>Załadowano {entries.length} wpisów. Eksport pobierze wszystkie dane.</>
                ) : (
                  <>Pobierz wszystkie wpisy ({entries.length}) jako plik</>
                )}
              </p>
              {hasMoreEntries && (
                <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Starsze wpisy zostaną automatycznie doładowane
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={exporting || loadingMore}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-wait text-white font-semibold py-3 px-5 rounded-xl transition-colors"
              >
                {exporting || loadingMore ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>CSV</span>
              </button>
              <button
                onClick={exportToJSON}
                disabled={exporting || loadingMore}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-wait text-white font-semibold py-3 px-5 rounded-xl transition-colors"
              >
                {exporting || loadingMore ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileJson className="w-5 h-5" />
                )}
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
