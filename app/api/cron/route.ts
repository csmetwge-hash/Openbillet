import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-server';

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: [to],
      subject,
      html,
    }),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const logs: string[] = [];

  // Cache manager email lookups so we don't hit the auth API repeatedly
  // for the same manager across multiple overdue items.
  const managerEmailCache = new Map<string, string | null>();
  const getManagerEmail = async (userId: string): Promise<string | null> => {
    if (managerEmailCache.has(userId)) return managerEmailCache.get(userId)!;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = !error && data?.user?.email ? data.user.email : null;
    managerEmailCache.set(userId, email);
    return email;
  };

  try {
    // ── 1. Overdue milestones → notify client AND manager ────────────────
    const { data: staleMilestones } = await supabaseAdmin
      .from('portal_milestones')
      .select('id, title, payment_request, client_portals(client_name, client_email, magic_token, user_id, project_name)')
      .eq('status', 'incomplete')
      .not('deadline_escalation_at', 'is', null)
      .lte('deadline_escalation_at', now);

    if (staleMilestones && staleMilestones.length > 0) {
      for (const m of staleMilestones) {
        const portalInfo = m.client_portals as any;
        const clientEmail = portalInfo?.client_email;
        const token = portalInfo?.magic_token;
        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;

        // Notify the client
        if (clientEmail) {
          await sendEmail(
            clientEmail,
            '[Action Required] Project Milestone Reminder',
            `
              <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">Milestone Reminder</h2>
                <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                <p style="font-size:14px;line-height:1.6;">Hello ${portalInfo.client_name},</p>
                <p style="font-size:14px;line-height:1.6;">The following milestone requires your attention:</p>
                <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #f59e0b;">
                  ${m.title}${m.payment_request ? ` — ${m.payment_request}` : ''}
                </div>
                <a href="${portalLink}" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                  Access Your Workspace →
                </a>
              </div>
            `
          );
        }

        // Notify the manager
        if (portalInfo?.user_id) {
          const managerEmail = await getManagerEmail(portalInfo.user_id);
          if (managerEmail) {
            await sendEmail(
              managerEmail,
              '[OpenBillet] Milestone overdue — client notified',
              `
                <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                  <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">Milestone Overdue</h2>
                  <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                  <p style="font-size:14px;line-height:1.6;"><strong>${portalInfo.client_name}</strong> — ${portalInfo.project_name}</p>
                  <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #f59e0b;">
                    ${m.title}${m.payment_request ? ` — ${m.payment_request}` : ''}
                  </div>
                  <p style="font-size:12px;color:#a1a1aa;">A reminder was sent to the client. No action needed unless you'd like to follow up directly.</p>
                  <a href="${portalLink}" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                    View Portal →
                  </a>
                </div>
              `
            );
          }
        }

        await supabaseAdmin
          .from('portal_milestones')
          .update({ deadline_escalation_at: null })
          .eq('id', m.id);

        logs.push(`Milestone reminder dispatched: ${m.title}`);
      }
    }

    // ── 2. Overdue file reviews → notify manager only ────────────────────
    const { data: staleFiles } = await supabaseAdmin
      .from('portal_files')
      .select('id, file_name, client_portals(client_name, project_name, magic_token, user_id)')
      .eq('status', 'pending_review')
      .not('deadline_escalation_at', 'is', null)
      .lte('deadline_escalation_at', now);

    if (staleFiles && staleFiles.length > 0) {
      for (const f of staleFiles) {
        const portalInfo = f.client_portals as any;
        const token = portalInfo?.magic_token;
        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;

        if (portalInfo?.user_id) {
          const managerEmail = await getManagerEmail(portalInfo.user_id);
          if (managerEmail) {
            await sendEmail(
              managerEmail,
              '[Action Required] File Review Reminder',
              `
                <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                  <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">File Review Pending</h2>
                  <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                  <p style="font-size:14px;line-height:1.6;"><strong>${portalInfo.client_name}</strong> — ${portalInfo.project_name}</p>
                  <p style="font-size:14px;line-height:1.6;">The following file is still awaiting your review:</p>
                  <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #f59e0b;">
                    ${f.file_name}
                  </div>
                  <a href="${portalLink}" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                    Review File →
                  </a>
                </div>
              `
            );
          }
        }

        await supabaseAdmin
          .from('portal_files')
          .update({ deadline_escalation_at: null })
          .eq('id', f.id);

        logs.push(`File review reminder dispatched: ${f.file_name}`);
      }
    }

    // ── 3. Recurring service reminders (1-2 days ahead) ────────────────
    const reminderWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: upcomingRecurring, error: recurringErr } = await supabaseAdmin
      .from('portal_milestones')
      .select('id, title, scheduled_at, assigned_worker_id, client_portals(client_name, client_email, magic_token, project_name)')
      .not('recurring_schedule_id', 'is', null)
      .neq('status', 'completed')
      .is('recurring_reminder_sent_at', null)
      .gte('scheduled_at', now)
      .lte('scheduled_at', reminderWindowEnd);

    if (recurringErr) {
      logs.push(`Recurring reminder query error: ${recurringErr.message}`);
    }

    if (upcomingRecurring && upcomingRecurring.length > 0) {
      for (const m of upcomingRecurring) {
        const portalInfo = m.client_portals as any;
        const whenStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

        if (portalInfo?.client_email) {
          const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalInfo.magic_token}`;
          await sendEmail(
            portalInfo.client_email,
            `Upcoming visit reminder — ${portalInfo.project_name}`,
            `
              <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">Upcoming Visit Reminder</h2>
                <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                <p style="font-size:14px;line-height:1.6;">Hello ${portalInfo.client_name},</p>
                <p style="font-size:14px;line-height:1.6;">This is a reminder about your upcoming scheduled service:</p>
                <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #3b82f6;">
                  ${m.title}${whenStr ? `<br/><span style="font-weight:normal;font-size:12px;color:#a1a1aa;">${whenStr}</span>` : ''}
                </div>
                <a href="${portalLink}" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                  View Your Portal →
                </a>
              </div>
            `
          );
        }

        if (m.assigned_worker_id) {
          const { data: worker } = await supabaseAdmin
            .from('team_members')
            .select('member_user_id, member_email')
            .eq('id', m.assigned_worker_id)
            .maybeSingle();
          if (worker?.member_user_id) {
            await sendPushToUser(worker.member_user_id, {
              title: 'Upcoming job reminder',
              body: `${m.title}${whenStr ? ` — ${whenStr}` : ''}`,
              url: '/worker',
            });
          }
          if (worker?.member_email) {
            await sendEmail(
              worker.member_email,
              `Upcoming job reminder — ${m.title}`,
              `
                <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                  <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">Upcoming Job Reminder</h2>
                  <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                  <p style="font-size:14px;line-height:1.6;">You have an upcoming scheduled job:</p>
                  <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #3b82f6;">
                    ${m.title}${whenStr ? `<br/><span style="font-weight:normal;font-size:12px;color:#a1a1aa;">${whenStr}</span>` : ''}
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/worker" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                    View Your Jobs →
                  </a>
                </div>
              `
            );
          }
        }

        await supabaseAdmin.from('portal_milestones').update({ recurring_reminder_sent_at: now }).eq('id', m.id);
        logs.push(`Recurring reminder dispatched: ${m.title}`);
      }
    }

    return NextResponse.json({ success: true, timestamp: now, fired: logs.length, details: logs });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}