"use client";

import { useState } from 'react';
import { ArrowLeft, ShoppingCart, Check, Plus, Trash2, Sparkles } from 'lucide-react';
import { ShoppingListItem, MealPlan, PantryItem } from './types';

interface ShoppingListProps {
  items: ShoppingListItem[];
  mealPlans: MealPlan[];
  pantryItems: PantryItem[];
  onToggleBought: (id: string) => void;
  onDelete: (id: string) => void;
  onClearBought: () => void;
  onGenerate: (plans: MealPlan[], pantry: PantryItem[]) => void;
  onAddItem: (item: { name: string; amount: number; unit: string }) => void;
  onBack: () => void;
}

export default function ShoppingList({
  items, mealPlans, pantryItems,
  onToggleBought, onDelete, onClearBought, onGenerate, onAddItem, onBack,
}: ShoppingListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');

  const toBuy = items.filter(i => !i.bought);
  const bought = items.filter(i => i.bought);

  const handleAdd = () => {
    if (!name.trim() || !amount) return;
    onAddItem({ name: name.trim(), amount: +amount, unit });
    setName(''); setAmount(''); setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
        <div className="flex gap-2">
          <button onClick={() => onGenerate(mealPlans.filter(m => m.status !== 'rejected'), pantryItems)}
            className="flex items-center gap-1 px-3 py-2 bg-violet-600/20 text-violet-400 text-sm rounded-lg hover:bg-violet-600/30">
            <Sparkles className="w-4 h-4" /> Generuj z planu
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-500">
            <Plus className="w-4 h-4" /> Dodaj
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-violet-400" /> Lista zakupów
      </h2>

      {showAddForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex gap-2 items-end">
          <div className="flex-1">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" />
          </div>
          <div className="w-20">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ilość"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" />
          </div>
          <select value={unit} onChange={e => setUnit(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm">
            <option value="g">g</option><option value="kg">kg</option>
            <option value="ml">ml</option><option value="l">l</option>
            <option value="szt">szt</option>
          </select>
          <button onClick={handleAdd} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg">OK</button>
        </div>
      )}

      {/* To buy */}
      {toBuy.length > 0 && (
        <div className="space-y-1">
          {toBuy.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <button onClick={() => onToggleBought(item.id)}
                className="w-5 h-5 rounded border-2 border-slate-500 hover:border-emerald-500 transition-colors" />
              <span className="text-white flex-1">{item.name}</span>
              <span className="text-slate-400 text-sm">{item.amount} {item.unit}</span>
              <button onClick={() => onDelete(item.id)} className="text-slate-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bought */}
      {bought.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Kupione ({bought.length})</p>
            <button onClick={onClearBought} className="text-xs text-slate-500 hover:text-red-400">Wyczyść</button>
          </div>
          <div className="space-y-1 opacity-60">
            {bought.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                <button onClick={() => onToggleBought(item.id)}
                  className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </button>
                <span className="text-slate-400 flex-1 line-through">{item.name}</span>
                <span className="text-slate-500 text-sm">{item.amount} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Lista zakupów jest pusta.</p>
          <p className="text-xs mt-1">Wygeneruj ją z planu posiłków lub dodaj ręcznie.</p>
        </div>
      )}
    </div>
  );
}
