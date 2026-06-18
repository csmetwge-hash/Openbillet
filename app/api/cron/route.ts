import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    return NextResponse.json({ success: true, timestamp: now, fired: logs.length, details: logs });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}