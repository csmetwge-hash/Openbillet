import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import stripe from '@/lib/stripe'; // Assumes you have configured your stripe instance here
import { supabase } from '@/lib/supabase';

// Explicitly tell Next.js to treat this as a raw runtime streaming asset node
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing security configuration parameters.' }, { status: 400 });
  }

  let event;

  // 1. Verify the payload signature is legitimately sent from Stripe
  try {
    event = (stripe as any).webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 2. Route payload events based on Stripe server signals
  const eventType = event.type;

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object;

    // Extract the internal metadata identifiers we passed during checkout generation
    const userId = session.metadata?.userId;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId) {
      return NextResponse.json({ error: 'Checkout Session missing local metadata profiles tracking user reference.' }, { status: 400 });
    }

    // 3. Mutate the user's subscription access status directly inside your database
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        tier: 'pro',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (dbError) {
      console.error(`❌ Supabase Account Mutation Sync Error: ${dbError.message}`);
      return NextResponse.json({ error: 'Database record mutation lookup framework failure.' }, { status: 500 });
    }

    console.log(`✅ User profile account linked to ID ${userId} successfully elevated to Pro tier parameters.`);
  }

  // Acknowledge receipt of data to Stripe's listeners
  return NextResponse.json({ received: true }, { status: 200 });
}