"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PantryItem, MealIngredient, formatDate } from './types';
import { UNIT_CONVERSIONS } from './constants';

export function usePantry(userId: string | undefined) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!userId || !supabase) return;
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (!error && data) setItems(data as PantryItem[]);
  }, [userId]);

  const addItem = useCallback(async (item: {
    name: string;
    quantity: number;
    inputUnit: string;
    price: number;
  }) => {
    if (!userId || !supabase) return;

    const conversion = UNIT_CONVERSIONS[item.inputUnit] || { unit: 'g' as const, multiplier: 1 };
    const normalizedQty = item.quantity * conversion.multiplier;

    const payload = {
      user_id: userId,
      name: item.name,
      quantity_total: normalizedQty,
      quantity_remaining: normalizedQty,
      unit: conversion.unit,
      price: item.price,
      purchased_at: formatDate(new Date()),
    };

    const { data, error } = await supabase
      .from('pantry_items')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      setItems(prev => [...prev, data as PantryItem].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { data, error };
  }, [userId]);

  const updateItem = useCallback(async (id: string, updates: Partial<PantryItem>) => {
    if (!supabase) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

    const { error } = await supabase
      .from('pantry_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) await loadItems();
  }, [loadItems]);

  const deleteItem = useCallback(async (id: string) => {
    if (!supabase) return;
    setItems(prev => prev.filter(i => i.id !== id));

    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id);

    if (error) await loadItems();
  }, [loadItems]);

  const deductIngredients = useCallback(async (ingredients: MealIngredient[]): Promise<number> => {
    if (!supabase) return 0;

    let totalCost = 0;

    for (const ing of ingredients) {
      const pantryItem = items.find(p =>
        p.unit === ing.unit &&
        p.quantity_remaining > 0 &&
        p.name.toLowerCase().includes(ing.name.toLowerCase())
      );

      if (pantryItem) {
        const deductAmount = Math.min(ing.amount, pantryItem.quantity_remaining);
        const costPerUnit = pantryItem.price / pantryItem.quantity_total;
        const ingredientCost = deductAmount * costPerUnit;
        totalCost += ingredientCost;

        const newRemaining = pantryItem.quantity_remaining - deductAmount;
        await updateItem(pantryItem.id, { quantity_remaining: newRemaining });
      }
    }

    return Math.round(totalCost * 100) / 100;
  }, [items, updateItem]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadItems();
      setIsLoading(false);
    }
    if (userId) init();
  }, [userId, loadItems]);

  return { items, isLoading, addItem, updateItem, deleteItem, deductIngredients, loadItems };
}
