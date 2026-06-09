import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ─── Send welcome email for new users (non-blocking) ─────────

async function sendWelcomeEmailIfNew(supabase, siteUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if this user already has a profile (returning user)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // If profile already exists, user is not new — skip welcome email
    if (profile) return;

    // Fire welcome email via the internal email API
    const emailUrl = `${siteUrl}/api/email`;
    await fetch(emailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        template: 'welcome',
        data: {
          name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0],
        },
      }),
    });
  } catch (err) {
    // Don't block auth flow if email fails
    console.error('[auth/callback] Welcome email error:', err);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';
  const type = searchParams.get('type');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this is a password recovery, redirect to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${siteUrl}/auth/reset-password`);
      }

      // Send welcome email for new users (non-blocking)
      sendWelcomeEmailIfNew(supabase, siteUrl);

      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=auth_failed`);
}
