export interface Challenge {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  trackReps: boolean;
  dailyGoals?: { [date: string]: number }; // cele per dzień (np. "2025-01-01": 10, "2025-01-02": 15)
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
  daily_goals?: { [date: string]: number };
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
  goalUnit: string;
  defaultGoal: number; // domyślna ilość powtórzeń na każdy dzień
}

export const GOAL_UNITS = [
  { value: 'powtórzeń', label: 'Powtórzeń' },
  { value: 'minut', label: 'Minut' },
  { value: 'sekund', label: 'Sekund' },
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
  goalUnit: 'powtórzeń',
  defaultGoal: 0
};
