// app/components/meals/MealsMode.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { pushMealToWeightEntry } from '@/lib/mealTrackerBridge';
import Toast from '@/app/components/ui/Toast';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigation } from '@/lib/NavigationContext';
import { supabase } from '@/lib/supabase';
import { MealPlan, MealPreferences, AIGeneratedMeal, MealIngredient, formatDate } from './types';
import { useMeals } from './useMeals';
import { usePantry } from './usePantry';
import { useShoppingList } from './useShoppingList';
import { useNutritionLookup } from './useNutritionLookup';
import { ZERO_CALORIE_INGREDIENTS } from './constants';
import MealWizard from './MealWizard';
import MealWizardAIInterview from './MealWizardAIInterview';
import MealDashboard from './MealDashboard';
import PantryManager from './PantryManager';
import ShoppingList from './ShoppingList';
import MealCalendar from './MealCalendar';
import MealSummaryCharts from './MealSummaryCharts';
import FavoriteMeals from './FavoriteMeals';
import PreferencesEditor from './PreferencesEditor';

interface MealsModeProps {
  onBack?: () => void;
}

type View = 'loading' | 'wizard' | 'interview' | 'dashboard' | 'pantry' | 'shopping' | 'calendar' | 'charts' | 'settings' | 'favorites' | 'preferences' | 'preferences-interview';

