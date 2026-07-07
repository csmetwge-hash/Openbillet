import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const [
      accountSettings,
      subscription,
      teamMembers,
      portals,
      recurringSchedules,
    ] = await Promise.all([
      supabaseAdmin.from('account_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('manager_subscriptions').select('subscription_status, tier_level, trial_started_at, trial_ends_at, created_at').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('team_members').select('member_email, role, status, phone_number, created_at').eq('owner_user_id', user.id),
      supabaseAdmin.from('client_portals').select('*').eq('user_id', user.id),
      supabaseAdmin.from('recurring_schedules').select('*').eq('owner_user_id', user.id),
    ]);

    const portalIds = (portals.data || []).map(p => p.id);

    let milestones: any[] = [], files: any[] = [], notes: any[] = [], proposals: any[] = [], activity: any[] = [];

    if (portalIds.length > 0) {
      const [msRes, fRes, nRes, pRes, aRes] = await Promise.all([
        supabaseAdmin.from('portal_milestones').select('*').in('portal_id', portalIds),
        supabaseAdmin.from('portal_files').select('id, portal_id, file_name, file_path, status, created_at').in('portal_id', portalIds),
        supabaseAdmin.from('portal_notes').select('*').in('portal_id', portalIds),
        supabaseAdmin.from('portal_proposals').select('*, proposal_line_items(*)').in('portal_id', portalIds),
        supabaseAdmin.from('portal_activity').select('*').in('portal_id', portalIds),
      ]);
      milestones = msRes.data || [];
      files = fRes.data || [];
      notes = nRes.data || [];
      proposals = pRes.data || [];
      activity = aRes.data || [];
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: user.email,
        user_id: user.id,
        created_at: user.created_at,
        settings: accountSettings.data || null,
        subscription: subscription.data || null,
      },
      team_members: teamMembers.data || [],
      recurring_schedules: recurringSchedules.data || [],
      portals: (portals.data || []).map(p => ({
        ...p,
        milestones: milestones.filter(m => m.portal_id === p.id),
        files: files.filter(f => f.portal_id === p.id),
        messages: notes.filter(n => n.portal_id === p.id),
        proposals: proposals.filter(pr => pr.portal_id === p.id),
        activity: activity.filter(a => a.portal_id === p.id),
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="openbillet-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });

  } catch (err: any) {
    console.error('Export data error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}