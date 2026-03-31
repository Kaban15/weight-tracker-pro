"use client";

import { Calendar, Clock, ListTodo, AlertCircle, Circle, Check } from "lucide-react";

interface TodoStats {
  total: number;
  completed: number;
  notCompleted: number;
  overdue: number;
  today: number;
  percentComplete: number;
}

interface TodoStatsBarProps {
  stats: TodoStats;
  formattedDate: string;
}

export default function TodoStatsBar({ stats, formattedDate }: TodoStatsBarProps) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Data</span>
          </div>
          <div className="text-lg font-bold text-white">{formattedDate}</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Dziś</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.today}</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <ListTodo className="w-4 h-4" />
            <span>Wszystkie</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-rose-500/30">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Spóźnione</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">{stats.overdue}</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Circle className="w-4 h-4 text-slate-400" />
            <span>Nie Ukończone</span>
          </div>
          <div className="text-2xl font-bold text-slate-300">{stats.notCompleted}</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Ukończone</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Postęp</span>
          <span className="text-white font-bold">{stats.percentComplete}%</span>
        </div>
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
            style={{ width: `${stats.percentComplete}%` }}
          />
        </div>
      </div>
    </>
  );
}
