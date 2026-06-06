import { supabase } from '@/lib/supabase';

/**
 * Resolves the owner user_id for a given authenticated user.
 * - If the user is an account owner, returns their own user_id.
 * - If the user is a team member, returns the owner's user_id.
 * Also returns the current user's role: 'owner', 'admin', or 'user'.
 */
export async function resolveWorkspaceAccess(): Promise<{
  ownerId: string | null;
  currentUserId: string | null;
  role: 'owner' | 'admin' | 'user' | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ownerId: null, currentUserId: null, role: null };

  // Check if this user is a team member of someone else's workspace
  const { data: membership } = await supabase
    .from('team_members')
    .select('owner_user_id, role, status')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership) {
    return {
      ownerId: membership.owner_user_id,
      currentUserId: user.id,
      role: membership.role as 'admin' | 'user',
    };
  }

  // Otherwise they are the owner
  return {
    ownerId: user.id,
    currentUserId: user.id,
    role: 'owner',
  };
}