export interface UserStats {
  id: string;
  email: string;
  createdAt: string;
  lastSignIn: string | null;
  entriesCount: number;
  challengesCount: number;
  tasksCount: number;
  plannerDaysCount: number;
}

export interface AppStatistics {
  totalUsers: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  totalEntries: number;
  totalChallenges: number;
  totalTasks: number;
  totalPlannerDays: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageEntriesPerUser: number;
  averageChallengesPerUser: number;
}

export interface DailyActivity {
  date: string;
  newUsers: number;
  activeUsers: number;
  entries: number;
}
