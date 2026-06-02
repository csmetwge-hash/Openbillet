import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Map your live/test Stripe Price IDs to your platform's operational tiers
const PRICE_TIER_MAP: { [key: string]: string } = {
  'price_starter_id': 'starter', // <-- Replace with your actual Stripe Price ID
  'price_pro_id': 'pro_unlimited'  // <-- Replace with your actual Stripe Price ID
};

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing security configuration parameters.' }, { status: 400 });
  }

  let event;

  // 1. Authenticate that the payload signature genuinely originated from Stripe
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const eventType = event.type;
  const session = event.data.object as any;

  try {
    // CASE 1: Manager completes initial checkout setup
    if (eventType === 'checkout.session.completed') {
      const customerId = session.customer;
      // Pulling userId passed during checkout initialization session metadata
      const userId = session.metadata?.userId || session.client_reference_id; 
      
      // Look up line items to identify exactly what tier they bought
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id || '';
      const selectedTier = PRICE_TIER_MAP[priceId] || 'starter';

      if (!userId) {
        return NextResponse.json({ error: 'Missing user reference identification tracking parameters.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('manager_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          subscription_status: 'active',
          tier_level: selectedTier,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log(`✅ Subscription record instantiated successfully for User: ${userId}`);
    }

    // CASE 2: Subscription tier changes, upgrades, or passes monthly renewal checkpoints
    if (eventType === 'customer.subscription.updated') {
      const customerId = session.customer;
      const status = session.status; // 'active', 'past_due', 'unpaid', 'canceled'
      const priceId = session.items.data[0].price.id;
      const selectedTier = PRICE_TIER_MAP[priceId] || 'starter';

      const { error } = await supabase
        .from('manager_subscriptions')
        .update({
          stripe_price_id: priceId,
          subscription_status: status === 'active' ? 'active' : 'inactive',
          tier_level: selectedTier,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🔄 Subscription properties synchronized for Customer: ${customerId}`);
    }

    // CASE 3: Subscription is officially dropped or terminated by manager
    if (eventType === 'customer.subscription.deleted') {
      const customerId = session.customer;

      const { error } = await supabase
        .from('manager_subscriptions')
        .update({ 
          subscription_status: 'inactive', 
          tier_level: 'free', // Drops them to free tier (fails 3-pipeline barrier checks)
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🚫 Subscription successfully revoked for Customer: ${customerId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (dbError: any) {
    console.error(`❌ Supabase Database Sync Mutation Error: ${dbError.message}`);
    return NextResponse.json({ error: 'Internal server database transaction failure.' }, { status: 500 });
  }
}