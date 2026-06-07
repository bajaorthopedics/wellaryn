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

    const consumerKey = process.env.GARMIN_CONSUMER_KEY;
    if (!consumerKey) {
      // Garmin Health API requires a business partnership — provide helpful info
      return NextResponse.json({
        error: 'Garmin integration not yet configured',
        message: 'Garmin Health API requires a business partnership with Garmin. Once approved, set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET environment variables.',
        docs: 'https://developer.garmin.com/health-api/overview/',
        status: 'partnership_required',
      }, { status: 503 });
    }

    // Garmin uses OAuth 1.0a — request token flow
    // Step 1: Get a request token from Garmin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host')}`;
    const callbackUrl = `${siteUrl}/api/garmin/callback`;
    const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

    const requestTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';

    // Build OAuth 1.0a signature for request token
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_callback: callbackUrl,
    };

    // Create signature base string
    const paramString = Object.keys(oauthParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&');

    const signatureBase = `POST&${encodeURIComponent(requestTokenUrl)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&`;

    // HMAC-SHA1 signature
    const { createHmac } = await import('crypto');
    const signature = createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');

    // Make request token call
    const authHeader = 'OAuth ' + Object.entries({
      ...oauthParams,
      oauth_signature: signature,
    }).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');

    const reqTokenRes = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    if (!reqTokenRes.ok) {
      console.error('Garmin request token failed:', await reqTokenRes.text());
      return NextResponse.json({ error: 'Failed to get Garmin request token' }, { status: 500 });
    }

    const reqTokenBody = await reqTokenRes.text();
    const reqTokenParams = new URLSearchParams(reqTokenBody);
    const oauthToken = reqTokenParams.get('oauth_token');
    const oauthTokenSecret = reqTokenParams.get('oauth_token_secret');

    if (!oauthToken) {
      return NextResponse.json({ error: 'Invalid request token response from Garmin' }, { status: 500 });
    }

    // Store the token secret temporarily (needed for callback)
    // We use the user's wearable_connections to store the temp secret
    await supabase.from('wearable_connections').upsert({
      user_id: session.user.id,
      provider: 'garmin',
      access_token: oauthToken,
      refresh_token: oauthTokenSecret, // Temp: store token secret here
      scopes: 'pending_authorization',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

    // Step 2: Redirect user to Garmin authorization page
    const authUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${oauthToken}`;
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('Garmin authorize error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
