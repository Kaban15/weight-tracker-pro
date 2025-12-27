export type Priority = 'high' | 'medium' | 'low' | 'optional';
export type TaskStatus = 'done' | 'in_progress' | 'not_started' | 'cancelled';
export type Category = 'health' | 'work' | 'money' | 'family' | 'personal_growth' | 'duties' | 'ideas' | 'free_time' | 'spirituality';

export interface Task {
  id: string;
  title: string;
  notes?: string; // Optional notes field
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
  notes?: string;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  category: Category;
}

export const DEFAULT_TASK_FORM: TaskFormData = {
  title: '',
  notes: '',
  deadline: new Date().toISOString().split('T')[0],
  priority: 'medium',
  status: 'not_started',
  category: 'duties',
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
  not_started: { label: 'Nie rozpoczęte', color: 'text-slate-400', icon: 'circle' },
  cancelled: { label: 'Anulowane', color: 'text-red-400', icon: 'x' },
};

export const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string }> = {
  health: { label: 'Zdrowie', emoji: '💪', color: 'text-emerald-400' },
  work: { label: 'Praca', emoji: '💼', color: 'text-blue-400' },
  money: { label: 'Pieniądze', emoji: '₿', color: 'text-amber-400' },
  family: { label: 'Rodzina', emoji: '👨‍👩‍👧', color: 'text-pink-400' },
  personal_growth: { label: 'Rozwój osobisty', emoji: '📚', color: 'text-violet-400' },
  duties: { label: 'Obowiązki', emoji: '✏️', color: 'text-orange-400' },
  ideas: { label: 'Pomysły', emoji: '💡', color: 'text-yellow-400' },
  free_time: { label: 'Czas wolny', emoji: '🎮', color: 'text-cyan-400' },
  spirituality: { label: 'Duchowość', emoji: '🧘', color: 'text-purple-400' },
};

export interface TaskStats {
  total: number;
  today: number;
  overdue: number;
  completed: number;
  notCompleted: number;
  cancelled: number;
  percentComplete: number;
}
