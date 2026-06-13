import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

interface PortalRef {
  id: string;
  client_name: string;
  project_name: string;
  user_id: string;
  magic_token: string;
}

interface OverdueMilestone {
  id: string;
  title: string;
  responsibility: string;
  deadline_escalation_at: string;
  client_portals: PortalRef | PortalRef[] | null;
}

interface OverdueFile {
  id: string;
  file_name: string;
  deadline_escalation_at: string;
  client_portals: PortalRef | PortalRef[] | null;
}

// Supabase nested selects can return either an object or a 1-item array
// depending on relationship inference — this normalizes either shape.
function getPortal(ref: PortalRef | PortalRef[] | null): PortalRef | null {
  if (!ref) return null;
  return Array.isArray(ref) ? ref[0] ?? null : ref;
}

export async function GET(req: Request) {
  // Secure the endpoint — Vercel automatically sends this header on Cron
  // invocations when CRON_SECRET is set as an environment variable.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  try {
    // ── 1. Find overdue, incomplete milestones that haven't been notified ──
    const { data: overdueMilestones, error: msErr } = await supabaseAdmin
      .from('portal_milestones')
      .select(`
        id, title, responsibility, deadline_escalation_at,
        client_portals ( id, client_name, project_name, user_id, magic_token )
      `)
      .eq('status', 'incomplete')
      .not('deadline_escalation_at', 'is', null)
      .lte('deadline_escalation_at', now)
      .is('reminder_sent_at', null);

    if (msErr) throw msErr;

    // ── 2. Find overdue, pending-review files that haven't been notified ──
    const { data: overdueFiles, error: fErr } = await supabaseAdmin
      .from('portal_files')
      .select(`
        id, file_name, deadline_escalation_at,
        client_portals ( id, client_name, project_name, user_id, magic_token )
      `)
      .eq('status', 'pending_review')
      .not('deadline_escalation_at', 'is', null)
      .lte('deadline_escalation_at', now)
      .is('reminder_sent_at', null);

    if (fErr) throw fErr;

    const milestones = (overdueMilestones || []) as unknown as OverdueMilestone[];
    const files = (overdueFiles || []) as unknown as OverdueFile[];

    if (milestones.length === 0 && files.length === 0) {
      return NextResponse.json({ message: 'No overdue items found.' });
    }

    // ── 3. Group everything by manager (user_id) ────────────────────────
    type PortalGroup = {
      portal: PortalRef;
      milestoneTitles: string[];
      fileNames: string[];
    };

    const byManager = new Map<string, Map<string, PortalGroup>>();
    const sentMilestoneIds: string[] = [];
    const sentFileIds: string[] = [];

    for (const m of milestones) {
      const portal = getPortal(m.client_portals);
      if (!portal) continue;

      if (!byManager.has(portal.user_id)) byManager.set(portal.user_id, new Map());
      const portalMap = byManager.get(portal.user_id)!;

      if (!portalMap.has(portal.id)) {
        portalMap.set(portal.id, { portal, milestoneTitles: [], fileNames: [] });
      }
      portalMap.get(portal.id)!.milestoneTitles.push(m.title);
      sentMilestoneIds.push(m.id);
    }

    for (const f of files) {
      const portal = getPortal(f.client_portals);
      if (!portal) continue;

      if (!byManager.has(portal.user_id)) byManager.set(portal.user_id, new Map());
      const portalMap = byManager.get(portal.user_id)!;

      if (!portalMap.has(portal.id)) {
        portalMap.set(portal.id, { portal, milestoneTitles: [], fileNames: [] });
      }
      portalMap.get(portal.id)!.fileNames.push(f.file_name);
      sentFileIds.push(f.id);
    }

    // ── 4. Send one digest email per manager ────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    let emailsSent = 0;
    const errors: string[] = [];

    for (const [userId, portalMap] of byManager.entries()) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (userErr || !userData?.user?.email) {
        errors.push(`Could not resolve email for user ${userId}`);
        continue;
      }

      const managerEmail = userData.user.email;

      const portalSections = Array.from(portalMap.values()).map(({ portal, milestoneTitles, fileNames }) => {
        const portalLink = `${appUrl}/portal/${portal.magic_token}`;
        let section = `<div style="margin-bottom:24px;padding:16px;border:1px solid #27272a;border-radius:12px;">`;
        section += `<p style="margin:0 0 4px;font-weight:700;color:#fff;">${portal.client_name} — ${portal.project_name}</p>`;
        section += `<p style="margin:0 0 12px;"><a href="${portalLink}" style="color:#a1a1aa;font-size:12px;">${portalLink}</a></p>`;

        if (milestoneTitles.length > 0) {
          section += `<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#fbbf24;">Overdue Milestones</p><ul style="margin:0 0 12px;padding-left:18px;">`;
          for (const title of milestoneTitles) {
            section += `<li style="font-size:13px;color:#e4e4e7;">${title}</li>`;
          }
          section += `</ul>`;
        }

        if (fileNames.length > 0) {
          section += `<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#fbbf24;">Pending File Reviews</p><ul style="margin:0;padding-left:18px;">`;
          for (const name of fileNames) {
            section += `<li style="font-size:13px;color:#e4e4e7;">${name}</li>`;
          }
          section += `</ul>`;
        }

        section += `</div>`;
        return section;
      }).join('');

      const html = `
        <div style="font-family:sans-serif;background:#18181b;padding:24px;border-radius:16px;max-width:560px;margin:0 auto;">
          <h2 style="color:#fff;margin:0 0 4px;font-size:18px;">OpenBillet — Deadline Reminder</h2>
          <p style="color:#a1a1aa;font-size:13px;margin:0 0 24px;">The following items have passed their reminder window and need attention.</p>
          ${portalSections}
        </div>
      `;

      try {
        await resend.emails.send({
          from: 'OpenBillet Notifications <notifications@openbillet.com>',
          to: managerEmail,
          subject: 'OpenBillet: Overdue items need your attention',
          html,
        });
        emailsSent++;
      } catch (sendErr: any) {
        errors.push(`Failed sending to ${managerEmail}: ${sendErr.message}`);
      }
    }

    // ── 5. Mark everything as notified so it doesn't fire again ─────────
    if (sentMilestoneIds.length > 0) {
      await supabaseAdmin
        .from('portal_milestones')
        .update({ reminder_sent_at: now })
        .in('id', sentMilestoneIds);
    }

    if (sentFileIds.length > 0) {
      await supabaseAdmin
        .from('portal_files')
        .update({ reminder_sent_at: now })
        .in('id', sentFileIds);
    }

    return NextResponse.json({
      message: 'Deadline check complete.',
      emailsSent,
      milestonesFlagged: sentMilestoneIds.length,
      filesFlagged: sentFileIds.length,
      errors,
    });

  } catch (err: any) {
    console.error(`❌ Cron deadline check error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}