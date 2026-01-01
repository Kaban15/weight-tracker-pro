import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin emails - same as in useAdmin.ts
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : ["piotrtokeny@gmail.com"];

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
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
    const isTableNotExistError = (error: { message?: string } | null) =>
      error?.message?.includes("does not exist") || error?.message?.includes("relation") || false;

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("*");

    if (profilesError && !isTableNotExistError(profilesError)) {
      console.warn("user_profiles error:", profilesError);
    }

    // Fetch entries count per user
    const { data: entriesCounts, error: entriesError } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id, id");

    if (entriesError && !isTableNotExistError(entriesError)) {
      throw entriesError;
    }

    // Fetch challenges count per user
    const { data: challengesCounts, error: challengesError } = await supabaseAdmin
      .from("challenges")
      .select("user_id, id");

    if (challengesError && !isTableNotExistError(challengesError)) {
      console.warn("challenges error:", challengesError);
    }

    // Fetch planner tasks count per user
    const { data: plannerCounts, error: plannerError } = await supabaseAdmin
      .from("tasks")
      .select("user_id, id");

    if (plannerError && !isTableNotExistError(plannerError)) {
      console.warn("tasks error:", plannerError);
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
    const users = Array.from(allUserIds).map((userId) => {
      const profile = (profiles || []).find((p: { user_id: string }) => p.user_id === userId);
      const goal = (goals || []).find((g: { user_id: string }) => g.user_id === userId);

      return {
        id: userId,
        email: userId.substring(0, 8) + "...",
        createdAt: goal?.created_at || profile?.created_at || "",
        lastSignIn: goal?.updated_at || null,
        entriesCount: entriesPerUser[userId] || 0,
        challengesCount: challengesPerUser[userId] || 0,
        tasksCount: 0, // Todo tasks are in localStorage
        plannerDaysCount: plannerPerUser[userId] || 0,
      };
    });

    // Sort by entries count (most active first)
    users.sort((a, b) => b.entriesCount - a.entriesCount);

    // Calculate statistics
    const totalUsers = users.length;
    const totalEntries = Object.values(entriesPerUser).reduce((a, b) => a + b, 0);
    const totalChallenges = Object.values(challengesPerUser).reduce((a, b) => a + b, 0);
    const totalTasks = 0;
    const totalPlannerDays = Object.values(plannerPerUser).reduce((a, b) => a + b, 0);

    // Active users (those with entries in last 7/30 days)
    const { data: recentEntries7 } = await supabaseAdmin
      .from("weight_entries")
      .select("user_id")
      .gte("date", weekAgo);

    const { data: recentEntries30 } = await supabaseAdmin
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

    const statistics = {
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
