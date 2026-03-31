// app/components/meals/useMealAI.ts
"use client";

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ChatMessage, MealPreferences, MealPlan, PantryItem, AIGeneratedMeal } from './types';

interface UseMealAIOptions {
  preferences: MealPreferences | null;
  recentMeals: MealPlan[];
  pantryItems: PantryItem[];
  usePantryMode: boolean;
}

function buildSystemPrompt(options: UseMealAIOptions): string {
  const { preferences, recentMeals, pantryItems, usePantryMode } = options;
  if (!preferences) return 'Jesteś pomocnym asystentem kulinarnym. Odpowiadaj po polsku.';

  const lines = [
    'Jesteś osobistym asystentem kulinarnym. Odpowiadaj ZAWSZE po polsku.',
    '',
    `## Profil użytkownika`,
    `- Dieta: ${preferences.diet_type}`,
    `- Cel: ${preferences.goal_type} (${preferences.target_calories} kcal/dzień)`,
    `- Posiłki dziennie: ${preferences.meals_per_day} (${preferences.meal_names.join(', ')})`,
    `- Alergie: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'brak'}`,
    `- Nie lubi: ${preferences.disliked_foods.length > 0 ? preferences.disliked_foods.join(', ') : 'brak'}`,
    `- Lubi: ${preferences.liked_foods.length > 0 ? preferences.liked_foods.join(', ') : 'brak'}`,
    `- Kuchnie: ${preferences.cuisines.length > 0 ? preferences.cuisines.join(', ') : 'różne'}`,
    preferences.preferences_text ? `- Dodatkowe preferencje: ${preferences.preferences_text}` : '',
  ];

  if (recentMeals.length > 0) {
    lines.push('', '## Ostatnie posiłki (unikaj powtórzeń)');
    const last10 = recentMeals.slice(-10);
    for (const meal of last10) {
      const ratingStr = meal.rating ? ` — ocena: ${meal.rating}/10${meal.rating_comment ? ` (${meal.rating_comment})` : ''}` : '';
      lines.push(`- ${meal.date} ${meal.meal_slot}: ${meal.name} (${meal.calories} kcal)${ratingStr}`);
    }
  }

  if (usePantryMode && pantryItems.length > 0) {
    lines.push('', '## Dostępne produkty w spiżarni (preferuj te składniki)');
    for (const item of pantryItems.filter(i => i.quantity_remaining > 0)) {
      lines.push(`- ${item.name}: ${item.quantity_remaining} ${item.unit} (cena: ${item.price} zł za ${item.quantity_total} ${item.unit})`);
    }
  }

  lines.push(
    '',
    '## Zasady',
    '- Zawsze podaj dokładne ilości składników w gramach/ml/szt',
    '- Wylicz kalorie i makro (białko, węgle, tłuszcze) dla każdego składnika',
    '- Podaj szacunkowy koszt posiłku jeśli to możliwe',
    '- Podaj przepis krok po kroku',
    `- Dopasuj posiłek do limitu kalorycznego: ${preferences.target_calories} kcal/dzień`,
    '- Nie powtarzaj posiłków z ostatnich dni',
  );

  return lines.filter(l => l !== undefined).join('\n');
}

function buildInterviewSystemPrompt(): string {
  return [
    'Jesteś dietetykiem przeprowadzającym krótki wywiad kulinarny. Odpowiadaj po polsku.',
    'Twoim celem jest poznanie preferencji kulinarnych użytkownika.',
    'Zadaj 5-8 pytań, jedno na turę. Pytaj o:',
    '- Ulubione kuchnie (polska, włoska, azjatycka, etc.)',
    '- Czego nie lubi / czego unika',
    '- Alergie / nietolerancje',
    '- Ulubione składniki',
    '- Preferencje dotyczące pikantności, słodyczy',
    '- Ile czasu chce poświęcać na gotowanie',
    '- Czy je mięso, ryby, nabiał',
    '',
    'Po zebraniu informacji ustaw is_complete na true i zwróć podsumowanie w extracted_preferences.',
    'Bądź naturalny i konwersacyjny, nie jak formularz.',
  ].join('\n');
}

export function useMealAI(options: UseMealAIOptions) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to avoid options object in dependency array
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendMessage = useCallback(async (
    messages: { role: 'user' | 'assistant'; content: string }[],
    mode: 'chat' | 'interview' = 'chat'
  ) => {
    if (!session?.access_token) {
      setError('Brak sesji użytkownika');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const systemPrompt = mode === 'interview'
        ? buildInterviewSystemPrompt()
        : buildSystemPrompt(optionsRef.current);

      const res = await fetch('/api/meals/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages, systemPrompt, mode }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Błąd API');
      }

      const { data } = await res.json();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  return { sendMessage, isLoading, error };
}

export { buildSystemPrompt, buildInterviewSystemPrompt };
