"use client";

import { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowLeft, Package, PackageX } from 'lucide-react';
import { PantryItem, PantryWriteOff, WriteOffReason, WRITE_OFF_REASON_LABELS } from './types';
import PantryItemModal from './PantryItemModal';
import WriteOffModal from './WriteOffModal';

interface PantryManagerProps {
  items: PantryItem[];
  onAdd: (item: { name: string; quantity: number; inputUnit: string; price: number }) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  writeOffs: PantryWriteOff[];
  writeOffMonthlyTotal: number;
  writeOffMonthlyCount: number;
  writeOffLoading: boolean;
  onWriteOff: (item: PantryItem, data: { quantity: number; reason: WriteOffReason; note?: string }) => Promise<void>;
  onDeleteWriteOff: (writeOff: PantryWriteOff) => Promise<void>;
  onLoadWriteOffs: (month: string) => void;
  initialTab?: 'pantry' | 'history';
}

function generateLastSixMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    months.push({ value, label });
  }
  return months;
}

export default function PantryManager({
  items,
  onAdd,
  onDelete,
  onBack,
  writeOffs,
  writeOffMonthlyTotal,
  writeOffMonthlyCount,
  writeOffLoading,
  onWriteOff,
  onDeleteWriteOff,
  onLoadWriteOffs,
  initialTab,
}: PantryManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pantry' | 'history'>(initialTab || 'pantry');
  const [writeOffItem, setWriteOffItem] = useState<PantryItem | null>(null);

  const monthOptions = useMemo(() => generateLastSixMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    onLoadWriteOffs(month);
  };

  const handleDeleteWriteOff = async (writeOff: PantryWriteOff) => {
    if (confirm(`Czy na pewno chcesz usunąć odpis "${writeOff.name}"?`)) {
      await onDeleteWriteOff(writeOff);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
        {activeTab === 'pantry' && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Dodaj produkt
          </button>
        )}
      </div>

      <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
        <Package className="w-5 h-5 text-violet-400" /> Spiżarnia
      </h2>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1">
        <button
          onClick={() => setActiveTab('pantry')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'pantry'
              ? 'bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Produkty ({items.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            onLoadWriteOffs(selectedMonth);
          }}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Historia strat
        </button>
      </div>

      {/* Pantry tab */}
      {activeTab === 'pantry' && (
        <>
          {items.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Spiżarnia jest pusta.</p>
              <p className="text-xs mt-1">Dodaj produkty, żeby śledzić koszty posiłków.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const percentRemaining = item.quantity_total > 0
                  ? (item.quantity_remaining / item.quantity_total) * 100
                  : 0;
                const isUsedUp = item.quantity_remaining === 0;
                return (
                  <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--foreground)] font-medium">{item.name}</span>
                        {isUsedUp ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                            Zużyty
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] text-sm">
                            {Math.round(item.quantity_remaining)} / {Math.round(item.quantity_total)} {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-sm">{item.price.toFixed(2)} zł</span>
                        {!isUsedUp && (
                          <button
                            onClick={() => setWriteOffItem(item)}
                            className="p-1 text-[var(--muted)] hover:text-amber-400 transition-colors"
                            title="Odpisz stratę"
                          >
                            <PackageX className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onDelete(item.id)}
                          className="p-1 text-[var(--muted)] hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!isUsedUp && (
                      <div className="w-full bg-[var(--surface)] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${
                          percentRemaining > 30 ? 'bg-emerald-500' : percentRemaining > 10 ? 'bg-amber-500' : 'bg-red-500'
                        }`} style={{ width: `${percentRemaining}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Summary */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-sm">
            <span className="text-[var(--muted)]">Łącznie: </span>
            <span className="text-[var(--foreground)] font-medium">{writeOffMonthlyTotal.toFixed(2)} zł</span>
            <span className="text-[var(--muted)]"> z </span>
            <span className="text-[var(--foreground)] font-medium">{writeOffMonthlyCount}</span>
            <span className="text-[var(--muted)]"> produktów</span>
          </div>

          {/* Write-off list */}
          {writeOffLoading ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <p>Ładowanie...</p>
            </div>
          ) : writeOffs.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <PackageX className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Brak strat w tym miesiącu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {writeOffs.map(wo => (
                <div key={wo.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[var(--foreground)] font-medium">{wo.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-sm font-medium">-{wo.total_cost.toFixed(2)} zł</span>
                      <button
                        onClick={() => handleDeleteWriteOff(wo)}
                        className="p-1 text-[var(--muted)] hover:text-red-400 transition-colors"
                        title="Usuń odpis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    <span>{wo.quantity} {wo.unit}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface)]">
                      {WRITE_OFF_REASON_LABELS[wo.reason]}
                    </span>
                    {wo.note && <span className="italic">{wo.note}</span>}
                    <span>{new Date(wo.written_off_at).toLocaleDateString('pl-PL')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <PantryItemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={onAdd} />

      {writeOffItem && (
        <WriteOffModal
          isOpen={!!writeOffItem}
          item={writeOffItem}
          onClose={() => setWriteOffItem(null)}
          onConfirm={async (data) => {
            await onWriteOff(writeOffItem, data);
            setWriteOffItem(null);
          }}
        />
      )}
    </div>
  );
}
