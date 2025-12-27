export interface Entry {
  id: string;
  date: string;
  weight: number;
  calories?: number;
  steps?: number;
  workout?: string;
  workout_duration?: number;
  notes?: string;
}

export interface Goal {
  id?: string;
  current_weight: number;
  target_weight: number;
  target_date: string;
  start_date?: string;
  weekly_weight_loss?: number;
  daily_calories_limit?: number;
  daily_steps_goal?: number;
  weekly_training_hours?: number;
  monitoring_method?: string;
}

export interface Stats {
  totalEntries: number;
  avgWeight: number;
  avgCalories: number;
  avgSteps: number;
  totalWorkouts: number;
  currentStreak: number;
  bestWeight: number;
  totalWeightChange: number;
}

export interface Profile {
  id?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  activity_level?: number;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysInMonth(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}
