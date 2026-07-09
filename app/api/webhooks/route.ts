import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
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
    // ── Checkout completed ───────────────────────────────────────────────────
    if (eventType === 'checkout.session.completed') {
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId) {
        console.error('❌ No userId in session metadata');
        return NextResponse.json({ error: 'Missing userId in metadata.' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: process.env.STRIPE_PRICE_ID || '',
            tier_level: 'pro_unlimited', // single plan — always full access
            subscription_status: 'active',
            status_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      console.log(`✅ Subscription created — user: ${userId}`);

      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'OpenBillet Notifications <notifications@openbillet.com>',
          to: process.env.CONTACT_FORM_RECIPIENT || 'support@openbillet.com',
          subject: `🎉 New subscriber — ${session.customer_details?.email || userId}`,
          html: `
            <div style="font-family:sans-serif;padding:24px;">
              <p><strong>New subscription!</strong></p>
              <p><strong>Email:</strong> ${session.customer_details?.email || 'Unknown'}</p>
              <p><strong>User ID:</strong> ${userId}</p>
              <p><strong>Stripe Customer:</strong> ${customerId}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
          `,
        });
      } catch (notifyErr) {
        console.error('New subscriber notification email failed:', notifyErr);
      }
    }

    // ── Subscription updated / renewed ───────────────────────────────────────
    if (eventType === 'customer.subscription.updated') {
      const customerId = session.customer as string;
      const stripeStatus = session.status;
      const isActive = stripeStatus === 'active' || stripeStatus === 'trialing';

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .update({
          subscription_status: isActive ? 'active' : 'inactive',
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🔄 Subscription updated — customer: ${customerId}, status: ${stripeStatus}`);
    }

    // ── Subscription cancelled ───────────────────────────────────────────────
    if (eventType === 'customer.subscription.deleted') {
      const customerId = session.customer as string;

      const { error } = await supabaseAdmin
        .from('manager_subscriptions')
        .update({
          subscription_status: 'inactive',
          tier_level: 'none',
          stripe_subscription_id: null,
          status_changed_at: new Date().toISOString(),
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