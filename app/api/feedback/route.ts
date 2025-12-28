import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Błąd',
  feature: 'Nowa funkcja',
  improvement: 'Ulepszenie',
  other: 'Inne',
};

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, category, message } = await request.json();

    if (!category || !message) {
      return NextResponse.json(
        { error: 'Kategoria i wiadomość są wymagane' },
        { status: 400 }
      );
    }

    // Zapisz do Supabase (jeśli skonfigurowane)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { error: dbError } = await supabase.from('feedback').insert({
        user_id: userId || null,
        user_email: userEmail || 'Anonim',
        category,
        message,
      });

      if (dbError) {
        console.error('Supabase error:', dbError);
      }
    }

    // Wyślij email przez Resend (jeśli skonfigurowane)
    if (process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { error: emailError } = await resend.emails.send({
        from: 'Weight Tracker Pro <onboarding@resend.dev>',
        to: process.env.FEEDBACK_EMAIL,
        subject: `[Feedback] ${CATEGORY_LABELS[category] || category}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Nowy feedback z Weight Tracker Pro</h2>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Kategoria:</strong> ${CATEGORY_LABELS[category] || category}</p>
              <p><strong>Od:</strong> ${userEmail || 'Anonim'}</p>
              <p><strong>User ID:</strong> ${userId || 'Brak'}</p>
            </div>
            <div style="background: #ffffff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Wiadomość:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
              Wysłano: ${new Date().toLocaleString('pl-PL')}
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error('Resend error:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas wysyłania feedbacku' },
      { status: 500 }
    );
  }
}
