import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { portalId, actionType, detail, hasPhotos } = await req.json();

    if (!portalId || !actionType) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Get portal + client email + brand
    const { data: portal } = await supabaseAdmin
      .from('client_portals')
      .select('client_name, client_email, project_name, magic_token, user_id, brand_name')
      .eq('id', portalId)
      .single();

    if (!portal?.client_email) {
      // No client email on file — skip silently
      return NextResponse.json({ success: true, skipped: true });
    }

    // Get brand name for the email
    const { data: settings } = await supabaseAdmin
      .from('account_settings')
      .select('brand_name')
      .eq('user_id', portal.user_id)
      .maybeSingle();

    const brandName = portal.brand_name || settings?.brand_name || 'Your Project Team';
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portal.magic_token}`;

    const subjects: Record<string, string> = {
      message: `New message on ${portal.project_name}`,
      proposal_sent: `Action required: Proposal ready for review — ${portal.project_name}`,
      milestone_completed: `Update: Milestone completed — ${portal.project_name}`,
      file_uploaded: `New file available — ${portal.project_name}`,
      milestone_client_action: `Action required on your project — ${portal.project_name}`,
      portal_created: `Your project workspace is ready — ${portal.project_name}`,
      schedule_updated: `Your project schedule has been updated — ${portal.project_name}`,
      schedule_set: `A date has been scheduled for your project — ${portal.project_name}`,
      milestone_canceled: `A scheduled item was canceled — ${portal.project_name}`,
      job_completed_paid: `Payment confirmed — ${portal.project_name}`,
      job_completed_awaiting_payment: `Job complete — payment required — ${portal.project_name}`,
      job_completed_no_payment: `Job completed — ${portal.project_name}`,
    };

    const bodyLines: Record<string, string> = {
      message: `You have a new message from your project team regarding <strong>${portal.project_name}</strong>.`,
      proposal_sent: `A proposal is ready for your review on <strong>${portal.project_name}</strong>. Please review and accept or decline at your earliest convenience.`,
      milestone_completed: `A milestone has been completed on <strong>${portal.project_name}</strong>${detail ? `: <strong>${detail}</strong>` : ''}.`,
      file_uploaded: `A new file has been uploaded to your project portal for <strong>${portal.project_name}</strong>${detail ? `: <strong>${detail}</strong>` : ''}.`,
      milestone_client_action: `A milestone requires your attention on <strong>${portal.project_name}</strong>${detail ? `: <strong>${detail}</strong>` : ''}.`,
      portal_created: `Your private project workspace has been created. You can track progress, view files, and communicate with your project team here at any time.`,
      schedule_updated: `Your schedule has been <strong>updated</strong> for <strong>${portal.project_name}</strong>. Please check your portal for the new timeline.`,
      schedule_set: `A date has been <strong>scheduled</strong> for <strong>${portal.project_name}</strong>. Please check your portal for details.`,
      milestone_canceled: `An item on your project <strong>${portal.project_name}</strong> has been canceled${detail ? `: <strong>${detail}</strong>` : ''}.`,
      job_completed_paid: `Great news — the job <strong>${detail}</strong> has been completed and your payment has been received. Thank you!`,
      job_completed_awaiting_payment: `The job <strong>${detail}</strong> has been completed. Please visit your portal to complete your payment.`,
      job_completed_no_payment: `Great news — the job <strong>${detail}</strong> has been completed.`,
    };

    const subject = subjects[actionType] || `Update on ${portal.project_name}`;
    const photoNote = hasPhotos ? ' Before/after photos are also available in your portal.' : '';
    const bodyLine = (bodyLines[actionType] || `There is an update on <strong>${portal.project_name}</strong>.`) + photoNote;

    const emailHtml = `
      <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">${brandName} · Project Update</p>
        <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 4px;">${portal.project_name}</h2>
        <p style="font-size:12px;color:#71717a;margin:0 0 20px;">Client: ${portal.client_name}</p>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">${bodyLine}</p>
        <a href="${portalUrl}" style="display:inline-block;background:#ffffff;color:#09090b;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
          View Your Portal →
        </a>
        <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
        <p style="font-size:11px;color:#52525b;margin:0;">You're receiving this because you have an active project with ${brandName}.</p>
      </div>
    `;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: portal.client_email,
      subject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Notify client error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}