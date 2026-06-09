import { NextResponse } from 'next/server';
import {
  welcomeEmail,
  weeklyReportEmail,
  passwordResetEmail,
  subscriptionConfirmationEmail,
} from '@/lib/email-templates';

// ─── Validate RESEND_API_KEY on startup ──────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = 'Wellaryn <hello@wellaryn.com>';

// ─── Template registry ───────────────────────────────────────

const TEMPLATES = {
  welcome: welcomeEmail,
  weekly_report: weeklyReportEmail,
  password_reset: passwordResetEmail,
  subscription_confirmation: subscriptionConfirmationEmail,
};

// ─── POST handler ────────────────────────────────────────────

export async function POST(request) {
  // 1. Check for Resend API key
  if (!RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY is not set');
    return NextResponse.json(
      { error: 'Email service is not configured. Missing RESEND_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { to, template, data } = body;

    // 2. Validate required fields
    if (!to || !template) {
      return NextResponse.json(
        { error: 'Missing required fields: "to" and "template"' },
        { status: 400 }
      );
    }

    // 3. Resolve template
    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      return NextResponse.json(
        { error: `Unknown template: "${template}". Valid templates: ${Object.keys(TEMPLATES).join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Generate email content
    const { subject, html } = templateFn(data || {});

    // 5. Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[email] Resend API error:', resendData);
      return NextResponse.json(
        { error: 'Failed to send email', details: resendData },
        { status: resendResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: resendData.id,
    });
  } catch (err) {
    console.error('[email] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
