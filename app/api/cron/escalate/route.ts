import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'hq_automation_override_2026') {
    return NextResponse.json({ error: 'Unauthorized operational access.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const logs: string[] = [];

  try {
    // Gather stale items along with client contact links
    const { data: staleMilestones } = await supabase
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
          // CALL RESEND API GATEWAY VIA DIRECT HTTP FETCH
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'Agency Operations <ops@yourplatform.com>',
              to: [clientEmail],
              subject: '[Action Required] Project Portal Timeline Notification',
              html: `
                <div style="font-family: sans-serif; background: #18181b; color: #f4f4f5; padding: 32px; border-radius: 16px; max-width: 600px;">
                  <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 4px;">Operational Timeline Reminder</h2>
                  <p style="color: #a1a1aa; font-size: 12px; margin-top: 0;">Project Update Dispatch</p>
                  <hr style="border: 0; border-top: 1px solid #27272a; margin: 20px 0;" />
                  <p style="font-size: 14px; line-height: 1.6;">Hello ${portalInfo.client_name},</p>
                  <p style="font-size: 14px; line-height: 1.6;">This is an automated system notice that the following milestone tracking block requires immediate action or confirmation inputs:</p>
                  <div style="background: #27272a; padding: 16px; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    ${m.title} ${m.payment_request ? `(${m.payment_request})` : ''}
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/portal/${token}" style="display: inline-block; background: #ffffff; color: #09090b; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px; margin-top: 10px;">Access Secure Workspace Deck</a>
                </div>
              `
            })
          });
        }

        // Clean up the countdown matrix so it doesn't duplicate loops
        await supabase.from('portal_milestones').update({ deadline_escalation_at: null }).eq('id', m.id);
        logs.push(`Dispatched notification email for milestone: ${m.title}`);
      }
    }

    return NextResponse.json({ success: true, timestamp: now, metrics_fired: logs.length, details: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}