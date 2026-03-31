// app/api/meals/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders, MEALS_RATE_LIMIT } from '@/lib/serverRateLimiter';
import { aiMealSchema, aiInterviewSchema } from '@/app/components/meals/types';
import { zodResponseFormat } from 'openai/helpers/zod';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const { allowed, remaining, resetTime } = checkRateLimit(request, MEALS_RATE_LIMIT);
  const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime, MEALS_RATE_LIMIT.maxRequests);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Przekroczono dzienny limit zapytań AI. Spróbuj jutro.' },
      {
        status: 429,
        headers: {
          ...Object.fromEntries(rateLimitHeaders.entries()),
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, systemPrompt, mode } = body;
    // mode: 'chat' (meal suggestions) or 'interview' (onboarding)

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 });
    }

    const schema = mode === 'interview' ? aiInterviewSchema : aiMealSchema;

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'Jesteś pomocnym asystentem kulinarnym. Odpowiadaj po polsku.' },
        ...messages,
      ],
      response_format: zodResponseFormat(schema, mode === 'interview' ? 'interview_response' : 'meal_response'),
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Brak odpowiedzi AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      data: parsed,
      usage: response.usage,
    }, {
      headers: Object.fromEntries(rateLimitHeaders.entries()),
    });
  } catch (error) {
    console.error('Meals AI error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas komunikacji z AI' },
      { status: 500 }
    );
  }
}
