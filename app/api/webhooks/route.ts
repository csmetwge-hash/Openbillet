import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, PRICE_TIER_MAP } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook security configuration.' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const eventType = event.type;
  const session = event.data.object as any;

  try {
    // ── CASE 1: User completes checkout ─────────────────────────────────────
    if (eventType === 'checkout.session.completed') {
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId) {
        console.error('❌ No userId in session metadata');
        return NextResponse.json({ error: 'Missing userId in metadata.' }, { status: 400 });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id || '';
      const tier = PRICE_TIER_MAP[priceId] || 'standard';

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            tier_level: tier,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      console.log(`✅ Subscription created — user: ${userId}, tier: ${tier}`);
    }

    // ── CASE 2: Subscription upgraded, downgraded, or renewed ───────────────
    if (eventType === 'customer.subscription.updated') {
      const customerId = session.customer as string;
      const subscriptionId = session.id as string;
      const stripeStatus = session.status;
      const priceId = session.items?.data[0]?.price?.id || '';
      const tier = PRICE_TIER_MAP[priceId] || 'standard';
      const isActive = stripeStatus === 'active' || stripeStatus === 'trialing';

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          tier_level: tier,
          subscription_status: isActive ? 'active' : 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🔄 Subscription updated — customer: ${customerId}, tier: ${tier}`);
    }

    // ── CASE 3: Subscription cancelled ──────────────────────────────────────
    if (eventType === 'customer.subscription.deleted') {
      const customerId = session.customer as string;

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .update({
          subscription_status: 'inactive',
          tier_level: 'none',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🚫 Subscription cancelled — customer: ${customerId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err: any) {
    console.error(`❌ Webhook DB sync error: ${err.message}`);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}