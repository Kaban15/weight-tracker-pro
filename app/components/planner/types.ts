export interface Task {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TasksByDate {
  [date: string]: Task[];
}
