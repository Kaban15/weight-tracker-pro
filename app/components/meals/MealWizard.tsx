"use client";

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { calculateBMR, calculateTDEE, calculateTargetCalories, ACTIVITY_LEVELS, GOAL_TYPES } from '@/lib/tdee';
import { DIET_TYPES, DEFAULT_MEAL_NAMES, MEALS_PER_DAY_OPTIONS } from './constants';
import { DietType, GoalType, MealPreferences } from './types';

interface MealWizardProps {
  existingProfile: { age?: number; gender?: 'male' | 'female'; height?: number } | null;
  currentWeight: number | null;
  onComplete: (data: Partial<MealPreferences>) => void;
}

interface WizardData {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activityLevel: number;
  dietType: DietType;
  goalType: GoalType;
  calorieAdjustment: number;
  mealsPerDay: number;
  mealNames: string[];
  customTdee: number | null;
}

const STEPS = ['Dane podstawowe', 'Aktywność', 'Dieta i cel', 'Posiłki', 'Podsumowanie'];

export default function MealWizard({ existingProfile, currentWeight, onComplete }: MealWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    age: existingProfile?.age || 30,
    gender: existingProfile?.gender || 'male',
    height: existingProfile?.height || 175,
    weight: currentWeight || 80,
    activityLevel: 1.55,
    dietType: 'standard',
    goalType: 'maintain',
    calorieAdjustment: 0,
    mealsPerDay: 4,
    mealNames: [...DEFAULT_MEAL_NAMES],
    customTdee: null,
  });

  const bmr = calculateBMR(data.weight, data.height, data.age, data.gender);
  const tdee = data.customTdee || calculateTDEE(bmr, data.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, data.calorieAdjustment);

  const handleComplete = () => {
    onComplete({
      diet_type: data.dietType,
      goal_type: data.goalType,
      calorie_adjustment: data.calorieAdjustment,
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      meals_per_day: data.mealsPerDay,
      meal_names: data.mealNames,
      custom_tdee: data.customTdee,
    });
  };

  const canProceed = () => {
    if (step === 0) return data.age > 0 && data.height > 0 && data.weight > 0;
    return true;
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-violet-500' : 'bg-slate-700'}`} />
            <p className={`text-xs mt-1 ${i === step ? 'text-violet-400' : 'text-slate-500'}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* Step 0: Basic data */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Dane podstawowe</h2>
          <p className="text-slate-400 text-sm">Te dane posłużą do obliczenia Twojego dziennego zapotrzebowania kalorycznego.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Wiek</label>
              <input type="number" value={data.age} onChange={e => setData(d => ({ ...d, age: +e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Płeć</label>
              <select value={data.gender} onChange={e => setData(d => ({ ...d, gender: e.target.value as 'male' | 'female' }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="male">Mężczyzna</option>
                <option value="female">Kobieta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Wzrost (cm)</label>
              <input type="number" value={data.height} onChange={e => setData(d => ({ ...d, height: +e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Waga (kg)</label>
              <input type="number" value={data.weight} onChange={e => setData(d => ({ ...d, weight: +e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Activity */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Poziom aktywności</h2>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(level => (
              <button key={level.value} onClick={() => setData(d => ({ ...d, activityLevel: level.value }))}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  data.activityLevel === level.value
                    ? 'border-violet-500 bg-violet-500/10 text-white'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                }`}>
                {level.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Diet & goal */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Typ diety</h2>
            <div className="grid grid-cols-2 gap-2">
              {DIET_TYPES.map(diet => (
                <button key={diet.value} onClick={() => setData(d => ({ ...d, dietType: diet.value as DietType }))}
                  className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                    data.dietType === diet.value
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}>
                  {diet.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Cel</h2>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPES.map(goal => (
                <button key={goal.value} onClick={() => setData(d => ({
                  ...d,
                  goalType: goal.value as GoalType,
                  calorieAdjustment: goal.defaultAdjustment,
                }))}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    data.goalType === goal.value
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}>
                  {goal.label}
                </button>
              ))}
            </div>

            {data.goalType !== 'maintain' && (
              <div className="mt-4">
                <label className="block text-sm text-slate-400 mb-1">
                  Dostosowanie ({data.calorieAdjustment > 0 ? '+' : ''}{data.calorieAdjustment} kcal/dzień)
                </label>
                <input type="range"
                  min={data.goalType === 'loss' ? -1000 : 100}
                  max={data.goalType === 'loss' ? -200 : 1000}
                  step={50}
                  value={data.calorieAdjustment}
                  onChange={e => setData(d => ({ ...d, calorieAdjustment: +e.target.value }))}
                  className="w-full accent-violet-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{data.goalType === 'loss' ? '-1000' : '+100'}</span>
                  <span>{data.goalType === 'loss' ? '-200' : '+1000'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Meals per day */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Posiłki dziennie</h2>
          <div className="flex gap-2">
            {MEALS_PER_DAY_OPTIONS.map(n => (
              <button key={n} onClick={() => {
                const names = DEFAULT_MEAL_NAMES.slice(0, Math.min(n, DEFAULT_MEAL_NAMES.length));
                while (names.length < n) names.push(`Posiłek ${names.length + 1}`);
                setData(d => ({ ...d, mealsPerDay: n, mealNames: names }));
              }}
                className={`flex-1 p-3 rounded-lg border-2 text-lg font-bold transition-colors ${
                  data.mealsPerDay === n
                    ? 'border-violet-500 bg-violet-500/10 text-white'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300'
                }`}>
                {n}
              </button>
            ))}
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-sm text-slate-400">Nazwy posiłków (możesz zmienić):</p>
            {data.mealNames.map((name, i) => (
              <input key={i} value={name}
                onChange={e => {
                  const names = [...data.mealNames];
                  names[i] = e.target.value;
                  setData(d => ({ ...d, mealNames: names }));
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Podsumowanie</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">BMR</span>
              <span className="text-white font-medium">{Math.round(bmr)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">TDEE</span>
              <span className="text-white font-medium">{Math.round(tdee)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cel kaloryczny</span>
              <span className="text-violet-400 font-bold text-lg">{Math.round(targetCalories)} kcal/dzień</span>
            </div>
            <hr className="border-slate-700" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Dieta</span>
              <span className="text-white">{DIET_TYPES.find(d => d.value === data.dietType)?.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Posiłki</span>
              <span className="text-white">{data.mealsPerDay}× ({data.mealNames.join(', ')})</span>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
            <label className="block text-sm text-slate-400 mb-1">Nadpisz TDEE ręcznie (opcjonalne)</label>
            <input type="number" placeholder="np. 2200"
              value={data.customTdee || ''}
              onChange={e => setData(d => ({ ...d, customTdee: e.target.value ? +e.target.value : null }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Wstecz
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-30 transition-colors">
            Dalej <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
            <Check className="w-4 h-4" /> Rozpocznij wywiad
          </button>
        )}
      </div>
    </div>
  );
}
