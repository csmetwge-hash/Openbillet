import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: Request) {
  try {
    const internalSecret = req.headers.get('x-internal-secret');
    const isInternalCall = internalSecret === process.env.INTERNAL_API_SECRET;

    const { portalId, actionType, clientName, projectName, detail, magicToken } = await req.json();

    if (!portalId || !actionType) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Look up the manager's email from auth.users via the portal's user_id
    const { data: portal } = await supabaseAdmin
      .from('client_portals')
      .select('user_id, magic_token')
      .eq('id', portalId)
      .single();

    if (!portal) return NextResponse.json({ error: 'Portal not found.' }, { status: 404 });

    if (!isInternalCall) {
      if (!magicToken || magicToken !== portal.magic_token) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }
    }

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(portal.user_id);
    const managerEmail = user?.email;

    if (!managerEmail) return NextResponse.json({ error: 'Manager email not found.' }, { status: 404 });

    const safeClientName = clientName ? escapeHtml(clientName) : '';
    const safeProjectName = projectName ? escapeHtml(projectName) : '';
    const safeDetail = detail ? escapeHtml(detail) : '';

    // Build email content based on action type
    const subjects: Record<string, string> = {
      message: `💬 New message from ${safeClientName}`,
      proposal_accepted: `✅ Proposal accepted by ${safeClientName}`,
      proposal_declined: `❌ Proposal declined by ${safeClientName}`,
      job_no_show: `🚫 Worker reported a no-show — ${safeProjectName}`,
      job_reschedule_requested: `🔄 Worker requested a reschedule — ${safeProjectName}`,
      job_completed_paid: `✅ Job completed, payment collected — ${safeProjectName}`,
      job_completed_no_payment: `✅ Job completed — ${safeProjectName}`,
      job_completed_awaiting_payment: `✅ Job completed, awaiting client payment — ${safeProjectName}`,
      job_completion_undone: `↩️ Worker undid job completion — ${safeProjectName}`,
      client_action_completed: `✅ Client completed a required action — ${safeProjectName}`,
    };
    const actionLines: Record<string, string> = {
      message: `${safeClientName} sent you a new message on <strong>${safeProjectName}</strong>:`,
      proposal_accepted: `${safeClientName} has <strong>accepted</strong> your proposal on <strong>${safeProjectName}</strong>.`,
      proposal_declined: `${safeClientName} has <strong>declined</strong> your proposal on <strong>${safeProjectName}</strong>.`,
      job_no_show: `A scheduled job on <strong>${safeProjectName}</strong> was marked as a <strong>no-show</strong> by the assigned worker.`,
      job_reschedule_requested: `The assigned worker has requested a <strong>reschedule</strong> for a job on <strong>${safeProjectName}</strong>.`,
      job_completed_paid: `A job has been <strong>completed</strong> on <strong>${safeProjectName}</strong> and payment was collected on-site.`,
      job_completed_no_payment: `A job has been <strong>completed</strong> on <strong>${safeProjectName}</strong>.`,
      job_completion_undone: `A worker has <strong>undone a job completion</strong> on <strong>${safeProjectName}</strong>. The job has been reset to active.`,
      client_action_completed: `Your client has <strong>completed a required action</strong> on <strong>${safeProjectName}</strong>${safeDetail ? `: ${safeDetail}` : ''}.`,
    };

    const emailHtml = `
      <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Activity Alert</p>
        <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 8px;">${subjects[actionType] || `New activity`}</h2>
        <p style="font-size:12px;color:#71717a;margin:0 0 20px;">Portal: <strong style="color:#a1a1aa;">${safeProjectName}</strong> · Client: <strong style="color:#a1a1aa;">${safeClientName}</strong></p>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 16px;">${actionLines[actionType] || ''}</p>
        ${safeDetail ? `
        <div style="background:#27272a;border-left:3px solid #52525b;padding:14px 16px;border-radius:8px;margin:0 0 24px;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;margin:0 0 6px;">Details</p>
          <p style="font-size:14px;color:#f4f4f5;margin:0;line-height:1.6;">${safeDetail}</p>
        </div>
        ` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" style="display:inline-block;background:#ffffff;color:#09090b;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
          Open Control Center →
        </a>
        <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
        <p style="font-size:11px;color:#52525b;margin:0;">OpenBillet · openbillet.com</p>
      </div>
    `;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: managerEmail,
      subject: subjects[actionType] || `New activity on ${safeProjectName}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Notify admin error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}