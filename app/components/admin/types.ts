export interface UserStats {
  id: string;
  email: string;
  createdAt: string;
  lastSignIn: string | null;
  lastActivityAt: string | null;
  entriesCount: number;
  challengesCount: number;
  tasksCount: number;
}

export interface ModuleUsage {
  trackerUsers: number;
  mealsUsers: number;
  todoUsers: number;
  habitsUsers: number;
}

export interface AppStatistics {
  totalUsers: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  newUsersLast30Days: number;
  totalEntries: number;
  totalChallenges: number;
  totalTasks: number;
  tasksDone: number;
  taskCompletionRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageEntriesPerUser: number;
  averageChallengesPerUser: number;
  moduleUsage: ModuleUsage;
}

export interface DailyActivity {
  date: string;
  newUsers: number;
  activeUsers: number;
  entries: number;
}
