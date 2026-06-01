import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TbEJKRyOVM6a0YbdfVO2eC2',   // ← Your Price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/pricing`,
    });

    console.log("✅ Checkout session created. Success URL:", `${baseUrl}/dashboard?success=true`);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("🔥 Stripe Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}