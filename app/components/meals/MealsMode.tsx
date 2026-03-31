"use client";

import { ArrowLeft } from "lucide-react";

interface MealsModeProps {
  onBack: () => void;
}

export default function MealsMode({ onBack }: MealsModeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Powrót
        </button>
        <h1 className="text-2xl font-bold text-white">Co zjem?</h1>
        <p className="text-slate-400 mt-2">Moduł w budowie...</p>
      </div>
    </div>
  );
}
