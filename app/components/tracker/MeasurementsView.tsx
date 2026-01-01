"use client";

import { useState } from 'react';
import { Plus, Ruler, TrendingDown, TrendingUp, Minus, Edit2, Calendar } from 'lucide-react';
import { BodyMeasurement, MeasurementChanges, MEASUREMENT_LABELS } from './types';
import { useMeasurements } from './useMeasurements';
import MeasurementModal from './MeasurementModal';

interface MeasurementsViewProps {
  userId: string | undefined;
}

function MeasurementCard({
  label,
  value,
  change,
  unit = 'cm',
}: {
  label: string;
  value?: number;
  change?: number;
  unit?: string;
}) {
  return (
    <div className="bg-slate-700/50 rounded-xl p-4">
      <div className="text-slate-400 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">
        {value !== undefined ? `${value} ${unit}` : '—'}
      </div>
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center gap-1 text-sm mt-1 ${
          change < 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {change < 0 ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)} {unit}</span>
        </div>
      )}
      {change === 0 && (
        <div className="flex items-center gap-1 text-sm mt-1 text-slate-500">
          <Minus className="w-3 h-3" />
          <span>bez zmian</span>
        </div>
      )}
    </div>
  );
}

function PairedMeasurementCard({
  label,
  leftValue,
  rightValue,
  leftChange,
  rightChange,
}: {
  label: string;
  leftValue?: number;
  rightValue?: number;
  leftChange?: number;
  rightChange?: number;
}) {
  const formatChange = (change?: number) => {
    if (change === undefined) return null;
    if (change === 0) return <span className="text-slate-500">0</span>;
    return (
      <span className={change < 0 ? 'text-emerald-400' : 'text-red-400'}>
        {change > 0 ? '+' : ''}{change.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="bg-slate-700/50 rounded-xl p-4">
      <div className="text-slate-400 text-sm mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Lewe</div>
          <div className="text-xl font-bold text-white">
            {leftValue !== undefined ? `${leftValue}` : '—'}
          </div>
          {leftChange !== undefined && (
            <div className="text-sm">{formatChange(leftChange)}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Prawe</div>
          <div className="text-xl font-bold text-white">
            {rightValue !== undefined ? `${rightValue}` : '—'}
          </div>
          {rightChange !== undefined && (
            <div className="text-sm">{formatChange(rightChange)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeasurementsView({ userId }: MeasurementsViewProps) {
  const {
    measurements,
    loading,
    latest,
    changesFromPrevious,
    totalChanges,
    saveMeasurement,
    deleteMeasurement,
  } = useMeasurements(userId);

  const [showModal, setShowModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [viewMode, setViewMode] = useState<'latest' | 'total'>('latest');

  const handleAddClick = () => {
    setEditingMeasurement(null);
    setShowModal(true);
  };

  const handleEditClick = (measurement: BodyMeasurement) => {
    setEditingMeasurement(measurement);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMeasurement(null);
  };

  const changes = viewMode === 'latest' ? changesFromPrevious : totalChanges;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
            <Ruler className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Pomiary ciała</h2>
            <p className="text-slate-400 text-sm">
              {measurements.length} {measurements.length === 1 ? 'pomiar' : measurements.length < 5 ? 'pomiary' : 'pomiarów'}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Dodaj pomiar</span>
        </button>
      </div>

      {measurements.length === 0 ? (
        // Empty state
        <div className="bg-slate-800/50 rounded-xl p-8 text-center border-2 border-dashed border-slate-700">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Ruler className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Brak pomiarów</h3>
          <p className="text-slate-400 mb-4">
            Dodaj pierwszy pomiar ciała, aby śledzić swoje postępy
          </p>
          <button
            onClick={handleAddClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Dodaj pierwszy pomiar
          </button>
        </div>
      ) : (
        <>
          {/* View mode toggle */}
          {measurements.length > 1 && (
            <div className="flex justify-end">
              <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setViewMode('latest')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'latest'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Od ostatniego
                </button>
                <button
                  onClick={() => setViewMode('total')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'total'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Od początku
                </button>
              </div>
            </div>
          )}

          {/* Latest measurement */}
          {latest && (
            <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">
                    Ostatni pomiar: {new Date(latest.date).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleEditClick(latest)}
                  className="text-slate-400 hover:text-indigo-400 transition-colors p-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Main measurements */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <MeasurementCard
                  label="Talia"
                  value={latest.waist}
                  change={changes.waist}
                />
                <MeasurementCard
                  label="Biodra"
                  value={latest.hips}
                  change={changes.hips}
                />
                <MeasurementCard
                  label="Klatka piersiowa"
                  value={latest.chest}
                  change={changes.chest}
                />
              </div>

              {/* Paired measurements */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PairedMeasurementCard
                  label="Uda"
                  leftValue={latest.thigh_left}
                  rightValue={latest.thigh_right}
                  leftChange={changes.thigh_left}
                  rightChange={changes.thigh_right}
                />
                <PairedMeasurementCard
                  label="Ramiona"
                  leftValue={latest.arm_left}
                  rightValue={latest.arm_right}
                  leftChange={changes.arm_left}
                  rightChange={changes.arm_right}
                />
                <PairedMeasurementCard
                  label="Łydki"
                  leftValue={latest.calf_left}
                  rightValue={latest.calf_right}
                  leftChange={changes.calf_left}
                  rightChange={changes.calf_right}
                />
              </div>

              {latest.notes && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">{latest.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {measurements.length > 1 && (
            <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Historia pomiarów</h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {measurements.slice(1).map((m) => (
                  <div
                    key={m.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {new Date(m.date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-slate-400 text-sm flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {m.waist && <span>T: {m.waist}</span>}
                        {m.hips && <span>B: {m.hips}</span>}
                        {m.chest && <span>K: {m.chest}</span>}
                        {(m.thigh_left || m.thigh_right) && (
                          <span>Ud: {m.thigh_left || '—'}/{m.thigh_right || '—'}</span>
                        )}
                        {(m.arm_left || m.arm_right) && (
                          <span>Ra: {m.arm_left || '—'}/{m.arm_right || '—'}</span>
                        )}
                        {(m.calf_left || m.calf_right) && (
                          <span>Ły: {m.calf_left || '—'}/{m.calf_right || '—'}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(m)}
                      className="text-slate-400 hover:text-indigo-400 transition-colors p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <MeasurementModal
        isOpen={showModal}
        measurement={editingMeasurement}
        onSave={saveMeasurement}
        onDelete={deleteMeasurement}
        onClose={handleCloseModal}
      />
    </div>
  );
}
