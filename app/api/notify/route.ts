import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { clientEmail, clientName, projectName, actionType, assetName } = await req.json();

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing target parameters.' }, { status: 400 });
    }

    // Build elegant, dark minimalistic monochromatic email layouts natively
    const emailHtml = `
      <div style="background-color: #09090b; color: #f4f4f5; font-family: sans-serif; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #27272a;">
        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa;">Workspace System Dispatch</span>
        <h2 style="font-size: 18px; font-weight: 900; tracking: -0.02em; margin-top: 4px; color: #ffffff;">Action Required: ${projectName}</h2>
        <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">Hello ${clientName},</p>
        <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">Our operations engineering team has pushed an update to your workspace: <strong>${actionType === 'file' ? `New Asset Drop: ${assetName}` : `New Roadmap Milestone Assigned`}</strong>.</p>
        <div style="margin-top: 32px; padding-top: 24px; border-t: 1px solid #18181b;">
          <p style="font-size: 11px; color: #71717a;">This is an automated operational sync transmission. Please navigate to your secure magic client token dashboard link to review or sign off.</p>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: 'Workspace Hub <onboarding@resend.dev>', // Upgrades to your custom domain parameters later
      to: clientEmail,
      subject: `[Workspace Action Required] New Update Available for ${projectName}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}