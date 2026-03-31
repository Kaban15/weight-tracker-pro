"use client";

import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Package } from 'lucide-react';
import { PantryItem } from './types';
import PantryItemModal from './PantryItemModal';

interface PantryManagerProps {
  items: PantryItem[];
  onAdd: (item: { name: string; quantity: number; inputUnit: string; price: number }) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function PantryManager({ items, onAdd, onDelete, onBack }: PantryManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Dodaj produkt
        </button>
      </div>

      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Package className="w-5 h-5 text-violet-400" /> Spiżarnia
      </h2>

      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Spiżarnia jest pusta.</p>
          <p className="text-xs mt-1">Dodaj produkty, żeby śledzić koszty posiłków.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const percentRemaining = (item.quantity_remaining / item.quantity_total) * 100;
            return (
              <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white font-medium">{item.name}</span>
                    <span className="text-slate-400 text-sm ml-2">
                      {Math.round(item.quantity_remaining)} / {Math.round(item.quantity_total)} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">{item.price.toFixed(2)} zł</span>
                    <button onClick={() => onDelete(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${
                    percentRemaining > 30 ? 'bg-emerald-500' : percentRemaining > 10 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${percentRemaining}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PantryItemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={onAdd} />
    </div>
  );
}
