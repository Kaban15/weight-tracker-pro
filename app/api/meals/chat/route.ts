// app/api/meals/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders, MEALS_RATE_LIMIT } from '@/lib/serverRateLimiter';
import { aiMealSchema, aiInterviewSchema } from '@/app/components/meals/types';
import { zodResponseFormat } from 'openai/helpers/zod';

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

    const { client, model } = getAIClient();

    const response = await client.chat.completions.create({
      model,
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
