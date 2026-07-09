import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
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

    const { confirmText } = await req.json();
    if (confirmText !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation text did not match.' }, { status: 400 });
    }

    const userId = user.id;

    // 1. Require the subscription to already be canceled before allowing deletion
    const { data: sub } = await supabaseAdmin
      .from('manager_subscriptions')
      .select('subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (sub?.subscription_status === 'active') {
      return NextResponse.json({
        error: 'Please cancel your subscription first via Manage Billing, then come back to delete your account.',
      }, { status: 400 });
    }

    // 2. Gather portal + milestone IDs before deleting anything
    const { data: portals } = await supabaseAdmin
      .from('client_portals')
      .select('id')
      .eq('user_id', userId);
    const portalIds = (portals || []).map(p => p.id);

    let milestoneIds: string[] = [];
    let proposalIds: string[] = [];

    if (portalIds.length > 0) {
      const { data: milestones } = await supabaseAdmin
        .from('portal_milestones')
        .select('id')
        .in('portal_id', portalIds);
      milestoneIds = (milestones || []).map(m => m.id);

      const { data: proposals } = await supabaseAdmin
        .from('portal_proposals')
        .select('id')
        .in('portal_id', portalIds);
      proposalIds = (proposals || []).map(p => p.id);
    }

    // 3. Best-effort storage cleanup
    try {
      const { data: logoFiles } = await supabaseAdmin.storage.from('brand-assets').list(userId);
      if (logoFiles && logoFiles.length > 0) {
        await supabaseAdmin.storage.from('brand-assets').remove(logoFiles.map(f => `${userId}/${f.name}`));
      }
    } catch (err) { console.error('Storage cleanup (brand-assets) failed:', err); }

    for (const milestoneId of milestoneIds) {
      try {
        const { data: workerUploads } = await supabaseAdmin.storage.from('portal-files').list(`worker-uploads/${milestoneId}`);
        if (workerUploads && workerUploads.length > 0) {
          await supabaseAdmin.storage.from('portal-files').remove(workerUploads.map(f => `worker-uploads/${milestoneId}/${f.name}`));
        }
        const { data: jobMsgFiles } = await supabaseAdmin.storage.from('portal-files').list(`job-messages/${milestoneId}`);
        if (jobMsgFiles && jobMsgFiles.length > 0) {
          await supabaseAdmin.storage.from('portal-files').remove(jobMsgFiles.map(f => `job-messages/${milestoneId}/${f.name}`));
        }
      } catch (err) { console.error(`Storage cleanup (milestone ${milestoneId}) failed:`, err); }
    }

    for (const portalId of portalIds) {
      try {
        const { data: portalDirs } = await supabaseAdmin.storage.from('milestone-photos').list(portalId);
        if (portalDirs) {
          for (const dir of portalDirs) {
            const { data: photoFiles } = await supabaseAdmin.storage.from('milestone-photos').list(`${portalId}/${dir.name}`);
            if (photoFiles && photoFiles.length > 0) {
              await supabaseAdmin.storage.from('milestone-photos').remove(photoFiles.map(f => `${portalId}/${dir.name}/${f.name}`));
            }
          }
        }
      } catch (err) { console.error(`Storage cleanup (portal ${portalId}) failed:`, err); }
    }

    // 4. Delete database rows, children before parents
    if (milestoneIds.length > 0) {
      await supabaseAdmin.from('job_messages').delete().in('milestone_id', milestoneIds);
    }
    if (proposalIds.length > 0) {
      await supabaseAdmin.from('proposal_line_items').delete().in('proposal_id', proposalIds);
    }
    if (portalIds.length > 0) {
      await supabaseAdmin.from('portal_proposals').delete().in('portal_id', portalIds);
      await supabaseAdmin.from('portal_activity').delete().in('portal_id', portalIds);
      await supabaseAdmin.from('portal_notes').delete().in('portal_id', portalIds);
      await supabaseAdmin.from('portal_files').delete().in('portal_id', portalIds);
      await supabaseAdmin.from('portal_milestones').delete().in('portal_id', portalIds);
    }
    await supabaseAdmin.from('recurring_schedules').delete().eq('owner_user_id', userId);
    if (portalIds.length > 0) {
      await supabaseAdmin.from('client_portals').delete().eq('user_id', userId);
    }
    await supabaseAdmin.from('team_members').delete().eq('owner_user_id', userId);
    await supabaseAdmin.from('team_members').delete().eq('member_user_id', userId);
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);
    await supabaseAdmin.from('account_settings').delete().eq('user_id', userId);
    await supabaseAdmin.from('manager_subscriptions').delete().eq('user_id', userId);

    // 5. Delete the actual auth user — point of no return
    const userEmail = user.email;
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteErr) throw authDeleteErr;

    // 6. Notify you that an account was deleted
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'OpenBillet Notifications <notifications@openbillet.com>',
        to: process.env.CONTACT_FORM_RECIPIENT || 'support@openbillet.com',
        subject: `Account deleted — ${userEmail}`,
        html: `
          <div style="font-family:sans-serif;padding:24px;">
            <p><strong>Account deleted:</strong> ${userEmail}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Portals removed:</strong> ${portalIds.length}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
      });
    } catch (notifyErr) {
      console.error('Deletion notification email failed:', notifyErr);
    }

    // 7. Confirm to the person who deleted their own account
    if (userEmail) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'OpenBillet Support <notifications@openbillet.com>',
          to: userEmail,
          subject: 'Your OpenBillet account has been deleted',
          html: `
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
              <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet</p>
              <h2 style="font-size:18px;font-weight:900;color:#fff;margin:0 0 20px;">Account Deleted</h2>
              <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Your OpenBillet account and all associated data — client portals, milestones, messages, files, and team members — have been permanently deleted.</p>
              <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">This action cannot be undone. If you'd like to use OpenBillet again in the future, you're welcome to sign up for a new account at any time — you'll simply be starting fresh.</p>
              <hr style="border:0;border-top:1px solid #27272a;margin:24px 0 16px;" />
              <p style="font-size:11px;color:#52525b;margin:0;">If you didn't request this, or believe this was done in error, contact us immediately at support@openbillet.com.</p>
            </div>
          `,
        });
      } catch (notifyErr) {
        console.error('Deletion confirmation email to user failed:', notifyErr);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Delete account error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}