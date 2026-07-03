import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-server';

export async function POST(req: Request) {
  const { milestoneId, message } = await req.json();
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: milestone } = await supabaseAdmin
    .from('portal_milestones')
    .select('id, title, assigned_worker_id, portal_id, client_portals(user_id)')
    .eq('id', milestoneId)
    .single();

  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const portalOwnerId = (milestone.client_portals as any)?.user_id;

  let isSenderOwnerSide = user.id === portalOwnerId;
  if (!isSenderOwnerSide) {
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('owner_user_id', portalOwnerId)
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isSenderOwnerSide = membership?.role === 'admin';
  }

  let recipientUserId: string | null = null;

  if (isSenderOwnerSide) {
    if (milestone.assigned_worker_id) {
      const { data: worker } = await supabaseAdmin
        .from('team_members')
        .select('member_user_id')
        .eq('id', milestone.assigned_worker_id)
        .single();
      recipientUserId = worker?.member_user_id || null;
    }
  } else {
    recipientUserId = portalOwnerId;
  }

  if (recipientUserId) {
    await sendPushToUser(recipientUserId, {
      title: `New message — ${milestone.title}`,
      body: message,
      url: `/dashboard/portal/${milestone.portal_id}?milestone=${milestoneId}`,
    });
  }

  return NextResponse.json({ success: true });
}