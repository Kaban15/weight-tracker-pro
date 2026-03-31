// app/components/meals/MealsMode.tsx
"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MealPreferences, AIGeneratedMeal, MealPlan } from './types';
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

interface MealsModeProps {
  onBack: () => void;
}

type View = 'loading' | 'wizard' | 'interview' | 'dashboard' | 'pantry' | 'shopping' | 'calendar' | 'charts' | 'settings';

export default function MealsMode({ onBack }: MealsModeProps) {
  const { user } = useAuth();
  const {
    preferences, mealPlans, isLoading,
    savePreferences, acceptMeals, updateMealPlan, deleteMealPlan, getDaySummary, loadMealPlans,
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

  // Update view when loading completes
  useEffect(() => {
    if (!isLoading && view === 'loading') {
      if (!preferences || !preferences.onboarding_completed) {
        setView('wizard');
      } else {
        setView('dashboard');
      }
    }
  }, [isLoading, preferences, view]);

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
    // Deduct from pantry if any
    for (const meal of meals) {
      await pantry.deductIngredients(meal.ingredients as any);
    }
  };

  if (view === 'loading' || isLoading) {
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
        {(view === 'wizard' || view === 'interview' || view === 'dashboard') && (
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" /> Powrót
            </button>
            {view === 'dashboard' && preferences && (
              <button onClick={() => setView('settings')}
                className="p-2 text-slate-400 hover:text-white" title="Ustawienia diety">
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {view === 'wizard' && (
          <MealWizard
            existingProfile={profile}
            currentWeight={latestWeight}
            onComplete={handleWizardComplete}
          />
        )}

        {view === 'interview' && (
          <MealWizardAIInterview onComplete={handleInterviewComplete} />
        )}

        {view === 'dashboard' && preferences && (
          <MealDashboard
            preferences={preferences}
            mealPlans={mealPlans}
            pantryItems={pantry.items}
            onAcceptMeals={handleAcceptMeals}
            onUpdateMeal={updateMealPlan}
            onDeleteMeal={deleteMealPlan}
            onNavigate={(v) => setView(v as View)}
          />
        )}

        {view === 'pantry' && (
          <PantryManager
            items={pantry.items}
            onAdd={pantry.addItem}
            onDelete={pantry.deleteItem}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'shopping' && (
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

        {view === 'calendar' && preferences && (
          <MealCalendar
            mealPlans={mealPlans}
            getDaySummary={getDaySummary}
            targetCalories={preferences.target_calories}
            onNavigateToCharts={() => setView('charts')}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'charts' && preferences && (
          <MealSummaryCharts
            mealPlans={mealPlans}
            getDaySummary={getDaySummary}
            targetCalories={preferences.target_calories}
            onBack={() => setView('calendar')}
          />
        )}

        {view === 'settings' && (
          <MealWizard
            existingProfile={profile}
            currentWeight={latestWeight}
            onComplete={async (data) => {
              await savePreferences(data);
              setView('dashboard');
            }}
          />
        )}
      </div>
    </div>
  );
}
