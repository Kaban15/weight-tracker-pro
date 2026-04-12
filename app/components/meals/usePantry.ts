"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PantryItem, MealIngredient, formatDate } from './types';
import { UNIT_CONVERSIONS } from './constants';
import { estimateCostFromPantry } from './costUtils';
import { findMatchingPantryItems, costPerUnit } from './pantryUtils';

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
    is_free?: boolean;
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
      is_free: item.is_free || false,
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

  /**
   * Deduct ingredients from pantry and return cost breakdown.
   * Ingredients not found in pantry get cost: null (user had them already).
   * Uses local remaining-quantity tracking to avoid stale-state bugs when
   * multiple ingredients match the same pantry item.
   */
  const deductIngredients = useCallback(async (
    ingredients: MealIngredient[]
  ): Promise<{ costs: Map<string, number | null>; totalCost: number }> => {
    if (!supabase) return { costs: new Map(), totalCost: 0 };

    let totalCost = 0;
    const costs = new Map<string, number | null>();

    // Track remaining quantities locally so multiple ingredients matching the
    // same pantry item deduct correctly (mirrors costUtils.ts pattern).
    const localRemaining = new Map<string, number>();
    for (const p of items) {
      localRemaining.set(p.id, p.quantity_remaining);
    }

    for (const ing of ingredients) {
      if (ing.fromPantry === false) {
        costs.set(ing.name, null);
        continue;
      }
      const matchingItems = findMatchingPantryItems(
        ing, items,
        (id) => localRemaining.get(id) ?? 0,
      );

      if (matchingItems.length > 0) {
        let remaining = ing.amount;
        let ingredientCost = 0;

        for (const pantryItem of matchingItems) {
          if (remaining <= 0) break;
          const currentRemaining = localRemaining.get(pantryItem.id) ?? 0;
          const deductAmount = Math.min(remaining, currentRemaining);
          ingredientCost += deductAmount * costPerUnit(pantryItem);
          remaining -= deductAmount;
          localRemaining.set(pantryItem.id, currentRemaining - deductAmount);
        }

        ingredientCost = Math.round(ingredientCost * 100) / 100;
        totalCost += ingredientCost;
        costs.set(ing.name, ingredientCost);
      } else {
        costs.set(ing.name, null);
      }
    }

    // Batch-update all changed pantry items in DB
    const updatePromises: Promise<void>[] = [];
    for (const p of items) {
      const newQty = localRemaining.get(p.id);
      if (newQty !== undefined && newQty !== p.quantity_remaining) {
        updatePromises.push(updateItem(p.id, { quantity_remaining: newQty }).then(() => {}));
      }
    }
    await Promise.all(updatePromises);

    return { costs, totalCost: Math.round(totalCost * 100) / 100 };
  }, [items, updateItem]);

  /** Estimate cost from pantry without deducting — for preview display */
  const estimateCost = useCallback((ingredients: MealIngredient[]) => {
    return estimateCostFromPantry(ingredients, items);
  }, [items]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadItems();
      setIsLoading(false);
    }
    if (userId) init();
  }, [userId, loadItems]);

  return { items, isLoading, addItem, updateItem, deleteItem, deductIngredients, estimateCost, loadItems };
}
