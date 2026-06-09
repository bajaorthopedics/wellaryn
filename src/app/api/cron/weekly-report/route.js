import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { weeklyReportEmail } from '@/lib/email-templates';

// ─── Auth: Verify cron secret ─────────────────────────────────

function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow (dev mode)
  if (!cronSecret) return true;

  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Supabase service client (bypasses RLS) ───────────────────

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// ─── Send email via Resend ────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wellaryn <hello@wellaryn.com>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[weekly-report-cron] Resend error for ${to}:`, err);
    }

    return res.ok;
  } catch (err) {
    console.error(`[weekly-report-cron] Send error for ${to}:`, err);
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function avg(arr) {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatDateRange(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[start.getUTCMonth()]} ${start.getUTCDate()} - ${months[end.getUTCMonth()]} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
}

// ─── GET handler (called by Vercel / external cron) ───────────

export async function GET(request) {
  try {
    // 1. Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
    }

    const supabase = getServiceClient();
    const now = new Date();

    // 2. Date range: last 7 days (yesterday back to 7 days ago)
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - 1);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    // Previous week for comparison
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6);

    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

    const dateRange = formatDateRange(weekStartStr, weekEndStr);

    // 3. Fetch users with email notifications enabled
    //    email_notifications column defaults to true if not present
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, email, email_notifications')
      .not('email', 'is', null);

    if (profileError) {
      console.error('[weekly-report-cron] Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Filter to users who have email notifications enabled (default: true)
    const eligibleUsers = (profiles || []).filter(p =>
      p.email && (p.email_notifications === true || p.email_notifications === null)
    );

    if (eligibleUsers.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, skipped: 0 });
    }

    const userIds = eligibleUsers.map(u => u.id);

    // 4. Fetch metrics for all eligible users (current + previous week)
    const { data: allMetrics, error: metricsError } = await supabase
      .from('daily_metrics')
      .select('user_id, date, hrv_rmssd, rhr, sleep_total, training_load')
      .in('user_id', userIds)
      .gte('date', prevWeekStartStr)
      .lte('date', weekEndStr)
      .order('date', { ascending: true });

    if (metricsError) {
      console.error('[weekly-report-cron] Error fetching metrics:', metricsError);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Group metrics by user
    const metricsByUser = {};
    for (const m of (allMetrics || [])) {
      if (!metricsByUser[m.user_id]) metricsByUser[m.user_id] = [];
      metricsByUser[m.user_id].push(m);
    }

    // 5. Process each user and send emails
    let sent = 0;
    let skipped = 0;

    for (const user of eligibleUsers) {
      const userMetrics = metricsByUser[user.id] || [];
      const weekMetrics = userMetrics.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);

      // Skip users with no data this week
      if (weekMetrics.length === 0) {
        skipped++;
        continue;
      }

      const prevWeekMetrics = userMetrics.filter(m => m.date >= prevWeekStartStr && m.date <= prevWeekEndStr);

      // Compute current week stats
      const hrvValues = weekMetrics.filter(m => m.hrv_rmssd != null).map(m => m.hrv_rmssd);
      const sleepValues = weekMetrics.filter(m => m.sleep_total != null).map(m => m.sleep_total);
      const trainingDays = weekMetrics.filter(m => m.training_load != null && m.training_load > 0).length;

      const avgHRV = hrvValues.length > 0 ? Math.round(avg(hrvValues)) : null;
      const avgSleep = sleepValues.length > 0 ? parseFloat(avg(sleepValues).toFixed(1)) : null;

      // Compute previous week stats for comparison
      const prevHrvValues = prevWeekMetrics.filter(m => m.hrv_rmssd != null).map(m => m.hrv_rmssd);
      const prevSleepValues = prevWeekMetrics.filter(m => m.sleep_total != null).map(m => m.sleep_total);

      const prevHRV = prevHrvValues.length > 0 ? Math.round(avg(prevHrvValues)) : null;
      const prevSleep = prevSleepValues.length > 0 ? parseFloat(avg(prevSleepValues).toFixed(1)) : null;

      // Note: Wellaryn Score computation requires the full wellaryn-score engine
      // which is already handled by /api/reports/weekly. This cron endpoint provides
      // a lightweight metric summary. For the full score, we query readiness_scores.
      let wellarynScore = null;
      let prevScore = null;

      const { data: weekScores } = await supabase
        .from('readiness_scores')
        .select('score')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);

      if (weekScores && weekScores.length > 0) {
        const scores = weekScores.filter(s => s.score != null).map(s => s.score);
        wellarynScore = scores.length > 0 ? Math.round(avg(scores)) : null;
      }

      const { data: prevScores } = await supabase
        .from('readiness_scores')
        .select('score')
        .eq('user_id', user.id)
        .gte('date', prevWeekStartStr)
        .lte('date', prevWeekEndStr);

      if (prevScores && prevScores.length > 0) {
        const scores = prevScores.filter(s => s.score != null).map(s => s.score);
        prevScore = scores.length > 0 ? Math.round(avg(scores)) : null;
      }

      // Generate and send email
      const { subject, html } = weeklyReportEmail({
        name: user.display_name,
        wellarynScore,
        avgHRV,
        avgSleep,
        trainingDays,
        prevScore,
        prevHRV,
        prevSleep,
        dateRange,
      });

      const ok = await sendEmail({ to: user.email, subject, html });
      if (ok) {
        sent++;
      } else {
        console.warn(`[weekly-report-cron] Failed to send to ${user.email}`);
      }
    }

    return NextResponse.json({
      processed: eligibleUsers.length,
      sent,
      skipped,
    });
  } catch (err) {
    console.error('[weekly-report-cron] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
