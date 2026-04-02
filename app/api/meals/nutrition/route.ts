// app/api/meals/nutrition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/serverRateLimiter';
import { nutritionSchema } from '@/app/components/meals/types';
import { zodResponseFormat } from 'openai/helpers/zod';

const NUTRITION_RATE_LIMIT = { maxRequests: 60, windowMs: 86400000 } as const; // 60/day

function getAIClient() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      model: 'gemini-2.0-flash',
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      model: 'gpt-4o-mini',
    };
  }

  throw new Error('No AI API key configured (GEMINI_API_KEY or OPENAI_API_KEY)');
}

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetTime } = checkRateLimit(request, NUTRITION_RATE_LIMIT);
  const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime, NUTRITION_RATE_LIMIT.maxRequests);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Przekroczono dzienny limit zapytań. Spróbuj jutro.' },
      { status: 429, headers: Object.fromEntries(rateLimitHeaders.entries()) }
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 });
    }

    const { name, amount, unit } = await request.json();
    if (!name || !amount || !unit) {
      return NextResponse.json({ error: 'Brak wymaganych pól: name, amount, unit' }, { status: 400 });
    }

    const { client, model } = getAIClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem od wartości odżywczych. Podaj dokładne wartości odżywcze dla podanego produktu spożywczego. Wartości muszą być realistyczne i niezerowe (chyba że to woda/przyprawy). Odpowiadaj w formacie JSON.',
        },
        {
          role: 'user',
          content: `Podaj wartości odżywcze dla: ${name} — ${amount} ${unit}. Zwróć: calories (kcal), protein (g), carbs (g), fat (g).`,
        },
      ],
      response_format: zodResponseFormat(nutritionSchema, 'nutrition_response'),
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Brak odpowiedzi AI' }, { status: 500 });
    }

    const parsed = nutritionSchema.parse(JSON.parse(content));

    return NextResponse.json({ data: parsed }, {
      headers: Object.fromEntries(rateLimitHeaders.entries()),
    });
  } catch (error) {
    console.error('Nutrition lookup error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas wyliczania wartości odżywczych' },
      { status: 500 }
    );
  }
}
