import { z } from "zod";

// Weight entry validation
export const weightEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  weight: z.number()
    .min(20, "Waga musi być większa niż 20 kg")
    .max(500, "Waga musi być mniejsza niż 500 kg"),
  calories: z.number()
    .min(0, "Kalorie nie mogą być ujemne")
    .max(20000, "Kalorie muszą być mniejsze niż 20000")
    .optional()
    .nullable(),
  steps: z.number()
    .min(0, "Kroki nie mogą być ujemne")
    .max(200000, "Kroki muszą być mniejsze niż 200000")
    .optional()
    .nullable(),
  notes: z.string().max(500, "Notatki nie mogą mieć więcej niż 500 znaków").optional().nullable(),
  workouts: z.array(z.object({
    type: z.string(),
    duration: z.number().min(0).optional(),
  })).optional(),
  meals: z.array(z.object({
    id: z.string(),
    name: z.string().max(200, "Nazwa posiłku nie może mieć więcej niż 200 znaków"),
    type: z.enum(['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska']),
    calories: z.number().min(0).max(10000),
    protein: z.number().min(0).max(1000),
    carbs: z.number().min(0).max(1000),
    fat: z.number().min(0).max(1000),
  })).optional(),
});

export type WeightEntryInput = z.infer<typeof weightEntrySchema>;

// Goal validation
export const goalSchema = z.object({
  currentWeight: z.number()
    .min(20, "Waga początkowa musi być większa niż 20 kg")
    .max(500, "Waga początkowa musi być mniejsza niż 500 kg"),
  targetWeight: z.number()
    .min(20, "Waga docelowa musi być większa niż 20 kg")
    .max(500, "Waga docelowa musi być mniejsza niż 500 kg"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  weeklyWeightLoss: z.number()
    .min(0, "Tygodniowa utrata wagi nie może być ujemna")
    .max(3, "Tygodniowa utrata wagi nie może być większa niż 3 kg")
    .optional()
    .nullable(),
  dailyCaloriesLimit: z.number()
    .min(800, "Limit kalorii musi być większy niż 800")
    .max(10000, "Limit kalorii musi być mniejszy niż 10000")
    .optional()
    .nullable(),
  dailyStepsGoal: z.number()
    .min(0, "Cel kroków nie może być ujemny")
    .max(100000, "Cel kroków musi być mniejszy niż 100000")
    .optional()
    .nullable(),
});

export type GoalInput = z.infer<typeof goalSchema>;

// Task validation
export const taskSchema = z.object({
  title: z.string()
    .min(1, "Tytuł jest wymagany")
    .max(200, "Tytuł nie może mieć więcej niż 200 znaków"),
  notes: z.string().max(1000, "Notatki nie mogą mieć więcej niż 1000 znaków").optional().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  priority: z.enum(["high", "medium", "low", "optional"], {
    message: "Nieprawidłowy priorytet",
  }),
  status: z.enum(["done", "in_progress", "not_started", "cancelled"], {
    message: "Nieprawidłowy status",
  }),
  category: z.enum([
    "health", "work", "money", "family", "personal_growth",
    "duties", "ideas", "free_time", "spirituality"
  ], {
    message: "Nieprawidłowa kategoria",
  }),
  duration: z.number().min(0).max(480).optional().nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Nieprawidłowy format czasu (HH:MM)").optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;

// Challenge/Habit validation
export const challengeSchema = z.object({
  name: z.string()
    .min(1, "Nazwa jest wymagana")
    .max(100, "Nazwa nie może mieć więcej niż 100 znaków"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  trackReps: z.boolean().optional(),
  defaultGoal: z.number().min(0).max(10000).optional(),
  goalUnit: z.string().max(50).optional(),
});

export type ChallengeInput = z.infer<typeof challengeSchema>;

// Body measurements validation
export const bodyMeasurementsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  waist: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  hips: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  chest: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  thigh_left: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  thigh_right: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  arm_left: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  arm_right: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  calf_left: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  calf_right: z.number().min(0, "Wartość nie może być ujemna").max(300, "Wartość musi być mniejsza niż 300 cm").optional().nullable(),
  notes: z.string().max(500, "Notatki nie mogą mieć więcej niż 500 znaków").optional().nullable(),
});

export type BodyMeasurementsInput = z.infer<typeof bodyMeasurementsSchema>;

// Feedback validation
export const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "improvement", "other"], {
    message: "Nieprawidłowa kategoria",
  }),
  message: z.string()
    .min(10, "Wiadomość musi mieć co najmniej 10 znaków")
    .max(2000, "Wiadomość nie może mieć więcej niż 2000 znaków"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// User profile validation
export const profileSchema = z.object({
  age: z.number()
    .min(10, "Wiek musi być większy niż 10")
    .max(120, "Wiek musi być mniejszy niż 120")
    .optional()
    .nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  height: z.number()
    .min(100, "Wzrost musi być większy niż 100 cm")
    .max(250, "Wzrost musi być mniejszy niż 250 cm")
    .optional()
    .nullable(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// Email validation
export const emailSchema = z.string().email("Nieprawidłowy adres email");

// Password validation
export const passwordSchema = z.string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
  .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
  .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę");

// Helper function to validate and return errors
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }

  return { success: false, errors };
}

// Helper to get first error message
export function getFirstError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): string | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  return result.error.issues[0]?.message || null;
}
