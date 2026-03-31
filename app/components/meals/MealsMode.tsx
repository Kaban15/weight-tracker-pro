// app/components/meals/MealsMode.tsx
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MealPreferences, AIGeneratedMeal, MealIngredient } from './types';
import { useMeals } from './useMeals';
import { usePantry } from './usePantry';
import { useShoppingList } from './useShoppingList';
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
  onBack: () => void;
}

type View = 'loading' | 'wizard' | 'interview' | 'dashboard' | 'pantry' | 'shopping' | 'calendar' | 'charts' | 'settings' | 'favorites' | 'preferences' | 'preferences-interview';

export default function MealsMode({ onBack }: MealsModeProps) {
  const { user } = useAuth();
  const {
    preferences, mealPlans, isLoading,
    savePreferences, acceptMeals, updateMealPlan, getDaySummary,
    toggleFavorite, reeatFavorite, getFavorites, updateIngredients, syncToTracker,
  } = useMeals(user?.id);

  const pantry = usePantry(user?.id);
  const shopping = useShoppingList(user?.id);

  const [view, setView] = useState<View>('loading');
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
    await acceptMeals(date, meals);
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

  if (resolvedView === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header — only on main views */}
        {(resolvedView === 'wizard' || resolvedView === 'interview' || resolvedView === 'dashboard') && (
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" /> Powrót
            </button>
            {resolvedView === 'dashboard' && preferences && (
              <button onClick={() => setView('settings')}
                className="p-2 text-slate-400 hover:text-white" title="Ustawienia diety">
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
            onNavigate={(v) => setView(v as View)}
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
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Powrót
            </button>
            <h2 className="text-xl font-semibold text-white">Ustawienia</h2>
            <button onClick={() => setView('wizard' as View)}
              className="w-full bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-violet-500 rounded-xl p-4 text-left transition-colors">
              <p className="text-white font-medium">Dane dietetyczne</p>
              <p className="text-xs text-slate-400 mt-1">Waga, wzrost, aktywność, cel kaloryczny, typ diety</p>
            </button>
            <button onClick={() => setView('preferences')}
              className="w-full bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-violet-500 rounded-xl p-4 text-left transition-colors">
              <p className="text-white font-medium">Preferencje kulinarne</p>
              <p className="text-xs text-slate-400 mt-1">Alergie, ulubione kuchnie, Thermomix, wywiad AI</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
