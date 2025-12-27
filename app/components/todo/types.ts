export type Priority = 'high' | 'medium' | 'low' | 'optional';
export type TaskStatus = 'done' | 'in_progress' | 'not_started';
export type Category = 'work' | 'money' | 'ideas' | 'duties' | 'spirituality' | 'health' | 'other';

export interface Task {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD format
  priority: Priority;
  status: TaskStatus;
  category: Category;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormData {
  title: string;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  category: Category;
}

export const DEFAULT_TASK_FORM: TaskFormData = {
  title: '',
  deadline: new Date().toISOString().split('T')[0],
  priority: 'medium',
  status: 'not_started',
  category: 'other',
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Wysokie', color: 'text-red-400', bgColor: 'bg-red-500' },
  medium: { label: 'Średnie', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  low: { label: 'Niskie', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  optional: { label: 'Nieobowiązkowe', color: 'text-slate-400', bgColor: 'bg-slate-500' },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  done: { label: 'Zrobione', color: 'text-emerald-400', icon: 'check' },
  in_progress: { label: 'W trakcie', color: 'text-amber-400', icon: 'pencil' },
  not_started: { label: 'Nie rozpoczęte', color: 'text-red-400', icon: 'alert' },
};

export const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string }> = {
  work: { label: 'Praca', emoji: '💼', color: 'text-amber-600' },
  money: { label: 'Pieniądze', emoji: '💰', color: 'text-green-500' },
  ideas: { label: 'Pomysły', emoji: '💡', color: 'text-yellow-400' },
  duties: { label: 'Obowiązki', emoji: '✏️', color: 'text-orange-400' },
  spirituality: { label: 'Duchowość', emoji: '🧘', color: 'text-purple-400' },
  health: { label: 'Zdrowie', emoji: '💪', color: 'text-emerald-400' },
  other: { label: 'Inne', emoji: '📌', color: 'text-slate-400' },
};

export interface TaskStats {
  total: number;
  today: number;
  overdue: number;
  completed: number;
  percentComplete: number;
}
