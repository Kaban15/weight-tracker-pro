"use client";

import { X } from "lucide-react";
import { ChallengeFormData, GOAL_UNITS } from "./types";

interface ChallengeFormModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  formData: ChallengeFormData;
  onChange: (data: Partial<ChallengeFormData>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function ChallengeFormModal({
  isOpen,
  isEdit = false,
  formData,
  onChange,
  onSubmit,
  onClose
}: ChallengeFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {isEdit ? 'Edytuj wyzwanie' : 'Nowe wyzwanie'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nazwa wyzwania</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="np. Pompki codziennie"
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Date Mode Toggle */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Sposób ustalenia terminu</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ dateMode: 'duration' })}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.dateMode === 'duration'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Czas trwania
              </button>
              <button
                onClick={() => onChange({ dateMode: 'dates' })}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.dateMode === 'dates'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Własne daty
              </button>
            </div>
          </div>

          {formData.dateMode === 'dates' ? (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Data rozpoczęcia</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => onChange({ startDate: e.target.value })}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Data zakończenia</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => onChange({ endDate: e.target.value })}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Typ okresu</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'days', label: 'Dni' },
                    { value: 'weeks', label: 'Tyg.' },
                    { value: 'months', label: 'Mies.' },
                    { value: 'year', label: 'Rok' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onChange({
                          durationType: option.value as ChallengeFormData['durationType'],
                          durationValue: option.value === 'year' ? 1 : formData.durationValue
                        });
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.durationType === option.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {formData.durationType !== 'year' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Liczba {formData.durationType === 'days' ? 'dni' : formData.durationType === 'weeks' ? 'tygodni' : 'miesięcy'}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={formData.durationType === 'days' ? 90 : 12}
                      value={formData.durationValue}
                      onChange={(e) => onChange({ durationValue: Number(e.target.value) })}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-2xl font-bold text-white w-12 text-center">
                      {formData.durationValue}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Track Reps Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => onChange({ trackReps: !formData.trackReps })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.trackReps ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.trackReps ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </div>
              <span className="text-sm text-slate-300">Śledź postępy z celami</span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-15">
              {formData.trackReps
                ? 'Ustaw różne cele na każdy dzień w kalendarzu'
                : 'Tylko zaznaczanie czy dzień został wykonany'}
            </p>
          </div>

          {/* Goal Unit Settings */}
          {formData.trackReps && (
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Jednostka</label>
                <select
                  value={formData.goalUnit}
                  onChange={(e) => onChange({ goalUnit: e.target.value })}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  {GOAL_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">
                Cele dla każdego dnia ustawisz w kalendarzu po utworzeniu wyzwania
              </p>
            </div>
          )}

          {/* Buttons */}
          {isEdit ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
              >
                Anuluj
              </button>
              <button
                onClick={onSubmit}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg"
              >
                Zapisz
              </button>
            </div>
          ) : (
            <button
              onClick={onSubmit}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold"
            >
              Utwórz wyzwanie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
