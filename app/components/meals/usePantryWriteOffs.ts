"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PantryItem, PantryWriteOff, WriteOffReason } from './types';
import { formatDate } from '../shared/dateUtils';

interface WriteOffSummary {
  monthlyTotal: number;
  monthlyCount: number;
}

export function usePantryWriteOffs(userId: string | undefined) {
  const [writeOffs, setWriteOffs] = useState<PantryWriteOff[]>([]);
  const [summary, setSummary] = useState<WriteOffSummary>({ monthlyTotal: 0, monthlyCount: 0 });
  const [loading, setLoading] = useState(false);

  const loadWriteOffs = useCallback(async (month: string) => {
    if (!userId || !supabase) return;
    setLoading(true);
    try {
      const startDate = `${month}-01`;
      const [year, m] = month.split('-').map(Number);
      const endDate = m === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(m + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('pantry_write_offs')
        .select('*')
        .eq('user_id', userId)
        .gte('written_off_at', startDate)
        .lt('written_off_at', endDate)
        .order('written_off_at', { ascending: false });

      if (error) throw error;
      const items = (data || []) as PantryWriteOff[];
      setWriteOffs(items);
      setSummary({
        monthlyTotal: Math.round(items.reduce((s, w) => s + w.total_cost, 0) * 100) / 100,
        monthlyCount: items.length,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMonthlySummary = useCallback(async (month: string) => {
    if (!userId || !supabase) return { monthlyTotal: 0, monthlyCount: 0 };
    const startDate = `${month}-01`;
    const [year, m] = month.split('-').map(Number);
    const endDate = m === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(m + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('pantry_write_offs')
      .select('total_cost')
      .eq('user_id', userId)
      .gte('written_off_at', startDate)
      .lt('written_off_at', endDate);

    if (error) return { monthlyTotal: 0, monthlyCount: 0 };
    const items = data || [];
    return {
      monthlyTotal: Math.round(items.reduce((s: number, w: { total_cost: number }) => s + w.total_cost, 0) * 100) / 100,
      monthlyCount: items.length,
    };
  }, [userId]);

  const createWriteOff = useCallback(async (data: {
    pantryItem: PantryItem;
    quantity: number;
    reason: WriteOffReason;
    note?: string;
  }) => {
    if (!userId || !supabase) return;

    const costPerUnit = data.pantryItem.quantity_total > 0
      ? data.pantryItem.price / data.pantryItem.quantity_total
      : 0;
    const totalCost = Math.round(data.quantity * costPerUnit * 100) / 100;

    const writeOff: Omit<PantryWriteOff, 'id' | 'created_at'> = {
      user_id: userId,
      pantry_item_id: data.pantryItem.id,
      name: data.pantryItem.name,
      unit: data.pantryItem.unit,
      quantity: data.quantity,
      cost_per_unit: Math.round(costPerUnit * 10000) / 10000,
      total_cost: totalCost,
      reason: data.reason,
      note: data.note || null,
      written_off_at: formatDate(new Date()),
    };

    const { error: insertError } = await supabase
      .from('pantry_write_offs')
      .insert(writeOff);
    if (insertError) throw insertError;

    const newRemaining = data.pantryItem.quantity_remaining - data.quantity;
    const { error: updateError } = await supabase
      .from('pantry_items')
      .update({ quantity_remaining: Math.max(0, newRemaining) })
      .eq('id', data.pantryItem.id);
    if (updateError) throw updateError;
  }, [userId]);

  const deleteWriteOff = useCallback(async (writeOff: PantryWriteOff) => {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from('pantry_write_offs')
      .delete()
      .eq('id', writeOff.id);
    if (deleteError) throw deleteError;

    if (writeOff.pantry_item_id) {
      const { data: pantryItem } = await supabase
        .from('pantry_items')
        .select('quantity_remaining')
        .eq('id', writeOff.pantry_item_id)
        .single();

      if (pantryItem) {
        await supabase
          .from('pantry_items')
          .update({ quantity_remaining: pantryItem.quantity_remaining + writeOff.quantity })
          .eq('id', writeOff.pantry_item_id);
      }
    }

    setWriteOffs(prev => prev.filter(w => w.id !== writeOff.id));
    setSummary(prev => ({
      monthlyTotal: Math.round((prev.monthlyTotal - writeOff.total_cost) * 100) / 100,
      monthlyCount: prev.monthlyCount - 1,
    }));
  }, []);

  return {
    writeOffs,
    monthlyTotal: summary.monthlyTotal,
    monthlyCount: summary.monthlyCount,
    loading,
    loadWriteOffs,
    loadMonthlySummary,
    createWriteOff,
    deleteWriteOff,
  };
}
