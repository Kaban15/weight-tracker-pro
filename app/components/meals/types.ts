import { z } from 'zod';

// ── Diet types ──
export type DietType = 'standard' | 'keto' | 'mediterranean' | 'vegetarian' | 'vegan' | 'paleo' | 'low-carb' | 'high-protein';
export type GoalType = 'loss' | 'maintain' | 'gain';
export type MealSlot = string; // user-configurable names
export type MealPlanStatus = 'planned' | 'accepted' | 'eaten' | 'rejected';
export type PantryUnit = 'g' | 'ml' | 'szt';

// ── Meal Preferences (Supabase: meal_preferences) ──
export interface MealPreferences {
  id: string;
  user_id: string;
  diet_type: DietType;
  goal_type: GoalType;
  calorie_adjustment: number;
  tdee: number;
  target_calories: number;
  meals_per_day: number;
  meal_names: string[];
  preferences_text: string;
  allergies: string[];
  disliked_foods: string[];
  liked_foods: string[];
  cuisines: string[];
  custom_tdee: number | null;
  onboarding_completed: boolean;
  has_thermomix: boolean;
  created_at: string;
  updated_at: string;
}

// ── Meal Plan (Supabase: meal_plans) ──
export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meal_slot: string;
  name: string;
  ingredients: MealIngredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe_steps: string[];
  estimated_cost: number | null;
  ingredient_costs: Record<string, number | null> | null;
  status: MealPlanStatus;
  rating: number | null;
  rating_comment: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealIngredient {
  name: string;
  amount: number;
  unit: PantryUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number | null;
}

// ── Pantry (Supabase: pantry_items) ──
export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity_total: number;
  quantity_remaining: number;
  unit: PantryUnit;
  price: number;
  purchased_at: string;
  created_at: string;
  updated_at: string;
}

// ── Shopping List (Supabase: shopping_lists) ──
export interface ShoppingListItem {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  unit: PantryUnit;
  bought: boolean;
  created_at: string;
  updated_at: string;
}

// ── AI Conversation (Supabase: ai_conversations) ──
export interface AIConversation {
  id: string;
  user_id: string;
  session_date: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  meal_data?: AIGeneratedMeal | null;
}

// ── AI Response Schema (structured output) ──
// Note: All fields must be required for structured output API compatibility.
// Use .nullable() instead of .optional() where a field may be absent.
export const aiMealSchema = z.object({
  message: z.string().describe('Konwersacyjna odpowiedź po polsku'),
  meals: z.array(z.object({
    meal_slot: z.string(),
    name: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.enum(['g', 'ml', 'szt']),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    recipe_steps: z.array(z.string()),
  })),
});

export type AIGeneratedMeal = z.infer<typeof aiMealSchema>['meals'][number];

/** Schema for Gemini nutrition lookup response */
export const nutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export type NutritionData = z.infer<typeof nutritionSchema>;

// ── AI Interview Schema ──
export const aiInterviewSchema = z.object({
  message: z.string().describe('Kolejne pytanie lub podsumowanie po polsku'),
  is_complete: z.boolean().describe('Czy wywiad jest zakończony'),
  extracted_preferences: z.object({
    allergies: z.array(z.string()),
    disliked_foods: z.array(z.string()),
    liked_foods: z.array(z.string()),
    cuisines: z.array(z.string()),
    notes: z.string(),
  }).nullable(),
});

export type AIInterviewResponse = z.infer<typeof aiInterviewSchema>;

// ── Day Summary ──
export interface DaySummary {
  date: string;
  meals: MealPlan[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalCost: number;
  avgRating: number | null;
  calorieGoalPercent: number;
}

// Re-export from shared for backwards compatibility
export { formatDate } from '../shared/dateUtils';
