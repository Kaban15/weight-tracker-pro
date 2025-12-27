"use client";

import { Scale, Target, ClipboardList, ListChecks } from "lucide-react";
import ThemeToggle from "./shared/ThemeToggle";

interface ModeSelectorProps {
  onSelectMode: (mode: 'tracker' | 'challenge' | 'planner' | 'todo') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Weight Tracker Pro
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Wybierz co chcesz dzisiaj zrobić
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lista Zadań - TODO */}
          <button
            onClick={() => onSelectMode('todo')}
            className="group bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-rose-500 rounded-2xl p-6 transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-500/30 transition-colors">
              <ListChecks className="w-7 h-7 text-rose-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Lista Zadań
            </h2>
            <p className="text-slate-400 text-sm">
              Zarządzaj zadaniami z priorytetami, terminami i kategoriami
            </p>
          </button>

          {/* Progress Tracker */}
          <button
            onClick={() => onSelectMode('tracker')}
            className="group bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-emerald-500 rounded-2xl p-6 transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
              <Scale className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Progress Tracker
            </h2>
            <p className="text-slate-400 text-sm">
              Śledź swoją wagę, ustalaj cele i monitoruj postępy w czasie
            </p>
          </button>

          {/* Challenge */}
          <button
            onClick={() => onSelectMode('challenge')}
            className="group bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-500 rounded-2xl p-6 transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
              <Target className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Challenge
            </h2>
            <p className="text-slate-400 text-sm">
              Codzienne wyzwania - pompki, burpees i inne ćwiczenia do odhaczenia
            </p>
          </button>

          {/* Planner */}
          <button
            onClick={() => onSelectMode('planner')}
            className="group bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-violet-500 rounded-2xl p-6 transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-violet-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/30 transition-colors">
              <ClipboardList className="w-7 h-7 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Planer
            </h2>
            <p className="text-slate-400 text-sm">
              Planuj zadania na każdy dzień i odhaczaj wykonane
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
