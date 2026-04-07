import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/serverRateLimiter';
import { feedbackRequestSchema } from '@/lib/validation';
import { getServerEnv } from '@/lib/env';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Błąd',
  feature: 'Nowa funkcja',
  improvement: 'Ulepszenie',
  other: 'Inne',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const { allowed, remaining, resetTime } = checkRateLimit(request, RATE_LIMIT_CONFIGS.feedback);
  const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime, RATE_LIMIT_CONFIGS.feedback.maxRequests);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Zbyt wiele żądań. Spróbuj ponownie później.' },
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
    const rawBody = await request.json();
    const parsed = feedbackRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane wejściowe' },
        { status: 400 }
      );
    }
    const { userId, userEmail, category, message } = parsed.data;

    const env = getServerEnv();

    // Zapisz do Supabase (jeśli skonfigurowane)
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );

      await supabase.from('feedback').insert({
        user_id: userId || null,
        user_email: userEmail || 'Anonim',
        category,
        message,
      });
    }

    // Wyślij email przez Resend (jeśli skonfigurowane)
    if (env.RESEND_API_KEY && env.FEEDBACK_EMAIL) {
      const resend = new Resend(env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'Weight Tracker Pro <onboarding@resend.dev>',
        to: env.FEEDBACK_EMAIL,
        subject: `[Feedback] ${CATEGORY_LABELS[category] || category}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Nowy feedback z Weight Tracker Pro</h2>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Kategoria:</strong> ${escapeHtml(CATEGORY_LABELS[category] || category)}</p>
              <p><strong>Od:</strong> ${escapeHtml(userEmail || 'Anonim')}</p>
              <p><strong>User ID:</strong> ${escapeHtml(userId || 'Brak')}</p>
            </div>
            <div style="background: #ffffff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Wiadomość:</h3>
              <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
              Wysłano: ${new Date().toLocaleString('pl-PL')}
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas wysyłania feedbacku' },
      { status: 500 }
    );
  }
}
