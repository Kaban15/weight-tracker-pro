export const DIET_TYPES = [
  { value: 'standard', label: 'Standardowa' },
  { value: 'keto', label: 'Ketogeniczna' },
  { value: 'mediterranean', label: 'Śródziemnomorska' },
  { value: 'vegetarian', label: 'Wegetariańska' },
  { value: 'vegan', label: 'Wegańska' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'low-carb', label: 'Nisko-węglowodanowa' },
  { value: 'high-protein', label: 'Wysokobiałkowa' },
] as const;

export const DEFAULT_MEAL_NAMES = ['Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export const UNIT_CONVERSIONS: Record<string, { unit: 'g' | 'ml' | 'szt'; multiplier: number }> = {
  'g': { unit: 'g', multiplier: 1 },
  'kg': { unit: 'g', multiplier: 1000 },
  'dag': { unit: 'g', multiplier: 10 },
  'ml': { unit: 'ml', multiplier: 1 },
  'l': { unit: 'ml', multiplier: 1000 },
  'szt': { unit: 'szt', multiplier: 1 },
};

export const MEALS_PER_DAY_OPTIONS = [2, 3, 4, 5, 6];

/** Ingredients that legitimately have ~0 calories — don't flag as AI error */
export const ZERO_CALORIE_INGREDIENTS = [
  'woda', 'sól', 'sol', 'pieprz', 'ocet', 'herbata', 'kawa',
  'przyprawy', 'cynamon', 'kurkuma', 'papryka ostra', 'imbir',
  'bazylia', 'oregano', 'tymianek', 'rozmaryn', 'liść laurowy',
  'czosnek suszony', 'pieprz cayenne',
];
