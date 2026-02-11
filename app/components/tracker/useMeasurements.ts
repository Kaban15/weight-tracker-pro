"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isOnline, measurementsStorage, syncQueue } from '@/lib/offlineStorage';
import { BodyMeasurement, MeasurementChanges } from './types';

export function useMeasurements(userId: string | undefined) {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const sortByDate = (items: BodyMeasurement[]) =>
    [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const fetchMeasurements = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Try Supabase first
    if (supabase && isOnline()) {
      try {
        const { data, error } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) throw error;
        const items = data || [];
        setMeasurements(items);

        // Cache to IndexedDB
        if (items.length > 0) {
          await measurementsStorage.saveAll(items as Array<Record<string, unknown> & { id: string }>);
        }
      } catch (err) {
        console.error('Error fetching measurements:', err);
        // Fallback to offline cache
        const cached = await measurementsStorage.getAll(userId);
        if (cached.length > 0) {
          setMeasurements(sortByDate(cached as unknown as BodyMeasurement[]));
        }
      }
    } else {
      // Offline — load from IndexedDB
      const cached = await measurementsStorage.getAll(userId);
      setMeasurements(sortByDate(cached as unknown as BodyMeasurement[]));
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const saveMeasurement = async (
    measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    editingId?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic update
    const tempId = editingId || crypto.randomUUID();
    const optimisticItem: BodyMeasurement = {
      ...measurement,
      id: tempId,
      user_id: userId,
    } as BodyMeasurement;

    if (editingId) {
      setMeasurements(prev => sortByDate(prev.map(m => m.id === editingId ? { ...m, ...measurement } : m)));
    } else {
      const existing = measurements.find(m => m.date === measurement.date);
      if (existing) {
        setMeasurements(prev => sortByDate(prev.map(m => m.id === existing.id ? { ...m, ...measurement } : m)));
      } else {
        setMeasurements(prev => sortByDate([optimisticItem, ...prev]));
      }
    }

    // Try Supabase
    if (supabase && isOnline()) {
      try {
        if (editingId) {
          const { data, error } = await supabase
            .from('body_measurements')
            .update({ ...measurement, updated_at: new Date().toISOString() })
            .eq('id', editingId)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setMeasurements(prev => sortByDate(prev.map(m => m.id === editingId ? data : m)));
            await measurementsStorage.save(data as Record<string, unknown> & { id: string });
          }
        } else {
          const existing = measurements.find(m => m.date === measurement.date);
          if (existing) {
            const { data, error } = await supabase
              .from('body_measurements')
              .update({ ...measurement, updated_at: new Date().toISOString() })
              .eq('id', existing.id)
              .select()
              .single();

            if (error) throw error;
            if (data) {
              setMeasurements(prev => sortByDate(prev.map(m => m.id === existing.id ? data : m)));
              await measurementsStorage.save(data as Record<string, unknown> & { id: string });
            }
          } else {
            const { data, error } = await supabase
              .from('body_measurements')
              .insert({ ...measurement, user_id: userId })
              .select()
              .single();

            if (error) throw error;
            if (data) {
              // Replace temp ID with real one
              setMeasurements(prev => sortByDate(prev.map(m => m.id === tempId ? data : m)));
              await measurementsStorage.save(data as Record<string, unknown> & { id: string });
            }
          }
        }
        return true;
      } catch (err) {
        console.error('Error saving measurement:', err);
        // Revert optimistic update
        await fetchMeasurements();
        return false;
      }
    } else {
      // Offline — queue for sync
      await measurementsStorage.save(optimisticItem as unknown as Record<string, unknown> & { id: string });
      await syncQueue.add({
        operation: editingId ? 'update' : 'create',
        table: 'body_measurements',
        data: { ...measurement, id: tempId, user_id: userId } as Record<string, unknown>,
      });
      return true;
    }
  };

  const deleteMeasurement = async (id: string): Promise<boolean> => {
    // Optimistic removal
    const previousMeasurements = measurements;
    setMeasurements(prev => prev.filter(m => m.id !== id));

    if (supabase && isOnline()) {
      try {
        const { error } = await supabase
          .from('body_measurements')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await measurementsStorage.delete(id);
        return true;
      } catch (err) {
        console.error('Error deleting measurement:', err);
        // Revert
        setMeasurements(previousMeasurements);
        return false;
      }
    } else {
      // Offline — queue for sync
      await measurementsStorage.delete(id);
      await syncQueue.add({
        operation: 'delete',
        table: 'body_measurements',
        data: { id } as Record<string, unknown>,
      });
      return true;
    }
  };

  // Calculate changes between measurements
  const calculateChanges = useCallback((
    current: BodyMeasurement | null,
    previous: BodyMeasurement | null
  ): MeasurementChanges => {
    if (!current || !previous) return {};

    const fields: (keyof MeasurementChanges)[] = [
      'waist', 'hips', 'chest', 'thigh_left', 'thigh_right',
      'arm_left', 'arm_right', 'calf_left', 'calf_right'
    ];

    const changes: MeasurementChanges = {};
    fields.forEach(field => {
      const curr = current[field];
      const prev = previous[field];
      if (curr !== undefined && prev !== undefined) {
        changes[field] = curr - prev;
      }
    });

    return changes;
  }, []);

  // Get latest and previous measurements
  const latest = useMemo(() => measurements[0] || null, [measurements]);
  const previous = useMemo(() => measurements[1] || null, [measurements]);
  const first = useMemo(() => measurements[measurements.length - 1] || null, [measurements]);

  // Changes from previous measurement
  const changesFromPrevious = useMemo(
    () => calculateChanges(latest, previous),
    [latest, previous, calculateChanges]
  );

  // Total changes from first measurement
  const totalChanges = useMemo(
    () => calculateChanges(latest, first),
    [latest, first, calculateChanges]
  );

  return {
    measurements,
    loading,
    latest,
    previous,
    first,
    changesFromPrevious,
    totalChanges,
    saveMeasurement,
    deleteMeasurement,
    refresh: fetchMeasurements,
  };
}
