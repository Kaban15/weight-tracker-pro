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
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch all user profiles with their stats
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Fetch entries count per user
      const { data: entriesCounts, error: entriesError } = await supabase
        .from("weight_entries")
        .select("user_id, id");

      if (entriesError) throw entriesError;

      // Fetch challenges count per user
      const { data: challengesCounts, error: challengesError } = await supabase
        .from("challenges")
        .select("user_id, id");

      if (challengesError) throw challengesError;

      // Note: Todo tasks are stored in localStorage only, not in Supabase
      // The 'tasks' table is used by Planner, not Todo
      const tasksData: { user_id: string }[] = [];

      // Fetch planner days count per user
      const { data: plannerCounts, error: plannerError } = await supabase
        .from("planner_days")
        .select("user_id, id");

      if (plannerError) throw plannerError;

      // Fetch goals for user activity tracking
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("user_id, created_at, updated_at");

      if (goalsError) throw goalsError;

      // Count entries per user
      const entriesPerUser: Record<string, number> = {};
      (entriesCounts || []).forEach((e: { user_id: string }) => {
        entriesPerUser[e.user_id] = (entriesPerUser[e.user_id] || 0) + 1;
      });

      // Count challenges per user
      const challengesPerUser: Record<string, number> = {};
      (challengesCounts || []).forEach((c: { user_id: string }) => {
        challengesPerUser[c.user_id] = (challengesPerUser[c.user_id] || 0) + 1;
      });

      // Count tasks per user
      const tasksPerUser: Record<string, number> = {};
      tasksData.forEach((t: { user_id: string }) => {
        tasksPerUser[t.user_id] = (tasksPerUser[t.user_id] || 0) + 1;
      });

      // Count planner days per user
      const plannerPerUser: Record<string, number> = {};
      (plannerCounts || []).forEach((p: { user_id: string }) => {
        plannerPerUser[p.user_id] = (plannerPerUser[p.user_id] || 0) + 1;
      });

      // Get unique user IDs from all tables
      const allUserIds = new Set<string>();
      (profiles || []).forEach((p: { user_id: string }) => allUserIds.add(p.user_id));
      (goals || []).forEach((g: { user_id: string }) => allUserIds.add(g.user_id));
      Object.keys(entriesPerUser).forEach((id) => allUserIds.add(id));
      Object.keys(challengesPerUser).forEach((id) => allUserIds.add(id));

      // Build user stats
      const userStats: UserStats[] = Array.from(allUserIds).map((userId) => {
        const profile = (profiles || []).find((p: { user_id: string }) => p.user_id === userId);
        const goal = (goals || []).find((g: { user_id: string }) => g.user_id === userId);

        return {
          id: userId,
          email: userId.substring(0, 8) + "...", // Privacy - show partial ID
          createdAt: goal?.created_at || profile?.created_at || "",
          lastSignIn: goal?.updated_at || null,
          entriesCount: entriesPerUser[userId] || 0,
          challengesCount: challengesPerUser[userId] || 0,
          tasksCount: tasksPerUser[userId] || 0,
          plannerDaysCount: plannerPerUser[userId] || 0,
        };
      });

      // Sort by entries count (most active first)
      userStats.sort((a, b) => b.entriesCount - a.entriesCount);

      // Calculate statistics
      const totalUsers = userStats.length;
      const totalEntries = Object.values(entriesPerUser).reduce((a, b) => a + b, 0);
      const totalChallenges = Object.values(challengesPerUser).reduce((a, b) => a + b, 0);
      const totalTasks = Object.values(tasksPerUser).reduce((a, b) => a + b, 0);
      const totalPlannerDays = Object.values(plannerPerUser).reduce((a, b) => a + b, 0);

      // Active users (those with entries in last 7/30 days)
      const { data: recentEntries7 } = await supabase
        .from("weight_entries")
        .select("user_id")
        .gte("date", weekAgo);

      const { data: recentEntries30 } = await supabase
        .from("weight_entries")
        .select("user_id")
        .gte("date", monthAgo);

      const activeUsersLast7Days = new Set((recentEntries7 || []).map((e: { user_id: string }) => e.user_id)).size;
      const activeUsersLast30Days = new Set((recentEntries30 || []).map((e: { user_id: string }) => e.user_id)).size;

      // New users (based on first goal creation)
      const newUsersToday = (goals || []).filter(
        (g: { created_at: string }) => g.created_at?.startsWith(today)
      ).length;
      const newUsersThisWeek = (goals || []).filter(
        (g: { created_at: string }) => g.created_at >= weekAgo
      ).length;
      const newUsersThisMonth = (goals || []).filter(
        (g: { created_at: string }) => g.created_at >= monthAgo
      ).length;

      const stats: AppStatistics = {
        totalUsers,
        activeUsersLast7Days,
        activeUsersLast30Days,
        totalEntries,
        totalChallenges,
        totalTasks,
        totalPlannerDays,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        averageEntriesPerUser: totalUsers > 0 ? Math.round(totalEntries / totalUsers) : 0,
        averageChallengesPerUser: totalUsers > 0 ? Math.round((totalChallenges / totalUsers) * 10) / 10 : 0,
      };

      // Daily activity for last 14 days
      const dailyData: DailyActivity[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];

        const { data: dayEntries } = await supabase
          .from("weight_entries")
          .select("user_id")
          .eq("date", dateStr);

        const { data: dayGoals } = await supabase
          .from("goals")
          .select("user_id")
          .gte("created_at", dateStr + "T00:00:00")
          .lt("created_at", dateStr + "T23:59:59");

        dailyData.push({
          date: dateStr,
          newUsers: (dayGoals || []).length,
          activeUsers: new Set((dayEntries || []).map((e: { user_id: string }) => e.user_id)).size,
          entries: (dayEntries || []).length,
        });
      }

      setStatistics(stats);
      setUsers(userStats);
      setDailyActivity(dailyData);
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
