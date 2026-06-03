import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const logs: string[] = [];

  try {
    const { data: staleMilestones } = await supabaseAdmin
      .from('portal_milestones')
      .select('id, title, payment_request, client_portals(client_name, client_email, magic_token)')
      .eq('status', 'incomplete')
      .lte('deadline_escalation_at', now);

    if (staleMilestones && staleMilestones.length > 0) {
      for (const m of staleMilestones) {
        const portalInfo = m.client_portals as any;
        const clientEmail = portalInfo?.client_email;
        const token = portalInfo?.magic_token;

        if (clientEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'OpenBillet Notifications <notifications@openbillet.com>',
              to: [clientEmail],
              subject: '[Action Required] Project Milestone Reminder',
              html: `
                <div style="font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:32px;border-radius:16px;max-width:600px;">
                  <h2 style="color:#fff;font-size:18px;margin-bottom:4px;">Milestone Reminder</h2>
                  <hr style="border:0;border-top:1px solid #27272a;margin:20px 0;" />
                  <p style="font-size:14px;line-height:1.6;">Hello ${portalInfo.client_name},</p>
                  <p style="font-size:14px;line-height:1.6;">The following milestone requires your attention:</p>
                  <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:20px 0;border-left:4px solid #f59e0b;">
                    ${m.title}${m.payment_request ? ` — ${m.payment_request}` : ''}
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}" style="display:inline-block;background:#fff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
                    Access Your Workspace →
                  </a>
                </div>
              `,
            }),
          });
        }

        // Clear the escalation timer so it doesn't re-fire
        await supabaseAdmin
          .from('portal_milestones')
          .update({ deadline_escalation_at: null })
          .eq('id', m.id);

        logs.push(`Dispatched reminder for: ${m.title}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      fired: logs.length,
      details: logs,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}