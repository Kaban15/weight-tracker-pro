// app/components/meals/MealDashboard.tsx
"use client";

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Package, BarChart3, ToggleLeft, ToggleRight, Heart, PlusCircle } from 'lucide-react';
import { MealPlan, MealPreferences, MealIngredient, PantryItem, ChatMessage, AIGeneratedMeal, formatDate } from './types';
import { useMealAI } from './useMealAI';
import MealCard from './MealCard';
import MealChat from './MealChat';
import ManualMealModal from './ManualMealModal';

interface MealDashboardProps {
  preferences: MealPreferences;
  mealPlans: MealPlan[];
  pantryItems: PantryItem[];
  onAcceptMeals: (date: string, meals: AIGeneratedMeal[]) => void;
  onUpdateMeal: (id: string, updates: Partial<MealPlan>) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateIngredients: (id: string, ingredients: MealIngredient[]) => void;
  onMarkEaten: (id: string) => void;
  onSaveManualMeal: (meal: { name: string; meal_slot: string; ingredients: MealIngredient[]; calories: number; protein: number; carbs: number; fat: number; recipe_steps: string[] }) => void;
  favoriteMeals: MealPlan[];
  onNavigate: (view: 'pantry' | 'shopping' | 'calendar' | 'settings' | 'favorites' | 'preferences') => void;
}

type GenerateScope = 'today' | 'tomorrow' | '3days' | 'week';

