"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AppStatistics, UserStats, DailyActivity } from "./types";

// Admin emails - add your email here
// You can also set NEXT_PUBLIC_ADMIN_EMAILS env variable (comma-separated)
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
  : [
      "piotrtokeny@gmail.com",
    ];

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function useAdmin(userEmail: string | undefined) {
  const [statistics, setStatistics] = useState<AppStatistics | null>(null);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdminUser = isAdmin(userEmail);

  const fetchStatistics = useCallback(async () => {
    if (!supabase || !isAdminUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("No authentication token");
      }

      // Fetch statistics from API (uses service role key to bypass RLS)
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setStatistics(data.statistics);
      setUsers(data.users);
      setDailyActivity(data.dailyActivity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading statistics");
    } finally {
      setIsLoading(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (isAdminUser) {
      fetchStatistics();
    } else {
      setIsLoading(false);
    }
  }, [isAdminUser, fetchStatistics]);

  return {
    isAdmin: isAdminUser,
    statistics,
    users,
    dailyActivity,
    isLoading,
    error,
    refresh: fetchStatistics,
  };
}
