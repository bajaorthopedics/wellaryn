import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

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

    // Get Stripe customer ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard/profile`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return NextResponse.json(
      { error: 'Failed to create portal session', details: err.message },
      { status: 500 }
    );
  }
}
