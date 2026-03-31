"use client";

import { useState } from 'react';
import { X } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity || !price) return;
    onSave({ name: name.trim(), quantity: +quantity, inputUnit: unit, price: +price });
    setName(''); setQuantity(''); setUnit('g'); setPrice('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Dodaj produkt</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nazwa</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Pierś z kurczaka"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Ilość</label>
              <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}
                placeholder="np. 1.5"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Jednostka</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Cena (zł)</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="np. 25.99"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
          </div>

          <button type="submit"
            className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
            Dodaj do spiżarni
          </button>
        </form>
      </div>
    </div>
  );
}
