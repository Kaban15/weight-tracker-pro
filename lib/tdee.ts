/**
 * Mifflin-St Jeor BMR formula
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Total Daily Energy Expenditure = BMR × activity multiplier
 */
export function calculateTDEE(bmr: number, activityMultiplier: number): number {
  return bmr * activityMultiplier;
}

/**
 * Target calories = TDEE + adjustment (negative for deficit, positive for surplus)
 * Minimum 1200 kcal for safety
 */
export function calculateTargetCalories(tdee: number, adjustment: number): number {
  return Math.max(1200, tdee + adjustment);
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Siedzący (brak ćwiczeń)' },
  { value: 1.375, label: 'Lekko aktywny (1-3 dni/tyg)' },
  { value: 1.55, label: 'Umiarkowanie aktywny (3-5 dni/tyg)' },
  { value: 1.725, label: 'Bardzo aktywny (6-7 dni/tyg)' },
  { value: 1.9, label: 'Ekstremalnie aktywny (2x dziennie)' },
] as const;

export const GOAL_TYPES = [
  { value: 'loss', label: 'Redukcja', defaultAdjustment: -500 },
  { value: 'maintain', label: 'Utrzymanie', defaultAdjustment: 0 },
  { value: 'gain', label: 'Masa', defaultAdjustment: 300 },
] as const;
