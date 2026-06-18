import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { clientEmail, clientName, projectName, actionType, assetName, portalToken } = await req.json();

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail.' }, { status: 400 });
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}`;
    const actionLine = actionType === 'file'
      ? `New deliverable uploaded: <strong>${assetName}</strong>`
      : `A new milestone has been assigned to your project roadmap.`;

    const emailHtml = `
      <div style="background-color:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Workspace Notification</p>
        <h2 style="font-size:20px;font-weight:900;color:#ffffff;margin:0 0 24px;">${projectName}</h2>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Hello ${clientName},</p>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">${actionLine}</p>
        <a href="${portalUrl}" style="display:inline-block;background:#ffffff;color:#09090b;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
          View Your Portal →
        </a>
        <hr style="border:0;border-top:1px solid #27272a;margin:32px 0;" />
        <p style="font-size:11px;color:#52525b;margin:0;">This is an automated notification from OpenBillet. Do not reply to this email.</p>
      </div>
    `;

    const data = await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: clientEmail,
      subject: `[Action Required] ${projectName} — New Update`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}