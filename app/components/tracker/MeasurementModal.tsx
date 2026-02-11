"use client";

import { useState, useEffect } from 'react';
import { X, Ruler, Trash2 } from 'lucide-react';
import { BodyMeasurement, formatDate } from './types';

interface MeasurementModalProps {
  isOpen: boolean;
  measurement: BodyMeasurement | null;
  onSave: (measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at' | 'updated_at'>, editingId?: string) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onClose: () => void;
}

interface FormData {
  date: string;
  waist: string;
  hips: string;
  chest: string;
  thigh_left: string;
  thigh_right: string;
  arm_left: string;
  arm_right: string;
  calf_left: string;
  calf_right: string;
  notes: string;
}

const SECTIONS = [
  {
    title: 'Góra ciała',
    icon: '🫁',
    fields: [
      { key: 'chest', label: 'Klatka piersiowa' },
      { key: 'waist', label: 'Talia' },
      { key: 'hips', label: 'Biodra' },
    ],
  },
  {
    title: 'Ramiona',
    icon: '💪',
    fields: [
      { key: 'arm_left', label: 'Ramię lewe' },
      { key: 'arm_right', label: 'Ramię prawe' },
    ],
  },
  {
    title: 'Nogi',
    icon: '🦵',
    fields: [
      { key: 'thigh_left', label: 'Udo lewe' },
      { key: 'thigh_right', label: 'Udo prawe' },
      { key: 'calf_left', label: 'Łydka lewa' },
      { key: 'calf_right', label: 'Łydka prawa' },
    ],
  },
] as const;

export default function MeasurementModal({
  isOpen,
  measurement,
  onSave,
  onDelete,
  onClose,
}: MeasurementModalProps) {
  const [formData, setFormData] = useState<FormData>({
    date: formatDate(new Date()),
    waist: '',
    hips: '',
    chest: '',
    thigh_left: '',
    thigh_right: '',
    arm_left: '',
    arm_right: '',
    calf_left: '',
    calf_right: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (measurement) {
      setFormData({
        date: measurement.date,
        waist: measurement.waist?.toString() || '',
        hips: measurement.hips?.toString() || '',
        chest: measurement.chest?.toString() || '',
        thigh_left: measurement.thigh_left?.toString() || '',
        thigh_right: measurement.thigh_right?.toString() || '',
        arm_left: measurement.arm_left?.toString() || '',
        arm_right: measurement.arm_right?.toString() || '',
        calf_left: measurement.calf_left?.toString() || '',
        calf_right: measurement.calf_right?.toString() || '',
        notes: measurement.notes || '',
      });
    } else {
      setFormData({
        date: formatDate(new Date()),
        waist: '',
        hips: '',
        chest: '',
        thigh_left: '',
        thigh_right: '',
        arm_left: '',
        arm_right: '',
        calf_left: '',
        calf_right: '',
        notes: '',
      });
    }
    setShowDeleteConfirm(false);
    setError(null);
  }, [measurement, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseValue = (val: string) => {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    const data = {
      date: formData.date,
      waist: parseValue(formData.waist),
      hips: parseValue(formData.hips),
      chest: parseValue(formData.chest),
      thigh_left: parseValue(formData.thigh_left),
      thigh_right: parseValue(formData.thigh_right),
      arm_left: parseValue(formData.arm_left),
      arm_right: parseValue(formData.arm_right),
      calf_left: parseValue(formData.calf_left),
      calf_right: parseValue(formData.calf_right),
      notes: formData.notes || undefined,
    };

    // Check if at least one measurement is provided
    const hasAnyMeasurement = Object.entries(data)
      .filter(([key]) => !['date', 'notes'].includes(key))
      .some(([, value]) => value !== undefined);

    if (!hasAnyMeasurement) {
      setError('Wprowadź przynajmniej jeden pomiar');
      return;
    }

    // Validate ranges
    const numericFields = Object.entries(data).filter(
      ([key, value]) => !['date', 'notes'].includes(key) && value !== undefined
    );
    for (const [, value] of numericFields) {
      if (typeof value === 'number' && (value < 0 || value > 300)) {
        setError('Wartość pomiaru musi być między 0 a 300 cm');
        return;
      }
    }

    setSaving(true);
    setError(null);
    const success = await onSave(data, measurement?.id);
    setSaving(false);

    if (success) {
      onClose();
    } else {
      setError('Nie udało się zapisać pomiaru. Spróbuj ponownie.');
    }
  };

  const handleDelete = async () => {
    if (!measurement?.id || !onDelete) return;

    setDeleting(true);
    const success = await onDelete(measurement.id);
    setDeleting(false);

    if (success) {
      onClose();
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border-2 border-slate-700">
        <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-700 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <Ruler className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {measurement ? 'Edytuj pomiary' : 'Nowe pomiary'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-5 flex-1">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Data pomiaru
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              max={formatDate(new Date())}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Body sections */}
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{section.icon}</span>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {section.fields.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="300"
                        value={formData[key as keyof FormData]}
                        onChange={(e) => handleChange(key as keyof FormData, e.target.value)}
                        placeholder="—"
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2.5 text-base text-white focus:outline-none focus:border-indigo-500 pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notatki (opcjonalnie)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Dodatkowe uwagi..."
              rows={2}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {measurement && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {deleting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Potwierdź
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-slate-800 hover:bg-red-600/20 text-red-400 hover:text-red-300 p-3 rounded-xl transition-colors"
                    aria-label="Usuń pomiar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                showDeleteConfirm ? 'hidden' : ''
              }`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                measurement ? 'Zapisz zmiany' : 'Dodaj pomiary'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
