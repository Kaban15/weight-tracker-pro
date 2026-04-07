"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingListItem, MealPlan, PantryItem } from './types';

export function useShoppingList(userId: string | undefined) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!userId || !supabase) return;
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('bought', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) setItems(data as ShoppingListItem[]);
  }, [userId]);

  const addItem = useCallback(async (item: { name: string; amount: number; unit: string }) => {
    if (!userId || !supabase) return;

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ user_id: userId, ...item, bought: false })
      .select()
      .single();

    if (!error && data) {
      setItems(prev => [...prev, data as ShoppingListItem]);
    }
    return { data, error };
  }, [userId]);

  const toggleBought = useCallback(async (id: string) => {
    if (!supabase) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newBought = !item.bought;
    setItems(prev => prev.map(i => i.id === id ? { ...i, bought: newBought } : i));

    const { error } = await supabase
      .from('shopping_lists')
      .update({ bought: newBought, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) await loadItems();
  }, [items, loadItems]);

  const deleteItem = useCallback(async (id: string) => {
    if (!supabase) return;
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('shopping_lists').delete().eq('id', id);
  }, []);

  const clearBought = useCallback(async () => {
    if (!userId || !supabase) return;
    setItems(prev => prev.filter(i => !i.bought));
    await supabase.from('shopping_lists').delete().eq('user_id', userId).eq('bought', true);
  }, [userId]);

  const generateFromPlans = useCallback(async (
    mealPlans: MealPlan[],
    pantryItems: PantryItem[]
  ) => {
    if (!userId || !supabase) return;

    const needed = new Map<string, { amount: number; unit: string }>();
    for (const plan of mealPlans) {
      for (const ing of plan.ingredients) {
        const key = `${ing.name.toLowerCase()}_${ing.unit}`;
        const existing = needed.get(key);
        if (existing) {
          existing.amount += ing.amount;
        } else {
          needed.set(key, { amount: ing.amount, unit: ing.unit });
        }
      }
    }

    const toBuy: { name: string; amount: number; unit: string }[] = [];
    for (const [key, need] of needed) {
      const name = key.split('_')[0] ?? key;
      const pantryItem = pantryItems.find(p =>
        p.name.toLowerCase().includes(name) && p.unit === need.unit
      );
      const available = pantryItem?.quantity_remaining || 0;
      const deficit = need.amount - available;
      if (deficit > 0) {
        toBuy.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          amount: Math.ceil(deficit),
          unit: need.unit,
        });
      }
    }

    if (toBuy.length > 0) {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert(toBuy.map(i => ({ ...i, user_id: userId, bought: false })))
        .select();

      if (!error && data) {
        setItems(prev => [...prev, ...(data as ShoppingListItem[])]);
      }
    }

    return toBuy;
  }, [userId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadItems();
      setIsLoading(false);
    }
    if (userId) init();
  }, [userId, loadItems]);

  return { items, isLoading, addItem, toggleBought, deleteItem, clearBought, generateFromPlans };
}
