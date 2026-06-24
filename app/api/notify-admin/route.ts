import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { portalId, actionType, clientName, projectName, detail } = await req.json();

    if (!portalId || !actionType) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Look up the manager's email from auth.users via the portal's user_id
    const { data: portal } = await supabaseAdmin
      .from('client_portals')
      .select('user_id')
      .eq('id', portalId)
      .single();

    if (!portal) return NextResponse.json({ error: 'Portal not found.' }, { status: 404 });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(portal.user_id);
    const managerEmail = user?.email;

    if (!managerEmail) return NextResponse.json({ error: 'Manager email not found.' }, { status: 404 });

    // Build email content based on action type
    const subjects: Record<string, string> = {
      message: `💬 New message from ${clientName}`,
      proposal_accepted: `✅ Proposal accepted by ${clientName}`,
      proposal_declined: `❌ Proposal declined by ${clientName}`,
      job_no_show: `🚫 Worker reported a no-show — ${projectName}`,
      job_reschedule_requested: `🔄 Worker requested a reschedule — ${projectName}`,
      job_completed_paid: `✅ Job completed, payment collected — ${projectName}`,
      job_completed_awaiting_payment: `✅ Job completed, awaiting client payment — ${projectName}`,
      job_completion_undone: `↩️ Worker undid job completion — ${projectName}`,
    };

    const actionLines: Record<string, string> = {
      message: `${clientName} sent you a new message on <strong>${projectName}</strong>:`,
      proposal_accepted: `${clientName} has <strong>accepted</strong> your proposal on <strong>${projectName}</strong>.`,
      proposal_declined: `${clientName} has <strong>declined</strong> your proposal on <strong>${projectName}</strong>.`,
      job_no_show: `A scheduled job on <strong>${projectName}</strong> was marked as a <strong>no-show</strong> by the assigned worker.`,
      job_reschedule_requested: `The assigned worker has requested a <strong>reschedule</strong> for a job on <strong>${projectName}</strong>.`,
      job_completed_paid: `A job has been <strong>completed</strong> on <strong>${projectName}</strong> and payment was collected on-site.`,
      job_completed_awaiting_payment: `A job has been <strong>completed</strong> on <strong>${projectName}</strong>. The client still needs to complete their online payment.`,
      job_completion_undone: `A worker has <strong>undone a job completion</strong> on <strong>${projectName}</strong>. The job has been reset to active.`,
    };  

    const emailHtml = `
      <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Client Activity</p>
        <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 20px;">${projectName}</h2>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 16px;">${actionLines[actionType]}</p>
        ${detail ? `
        <div style="background:#27272a;border-left:3px solid #52525b;padding:14px 16px;border-radius:8px;margin:0 0 24px;">
          <p style="font-size:14px;color:#f4f4f5;margin:0;line-height:1.6;">${detail}</p>
        </div>
        ` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#ffffff;color:#09090b;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
          Open Dashboard →
        </a>
        <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
        <p style="font-size:11px;color:#52525b;margin:0;">You're receiving this because a client took action on your OpenBillet portal.</p>
      </div>
    `;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: managerEmail,
      subject: subjects[actionType] || `New activity on ${projectName}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Notify admin error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}