import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // 1. Initialize the modern Supabase SSR Client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method can be ignored if called from a Middleware or Route Handler
            }
          },
        },
      }
    );

    // 2. Fetch the active user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized configuration access request.' }, { status: 401 });
    }

    // 3. Parse the incoming request body to see which price ID they are buying
    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing required priceId target parameter.' }, { status: 400 });
    }

    // 4. Create the secure Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
    });

    // 5. Return the session URL back to your front-end
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error(`❌ Checkout Session Generation Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}