import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Convert seconds to hours (rounded to 1 decimal)
function secToHrs(sec) {
  return sec != null ? Math.round((sec / 3600) * 10) / 10 : null;
}

// Convert Garmin sleep score (0-100) to quality (1-10)
function scoreToQuality(score) {
  if (score == null) return null;
  const q = Math.round(score / 10);
  return Math.max(1, Math.min(10, q));
}

// Build OAuth 1.0a Authorization header for Garmin API requests
async function buildOAuthHeader(method, url, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const signatureBase = `${method}&${encodeURIComponent(url.split('?')[0])}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;

  const { createHmac } = await import('crypto');
  const signature = createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  return 'OAuth ' + Object.entries({
    ...oauthParams,
    oauth_signature: signature,
  }).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');
}

export async function POST(request) {
  try {
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

    const userId = session.user.id;

    // Get Garmin tokens
    const { data: conn, error: connErr } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'garmin')
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Garmin not connected' }, { status: 400 });
    }

    const accessToken = conn.access_token;
    const accessTokenSecret = conn.refresh_token; // OAuth 1.0a token secret stored here
    const consumerKey = process.env.GARMIN_CONSUMER_KEY;
    const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Garmin not configured' }, { status: 500 });
    }

    // Determine sync window (last 7 days by default)
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startEpoch = Math.floor(startDate.getTime() / 1000);
    const endEpoch = Math.floor(Date.now() / 1000);

    const baseUrl = 'https://apis.garmin.com/wellness-api/rest';

    // Helper to make signed Garmin API requests
    async function garminFetch(endpoint) {
      const url = `${baseUrl}${endpoint}`;
      const authHeader = await buildOAuthHeader('GET', url, consumerKey, consumerSecret, accessToken, accessTokenSecret);
      return fetch(url, {
        headers: { Authorization: authHeader },
      });
    }

    // Fetch daily summaries, sleep, activities, and heart rate in parallel
    const [dailiesRes, sleepRes, activitiesRes, heartRateRes] = await Promise.all([
      garminFetch(`/dailies?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
      garminFetch(`/sleeps?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
      garminFetch(`/activities?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
      garminFetch(`/heartRates?uploadStartTimeInSeconds=${startEpoch}&uploadEndTimeInSeconds=${endEpoch}`),
    ]);

    const dailiesData = dailiesRes.ok ? await dailiesRes.json() : [];
    const sleepData = sleepRes.ok ? await sleepRes.json() : [];
    const activitiesData = activitiesRes.ok ? await activitiesRes.json() : [];
    const heartRateData = heartRateRes.ok ? await heartRateRes.json() : [];

    // Group by day
    const dayMap = {};

    // Process daily summaries
    for (const d of (Array.isArray(dailiesData) ? dailiesData : [])) {
      const day = d.calendarDate;
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};
      dayMap[day].steps = d.steps || dayMap[day].steps;
      dayMap[day].calories = d.activeKilocalories || d.totalKilocalories || dayMap[day].calories;
      if (d.restingHeartRateInBeatsPerMinute) {
        dayMap[day].rhr = d.restingHeartRateInBeatsPerMinute;
      }
      if (d.averageStressLevel != null) {
        // Garmin stress is 0-100, map to 1-10
        dayMap[day].stress_garmin = Math.max(1, Math.min(10, Math.round(d.averageStressLevel / 10)));
      }
    }

    // Process sleep data
    for (const s of (Array.isArray(sleepData) ? sleepData : [])) {
      const day = s.calendarDate;
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};
      const existing = dayMap[day];

      const totalSleep = secToHrs(s.durationInSeconds);

      // Only use if this is a longer sleep than what we have
      if (!existing.sleep_total || (totalSleep && totalSleep > existing.sleep_total)) {
        existing.sleep_total = totalSleep;
        existing.sleep_deep = secToHrs(s.deepSleepDurationInSeconds);
        existing.sleep_rem = secToHrs(s.remSleepInSeconds);
        existing.sleep_light = secToHrs(s.lightSleepDurationInSeconds);
        existing.sleep_quality = scoreToQuality(s.sleepScores?.overallScore);

        // Garmin HRV data from sleep
        if (s.averageHRV != null) {
          existing.hrv_rmssd = Math.round(s.averageHRV * 10) / 10;
        }
      }
    }

    // Process heart rate data (supplement RHR from heart rate summaries)
    for (const hr of (Array.isArray(heartRateData) ? heartRateData : [])) {
      const day = hr.calendarDate;
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};
      if (hr.restingHeartRateInBeatsPerMinute && !dayMap[day].rhr) {
        dayMap[day].rhr = hr.restingHeartRateInBeatsPerMinute;
      }
    }

    // Process activities — aggregate per day
    for (const a of (Array.isArray(activitiesData) ? activitiesData : [])) {
      // Activities have startTimeInSeconds (epoch), derive the day
      const startTime = a.startTimeInSeconds;
      if (!startTime) continue;
      const day = new Date(startTime * 1000).toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = {};

      const dur = a.durationInSeconds ? Math.round(a.durationInSeconds / 60) : 0;

      // Map Garmin activity type to intensity (rough mapping)
      // Garmin activityType is a string like 'RUNNING', 'CYCLING', etc.
      let intensity = 5; // default moderate
      if (a.averageHeartRateInBeatsPerMinute) {
        // Estimate intensity from HR zones
        const avgHR = a.averageHeartRateInBeatsPerMinute;
        if (avgHR > 170) intensity = 9;
        else if (avgHR > 155) intensity = 8;
        else if (avgHR > 140) intensity = 7;
        else if (avgHR > 125) intensity = 6;
        else if (avgHR > 110) intensity = 5;
        else intensity = 4;
      }

      const load = dur * intensity;
      dayMap[day].training_load = (dayMap[day].training_load || 0) + load;
      dayMap[day].training_duration = (dayMap[day].training_duration || 0) + dur;
      dayMap[day].training_rpe = intensity;
      dayMap[day].training_type = a.activityType?.toLowerCase() || dayMap[day].training_type || 'other';
    }

    // Upsert to daily_metrics
    let syncedDays = 0;
    for (const [day, metrics] of Object.entries(dayMap)) {
      const { error: upsertErr } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: day,
          source: 'garmin',
          ...metrics,
        }, { onConflict: 'user_id,date' });
      if (!upsertErr) syncedDays++;
    }

    // Update last_sync_at
    await supabase.from('wearable_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'garmin');

    return NextResponse.json({ success: true, syncedDays, days: Object.keys(dayMap) });
  } catch (err) {
    console.error('Garmin sync error:', err);
    return NextResponse.json({ error: 'Sync failed', details: err.message }, { status: 500 });
  }
}
