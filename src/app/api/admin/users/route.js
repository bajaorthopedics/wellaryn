import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateBody, adminUsersSchema } from '@/lib/validate';

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

// ─── GET: List all users ──────────────────────────────────────

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const planFilter = searchParams.get('plan') || '';
    const statusFilter = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }
    if (planFilter) {
      query = query.eq('plan', planFilter);
    }
    if (statusFilter === 'active') {
      query = query.eq('is_disabled', false);
    } else if (statusFilter === 'disabled') {
      query = query.eq('is_disabled', true);
    }

    // Sort
    const ascending = sortDir === 'asc';
    query = query.order(sortBy, { ascending });

    // Paginate
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Admin users query error:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH: Update a user ─────────────────────────────────────

export async function PATCH(request) {
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

    const parsed = await validateBody(request, adminUsersSchema);
    if (!parsed.success) return parsed.response;
    const { userId, action, value } = parsed.data;

    // Don't allow admins to modify themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    let update = {};

    switch (action) {
      case 'changeRole':
        if (!['athlete', 'coach', 'doctor', 'admin'].includes(value)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        update = { role: value };
        break;
      case 'changePlan':
        if (!['free', 'pro', 'team'].includes(value)) {
          return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }
        update = { plan: value };
        break;
      case 'toggleDisable':
        update = { is_disabled: value };
        break;
      case 'delete':
        // Soft delete — disable and mark
        update = { is_disabled: true, deleted_at: new Date().toISOString() };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Admin user update error:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('Admin users PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
