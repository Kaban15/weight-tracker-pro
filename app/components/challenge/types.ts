export interface Challenge {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  trackReps: boolean;
  completedDays: { [date: string]: number };
}

export interface ChallengeRow {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  track_reps: boolean;
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
}

export const DEFAULT_FORM_DATA: ChallengeFormData = {
  name: '',
  dateMode: 'duration',
  durationType: 'days',
  durationValue: 30,
  startDate: '',
  endDate: '',
  trackReps: false
};
