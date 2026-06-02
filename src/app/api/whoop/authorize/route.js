import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Verify user is authenticated
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.WHOOP_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'WHOOP not configured' }, { status: 500 });
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUri = `${protocol}://${host}/api/whoop/callback`;
    const scopes = 'read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement';
    const state = session.user.id;

    const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
      `response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('WHOOP authorize error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
