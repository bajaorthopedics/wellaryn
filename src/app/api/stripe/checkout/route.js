import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  pro_month: process.env.STRIPE_PRO_MONTHLY,
  pro_year: process.env.STRIPE_PRO_YEARLY,
  team_month: process.env.STRIPE_TEAM_MONTHLY,
  team_year: process.env.STRIPE_TEAM_YEARLY,
};

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

    const body = await request.json();
    const { planId, interval } = body;

    if (!planId || !['pro', 'team'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const priceKey = `${planId}_${interval}`;
    const priceId = PRICE_MAP[priceKey];

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: session.user.email,
        metadata: {
          supabase_user_id: session.user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/profile?subscription=success`,
      cancel_url: `${origin}/pricing`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: session.user.id,
          plan: planId,
        },
      },
      metadata: {
        supabase_user_id: session.user.id,
        plan: planId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: err.message },
      { status: 500 }
    );
  }
}
