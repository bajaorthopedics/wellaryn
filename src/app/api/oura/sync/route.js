import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { userSyncLimiter, checkLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Convert seconds to hours (rounded to 1 decimal)
function secToHrs(sec) {
  return sec != null ? Math.round((sec / 3600) * 10) / 10 : null;
}

// Convert Oura efficiency (1-100) to quality (1-10)
function efficiencyToQuality(eff) {
  return eff != null ? Math.round(eff / 10) : null;
}

// Convert ISO datetime to minute-of-day
function isoToMinuteOfDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
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

    // Rate limit por usuario (sync es caro: API externa + escritura BD)
    const _rl = await checkLimit(userSyncLimiter, userId);
    if (!_rl.success) {
      return NextResponse.json(
        { error: 'Demasiadas sincronizaciones. Espera un momento.' },
        { status: 429, headers: rateLimitHeaders(_rl) }
      );
    }

    // Get Oura tokens
    const { data: conn, error: connErr } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'oura')
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Oura not connected' }, { status: 400 });
    }

    let accessToken = conn.access_token;

    // Check if token expired and refresh if needed
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      if (!conn.refresh_token) {
        return NextResponse.json({ error: 'Token expired, reconnect Oura' }, { status: 401 });
      }
      try {
        const refreshRes = await fetch('https://api.ouraring.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: conn.refresh_token,
            client_id: process.env.OURA_CLIENT_ID,
            client_secret: process.env.OURA_CLIENT_SECRET,
          }),
        });
        if (!refreshRes.ok) {
          return NextResponse.json({ error: 'Token refresh failed, reconnect Oura' }, { status: 401 });
        }
        const newTokens = await refreshRes.json();
        accessToken = newTokens.access_token;
        const newExpiry = new Date(Date.now() + (newTokens.expires_in || 86400) * 1000).toISOString();
        await supabase.from('wearable_connections').update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || conn.refresh_token,
          token_expires_at: newExpiry,
        }).eq('user_id', userId).eq('provider', 'oura');
      } catch (e) {
        console.error('Token refresh error:', e);
        return NextResponse.json({ error: 'Token refresh error' }, { status: 500 });
      }
    }

    // Determine sync window (last 7 days by default)
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString().split('T')[0];
    const end = new Date().toISOString().split('T')[0];

    const headers = { Authorization: `Bearer ${accessToken}` };
    const baseUrl = 'https://api.ouraring.com/v2/usercollection';

    // Fetch sleep, activity, and workout data in parallel
    const [sleepRes, activityRes, workoutRes] = await Promise.all([
      fetch(`${baseUrl}/sleep?start_date=${start}&end_date=${end}`, { headers }),
      fetch(`${baseUrl}/daily_activity?start_date=${start}&end_date=${end}`, { headers }),
      fetch(`${baseUrl}/workout?start_date=${start}&end_date=${end}`, { headers }),
    ]);

    const sleepData = sleepRes.ok ? await sleepRes.json() : { data: [] };
    const activityData = activityRes.ok ? await activityRes.json() : { data: [] };
    const workoutData = workoutRes.ok ? await workoutRes.json() : { data: [] };

    // Group by day
    const dayMap = {};

    // Process sleep (prefer long_sleep type per day)
    for (const s of (sleepData.data || [])) {
      if (s.type !== 'long_sleep' && (sleepData.data || []).some(o => o.day === s.day && o.type === 'long_sleep')) {
        continue;
      }
      const day = s.day;
      if (!dayMap[day]) dayMap[day] = {};
      const existing = dayMap[day];
      // Only use if this is a longer sleep than what we have
      if (!existing.sleep_total || secToHrs(s.total_sleep_duration) > existing.sleep_total) {
        existing.hrv_rmssd = s.average_hrv || existing.hrv_rmssd;
        existing.rhr = s.lowest_heart_rate || existing.rhr;
        existing.sleep_total = secToHrs(s.total_sleep_duration);
        existing.sleep_deep = secToHrs(s.deep_sleep_duration);
        existing.sleep_rem = secToHrs(s.rem_sleep_duration);
        existing.sleep_light = secToHrs(s.light_sleep_duration);
        existing.sleep_quality = efficiencyToQuality(s.efficiency);
        existing.bedtime_minutes = isoToMinuteOfDay(s.bedtime_start);
        existing.wake_time_minutes = isoToMinuteOfDay(s.bedtime_end);
      }
    }

    // Process activity
    for (const a of (activityData.data || [])) {
      const day = a.day;
      if (!dayMap[day]) dayMap[day] = {};
      dayMap[day].steps = a.steps || dayMap[day].steps;
      dayMap[day].calories = a.total_calories || dayMap[day].calories;
    }

    // Process workouts — aggregate per day
    for (const w of (workoutData.data || [])) {
      const day = w.day;
      if (!dayMap[day]) dayMap[day] = {};
      const dur = w.start_datetime && w.end_datetime
        ? Math.round((new Date(w.end_datetime) - new Date(w.start_datetime)) / 60000)
        : 0;
      const intensity = w.intensity === 'high' ? 8 : w.intensity === 'medium' ? 5 : 3;
      const load = dur * intensity;
      dayMap[day].training_load = (dayMap[day].training_load || 0) + load;
      dayMap[day].training_duration = (dayMap[day].training_duration || 0) + dur;
      dayMap[day].training_rpe = intensity;
      dayMap[day].training_type = w.activity || dayMap[day].training_type || 'other';
    }

    // Upsert to daily_metrics
    let syncedDays = 0;
    for (const [day, metrics] of Object.entries(dayMap)) {
      const { error: upsertErr } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: day,
          source: 'oura',
          ...metrics,
        }, { onConflict: 'user_id,date' });
      if (!upsertErr) syncedDays++;
    }

    // Update last_sync_at
    await supabase.from('wearable_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'oura');

    return NextResponse.json({ success: true, syncedDays, days: Object.keys(dayMap) });
  } catch (err) {
    console.error('Oura sync error:', err);
    return NextResponse.json({ error: 'Sync failed', details: err.message }, { status: 500 });
  }
}
