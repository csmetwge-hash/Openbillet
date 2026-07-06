import { supabase } from '@/lib/supabase';

const GRACE_PERIOD_DAYS = 3;

export async function resolveWorkspaceAccess(): Promise<{
  ownerId: string | null;
  currentUserId: string | null;
  role: 'owner' | 'admin' | 'user' | 'worker' | null;
  blocked: boolean;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ownerId: null, currentUserId: null, role: null, blocked: false };

  const { data: membership } = await supabase
    .from('team_members')
    .select('owner_user_id, role, status')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const ownerId = membership ? membership.owner_user_id : user.id;
  const role = membership ? (membership.role as 'admin' | 'user' | 'worker') : 'owner';

  const { data: sub } = await supabase
    .from('manager_subscriptions')
    .select('subscription_status, status_changed_at')
    .eq('user_id', ownerId)
    .maybeSingle();

  let blocked = false;
  if (sub && (sub.subscription_status === 'trial_expired' || sub.subscription_status === 'inactive')) {
    if (sub.status_changed_at) {
      const daysSince = (Date.now() - new Date(sub.status_changed_at).getTime()) / (24 * 60 * 60 * 1000);
      blocked = daysSince >= GRACE_PERIOD_DAYS;
    }
  }

  return { ownerId, currentUserId: user.id, role, blocked };
}