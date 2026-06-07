import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Convert minutes to hours (rounded to 1 decimal)
function minToHrs(min) {
  return min != null ? Math.round((min / 60) * 10) / 10 : null;
}

// Convert Fitbit sleep efficiency (0-100) to quality (1-10)
function effToQuality(eff) {
  if (eff == null) return null;
  const q = Math.round(eff / 10);
  return Math.max(1, Math.min(10, q));
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

    // Get Fitbit tokens
    const { data: conn, error: connErr } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'fitbit')
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Fitbit not connected' }, { status: 400 });
    }

    let accessToken = conn.access_token;

    // Check if token expired and refresh if needed
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      if (!conn.refresh_token) {
        return NextResponse.json({ error: 'Token expired, reconnect Fitbit' }, { status: 401 });
      }
      try {
        const basicAuth = Buffer.from(
          `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
        ).toString('base64');

        const refreshRes = await fetch('https://api.fitbit.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: conn.refresh_token,
          }),
        });
        if (!refreshRes.ok) {
          return NextResponse.json({ error: 'Token refresh failed, reconnect Fitbit' }, { status: 401 });
        }
        const newTokens = await refreshRes.json();
        accessToken = newTokens.access_token;
        const newExpiry = new Date(Date.now() + (newTokens.expires_in || 28800) * 1000).toISOString();
        await supabase.from('wearable_connections').update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || conn.refresh_token,
          token_expires_at: newExpiry,
        }).eq('user_id', userId).eq('provider', 'fitbit');
      } catch (e) {
        console.error('Token refresh error:', e);
        return NextResponse.json({ error: 'Token refresh error' }, { status: 500 });
      }
    }

    // Determine sync window (last 7 days by default)
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;

    const headers = { Authorization: `Bearer ${accessToken}` };
    const baseUrl = 'https://api.fitbit.com';

    // Group by day
    const dayMap = {};

    // Fetch data for each day (Fitbit API is date-based)
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Fetch sleep, heart rate, HRV, and activity in parallel for this day
      const [sleepRes, heartRes, hrvRes, activityRes] = await Promise.all([
        fetch(`${baseUrl}/1.2/user/-/sleep/date/${dateStr}.json`, { headers }),
        fetch(`${baseUrl}/1/user/-/activities/heart/date/${dateStr}/1d.json`, { headers }),
        fetch(`${baseUrl}/1/user/-/hrv/date/${dateStr}.json`, { headers }),
        fetch(`${baseUrl}/1/user/-/activities/date/${dateStr}.json`, { headers }),
      ]);

      const sleepData = sleepRes.ok ? await sleepRes.json() : {};
      const heartData = heartRes.ok ? await heartRes.json() : {};
      const hrvData = hrvRes.ok ? await hrvRes.json() : {};
      const activityData = activityRes.ok ? await activityRes.json() : {};

      if (!dayMap[dateStr]) dayMap[dateStr] = {};
      const metrics = dayMap[dateStr];

      // Process sleep
      const mainSleep = (sleepData.sleep || []).find(s => s.isMainSleep) || (sleepData.sleep || [])[0];
      if (mainSleep) {
        metrics.sleep_total = minToHrs(mainSleep.minutesAsleep || mainSleep.duration / 60000);
        metrics.sleep_quality = effToQuality(mainSleep.efficiency);

        if (mainSleep.levels?.summary) {
          const levels = mainSleep.levels.summary;
          metrics.sleep_deep = minToHrs(levels.deep?.minutes);
          metrics.sleep_rem = minToHrs(levels.rem?.minutes);
          metrics.sleep_light = minToHrs(levels.light?.minutes);
        }
      }

      // Process resting heart rate
      const hrSummary = heartData['activities-heart']?.[0]?.value;
      if (hrSummary?.restingHeartRate) {
        metrics.rhr = hrSummary.restingHeartRate;
      }

      // Process HRV
      const hrvEntry = (hrvData.hrv || [])[0];
      if (hrvEntry?.value?.dailyRmssd != null) {
        metrics.hrv_rmssd = Math.round(hrvEntry.value.dailyRmssd * 10) / 10;
      }

      // Process activity summary
      const summary = activityData.summary;
      if (summary) {
        metrics.steps = summary.steps || metrics.steps;
        metrics.calories = summary.caloriesOut || summary.activityCalories || metrics.calories;
      }

      // Process activities (workouts)
      const activities = activityData.activities || [];
      for (const a of activities) {
        const dur = a.duration ? Math.round(a.duration / 60000) : 0;
        // Estimate intensity from calories per minute
        const calPerMin = dur > 0 && a.calories ? a.calories / dur : 0;
        let intensity = 5;
        if (calPerMin > 12) intensity = 9;
        else if (calPerMin > 9) intensity = 7;
        else if (calPerMin > 6) intensity = 5;
        else intensity = 3;

        const load = dur * intensity;
        metrics.training_load = (metrics.training_load || 0) + load;
        metrics.training_duration = (metrics.training_duration || 0) + dur;
        metrics.training_rpe = intensity;
        metrics.training_type = a.name?.toLowerCase() || metrics.training_type || 'other';
      }
    }

    // Upsert to daily_metrics
    let syncedDays = 0;
    for (const [day, metrics] of Object.entries(dayMap)) {
      // Only upsert if we actually got some data
      if (Object.keys(metrics).length === 0) continue;
      const { error: upsertErr } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: day,
          source: 'fitbit',
          ...metrics,
        }, { onConflict: 'user_id,date' });
      if (!upsertErr) syncedDays++;
    }

    // Update last_sync_at
    await supabase.from('wearable_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'fitbit');

    return NextResponse.json({ success: true, syncedDays, days: Object.keys(dayMap) });
  } catch (err) {
    console.error('Fitbit sync error:', err);
    return NextResponse.json({ error: 'Sync failed', details: err.message }, { status: 500 });
  }
}
