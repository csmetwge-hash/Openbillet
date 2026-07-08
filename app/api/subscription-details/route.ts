import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { data: sub } = await supabaseAdmin
      .from('manager_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found.' }, { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = subscription.items.data[0];
    const price = item?.price;

    return NextResponse.json({
      interval: price?.recurring?.interval || null,
      amount: price?.unit_amount ? price.unit_amount / 100 : null,
      currency: price?.currency || 'usd',
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

  } catch (err: any) {
    console.error('Subscription details error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}