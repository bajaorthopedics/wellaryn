import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host')}`;

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=error`);
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

  try {
    // Create Supabase server client to verify auth and retrieve temp token secret
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
      return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=error`);
    }

    // Retrieve the stored request token secret
    const { data: pendingConn } = await supabase
      .from('wearable_connections')
      .select('refresh_token')
      .eq('user_id', session.user.id)
      .eq('provider', 'garmin')
      .maybeSingle();

    const oauthTokenSecret = pendingConn?.refresh_token || '';

    // Exchange for access token (OAuth 1.0a Step 3)
    const accessTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_token: oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_verifier: oauthVerifier,
    };

    const paramString = Object.keys(oauthParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&');

    const signatureBase = `POST&${encodeURIComponent(accessTokenUrl)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthTokenSecret)}`;

    const { createHmac } = await import('crypto');
    const signature = createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');

    const authHeader = 'OAuth ' + Object.entries({
      ...oauthParams,
      oauth_signature: signature,
    }).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');

    const tokenRes = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    if (!tokenRes.ok) {
      console.error('Garmin token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=error`);
    }

    const tokenBody = await tokenRes.text();
    const tokenParams = new URLSearchParams(tokenBody);
    const accessToken = tokenParams.get('oauth_token');
    const accessTokenSecret = tokenParams.get('oauth_token_secret');

    if (!accessToken) {
      return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=error`);
    }

    // Store the access token and secret
    await supabase.from('wearable_connections').upsert({
      user_id: session.user.id,
      provider: 'garmin',
      access_token: accessToken,
      refresh_token: accessTokenSecret,
      token_expires_at: null, // Garmin OAuth 1.0a tokens don't expire
      scopes: 'dailies activities sleep heartRate',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

    return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=connected`);
  } catch (err) {
    console.error('Garmin callback error:', err);
    return NextResponse.redirect(`${siteUrl}/dashboard/profile?garmin=error`);
  }
}
