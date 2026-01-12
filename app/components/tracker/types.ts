export interface Workout {
  type: string;
  duration?: number;
}

export interface Entry {
  id: string;
  date: string;
  weight: number;
  calories?: number;
  steps?: number;
  workout?: string;
  workout_duration?: number;
  workouts?: Workout[];
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

// Goal completion types
export type CompletionType = 'target_reached' | 'date_passed' | 'manual';

export interface GoalHistory {
  id: string;
  user_id: string;
  original_goal_id?: string;

  // Original goal snapshot
  current_weight: number;
  target_weight: number;
  start_date: string;
  target_date: string;
  weekly_weight_loss?: number;
  daily_calories_limit?: number;
  daily_steps_goal?: number;
  weekly_training_hours?: number;
  monitoring_method?: string;

  // Completion metadata
  completion_type: CompletionType;
  completed_at: string;

  // Final stats
  final_weight: number;
  weight_lost: number;
  progress_percentage: number;
  total_entries: number;
  total_workouts: number;
  avg_calories?: number;
  avg_steps?: number;
  best_weight: number;
  current_streak: number;
  duration_days: number;
}

export interface GoalCompletionData {
  goal: Goal;
  stats: Stats;
  completionType: CompletionType;
  finalWeight: number;
}

// Body measurements types
export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  waist?: number;
  hips?: number;
  chest?: number;
  thigh_left?: number;
  thigh_right?: number;
  arm_left?: number;
  arm_right?: number;
  calf_left?: number;
  calf_right?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeasurementChanges {
  waist?: number;
  hips?: number;
  chest?: number;
  thigh_left?: number;
  thigh_right?: number;
  arm_left?: number;
  arm_right?: number;
  calf_left?: number;
  calf_right?: number;
}

export const MEASUREMENT_LABELS: Record<keyof MeasurementChanges, string> = {
  waist: 'Talia',
  hips: 'Biodra',
  chest: 'Klatka',
  thigh_left: 'Udo L',
  thigh_right: 'Udo P',
  arm_left: 'Ramię L',
  arm_right: 'Ramię P',
  calf_left: 'Łydka L',
  calf_right: 'Łydka P',
};

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
