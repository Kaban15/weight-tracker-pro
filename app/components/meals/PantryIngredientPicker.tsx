// app/components/meals/PantryIngredientPicker.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Package } from 'lucide-react';
import { PantryItem } from './types';

interface PantryIngredientPickerProps {
  readonly pantryItems: PantryItem[];
  readonly onSelect: (item: PantryItem) => void;
}

export default function PantryIngredientPicker({ pantryItems, onSelect }: PantryIngredientPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const available = pantryItems.filter(p =>
    p.quantity_remaining > 0 &&
    !p.is_free &&
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen(!open); setFilter(''); }}
        title="Wybierz ze spiżarni"
        className="flex items-center justify-center p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <Package className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg z-20 overflow-hidden">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Szukaj w spiżarni..."
            autoFocus
            className="w-full bg-[var(--background)] border-b border-[var(--card-border)] px-3 py-2 text-white text-xs placeholder-[var(--muted)] outline-none"
          />
          <div className="max-h-40 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--muted)]">Brak produktów</div>
            ) : (
              available.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors flex justify-between items-center"
                >
                  <span>{item.name}</span>
                  <span className="text-[var(--muted)] text-[10px]">
                    {Math.round(item.quantity_remaining)}{item.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
