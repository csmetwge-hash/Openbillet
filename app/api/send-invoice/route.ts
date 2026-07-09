import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { portalId, milestoneIds, invoiceNumber, total } = await req.json();
    if (!portalId || !milestoneIds) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const { data: portal } = await supabaseAdmin
      .from('client_portals')
      .select('client_name, client_email, project_name, user_id, brand_name')
      .eq('id', portalId)
      .single();

    if (!portal) return NextResponse.json({ error: 'Portal not found.' }, { status: 404 });

    let authorized = user.id === portal.user_id;
    if (!authorized) {
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('owner_user_id', portal.user_id)
        .eq('member_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (membership?.role === 'admin') authorized = true;
    }
    if (!authorized) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    if (!portal.client_email) {
      return NextResponse.json({ error: 'No client email on file for this portal.' }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from('account_settings')
      .select('brand_name')
      .eq('user_id', portal.user_id)
      .maybeSingle();
    const brandName = portal.brand_name || settings?.brand_name || 'Your Project Team';

    const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${portalId}?milestones=${milestoneIds}`;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: portal.client_email,
      subject: `Invoice ${invoiceNumber} — ${portal.project_name}`,
      html: `
        <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">${brandName} · Invoice</p>
          <h2 style="font-size:18px;font-weight:900;color:#ffffff;margin:0 0 4px;">${portal.project_name}</h2>
          <p style="font-size:12px;color:#71717a;margin:0 0 20px;">Invoice ${invoiceNumber}</p>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 8px;">Hi ${portal.client_name},</p>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">Your invoice is ready to view.${total ? ` Total: <strong>${total}</strong>.` : ''}</p>
          <a href="${invoiceUrl}" style="display:inline-block;background:#ffffff;color:#09090b;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
            View Invoice →
          </a>
          <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
          <p style="font-size:11px;color:#52525b;margin:0;">You're receiving this because you have an active project with ${brandName}.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Send invoice error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}