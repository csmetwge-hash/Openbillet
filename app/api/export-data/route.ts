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

    const [accountSettings, subscription, teamMembers, portals, recurringSchedules] = await Promise.all([
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

    const line = (s = '') => s + '\n';
    const rule = () => line('─'.repeat(60));
    let out = '';

    out += line('OPENBILLET — YOUR DATA EXPORT');
    out += line(`Generated: ${new Date().toLocaleString()}`);
    out += rule();
    out += line();
    out += line('ACCOUNT');
    out += line(`Email: ${user.email}`);
    out += line(`Account created: ${new Date(user.created_at).toLocaleDateString()}`);
    if (accountSettings.data?.brand_name) out += line(`Brand name: ${accountSettings.data.brand_name}`);
    if (subscription.data) {
      out += line(`Subscription status: ${subscription.data.subscription_status}`);
      if (subscription.data.trial_ends_at) out += line(`Trial ends: ${new Date(subscription.data.trial_ends_at).toLocaleDateString()}`);
    }
    out += line();

    const team = teamMembers.data || [];
    out += line(`TEAM (${team.length})`);
    if (team.length === 0) out += line('No team members.');
    team.forEach(t => {
      out += line(`- ${t.member_email} — ${t.role}, ${t.status}${t.phone_number ? `, ${t.phone_number}` : ''}`);
    });
    out += line();

    const recSchedules = recurringSchedules.data || [];
    if (recSchedules.length > 0) {
      out += line(`RECURRING SCHEDULES (${recSchedules.length})`);
      recSchedules.forEach(s => {
        out += line(`- ${s.title} — every ${s.interval_count} ${s.interval_unit}(s), status: ${s.status}`);
      });
      out += line();
    }

    out += rule();
    out += line(`CLIENT PORTALS (${(portals.data || []).length})`);
    out += rule();

    (portals.data || []).forEach(p => {
      out += line();
      out += line(`▶ ${p.client_name} — ${p.project_name}`);
      out += line(`  Status: ${p.status} | Created: ${new Date(p.created_at).toLocaleDateString()}`);
      if (p.client_email) out += line(`  Email: ${p.client_email}`);
      if (p.client_phone) out += line(`  Phone: ${p.client_phone}`);
      if (p.client_address) out += line(`  Address: ${p.client_address}`);
      if (p.notes) out += line(`  Internal notes: ${p.notes}`);

      const pMilestones = milestones.filter(m => m.portal_id === p.id);
      out += line();
      out += line(`  Milestones (${pMilestones.length}):`);
      if (pMilestones.length === 0) out += line('    None.');
      pMilestones.forEach(m => {
        out += line(`    - [${m.status}] ${m.title}${m.amount ? ` — ${m.amount}` : ''}${m.scheduled_at ? ` (scheduled ${new Date(m.scheduled_at).toLocaleDateString()})` : ''}`);
      });

      const pFiles = files.filter(f => f.portal_id === p.id);
      if (pFiles.length > 0) {
        out += line();
        out += line(`  Files (${pFiles.length}):`);
        pFiles.forEach(f => out += line(`    - ${f.file_name} (${f.status})`));
      }

      const pMessages = notes.filter(n => n.portal_id === p.id);
      if (pMessages.length > 0) {
        out += line();
        out += line(`  Messages (${pMessages.length}):`);
        pMessages.forEach(n => out += line(`    - [${new Date(n.created_at).toLocaleString()}] ${n.is_from_client ? 'Client' : 'You'}: ${n.message}`));
      }

      const pProposals = proposals.filter(pr => pr.portal_id === p.id);
      if (pProposals.length > 0) {
        out += line();
        out += line(`  Proposals (${pProposals.length}):`);
        pProposals.forEach(pr => out += line(`    - ${pr.title} (${pr.status})${pr.total_amount ? ` — ${pr.total_amount}` : ''}`));
      }

      out += line('  ' + '─'.repeat(40));
    });

    return new NextResponse(out, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="openbillet-data-export-${new Date().toISOString().slice(0, 10)}.txt"`,
      },
    });

  } catch (err: any) {
    console.error('Export data error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}