"use client";

import { useState, useMemo } from 'react';
import { X, Trash2, User, PackageX, FileText } from 'lucide-react';
import { PantryItem, WriteOffReason, WRITE_OFF_REASON_LABELS } from './types';

interface WriteOffModalProps {
  isOpen: boolean;
  item: PantryItem;
  onClose: () => void;
  onConfirm: (data: { quantity: number; reason: WriteOffReason; note?: string }) => void;
}

const REASON_ICONS: Record<WriteOffReason, typeof Trash2> = {
  spoiled: Trash2,
  taken: User,
  discarded: PackageX,
  other: FileText,
};

export default function WriteOffModal({ isOpen, item, onClose, onConfirm }: WriteOffModalProps) {
  const [quantity, setQuantity] = useState(item.quantity_remaining);
  const [reason, setReason] = useState<WriteOffReason | null>(null);
  const [note, setNote] = useState('');

  const costPerUnit = item.quantity_total > 0 ? item.price / item.quantity_total : 0;
  const estimatedCost = useMemo(
    () => Math.round(quantity * costPerUnit * 100) / 100,
    [quantity, costPerUnit]
  );

  // Reset state when item changes
  const itemId = item.id;
  const [prevItemId, setPrevItemId] = useState(itemId);
  if (itemId !== prevItemId) {
    setPrevItemId(itemId);
    setQuantity(item.quantity_remaining);
    setReason(null);
    setNote('');
  }

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onConfirm({ quantity, reason, note: note.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Spisz stratę: {item.name}
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-1">
            Ilość do spisania ({item.unit})
          </label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Math.min(Number(e.target.value), item.quantity_remaining))}
            min={0.1}
            max={item.quantity_remaining}
            step={item.unit === 'szt' ? 1 : 0.1}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)]"
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Dostępne: {Math.round(item.quantity_remaining)} {item.unit}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
          <span className="text-sm text-[var(--muted)]">Koszt straty: </span>
          <span className="text-lg font-semibold text-red-400">{estimatedCost.toFixed(2)} zł</span>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-2">Powód</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(WRITE_OFF_REASON_LABELS) as [WriteOffReason, string][]).map(([key, label]) => {
              const Icon = REASON_ICONS[key];
              return (
                <button
                  key={key}
                  onClick={() => setReason(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    reason === key
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-1">Notatka (opcjonalne)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm resize-none"
            placeholder="Np. przeterminowane o 2 dni..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!reason || quantity <= 0}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Spisz stratę
        </button>
      </div>
    </div>
  );
}
