import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = payload.type;
    const session = payload.data.object;

    // Map out your subscription price IDs to software tiers
    const priceTierMap: { [key: string]: string } = {
      'price_starter_id': 'starter',
      'price_pro_id': 'pro'
    };

    // Case 1: Client completes their initial purchase checkout sequence
    if (eventType === 'checkout.session.completed') {
      const customerId = session.customer;
      const clientUserId = session.client_reference_id; // Pass this as user.id inside checkout metadata
      const priceId = session.line_items?.data[0]?.price?.id || 'price_starter_id';
      const selectedTier = priceTierMap[priceId] || 'starter';

      await supabase
        .from('manager_subscriptions')
        .upsert({
          user_id: clientUserId,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          subscription_status: 'active',
          tier_level: selectedTier
        });
    }

    // Case 2: Subscription plan experiences an active profile alteration or renewal success
    if (eventType === 'customer.subscription.updated') {
      const customerId = session.customer;
      const status = session.status; // 'active', 'past_due', 'unpaid', 'canceled'
      const priceId = session.items.data[0].price.id;
      const selectedTier = priceTierMap[priceId] || 'starter';

      await supabase
        .from('manager_subscriptions')
        .update({
          subscription_status: status === 'active' ? 'active' : 'inactive',
          tier_level: selectedTier
        })
        .eq('stripe_customer_id', customerId);
    }

    // Case 3: Customer subscription is officially terminated or canceled
    if (eventType === 'customer.subscription.deleted') {
      const customerId = session.customer;

      await supabase
        .from('manager_subscriptions')
        .update({ subscription_status: 'inactive', tier_level: 'free' })
        .eq('stripe_customer_id', customerId);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}