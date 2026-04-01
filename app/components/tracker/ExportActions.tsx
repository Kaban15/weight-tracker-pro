"use client";

import { useState } from 'react';
import { Download, FileJson, AlertCircle } from 'lucide-react';
import { Entry, Goal, formatDate } from './types';

interface ExportActionsProps {
  entries: Entry[];
  goal: Goal | null;
  hasMoreEntries: boolean;
  loadAllEntries: () => Promise<Entry[]>;
  loadingMore: boolean;
}

export default function ExportActions({ entries, goal, hasMoreEntries, loadAllEntries, loadingMore }: ExportActionsProps) {
  const [exporting, setExporting] = useState(false);

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

  const performCSVExport = (entriesToExport: Entry[]) => {
    if (entriesToExport.length === 0) return;
    const headers = ['Data', 'Waga (kg)', 'Kalorie', 'Kroki', 'Trening', 'Czas treningu (min)', 'Notatki'];
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
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `weight-tracker-${formatDate(new Date())}.csv`);
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
    downloadFile(blob, `weight-tracker-${formatDate(new Date())}.json`);
  };

  const exportToCSV = async () => {
    if (entries.length === 0) return;
    let entriesToExport = entries;
    if (hasMoreEntries) {
      setExporting(true);
      try {
        entriesToExport = await loadAllEntries();
      } finally {
        setExporting(false);
      }
    }
    performCSVExport(entriesToExport);
  };

  const exportToJSON = async () => {
    if (entries.length === 0) return;
    let entriesToExport = entries;
    if (hasMoreEntries) {
      setExporting(true);
      try {
        entriesToExport = await loadAllEntries();
      } finally {
        setExporting(false);
      }
    }
    performJSONExport(entriesToExport);
  };

  if (entries.length === 0) return null;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl p-6 border-2 border-[var(--card-border)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Eksport danych</h3>
          <p className="text-[var(--muted)] text-sm">
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
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:bg-[var(--surface)] disabled:cursor-wait text-white font-semibold py-3 px-5 rounded-xl transition-colors"
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
            className="flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface)] disabled:bg-[var(--card-bg)] disabled:cursor-wait text-white font-semibold py-3 px-5 rounded-xl transition-colors"
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
  );
}