export default function MealDashboard({
  preferences,
  mealPlans,
  pantryItems,
  onAcceptMeals,
  onUpdateMeal,
  onToggleFavorite,
  onUpdateIngredients,
  onMarkEaten,
  onSaveManualMeal,
  favoriteMeals,
  onNavigate,
}: MealDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [usePantryMode, setUsePantryMode] = useState(false);
  const [showManualMeal, setShowManualMeal] = useState(false);

  const recentMeals = mealPlans.filter(m => m.status === 'eaten').slice(-10);

  const { sendMessage, isLoading, error } = useMealAI({
    preferences,
    recentMeals,
    favoriteMeals,
    pantryItems,
    usePantryMode,
  });

  const dayMeals = mealPlans.filter(m => m.date === selectedDate);

  const dayTotals = {
    calories: dayMeals.reduce((s, m) => s + m.calories, 0),
    protein: dayMeals.reduce((s, m) => s + m.protein, 0),
    carbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
    fat: dayMeals.reduce((s, m) => s + m.fat, 0),
    cost: dayMeals.reduce((s, m) => s + (m.estimated_cost || 0), 0),
  };

  const handleGenerate = async (scope: GenerateScope) => {
    const scopeLabels: Record<GenerateScope, string> = {
      today: 'na dziś',
      tomorrow: 'na jutro',
      '3days': 'na 3 dni',
      week: 'na tydzień',
    };

    const userMsg = `Zaproponuj posiłki ${scopeLabels[scope]}. Dopasuj do mojego limitu ${preferences.target_calories} kcal/dzień, ${preferences.meals_per_day} posiłków: ${preferences.meal_names.join(', ')}.`;

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: userMsg, timestamp: new Date().toISOString() },
    ];
    setChatMessages(newMessages);

    const apiMessages = newMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const response = await sendMessage(apiMessages, 'chat');

    if (response) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        meal_data: response.meals?.length > 0 ? response.meals[0] : null,
      }]);

      // Auto-save generated meals as 'planned'
      if (response.meals?.length > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDate = scope === 'tomorrow'
          ? formatDate(tomorrow)
          : selectedDate;
        onAcceptMeals(targetDate, response.meals);
      }
    }
  };

  const handleChatSend = async (text: string) => {
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: text, timestamp: new Date().toISOString() },
    ];
    setChatMessages(newMessages);

    const apiMessages = newMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const response = await sendMessage(apiMessages, 'chat');

    if (response) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        meal_data: response.meals?.length > 0 ? response.meals[0] : null,
      }]);

      if (response.meals?.length > 0) {
        onAcceptMeals(selectedDate, response.meals);
      }
    }
  };

  const handleRate = (id: string, rating: number, comment: string) => {
    onUpdateMeal(id, { rating, rating_comment: comment, status: 'eaten' });
  };

  const handleReplace = (meal: MealPlan) => {
    handleChatSend(`Zamień "${meal.name}" (${meal.meal_slot}) na coś innego.`);
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="p-1 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">
            {isToday ? 'Dziś' : selectedDate}
          </span>
          <button onClick={() => navigateDate(1)} className="p-1 text-slate-400 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setUsePantryMode(!usePantryMode)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              usePantryMode ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
            }`}>
            {usePantryMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Z tego co mam
          </button>
          <button onClick={() => onNavigate('favorites')}
            className="p-2 text-slate-400 hover:text-white" title="Ulubione">
            <Heart className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('pantry')}
            className="p-2 text-slate-400 hover:text-white" title="Spiżarnia">
            <Package className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('shopping')}
            className="p-2 text-slate-400 hover:text-white" title="Lista zakupów">
            <ShoppingCart className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('calendar')}
            className="p-2 text-slate-400 hover:text-white" title="Historia">
            <CalendarDays className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('settings')}
            className="p-2 text-slate-400 hover:text-white" title="Podsumowania">
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day summary bar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex gap-4">
          <span className="text-emerald-400 font-medium">{Math.round(dayTotals.calories)} / {Math.round(preferences.target_calories)} kcal</span>
          <span className="text-blue-400">B: {Math.round(dayTotals.protein)}g</span>
          <span className="text-amber-400">W: {Math.round(dayTotals.carbs)}g</span>
          <span className="text-red-400">T: {Math.round(dayTotals.fat)}g</span>
        </div>
        <span className="text-slate-400">{dayTotals.cost.toFixed(2)} zł</span>
      </div>

      {/* Generate buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['today', 'tomorrow', '3days', 'week'] as GenerateScope[]).map(scope => (
          <button key={scope} onClick={() => handleGenerate(scope)} disabled={isLoading}
            className="flex items-center gap-1 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-sm rounded-lg transition-colors disabled:opacity-30">
            <Sparkles className="w-4 h-4" />
            {{ today: 'Na dziś', tomorrow: 'Na jutro', '3days': 'Na 3 dni', week: 'Na tydzień' }[scope]}
          </button>
        ))}
        <button onClick={() => setShowManualMeal(true)}
          className="flex items-center gap-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm rounded-lg transition-colors">
          <PlusCircle className="w-4 h-4" /> Dodaj ręcznie
        </button>
      </div>

      {/* Meal cards */}
      <div className="space-y-3">
        {dayMeals.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Brak zaplanowanych posiłków na ten dzień.</p>
            <p className="text-xs mt-1">Kliknij przycisk powyżej lub napisz w czacie.</p>
          </div>
        )}

        {dayMeals.map(meal => (
          <MealCard key={meal.id} meal={meal}
            onRate={handleRate}
            onReplace={handleReplace}
            onAccept={id => onUpdateMeal(id, { status: 'accepted' })}
            onReject={id => onUpdateMeal(id, { status: 'rejected' })}
            onMarkEaten={onMarkEaten}
            onToggleFavorite={onToggleFavorite}
            onUpdateIngredients={onUpdateIngredients}
          />
        ))}
      </div>

      {/* Chat */}
      <MealChat
        messages={chatMessages}
        onSend={handleChatSend}
        isLoading={isLoading}
        error={error}
      />

      {/* Manual meal modal */}
      <ManualMealModal
        isOpen={showManualMeal}
        onClose={() => setShowManualMeal(false)}
        onSave={(meal) => onSaveManualMeal(meal)}
        mealSlots={preferences.meal_names}
      />
    </div>
  );
}
