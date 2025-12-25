"use client";

import { X } from "lucide-react";

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

interface RepsModalProps {
  isOpen: boolean;
  day: number;
  month: number;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function RepsModal({
  isOpen,
  day,
  month,
  value,
  onChange,
  onSave,
  onDelete,
  onClose
}: RepsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {day} {MONTH_NAMES[month]}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Liczba powtórzeń</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="np. 50"
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white text-2xl text-center placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDelete}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
            >
              Usuń
            </button>
            <button
              onClick={onSave}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-medium"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
