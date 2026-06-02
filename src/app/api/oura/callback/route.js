import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${protocol}://${host}`;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/profile?oura=error`);
  }

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = `${origin}/api/oura/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://api.ouraring.com/oauth/token', {
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
      console.error('Oura token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${origin}/dashboard/profile?oura=error`);
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
      return NextResponse.redirect(`${origin}/dashboard/profile?oura=error`);
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString();

    await supabase.from('wearable_connections').upsert({
      user_id: session.user.id,
      provider: 'oura',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      scopes: 'daily heartrate workout personal session',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

    return NextResponse.redirect(`${origin}/dashboard/profile?oura=connected`);
  } catch (err) {
    console.error('Oura callback error:', err);
    return NextResponse.redirect(`${origin}/dashboard/profile?oura=error`);
  }
}
