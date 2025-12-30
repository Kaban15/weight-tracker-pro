/**
 * Schedule module types
 */

export interface ScheduleItem {
  id: string;
  title: string;
  type: 'todo' | 'challenge' | 'custom';
  completed: boolean;
  date: string; // YYYY-MM-DD

  // Source reference
  sourceId?: string;

  // Todo-specific fields
  priority?: 'high' | 'medium' | 'low' | 'optional';
  category?: string;
  notes?: string;

  // Challenge-specific fields
  reps?: number;
  goalReps?: number;
  goalUnit?: string;
  trackReps?: boolean;
}

export interface CustomScheduleItem {
  id: string;
  user_id: string;
  date: string;
  title: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleStats {
  total: number;
  completed: number;
  todos: number;
  challenges: number;
  custom: number;
}
