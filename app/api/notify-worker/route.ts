import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { workerEmail, jobTitle, scheduledAt, clientName, projectName } = await req.json();

    if (!workerEmail || !jobTitle || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const formattedTime = new Date(scheduledAt).toLocaleString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    const emailHtml = `
      <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Schedule Update</p>
        <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 20px;">Job Rescheduled</h2>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Your job <strong>${jobTitle}</strong>${projectName ? ` (${projectName}${clientName ? ` — ${clientName}` : ''})` : ''} has a new scheduled time:</p>
        <div style="background:#27272a;padding:16px;border-radius:8px;font-weight:bold;font-size:14px;margin:0 0 24px;border-left:4px solid #f59e0b;">
          ${formattedTime}
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/worker" style="display:inline-block;background:#ffffff;color:#09090b;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:13px;">
          View My Jobs →
        </a>
      </div>
    `;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: workerEmail,
      subject: `Job rescheduled: ${jobTitle}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Notify worker error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}