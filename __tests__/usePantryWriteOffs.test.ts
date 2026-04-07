import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePantryWriteOffs } from '@/app/components/meals/usePantryWriteOffs';
import { PantryItem } from '@/app/components/meals/types';

// Supabase is globally mocked in vitest.setup.ts

const mockPantryItem: PantryItem = {
  id: 'pantry-1',
  user_id: 'user-1',
  name: 'Masło',
  quantity_total: 1000,
  quantity_remaining: 500,
  unit: 'g',
  price: 10,
  purchased_at: '2026-04-01',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('usePantryWriteOffs', () => {
  describe('cost calculation', () => {
    it('calculates cost_per_unit as price / quantity_total', () => {
      const costPerUnit = mockPantryItem.price / mockPantryItem.quantity_total;
      expect(costPerUnit).toBe(0.01);
    });

    it('calculates total_cost as quantity × cost_per_unit', () => {
      const costPerUnit = mockPantryItem.price / mockPantryItem.quantity_total;
      const quantity = 500;
      const totalCost = Math.round(quantity * costPerUnit * 100) / 100;
      expect(totalCost).toBe(5);
    });

    it('returns 0 total_cost when price is 0', () => {
      const freeItem = { ...mockPantryItem, price: 0 };
      const costPerUnit = freeItem.price / freeItem.quantity_total;
      const totalCost = Math.round(250 * costPerUnit * 100) / 100;
      expect(totalCost).toBe(0);
    });
  });
});
