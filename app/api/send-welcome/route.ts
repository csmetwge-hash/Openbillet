import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
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

    await resend.emails.send({
      from: 'OpenBillet <notifications@openbillet.com>',
      to: user.email!,
      subject: 'Welcome to OpenBillet — let\'s get you set up',
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#09090b;color:#f4f4f5;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #27272a;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;margin:0 0 4px;">OpenBillet</p>
          <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:0 0 24px;">Welcome aboard.</h2>

          <p style="font-size:14px;color:#d4d4d8;line-height:1.7;margin:0 0 12px;">Your 14-day free trial has started. Here&apos;s how to get your first client portal live in the next 5 minutes:</p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin:0 0 24px;">
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
              <div style="background:#27272a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;text-align:center;line-height:24px;">1</div>
              <div>
                <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 2px;">Create a client portal</p>
                <p style="font-size:12px;color:#71717a;margin:0;">Enter your client&apos;s name, project, and email. Takes 30 seconds.</p>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
              <div style="background:#27272a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;text-align:center;line-height:24px;">2</div>
              <div>
                <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 2px;">Add milestones</p>
                <p style="font-size:12px;color:#71717a;margin:0;">Break the job into steps. Add amounts, photos, due dates, and worker assignments.</p>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <div style="background:#27272a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;text-align:center;line-height:24px;">3</div>
              <div>
                <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 2px;">Share the link</p>
                <p style="font-size:12px;color:#71717a;margin:0;">Your client taps it and sees their private workspace instantly — no login required.</p>
              </div>
            </div>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" style="display:inline-block;background:#ffffff;color:#09090b;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px;margin-bottom:24px;">
            Go to Control Center →
          </a>

          <hr style="border:0;border-top:1px solid #27272a;margin:24px 0 16px;" />

          <p style="font-size:13px;color:#d4d4d8;line-height:1.7;margin:0 0 8px;">A few things worth knowing:</p>
          <ul style="padding-left:20px;margin:0 0 24px;">
            <li style="font-size:13px;color:#a1a1aa;line-height:1.7;margin-bottom:4px;">Your trial lasts 14 days — no credit card required yet</li>
            <li style="font-size:13px;color:#a1a1aa;line-height:1.7;margin-bottom:4px;">Unlimited portals, milestones, files, and team members during the trial</li>
            <li style="font-size:13px;color:#a1a1aa;line-height:1.7;margin-bottom:4px;">After the trial, plans start at $37/month</li>
            <li style="font-size:13px;color:#a1a1aa;line-height:1.7;">Questions? Reply to this email or visit <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color:#d4d4d8;">openbillet.com/contact</a></li>
          </ul>

          <p style="font-size:13px;color:#d4d4d8;line-height:1.7;margin:0;">Good luck with your first portal.<br />— The OpenBillet Team</p>

          <hr style="border:0;border-top:1px solid #27272a;margin:24px 0 16px;" />
          <p style="font-size:11px;color:#52525b;margin:0;">You&apos;re receiving this because you created an OpenBillet account. <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color:#52525b;">Contact support</a> if you have questions.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Welcome email error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}