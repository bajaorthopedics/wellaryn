import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/profile?whoop=error`);
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = `${origin}/api/whoop/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      console.error('WHOOP token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${origin}/dashboard/profile?whoop=error`);
    }

    const tokens = await tokenRes.json();

    // Create Supabase server client to verify auth and store tokens
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(`${origin}/dashboard/profile?whoop=error`);
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString();

    await supabase.from('wearable_connections').upsert({
      user_id: session.user.id,
      provider: 'whoop',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      scopes: 'read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

    return NextResponse.redirect(`${origin}/dashboard/profile?whoop=connected`);
  } catch (err) {
    console.error('WHOOP callback error:', err);
    return NextResponse.redirect(`${origin}/dashboard/profile?whoop=error`);
  }
}
