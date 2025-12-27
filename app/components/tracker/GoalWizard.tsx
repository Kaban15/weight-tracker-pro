"use client";

import { useState } from 'react';
import { X, Scale, Target, TrendingDown, Clock, Flame, Footprints, Dumbbell, FileText, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { Goal, Profile, formatDate } from './types';

interface GoalWizardProps {
  isOpen: boolean;
  goal?: Goal | null;
  profile?: Profile | null;
  onSave: (goal: Omit<Goal, 'id'>) => Promise<boolean>;
  onSaveProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  onReset: (deleteEntries: boolean) => Promise<boolean>;
  onClose: () => void;
}

export default function GoalWizard({
  isOpen,
  goal,
  profile,
  onSave,
  onSaveProfile,
  onReset,
  onClose
}: GoalWizardProps) {
  const [step, setStep] = useState(1);
  const [currentWeightInput, setCurrentWeightInput] = useState(goal?.current_weight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(goal?.target_weight?.toString() || '');
  const [targetDate, setTargetDate] = useState(goal?.target_date || '');
  const [startDate, setStartDate] = useState(goal?.start_date || formatDate(new Date()));
  const [weeklyWeightLoss, setWeeklyWeightLoss] = useState(goal?.weekly_weight_loss?.toString() || '');
  const [dailyCalories, setDailyCalories] = useState(goal?.daily_calories_limit?.toString() || '');
  const [dailySteps, setDailySteps] = useState(goal?.daily_steps_goal?.toString() || '');
  const [weeklyTraining, setWeeklyTraining] = useState(goal?.weekly_training_hours?.toString() || '');
  const [monitoringMethod, setMonitoringMethod] = useState(goal?.monitoring_method || '');
  const [saving, setSaving] = useState(false);
  const [dateMode, setDateMode] = useState<'date' | 'days' | 'weeks' | 'months'>('date');
  const [durationValue, setDurationValue] = useState('');

  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level?.toString() || '1.2');
  const [dateError, setDateError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validate dates
  const validateDates = (): boolean => {
    if (!startDate || !targetDate) {
      setDateError('Wybierz obie daty');
      return false;
    }
    const start = new Date(startDate);
    const end = new Date(targetDate);
    if (end <= start) {
      setDateError('Data końcowa musi być późniejsza niż data startu');
      return false;
    }
    setDateError(null);
    return true;
  };

  const cw = parseFloat(currentWeightInput) || 0;
  const tw = parseFloat(targetWeight) || 0;
  const totalLoss = cw - tw;

  const calculateTDEE = () => {
    const w = cw;
    const h = parseFloat(height) || 0;
    const a = parseInt(age) || 0;
    const activity = parseFloat(activityLevel) || 1.2;
    const steps = parseInt(dailySteps) || 0;

    if (!w || !h || !a) return null;

    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    let tdee = bmr * activity;
    const stepsCalories = steps * 0.04;
    tdee += stepsCalories;

    const weeklyLoss = parseFloat(weeklyWeightLoss) || 0;
    const dailyDeficit = (weeklyLoss * 7700) / 7;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      stepsCalories: Math.round(stepsCalories),
      dailyDeficit: Math.round(dailyDeficit),
      targetCalories: Math.round(tdee - dailyDeficit),
    };
  };

  const calorieData = calculateTDEE();

  const calculateWeeklyLoss = () => {
    if (!targetDate || !startDate || totalLoss <= 0) return '';
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const weeks = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
    if (weeks <= 0) return '';
    return (totalLoss / weeks).toFixed(2);
  };

  const calculateDateFromDuration = (value: string, mode: 'days' | 'weeks' | 'months') => {
    if (!value || !startDate || totalLoss <= 0) return;
    const num = parseInt(value);
    if (num <= 0) return;

    const start = new Date(startDate);
    const end = new Date(startDate);
    if (mode === 'days') end.setDate(end.getDate() + num);
    else if (mode === 'weeks') end.setDate(end.getDate() + num * 7);
    else if (mode === 'months') end.setMonth(end.getMonth() + num);

    setTargetDate(formatDate(end));
    const weeks = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
    if (weeks > 0) setWeeklyWeightLoss((totalLoss / weeks).toFixed(2));
  };

  const handleSave = async () => {
    if (!validateDates()) return;
    if (cw > 0 && tw > 0 && targetDate && startDate) {
      setSaving(true);

      if (age || height) {
        await onSaveProfile({
          age: age ? parseInt(age) : undefined,
          gender: gender,
          height: height ? parseFloat(height) : undefined,
          activity_level: parseFloat(activityLevel),
        });
      }

      const success = await onSave({
        current_weight: cw,
        target_weight: tw,
        target_date: targetDate,
        start_date: startDate,
        weekly_weight_loss: weeklyWeightLoss ? parseFloat(weeklyWeightLoss) : undefined,
        daily_calories_limit: dailyCalories ? parseInt(dailyCalories) : undefined,
        daily_steps_goal: dailySteps ? parseInt(dailySteps) : undefined,
        weekly_training_hours: weeklyTraining ? parseFloat(weeklyTraining) : undefined,
        monitoring_method: monitoringMethod || undefined,
      });

      setSaving(false);
      if (success) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border-2 border-emerald-500/20 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {step === 1 && 'Krok 1: Cel wagowy'}
            {step === 2 && 'Krok 2: Plan tygodniowy'}
            {step === 3 && 'Krok 3: Zasady dzienne'}
            {step === 4 && 'Krok 4: Monitorowanie'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                <Scale className="w-4 h-4 text-emerald-400" />
                Aktualna waga (kg) *
              </label>
              <input type="number" step="0.1" value={currentWeightInput} onChange={(e) => setCurrentWeightInput(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                <Target className="w-4 h-4 text-amber-400" />
                Waga docelowa (kg) *
              </label>
              <input type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
            </div>

            {totalLoss > 0 && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400">
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Do zrzucenia: <strong>{totalLoss.toFixed(1)} kg</strong>
                </p>
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!currentWeightInput || !targetWeight || cw <= tw}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
              Dalej
            </button>

            {goal?.id && (
              <div className="pt-4 mt-4 border-t border-slate-700">
                <p className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Strefa niebezpieczna
                </p>
                <div className="space-y-2">
                  <button onClick={() => onReset(false)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 px-4 rounded-xl transition-colors text-sm">
                    <RotateCcw className="w-4 h-4" />
                    Resetuj plan (zachowaj wpisy)
                  </button>
                  <button onClick={() => onReset(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2 px-4 rounded-xl transition-colors text-sm border border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                    Usuń plan i wszystkie wpisy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Data startu *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-3">Wybierz sposób planowania:</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-2 font-semibold">Tempo: kg na tydzień</label>
                  <input type="number" step="0.1" value={weeklyWeightLoss}
                    onChange={(e) => {
                      setWeeklyWeightLoss(e.target.value);
                      if (e.target.value && startDate && totalLoss > 0) {
                        const weeks = totalLoss / parseFloat(e.target.value);
                        const end = new Date(startDate);
                        end.setDate(end.getDate() + Math.ceil(weeks * 7));
                        setTargetDate(formatDate(end));
                      }
                    }}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                </div>

                <p className="text-center text-slate-500">lub</p>

                <div>
                  <label className="block text-slate-300 mb-2 font-semibold">Data końcowa</label>
                  <div className="flex gap-2 mb-3">
                    {[
                      { id: 'date', label: 'Data' },
                      { id: 'days', label: 'Dni' },
                      { id: 'weeks', label: 'Tygodnie' },
                      { id: 'months', label: 'Miesiące' },
                    ].map(({ id, label }) => (
                      <button key={id} type="button"
                        onClick={() => { setDateMode(id as typeof dateMode); setDurationValue(''); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          dateMode === id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {dateMode === 'date' ? (
                    <input type="date" value={targetDate}
                      onChange={(e) => {
                        setTargetDate(e.target.value);
                        const calculated = calculateWeeklyLoss();
                        if (calculated) setWeeklyWeightLoss(calculated);
                      }}
                      className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input type="number" value={durationValue}
                        onChange={(e) => { setDurationValue(e.target.value); if (e.target.value) calculateDateFromDuration(e.target.value, dateMode); }}
                        className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
                      <span className="text-slate-400 text-sm min-w-[80px]">
                        {dateMode === 'days' && 'dni'}
                        {dateMode === 'weeks' && 'tygodni'}
                        {dateMode === 'months' && 'miesięcy'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {weeklyWeightLoss && targetDate && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-sm">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Plan: <strong>-{weeklyWeightLoss} kg/tydzień</strong> do {new Date(targetDate).toLocaleDateString('pl-PL')}
                </p>
              </div>
            )}

            {dateError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{dateError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">Wstecz</button>
              <button onClick={() => { if (validateDates()) setStep(3); }} disabled={!targetDate || !startDate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">Dalej</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm mb-2">Podaj dane do obliczenia zapotrzebowania kalorycznego:</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-2 font-semibold text-sm">Wiek (lata)</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-slate-300 mb-2 font-semibold text-sm">Wzrost (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold text-sm">Płeć</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setGender('male')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${gender === 'male' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  Mężczyzna
                </button>
                <button type="button" onClick={() => setGender('female')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${gender === 'female' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  Kobieta
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold text-sm">Poziom aktywności</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none">
                <option value="1.2">Siedzący (praca biurowa)</option>
                <option value="1.375">Lekko aktywny (1-2 treningi/tydz.)</option>
                <option value="1.55">Umiarkowanie aktywny (3-4 treningi/tydz.)</option>
                <option value="1.725">Bardzo aktywny (5-6 treningów/tydz.)</option>
                <option value="1.9">Ekstremalnie aktywny</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                  <Footprints className="w-4 h-4 text-blue-400" />
                  Cel kroków/dzień
                </label>
                <input type="number" value={dailySteps} onChange={(e) => setDailySteps(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                  <Dumbbell className="w-4 h-4 text-purple-400" />
                  Trening h/tydz.
                </label>
                <input type="number" step="0.5" value={weeklyTraining} onChange={(e) => setWeeklyTraining(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
              </div>
            </div>

            {calorieData && (
              <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl space-y-3">
                <p className="text-orange-400 font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Obliczone zapotrzebowanie
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-400">BMR:</div>
                  <div className="text-white font-medium">{calorieData.bmr} kcal</div>
                  <div className="text-slate-400">TDEE:</div>
                  <div className="text-white font-medium">{calorieData.tdee} kcal</div>
                  <div className="text-slate-400">Deficyt:</div>
                  <div className="text-red-400 font-medium">-{calorieData.dailyDeficit} kcal</div>
                </div>
                <div className="pt-3 border-t border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-bold">Twój limit:</span>
                    <span className="text-2xl font-bold text-white">{calorieData.targetCalories} kcal</span>
                  </div>
                  <button type="button" onClick={() => setDailyCalories(calorieData.targetCalories.toString())}
                    className="w-full mt-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 rounded-xl transition-colors text-sm">
                    Użyj tej wartości
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold text-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                Dzienny limit kalorii
              </label>
              <input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">Wstecz</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">Dalej</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                <FileText className="w-4 h-4 text-slate-400" />
                Metoda monitorowania
              </label>
              <textarea value={monitoringMethod} onChange={(e) => setMonitoringMethod(e.target.value)} rows={4}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none resize-none" />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2 text-sm">
              <p className="text-slate-400 font-semibold mb-2">Podsumowanie planu:</p>
              <p className="text-white">Cel: {currentWeightInput} kg → {targetWeight} kg</p>
              <p className="text-white">Tempo: -{weeklyWeightLoss || '?'} kg/tydzień</p>
              <p className="text-white">Data: {startDate && new Date(startDate).toLocaleDateString('pl-PL')} → {targetDate && new Date(targetDate).toLocaleDateString('pl-PL')}</p>
              {dailyCalories && <p className="text-orange-400">Kalorie: {dailyCalories}/dzień</p>}
              {dailySteps && <p className="text-blue-400">Kroki: {parseInt(dailySteps).toLocaleString()}/dzień</p>}
              {weeklyTraining && <p className="text-purple-400">Trening: {weeklyTraining}h/tydzień</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">Wstecz</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Zapisz plan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
