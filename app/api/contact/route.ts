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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // Rate limit: max 5 submissions per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo);

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    await supabaseAdmin.from('contact_submissions').insert({ ip_address: ip });

    const safeName = escapeHtml(name);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);
    const recipient = process.env.CONTACT_FORM_RECIPIENT || 'support@openbillet.com';

    await resend.emails.send({
      from: 'OpenBillet Contact <notifications@openbillet.com>',
      to: recipient,
      replyTo: email,
      subject: `[Contact] ${safeSubject} — from ${safeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#18181b;margin:0 0 16px;font-size:18px;">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:8px 0;font-size:13px;color:#71717a;width:100px;"><strong>Name</strong></td><td style="padding:8px 0;font-size:13px;color:#18181b;">${safeName}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#71717a;"><strong>Email</strong></td><td style="padding:8px 0;font-size:13px;"><a href="mailto:${email}" style="color:#18181b;">${email}</a></td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#71717a;"><strong>Subject</strong></td><td style="padding:8px 0;font-size:13px;color:#18181b;">${safeSubject}</td></tr>
          </table>
          <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:16px;">
            <p style="margin:0;font-size:14px;color:#18181b;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
          </div>
          <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;">Sent via openbillet.com/contact · Reply directly to this email to respond to ${safeName}.</p>
        </div>
      `,
    });

    await resend.emails.send({
      from: 'OpenBillet Support <notifications@openbillet.com>',
      to: email,
      replyTo: recipient,
      subject: 'We received your message — OpenBillet Support',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#09090b;border-radius:16px;border:1px solid #27272a;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet Support</p>
          <h2 style="font-size:18px;font-weight:900;color:#fff;margin:0 0 20px;">We got your message</h2>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Hi ${safeName},</p>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">Thanks for reaching out. We typically respond within 1 business day. In the meantime, you can reply directly to this email if you have anything to add.</p>
          <div style="background:#27272a;padding:16px;border-radius:8px;margin:0 0 24px;">
            <p style="font-size:12px;font-weight:700;color:#a1a1aa;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Your message</p>
            <p style="font-size:13px;color:#f4f4f5;margin:0;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
          </div>
          <hr style="border:0;border-top:1px solid #27272a;margin:24px 0 16px;" />
          <p style="font-size:11px;color:#52525b;margin:0;">OpenBillet · support@openbillet.com</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Contact form error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}