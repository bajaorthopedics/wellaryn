import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    const body = await request.json();

    if (body.all === true) {
      // Mark all unread notifications as read for this coach
      const { error } = await supabase
        .from('coach_notifications')
        .update({ read: true })
        .eq('coach_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, marked: 'all' });
    }

    if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('coach_notifications')
        .update({ read: true })
        .eq('coach_id', userId)
        .in('id', body.notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, marked: body.notificationIds.length });
    }

    return NextResponse.json({ error: 'Provide notificationIds array or { all: true }' }, { status: 400 });
  } catch (err) {
    console.error('Mark read error:', err);
    return NextResponse.json({ error: 'Failed', details: err.message }, { status: 500 });
  }
}
