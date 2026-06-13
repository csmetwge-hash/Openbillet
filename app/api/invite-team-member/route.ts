import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing email or role.' }, { status: 400 });
    }

    if (!['admin', 'user', 'worker'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, user, or worker.' }, { status: 400 });
    }

    // Check if already invited
    const { data: existing } = await supabaseAdmin
      .from('team_members')
      .select('id, status')
      .eq('owner_user_id', user.id)
      .eq('member_email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This email has already been invited.' }, { status: 409 });
    }

    // Get owner's brand name for the email
    const { data: settings } = await supabaseAdmin
      .from('account_settings')
      .select('brand_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const brandName = settings?.brand_name || 'OpenBillet';

    const roleDescriptions: Record<string, string> = {
      admin: 'an <strong>Admin (full access)</strong>',
      worker: "a <strong>Field Worker</strong> — you'll see jobs assigned to you and your schedule",
      user: 'a <strong>Viewer (read-only)</strong>',
    };

    // Create the invite record
    const { data: invite, error: insertError } = await supabaseAdmin
      .from('team_members')
      .insert({
        owner_user_id: user.id,
        member_email: email.toLowerCase(),
        role,
        status: 'invited',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Send invite email
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?id=${invite.id}&email=${encodeURIComponent(email.toLowerCase())}`;

    await resend.emails.send({
      from: 'OpenBillet Notifications <notifications@openbillet.com>',
      to: email,
      subject: `You've been invited to join ${brandName} on OpenBillet`,
      html: `
        <div style="background:#09090b;color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet · Team Invite</p>
          <h2 style="font-size:20px;font-weight:900;color:#ffffff;margin:0 0 20px;">${brandName}</h2>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">You've been invited to join <strong>${brandName}</strong>'s workspace on OpenBillet as ${roleDescriptions[role] || roleDescriptions.user}.</p>
          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 24px;">Click below to accept the invite and access the workspace.</p>
          <a href="${acceptUrl}" style="display:inline-block;background:#ffffff;color:#09090b;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;">
            Accept Invite →
          </a>
          <hr style="border:0;border-top:1px solid #27272a;margin:32px 0 16px;" />
          <p style="font-size:11px;color:#52525b;margin:0;">If you weren't expecting this invite, you can ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, inviteId: invite.id });

  } catch (err: any) {
    console.error('Invite error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}