import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { workerEmail, jobTitle, scheduledAt, clientName, projectName, type } = await req.json();
    const isAssignment = type === 'assignment';
    const isCancellation = type === 'cancellation';

    if (!workerEmail || !jobTitle) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // scheduledAt is required for reschedule but optional for assignment/cancellation
    if (!isAssignment && !isCancellation && !scheduledAt) {
      return NextResponse.json({ error: 'Missing scheduledAt for reschedule.' }, { status: 400 });
    }

    const formattedTime = scheduledAt ? new Date(scheduledAt).toLocaleString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }) : null;

    const headingText = isCancellation ? 'Job Canceled' : isAssignment ? 'New Job Assigned' : 'Job Rescheduled';

    const emailHtml = `
      <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Job Update</p>
        <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 20px;">${headingText}</h2>
        ${isCancellation ? `
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">A job assigned to you has been <strong style="color:#f87171;">canceled</strong>:</p>
        <div style="background:#27272a;padding:16px;border-radius:8px;font-size:14px;margin:0 0 24px;border-left:4px solid #f87171;">
          <p style="font-weight:bold;color:#fff;margin:0 0 4px;">${jobTitle}</p>
          ${projectName ? `<p style="color:#a1a1aa;margin:0 0 2px;font-size:13px;">${projectName}${clientName ? ` — ${clientName}` : ''}</p>` : ''}
          <p style="color:#a1a1aa;font-size:13px;margin:4px 0 0;">No action needed — this job has been removed.</p>
        </div>
        ` : isAssignment ? `
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">A new job has been assigned to you:</p>
        <div style="background:#27272a;padding:16px;border-radius:8px;font-size:14px;margin:0 0 24px;border-left:4px solid #f59e0b;">
          <p style="font-weight:bold;color:#fff;margin:0 0 4px;">${jobTitle}</p>
          ${projectName ? `<p style="color:#a1a1aa;margin:0 0 2px;font-size:13px;">${projectName}${clientName ? ` — ${clientName}` : ''}</p>` : ''}
          ${scheduledAt ? `<p style="color:#a1a1aa;font-size:13px;margin:6px 0 0;">📅 ${formattedTime}</p>` : ''}
        </div>
        ` : `
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Your job <strong>${jobTitle}</strong>${projectName ? ` (${projectName}${clientName ? ` — ${clientName}` : ''})` : ''} has a new scheduled time:</p>
        <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:0 0 24px;border-left:4px solid #f59e0b;">
          ${formattedTime}
        </div>
        `}
        ${!isCancellation ? `
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/worker" style="display:inline-block;background:#ffffff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
          View My Jobs →
        </a>
        ` : ''}
        <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
        <p style="font-size:11px;color:#52525b;margin:0;">Powered by <a href="https://openbillet.com" style="color:#52525b;">OpenBillet</a></p>
      </div>
    `;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: workerEmail,
      subject: isCancellation ? `Job canceled: ${jobTitle}` : isAssignment ? `New job assigned: ${jobTitle}` : `Job rescheduled: ${jobTitle}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Notify worker error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}