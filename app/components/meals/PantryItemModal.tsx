"use client";

import { useState } from 'react';
import { Gift } from 'lucide-react';
import Modal from '../shared/Modal';

interface PantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: { name: string; quantity: number; inputUnit: string; price: number; is_free: boolean }) => void;
}

const UNIT_OPTIONS = ['g', 'kg', 'dag', 'ml', 'l', 'szt'];

export default function PantryItemModal({ isOpen, onClose, onSave }: PantryItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity || (!isFree && !price)) return;
    onSave({ name: name.trim(), quantity: +quantity, inputUnit: unit, price: isFree ? 0 : +price, is_free: isFree });
    setName(''); setQuantity(''); setUnit('g'); setPrice(''); setIsFree(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj produkt">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Nazwa</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="np. Pierś z kurczaka"
            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Ilość</label>
            <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}
              placeholder="np. 1.5"
              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Jednostka</label>
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setIsFree(!isFree); if (!isFree) setPrice('0'); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isFree
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--card-border)]'
            }`}
          >
            <Gift className="w-4 h-4" />
            Nie kupowane (prezent)
          </button>
        </div>

        {!isFree && (
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Cena (zł)</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="np. 25.99"
              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white" />
          </div>
        )}

        <button type="submit"
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
          Dodaj do spiżarni
        </button>
      </form>
    </Modal>
  );
}
