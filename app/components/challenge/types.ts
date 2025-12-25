export interface Challenge {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  trackReps: boolean;
  dailyGoal?: number; // cel dzienny (np. 50 pompek, 30 minut)
  goalUnit?: string; // jednostka (np. "powtórzeń", "minut", "km")
  completedDays: { [date: string]: number };
}

export interface ChallengeRow {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  track_reps: boolean;
  daily_goal?: number;
  goal_unit?: string;
  completed_days: { [date: string]: number };
}

export interface ChallengeProgress {
  totalDays: number;
  completedCount: number;
  totalReps: number;
  percentage: number;
  isCompleted: boolean;
  streak: number;
}

export interface ChallengeFormData {
  name: string;
  dateMode: 'duration' | 'dates';
  durationType: 'days' | 'weeks' | 'months' | 'year';
  durationValue: number;
  startDate: string;
  endDate: string;
  trackReps: boolean;
  dailyGoal: number;
  goalUnit: string;
}

export const GOAL_UNITS = [
  { value: 'powtórzeń', label: 'Powtórzeń' },
  { value: 'minut', label: 'Minut' },
  { value: 'km', label: 'Kilometrów' },
  { value: 'stron', label: 'Stron' },
  { value: 'kalorii', label: 'Kalorii' },
  { value: 'sztuk', label: 'Sztuk' },
];

export const DEFAULT_FORM_DATA: ChallengeFormData = {
  name: '',
  dateMode: 'duration',
  durationType: 'days',
  durationValue: 30,
  startDate: '',
  endDate: '',
  trackReps: false,
  dailyGoal: 0,
  goalUnit: 'powtórzeń'
};
