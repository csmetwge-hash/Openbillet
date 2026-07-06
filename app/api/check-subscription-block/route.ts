import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

const GRACE_PERIOD_DAYS = 3;

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ownerId: null, currentUserId: null, role: null, blocked: false });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('owner_user_id, role')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const ownerId = membership ? membership.owner_user_id : user.id;
  const role = membership ? membership.role : 'owner';

  const { data: sub } = await supabaseAdmin
    .from('manager_subscriptions')
    .select('subscription_status, status_changed_at')
    .eq('user_id', ownerId)
    .maybeSingle();

  let blocked = false;
  if (sub && (sub.subscription_status === 'trial_expired' || sub.subscription_status === 'inactive') && sub.status_changed_at) {
    const daysSince = (Date.now() - new Date(sub.status_changed_at).getTime()) / (24 * 60 * 60 * 1000);
    blocked = daysSince >= GRACE_PERIOD_DAYS;
  }

  return NextResponse.json({ ownerId, currentUserId: user.id, role, blocked });
}