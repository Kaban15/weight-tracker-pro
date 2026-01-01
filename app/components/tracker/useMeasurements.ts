"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BodyMeasurement, MeasurementChanges } from './types';

export function useMeasurements(userId: string | undefined) {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeasurements = useCallback(async () => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (err) {
      console.error('Error fetching measurements:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const saveMeasurement = async (
    measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    editingId?: string
  ): Promise<boolean> => {
    if (!userId || !supabase) return false;

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
          setMeasurements(prev => prev.map(m => m.id === editingId ? data : m));
        }
      } else {
        // Check if measurement for this date exists
        const existing = measurements.find(m => m.date === measurement.date);
        if (existing) {
          // Update existing
          const { data, error } = await supabase
            .from('body_measurements')
            .update({ ...measurement, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setMeasurements(prev => prev.map(m => m.id === existing.id ? data : m));
          }
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('body_measurements')
            .insert({ ...measurement, user_id: userId })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setMeasurements(prev => [data, ...prev].sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            ));
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving measurement:', err);
      return false;
    }
  };

  const deleteMeasurement = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMeasurements(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting measurement:', err);
      return false;
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
