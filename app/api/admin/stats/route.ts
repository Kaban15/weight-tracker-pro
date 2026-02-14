import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMIT_CONFIGS } from "@/lib/serverRateLimiter";

// Admin emails - same as in useAdmin.ts
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : ["piotrtokeny@gmail.com"];

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const { allowed, remaining, resetTime } = checkRateLimit(request, RATE_LIMIT_CONFIGS.admin);
  const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime, RATE_LIMIT_CONFIGS.admin.maxRequests);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...Object.fromEntries(rateLimitHeaders.entries()),
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's token using anon key client
    const supabaseAnon = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(userData.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Now fetch statistics using admin client (bypasses RLS)
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Helper to check if error is "table doesn't exist"
    const isTableNotExistError = (error: { code?: string; message?: string } | null) =>
      error?.code === "PGRST205" ||
      error?.code === "42P01" ||
      error?.message?.includes("does not exist") ||
      error?.message?.includes("relation") ||
      false;

    // Fetch all user profiles (try both table names for compatibility)
    let profiles: { user_id: string; last_active_at?: string; created_at?: string }[] | null = null;
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("*");

    if (profilesError && !isTableNotExistError(profilesError)) {
      console.warn("user_profiles error:", profilesError);
    }
    profiles = profilesData;

    // Also try 'profiles' table for heartbeat data (last_active_at)
    if (!profiles || profilesError) {
      const { data: altProfiles } = await supabaseAdmin
        .from("profiles")
        .select("*");
      if (altProfiles) profiles = altProfiles;
    }

    // Build map of user_id -> last_active_at from profiles heartbeat
    const heartbeatPerUser: Record<string, string> = {};
    (profiles || []).forEach((p: { user_id: string; last_active_at?: string }) => {
      if (p.last_active_at) {
        heartbeatPerUser[p.user_id] = p.last_active_at;
      }
    });

    // Fetch entries count per user (with date for last-activity tracking)
    const { data: entriesCounts, error: entriesError } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id, id, date");

    if (entriesError && !isTableNotExistError(entriesError)) {
      throw entriesError;
    }

    // Fetch challenges count per user (with date for last-activity tracking)
    const { data: challengesCounts, error: challengesError } = await supabaseAdmin
      .from("challenges")
      .select("user_id, id, date");

    if (challengesError && !isTableNotExistError(challengesError)) {
      console.warn("challenges error:", challengesError);
    }

    // Fetch tasks with status for per-user counts and completion rate (with date)
    const { data: tasksData, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("user_id, id, status, date");

    if (tasksError && !isTableNotExistError(tasksError)) {
      console.warn("tasks error:", tasksError);
    }

    // Fetch entries with non-null meals for mealsUsers metric
    let mealsEntries: { user_id: string }[] = [];
    const { data: mealsData, error: mealsError } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id, meals")
      .not("meals", "is", null);

    if (!mealsError) {
      // Filter out empty arrays
      mealsEntries = (mealsData || []).filter((e: { meals: unknown }) => {
        if (Array.isArray(e.meals) && e.meals.length === 0) return false;
        return true;
      });
    }

    // Fetch goals for user activity tracking
    const { data: goals, error: goalsError } = await supabaseAdmin
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
    (tasksData || []).forEach((t: { user_id: string }) => {
      tasksPerUser[t.user_id] = (tasksPerUser[t.user_id] || 0) + 1;
    });

    // Fetch auth users to get emails and last_sign_in_at
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    const authUsers = authUsersData?.users || [];

    // Create a map of user_id -> email
    const userEmails: Record<string, string> = {};
    authUsers.forEach((u) => {
      userEmails[u.id] = u.email || u.id.substring(0, 8) + "...";
    });

    // Extract last_sign_in_at for activity tracking
    const authUserSignIns: [string, string][] = authUsers
      .filter((u) => u.last_sign_in_at)
      .map((u) => [u.id, u.last_sign_in_at!]);

    // Compute last activity per user (max across heartbeat, last_sign_in, entries, tasks, challenges)
    // Uses full ISO timestamps for heartbeat/signIn, date strings for data tables
    const lastActivityPerUser: Record<string, string> = {};
    const updateLastActivity = (userId: string, dateStr: string | undefined | null) => {
      if (!dateStr) return;
      // Keep full ISO for comparison (timestamps sort correctly as strings)
      if (!lastActivityPerUser[userId] || dateStr > lastActivityPerUser[userId]) {
        lastActivityPerUser[userId] = dateStr;
      }
    };

    // Heartbeat signal (primary - full ISO timestamp from profiles.last_active_at)
    Object.entries(heartbeatPerUser).forEach(([userId, ts]) => {
      updateLastActivity(userId, ts);
    });

    // Auth last_sign_in_at signal (full ISO timestamp)
    authUserSignIns.forEach(([userId, ts]) => {
      updateLastActivity(userId, ts);
    });

    // Data-based signals (date strings like "2026-02-14")
    (entriesCounts || []).forEach((e: { user_id: string; date?: string }) => {
      updateLastActivity(e.user_id, e.date);
    });
    (tasksData || []).forEach((t: { user_id: string; date?: string }) => {
      updateLastActivity(t.user_id, t.date);
    });
    (challengesCounts || []).forEach((c: { user_id: string; date?: string }) => {
      updateLastActivity(c.user_id, c.date);
    });

    // Get unique user IDs from all tables
    const allUserIds = new Set<string>();
    (profiles || []).forEach((p: { user_id: string }) => allUserIds.add(p.user_id));
    (goals || []).forEach((g: { user_id: string }) => allUserIds.add(g.user_id));
    Object.keys(entriesPerUser).forEach((id) => allUserIds.add(id));
    Object.keys(challengesPerUser).forEach((id) => allUserIds.add(id));
    Object.keys(tasksPerUser).forEach((id) => allUserIds.add(id));

    // Build user stats
    const users = Array.from(allUserIds).map((userId) => {
      const profile = (profiles || []).find((p: { user_id: string }) => p.user_id === userId);
      const goal = (goals || []).find((g: { user_id: string }) => g.user_id === userId);
      const authUser = authUsers.find((u) => u.id === userId);

      return {
        id: userId,
        email: userEmails[userId] || userId.substring(0, 8) + "...",
        createdAt: authUser?.created_at || goal?.created_at || profile?.created_at || "",
        lastSignIn: authUser?.last_sign_in_at || null,
        lastActivityAt: lastActivityPerUser[userId] || null,
        entriesCount: entriesPerUser[userId] || 0,
        challengesCount: challengesPerUser[userId] || 0,
        tasksCount: tasksPerUser[userId] || 0,
      };
    });

    // Sort by entries count (most active first)
    users.sort((a, b) => b.entriesCount - a.entriesCount);

    // Calculate statistics
    const totalUsers = users.length;
    const totalEntries = Object.values(entriesPerUser).reduce((a, b) => a + b, 0);
    const totalChallenges = Object.values(challengesPerUser).reduce((a, b) => a + b, 0);
    const totalTasks = (tasksData || []).length;

    // Task completion rate
    const tasksDone = (tasksData || []).filter((t: { status: string }) => t.status === "done").length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;

    // Active users last 7 days - union across entries, tasks, and challenges
    const { data: recentEntries7 } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id")
      .gte("date", weekAgo);

    const activeUsers7Set = new Set<string>();
    (recentEntries7 || []).forEach((e: { user_id: string }) => activeUsers7Set.add(e.user_id));

    // Tasks active in last 7 days (using date column)
    const { data: recentTasks7, error: recentTasksError } = await supabaseAdmin
      .from("tasks")
      .select("user_id")
      .gte("date", weekAgo);

    if (!recentTasksError) {
      (recentTasks7 || []).forEach((t: { user_id: string }) => activeUsers7Set.add(t.user_id));
    }

    // Challenges active in last 7 days (using date column, fallback to created_at)
    let recentChallenges7: { user_id: string }[] = [];
    const { data: rc7Date, error: rc7DateErr } = await supabaseAdmin
      .from("challenges")
      .select("user_id")
      .gte("date", weekAgo);

    if (!rc7DateErr && rc7Date) {
      recentChallenges7 = rc7Date;
    } else {
      // Fallback: try created_at
      const { data: rc7Created } = await supabaseAdmin
        .from("challenges")
        .select("user_id")
        .gte("created_at", weekAgo + "T00:00:00");
      recentChallenges7 = rc7Created || [];
    }
    recentChallenges7.forEach((c: { user_id: string }) => activeUsers7Set.add(c.user_id));

    // Heartbeat-active users in last 7 days
    const weekAgoISO = weekAgo + "T00:00:00";
    Object.entries(heartbeatPerUser).forEach(([userId, ts]) => {
      if (ts >= weekAgoISO) activeUsers7Set.add(userId);
    });

    const activeUsersLast7Days = activeUsers7Set.size;

    // Active users last 30 days (entries only, for backwards compat)
    const { data: recentEntries30 } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id")
      .gte("date", monthAgo);

    const activeUsersLast30Days = new Set((recentEntries30 || []).map((e: { user_id: string }) => e.user_id)).size;

    // New users from auth (last 30 days)
    const newUsersLast30Days = authUsers.filter(
      (u) => u.created_at && u.created_at >= monthAgo
    ).length;

    // New users (based on first goal creation - existing logic)
    const newUsersToday = (goals || []).filter(
      (g: { created_at: string }) => g.created_at?.startsWith(today)
    ).length;
    const newUsersThisWeek = (goals || []).filter(
      (g: { created_at: string }) => g.created_at >= weekAgo
    ).length;
    const newUsersThisMonth = (goals || []).filter(
      (g: { created_at: string }) => g.created_at >= monthAgo
    ).length;

    // Module usage
    const moduleUsage = {
      trackerUsers: Object.keys(entriesPerUser).length,
      mealsUsers: new Set(mealsEntries.map((e: { user_id: string }) => e.user_id)).size,
      todoUsers: Object.keys(tasksPerUser).length,
      habitsUsers: Object.keys(challengesPerUser).length,
    };

    const statistics = {
      totalUsers,
      activeUsersLast7Days,
      activeUsersLast30Days,
      newUsersLast30Days,
      totalEntries,
      totalChallenges,
      totalTasks,
      tasksDone,
      taskCompletionRate,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      averageEntriesPerUser: totalUsers > 0 ? Math.round(totalEntries / totalUsers) : 0,
      averageChallengesPerUser: totalUsers > 0 ? Math.round((totalChallenges / totalUsers) * 10) / 10 : 0,
      moduleUsage,
    };

    // Daily activity for last 14 days
    const dailyActivity = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const { data: dayEntries } = await supabaseAdmin
        .from("weight_entries")
        .select("user_id")
        .eq("date", dateStr);

      const { data: dayGoals } = await supabaseAdmin
        .from("goals")
        .select("user_id")
        .gte("created_at", dateStr + "T00:00:00")
        .lt("created_at", dateStr + "T23:59:59");

      dailyActivity.push({
        date: dateStr,
        newUsers: (dayGoals || []).length,
        activeUsers: new Set((dayEntries || []).map((e: { user_id: string }) => e.user_id)).size,
        entries: (dayEntries || []).length,
      });
    }

    return NextResponse.json({
      statistics,
      users,
      dailyActivity,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error loading statistics" },
      { status: 500 }
    );
  }
}
