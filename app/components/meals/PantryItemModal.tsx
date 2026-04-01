"use client";

import { useState } from 'react';
import Modal from '../shared/Modal';

interface PantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: { name: string; quantity: number; inputUnit: string; price: number }) => void;
}

const UNIT_OPTIONS = ['g', 'kg', 'dag', 'ml', 'l', 'szt'];

export default function PantryItemModal({ isOpen, onClose, onSave }: PantryItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity || !price) return;
    onSave({ name: name.trim(), quantity: +quantity, inputUnit: unit, price: +price });
    setName(''); setQuantity(''); setUnit('g'); setPrice('');
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

        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Cena (zł)</label>
          <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="np. 25.99"
            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white" />
        </div>

        <button type="submit"
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
          Dodaj do spiżarni
        </button>
      </form>
    </Modal>
  );
}
