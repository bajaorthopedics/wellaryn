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

    const clientId = process.env.FITBIT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Fitbit not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host')}`;
    const redirectUri = `${siteUrl}/api/fitbit/callback`;
    const scopes = 'activity heartrate sleep profile';
    const state = session.user.id;

    const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
      `response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('Fitbit authorize error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
