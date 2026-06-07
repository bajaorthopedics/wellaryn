import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service role key for webhook — no user session available
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  let event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripe = getStripe();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);

          await supabase
            .from('profiles')
            .update({
              plan,
              stripe_customer_id: session.customer,
              subscription_id: session.subscription,
              subscription_status: 'active',
              plan_interval: subscription.items.data[0]?.plan?.interval || 'month',
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const plan = subscription.metadata?.plan || 'free';
          const status = subscription.cancel_at_period_end ? 'canceling' : subscription.status;

          await supabase
            .from('profiles')
            .update({
              plan: subscription.status === 'active' ? plan : 'free',
              subscription_status: status,
              plan_interval: subscription.items.data[0]?.plan?.interval || 'month',
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              plan: 'free',
              subscription_status: 'canceled',
              subscription_id: null,
              plan_interval: null,
              trial_ends_at: null,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
