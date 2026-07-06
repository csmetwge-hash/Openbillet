import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Skip trial creation for team members / workers — they don't need a subscription record
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id, role')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membership) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Check if they already have a subscription record
    const { data: existing } = await supabaseAdmin
      .from('manager_subscriptions')
      .select('id, trial_started_at, subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Already has a record — don't overwrite
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    // Create trial record — 14 days from now
    const trialStarted = new Date();
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const { error } = await supabaseAdmin
      .from('manager_subscriptions')
      .insert({
        user_id: user.id,
        tier_level: 'pro_unlimited',
        subscription_status: 'trial',
        trial_started_at: trialStarted.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        status_changed_at: trialStarted.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, alreadyExists: true });
      }
      throw error;
    }

    // Fire welcome email for new accounts (non-blocking)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr);
    }

    return NextResponse.json({ success: true, trialEnds: trialEnds.toISOString() });

  } catch (err: any) {
    console.error('Start trial error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}