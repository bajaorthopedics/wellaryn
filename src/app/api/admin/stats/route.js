import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

// ─── Get the requesting user from cookies ─────────────────────

async function getRequestingUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Verify admin role ────────────────────────────────────────

async function verifyAdmin(serviceClient, userId) {
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return profile?.role === 'admin';
}

// ─── GET: Platform statistics ─────────────────────────────────

export async function GET() {
  try {
    const user = await getRequestingUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();

    const isAdmin = await verifyAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // ── Total users ───────────────────────────────────────────
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // ── Active users (last 7 days) ────────────────────────────
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_sign_in', sevenDaysAgo.toISOString());

    // ── Total data points ─────────────────────────────────────
    const { count: totalDataPoints } = await supabase
      .from('daily_metrics')
      .select('id', { count: 'exact', head: true });

    // ── New users (last 30 days) ──────────────────────────────
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // ── Plan distribution ─────────────────────────────────────
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('plan, role, created_at');

    const planCounts = { free: 0, pro: 0, team: 0 };
    const roleCounts = { athlete: 0, coach: 0, doctor: 0, admin: 0 };

    (allProfiles || []).forEach(p => {
      const plan = p.plan || 'free';
      if (planCounts[plan] !== undefined) planCounts[plan]++;
      const role = p.role || 'athlete';
      if (roleCounts[role] !== undefined) roleCounts[role]++;
    });

    // Revenue estimate (placeholder pricing)
    const PLAN_PRICES = { free: 0, pro: 14.99, team: 39.99 };
    const estimatedMRR = (planCounts.pro * PLAN_PRICES.pro) + (planCounts.team * PLAN_PRICES.team);

    // Conversion rate (free → paid)
    const totalProfiles = allProfiles?.length || 1;
    const paidUsers = planCounts.pro + planCounts.team;
    const conversionRate = totalProfiles > 0 ? ((paidUsers / totalProfiles) * 100).toFixed(1) : '0.0';

    // ── Weekly growth (last 12 weeks) ─────────────────────────
    const weeklyGrowth = [];
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));

      const weekStartStr = weekStart.toISOString();
      const weekEndStr = weekEnd.toISOString();

      const count = (allProfiles || []).filter(p => {
        const created = p.created_at;
        return created >= weekStartStr && created < weekEndStr;
      }).length;

      const weekLabel = `W${12 - w}`;
      weeklyGrowth.push({ week: weekLabel, signups: count });
    }

    // ── Plan distribution for chart ───────────────────────────
    const planDistribution = [
      { name: 'Free', value: planCounts.free, color: 'hsl(225, 10%, 55%)' },
      { name: 'Pro', value: planCounts.pro, color: 'hsl(152, 68%, 52%)' },
      { name: 'Team', value: planCounts.team, color: 'hsl(270, 60%, 60%)' },
    ];

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalDataPoints: totalDataPoints || 0,
      newUsers: newUsers || 0,
      estimatedMRR: estimatedMRR.toFixed(2),
      conversionRate,
      planCounts,
      roleCounts,
      weeklyGrowth,
      planDistribution,
    });
  } catch (err) {
    console.error('Admin stats GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
