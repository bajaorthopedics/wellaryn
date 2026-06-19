import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { userSyncLimiter, checkLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { validateBody, syncSchema } from '@/lib/validate';

// Convert milliseconds to hours (rounded to 1 decimal)
function msToHrs(ms) {
  return ms != null ? Math.round((ms / 3600000) * 10) / 10 : null;
}

// Convert WHOOP sleep performance percentage (0-100) to quality (1-10)
function perfToQuality(perf) {
  if (perf == null) return null;
  const q = Math.round(perf / 10);
  return Math.max(1, Math.min(10, q));
}

// Convert ISO datetime to minute-of-day
function isoToMinuteOfDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

// Extract YYYY-MM-DD from ISO datetime
function isoToDay(iso) {
  if (!iso) return null;
  return iso.split('T')[0];
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

    // Get WHOOP tokens
    const { data: conn, error: connErr } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'whoop')
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'WHOOP not connected' }, { status: 400 });
    }

    let accessToken = conn.access_token;

    // Check if token expired and refresh if needed
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      if (!conn.refresh_token) {
        return NextResponse.json({ error: 'Token expired, reconnect WHOOP' }, { status: 401 });
      }
      try {
        const refreshRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: conn.refresh_token,
            client_id: process.env.WHOOP_CLIENT_ID,
            client_secret: process.env.WHOOP_CLIENT_SECRET,
          }),
        });
        if (!refreshRes.ok) {
          return NextResponse.json({ error: 'Token refresh failed, reconnect WHOOP' }, { status: 401 });
        }
        const newTokens = await refreshRes.json();
        accessToken = newTokens.access_token;
        const newExpiry = new Date(Date.now() + (newTokens.expires_in || 86400) * 1000).toISOString();
        await supabase.from('wearable_connections').update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || conn.refresh_token,
          token_expires_at: newExpiry,
        }).eq('user_id', userId).eq('provider', 'whoop');
      } catch (e) {
        console.error('Token refresh error:', e);
        return NextResponse.json({ error: 'Token refresh error' }, { status: 500 });
      }
    }

    // Determine sync window (last 7 days by default)
    const parsed = await validateBody(request, syncSchema);
    if (!parsed.success) return parsed.response;
    const { days } = parsed.data;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString().split('T')[0];
    const end = new Date().toISOString().split('T')[0];

    // WHOOP API uses ISO 8601 datetime for start/end params
    const startParam = `${start}T00:00:00.000Z`;
    const endParam = `${end}T23:59:59.999Z`;

    const headers = { Authorization: `Bearer ${accessToken}` };
    const baseUrl = 'https://api.prod.whoop.com/developer/v1';

    // Fetch sleep, recovery, workout, and cycle data in parallel
    const [sleepRes, recoveryRes, workoutRes, cycleRes] = await Promise.all([
      fetch(`${baseUrl}/activity/sleep?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`, { headers }),
      fetch(`${baseUrl}/recovery?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`, { headers }),
      fetch(`${baseUrl}/activity/workout?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`, { headers }),
      fetch(`${baseUrl}/cycle?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`, { headers }),
    ]);

    const sleepData = sleepRes.ok ? await sleepRes.json() : { records: [] };
    const recoveryData = recoveryRes.ok ? await recoveryRes.json() : { records: [] };
    const workoutData = workoutRes.ok ? await workoutRes.json() : { records: [] };
    const cycleData = cycleRes.ok ? await cycleRes.json() : { records: [] };

    // Group by day
    const dayMap = {};

    // Process sleep records
    for (const s of (sleepData.records || [])) {
      const day = isoToDay(s.start) || isoToDay(s.end);
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};
      const existing = dayMap[day];

      const score = s.score || {};
      const stages = score.stage_summary || {};

      const totalSleep = msToHrs(stages.total_in_bed_time_milli);

      // Only use if this is a longer sleep than what we have
      if (!existing.sleep_total || (totalSleep && totalSleep > existing.sleep_total)) {
        existing.sleep_total = totalSleep;
        existing.sleep_deep = msToHrs(stages.total_slow_wave_sleep_time_milli);
        existing.sleep_rem = msToHrs(stages.total_rem_sleep_time_milli);
        existing.sleep_light = msToHrs(stages.total_light_sleep_time_milli);
        existing.sleep_quality = perfToQuality(score.sleep_performance_percentage);
        existing.bedtime_minutes = isoToMinuteOfDay(s.start);
        existing.wake_time_minutes = isoToMinuteOfDay(s.end);
      }
    }

    // Process recovery records
    for (const r of (recoveryData.records || [])) {
      const day = isoToDay(r.created_at) || isoToDay(r.cycle?.start);
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};

      const score = r.score || {};
      // WHOOP hrv_rmssd_milli is in milliseconds (already ms), no conversion needed
      if (score.hrv_rmssd_milli != null) {
        dayMap[day].hrv_rmssd = Math.round(score.hrv_rmssd_milli * 10) / 10;
      }
      if (score.resting_heart_rate != null) {
        dayMap[day].rhr = Math.round(score.resting_heart_rate);
      }
    }

    // Process workout records — aggregate per day
    for (const w of (workoutData.records || [])) {
      const day = isoToDay(w.start) || isoToDay(w.end);
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};

      const score = w.score || {};
      const strain = score.strain || 0;

      // Calculate duration in minutes from start/end
      let dur = 0;
      if (w.start && w.end) {
        dur = Math.round((new Date(w.end) - new Date(w.start)) / 60000);
      }

      // Approximate training load: duration_min * (strain/21 * 10)
      const load = dur > 0 ? Math.round(dur * (strain / 21) * 10) : 0;

      dayMap[day].training_load = (dayMap[day].training_load || 0) + load;
      dayMap[day].training_duration = (dayMap[day].training_duration || 0) + dur;

      // Map strain (0-21) to RPE-like scale (1-10)
      const rpe = Math.max(1, Math.min(10, Math.round((strain / 21) * 10)));
      dayMap[day].training_rpe = rpe;

      // Map sport_id to training_type (WHOOP uses numeric IDs)
      dayMap[day].training_type = dayMap[day].training_type || 'other';
    }

    // Process cycle records (day-level strain, calories)
    for (const c of (cycleData.records || [])) {
      const day = isoToDay(c.start) || isoToDay(c.end);
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = {};

      const score = c.score || {};
      if (score.kilojoule != null) {
        // Convert kilojoules to kilocalories (1 kJ ≈ 0.239 kcal)
        dayMap[day].calories = Math.round(score.kilojoule * 0.239);
      }
    }

    // Upsert to daily_metrics
    let syncedDays = 0;
    for (const [day, metrics] of Object.entries(dayMap)) {
      const { error: upsertErr } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: day,
          source: 'whoop',
          ...metrics,
        }, { onConflict: 'user_id,date' });
      if (!upsertErr) syncedDays++;
    }

    // Update last_sync_at
    await supabase.from('wearable_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'whoop');

    return NextResponse.json({ success: true, syncedDays, days: Object.keys(dayMap) });
  } catch (err) {
    console.error('WHOOP sync error:', err);
    return NextResponse.json({ error: 'Sync failed', details: err.message }, { status: 500 });
  }
}
