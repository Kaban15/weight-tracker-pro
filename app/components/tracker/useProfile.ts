"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from './types';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const saveProfile = async (newProfile: Omit<Profile, 'id'>) => {
    if (!userId || !supabase) return;

    try {
      if (profile?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ ...newProfile, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({ ...newProfile, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        if (data) setProfile(data);
      }
    } catch {
      // Error handled silently
    }
  };

  return { profile, setProfile, saveProfile };
}
