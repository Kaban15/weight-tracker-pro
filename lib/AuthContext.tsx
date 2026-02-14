"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const HEARTBEAT_THROTTLE_MS = 60 * 60 * 1000; // 1 hour
const HEARTBEAT_LS_KEY = 'last_activity_ping';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatSent = useRef(false);

  // Heartbeat: update profiles.last_active_at (throttled to 1h via localStorage)
  const sendHeartbeat = useCallback(async (userId: string) => {
    if (!supabase || typeof window === 'undefined') return;

    try {
      const lastPing = localStorage.getItem(HEARTBEAT_LS_KEY);
      if (lastPing && Date.now() - Number(lastPing) < HEARTBEAT_THROTTLE_MS) return;

      const { error } = await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (!error) {
        localStorage.setItem(HEARTBEAT_LS_KEY, String(Date.now()));
      }
    } catch {
      // Silent fail - heartbeat is non-critical
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      // Send heartbeat on app open
      if (data.session?.user && !heartbeatSent.current) {
        heartbeatSent.current = true;
        sendHeartbeat(data.session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Send heartbeat on sign in
        if (session?.user) {
          sendHeartbeat(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [sendHeartbeat]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/`
          : undefined,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