export default function MealsMode({ onBack }: MealsModeProps) {
  const { user } = useAuth();
  const { goHome } = useNavigation();
  const {
    preferences, mealPlans, isLoading,
    savePreferences, saveMealPlan, acceptMeals, updateMealPlan, getDaySummary,
    toggleFavorite, reeatFavorite, getFavorites, updateIngredients, syncToTracker,
  } = useMeals(user?.id);

  const pantry = usePantry(user?.id);
  const shopping = useShoppingList(user?.id);
  const { lookupNutrition } = useNutritionLookup();

  const [view, setView] = useState<View>('loading');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [wizardData, setWizardData] = useState<Partial<MealPreferences> | null>(null);
  const [profile, setProfile] = useState<{ age?: number; gender?: 'male' | 'female'; height?: number } | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // Fetch profile data from tracker module
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id || !supabase) return;
      const { data } = await supabase
        .from('profiles')
        .select('age, gender, height')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data);

      const { data: entry } = await supabase
        .from('entries')
        .select('weight')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      if (entry) setLatestWeight(entry.weight);
    }
    fetchProfile();
  }, [user?.id]);

  // One-time auto-repair: re-enrich meals that have 0 kcal on ingredients
  const repairRan = useRef(false);
  useEffect(() => {
    if (isLoading || repairRan.current || mealPlans.length === 0) return;
    repairRan.current = true;

    const mealsToRepair = mealPlans.filter(m => {
      const ings = m.ingredients as MealIngredient[];
      if (!ings?.length) return false;
      return ings.some(ing => {
        const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z => ing.name.toLowerCase().includes(z));
        return !isZeroCal && ing.name.trim() && ing.amount > 0 && ing.calories === 0;
      });
    });

    if (mealsToRepair.length === 0) return;

    (async () => {
      for (const meal of mealsToRepair) {
        const enriched = await enrichIngredientsWithNutrition(meal.ingredients as MealIngredient[]);
        const totalCal = enriched.reduce((s, i) => s + i.calories, 0);
        if (totalCal > 0) {
          await updateMealPlan(meal.id, {
            ingredients: enriched,
            calories: totalCal,
            protein: enriched.reduce((s, i) => s + i.protein, 0),
            carbs: enriched.reduce((s, i) => s + i.carbs, 0),
            fat: enriched.reduce((s, i) => s + i.fat, 0),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, mealPlans.length]);

  // Derive initial view from loading state
  const resolvedView = view === 'loading' && !isLoading
    ? (!preferences || !preferences.onboarding_completed ? 'wizard' : 'dashboard')
    : view;

  const handleWizardComplete = (data: Partial<MealPreferences>) => {
    setWizardData(data);
    setView('interview');
  };

  const handleInterviewComplete = async (interviewData: Partial<MealPreferences>) => {
    const merged = { ...wizardData, ...interviewData };
    await savePreferences(merged);
    setView('dashboard');
  };

  const handleAcceptMeals = async (date: string, meals: AIGeneratedMeal[]) => {
    const result = await acceptMeals(date, meals);
    if (result?.data) {
      for (const savedMeal of result.data as MealPlan[]) {
        const ingredients = savedMeal.ingredients as MealIngredient[];

        // Enrich macros if AI returned zeros
        const hasZeroMacros = ingredients.some(ing => {
          const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z => ing.name.toLowerCase().includes(z));
          return !isZeroCal && ing.calories === 0;
        });

        if (hasZeroMacros) {
          const enriched = await enrichIngredientsWithNutrition(ingredients);
          const totalCal = enriched.reduce((s, i) => s + i.calories, 0);
          const totalPro = enriched.reduce((s, i) => s + i.protein, 0);
          const totalCarb = enriched.reduce((s, i) => s + i.carbs, 0);
          const totalFat = enriched.reduce((s, i) => s + i.fat, 0);
          await updateMealPlan(savedMeal.id, {
            ingredients: enriched,
            calories: totalCal,
            protein: totalPro,
            carbs: totalCarb,
            fat: totalFat,
          });
        }

        // Estimate cost from pantry
        const { costs, totalCost } = pantry.estimateCost(ingredients);
        if (totalCost > 0 || costs.size > 0) {
          const costObj: Record<string, number | null> = {};
          costs.forEach((v, k) => { costObj[k] = v; });
          await updateMealPlan(savedMeal.id, {
            estimated_cost: totalCost,
            ingredient_costs: costObj,
          });
        }
      }
    }
  };

  /** Look up nutrition for each ingredient with 0 macros (sequential with retry) */
  const enrichIngredientsWithNutrition = async (ingredients: MealIngredient[]): Promise<MealIngredient[]> => {
    const results: MealIngredient[] = [];
    for (const ing of ingredients) {
      const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z => ing.name.toLowerCase().includes(z));
      if (isZeroCal || ing.calories > 0 || !ing.name.trim() || ing.amount <= 0) {
        results.push(ing);
        continue;
      }

      // Retry up to 2 times with delay between requests
      let nutrition = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
        nutrition = await lookupNutrition(ing.name, ing.amount, ing.unit);
        if (nutrition && nutrition.calories > 0) break;
        nutrition = null; // treat all-zero response as failure
      }

      results.push(nutrition ? { ...ing, ...nutrition } : ing);
      // Small delay between ingredients to avoid Gemini API rate limits
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  };

  const handleSendToTracker = async (meal: MealPlan): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'no_user' };
    try {
      const result = await pushMealToWeightEntry(user.id, meal.date, meal);
      if (result.success) {
        setToast({ message: 'Wysłano do wpisu wagi', type: 'success' });
      } else if (result.error === 'no_entry') {
        setToast({ message: 'Najpierw dodaj wpis wagi na ten dzień', type: 'error' });
      } else if (result.error === 'duplicate') {
        setToast({ message: 'Ten posiłek już jest we wpisie wagi', type: 'error' });
      } else {
        setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      }
      return result;
    } catch {
      setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      return { success: false, error: 'supabase_error' };
    }
  };

  const handleMarkEaten = async (id: string) => {
    const meal = mealPlans.find(m => m.id === id);
    if (!meal) return;

    // 1. Deduct from pantry and get cost breakdown
    const { costs, totalCost } = await pantry.deductIngredients(meal.ingredients as MealIngredient[]);

    // 2. Save costs and mark as eaten
    const costObj: Record<string, number | null> = {};
    costs.forEach((v, k) => { costObj[k] = v; });
    await updateMealPlan(id, {
      status: 'eaten',
      estimated_cost: totalCost,
      ingredient_costs: costObj,
    });

    // 3. Sync to progress tracker
    const updatedMeal = { ...meal, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat };
    await syncToTracker(updatedMeal);
  };

  const handleSaveManualMeal = async (meal: {
    name: string; meal_slot: string; ingredients: MealIngredient[];
    calories: number; protein: number; carbs: number; fat: number; recipe_steps: string[];
  }) => {
    // Estimate cost before saving
    const { costs, totalCost } = pantry.estimateCost(meal.ingredients);
    const costObj: Record<string, number | null> = {};
    costs.forEach((v, k) => { costObj[k] = v; });

    await saveMealPlan({
      date: formatDate(new Date()),
      meal_slot: meal.meal_slot,
      name: meal.name,
      ingredients: meal.ingredients,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      recipe_steps: meal.recipe_steps,
      estimated_cost: totalCost,
      ingredient_costs: costObj,
      status: 'accepted',
      rating: null,
      rating_comment: null,
      is_favorite: false,
    });
  };

  if (resolvedView === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header — only on main views */}
        {(resolvedView === 'wizard' || resolvedView === 'interview' || resolvedView === 'dashboard') && (
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { if (onBack) onBack(); else goHome(); }}
              className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" /> Powrót
            </button>
            {resolvedView === 'dashboard' && preferences && (
              <button onClick={() => setView('settings')}
                className="p-2 text-[var(--muted)] hover:text-white" title="Ustawienia diety">
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {resolvedView === 'wizard' && (
          <MealWizard
            existingProfile={profile}
            currentWeight={latestWeight}
            onComplete={handleWizardComplete}
          />
        )}

        {resolvedView === 'interview' && (
          <MealWizardAIInterview onComplete={handleInterviewComplete} />
        )}

        {resolvedView === 'dashboard' && preferences && (
          <MealDashboard
            preferences={preferences}
            mealPlans={mealPlans}
            pantryItems={pantry.items}
            favoriteMeals={getFavorites()}
            onAcceptMeals={handleAcceptMeals}
            onUpdateMeal={updateMealPlan}
            onToggleFavorite={toggleFavorite}
            onUpdateIngredients={updateIngredients}
            onMarkEaten={handleMarkEaten}
            onSaveManualMeal={handleSaveManualMeal}
            onNavigate={(v) => setView(v as View)}
            onEstimateCost={pantry.estimateCost}
            onSendToTracker={handleSendToTracker}
          />
        )}

        {resolvedView === 'pantry' && (
          <PantryManager
            items={pantry.items}
            onAdd={pantry.addItem}
            onDelete={pantry.deleteItem}
            onBack={() => setView('dashboard')}
          />
        )}

        {resolvedView === 'shopping' && (
          <ShoppingList
            items={shopping.items}
            mealPlans={mealPlans}
            pantryItems={pantry.items}
            onToggleBought={shopping.toggleBought}
            onDelete={shopping.deleteItem}
            onClearBought={shopping.clearBought}
            onGenerate={shopping.generateFromPlans}
            onAddItem={shopping.addItem}
            onBack={() => setView('dashboard')}
          />
        )}

        {resolvedView === 'favorites' && (
          <FavoriteMeals
            favorites={getFavorites()}
            onReeat={reeatFavorite}
            onToggleFavorite={toggleFavorite}
            onBack={() => setView('dashboard')}
          />
        )}

        {resolvedView === 'preferences' && preferences && (
          <PreferencesEditor
            preferences={preferences}
            onSave={async (updates) => { await savePreferences(updates); }}
            onStartInterview={() => setView('preferences-interview')}
            onBack={() => setView('dashboard')}
          />
        )}

        {resolvedView === 'preferences-interview' && (
          <MealWizardAIInterview onComplete={async (data) => {
            await savePreferences(data);
            setView('dashboard');
          }} />
        )}

        {resolvedView === 'calendar' && preferences && (
          <MealCalendar
            mealPlans={mealPlans}
            getDaySummary={getDaySummary}
            targetCalories={preferences.target_calories}
            onNavigateToCharts={() => setView('charts')}
            onBack={() => setView('dashboard')}
          />
        )}

        {resolvedView === 'charts' && preferences && (
          <MealSummaryCharts
            mealPlans={mealPlans}
            getDaySummary={getDaySummary}
            targetCalories={preferences.target_calories}
            onBack={() => setView('calendar')}
          />
        )}

        {resolvedView === 'settings' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <button onClick={() => setView('dashboard')}
              className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Powrót
            </button>
            <h2 className="text-xl font-semibold text-white">Ustawienia</h2>
            <button onClick={() => setView('wizard' as View)}
              className="w-full bg-[var(--card-bg)] hover:bg-[var(--card-bg)] border-2 border-[var(--card-border)] hover:border-violet-500 rounded-xl p-4 text-left transition-colors">
              <p className="text-white font-medium">Dane dietetyczne</p>
              <p className="text-xs text-[var(--muted)] mt-1">Waga, wzrost, aktywność, cel kaloryczny, typ diety</p>
            </button>
            <button onClick={() => setView('preferences')}
              className="w-full bg-[var(--card-bg)] hover:bg-[var(--card-bg)] border-2 border-[var(--card-border)] hover:border-violet-500 rounded-xl p-4 text-left transition-colors">
              <p className="text-white font-medium">Preferencje kulinarne</p>
              <p className="text-xs text-[var(--muted)] mt-1">Alergie, ulubione kuchnie, Thermomix, wywiad AI</p>
            </button>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
