import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { inviteId, email } = await req.json();

    if (!inviteId || !email) {
      return NextResponse.json({ error: 'Missing inviteId or email.' }, { status: 400 });
    }

    // Verify the invite matches the logged-in user's email
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('id', inviteId)
      .eq('member_email', email.toLowerCase())
      .eq('status', 'invited')
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invite not found or already used.' }, { status: 404 });
    }

    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'You must be logged in with the invited email address.' }, { status: 403 });
    }

    // Activate the invite
    const { error: updateError } = await supabaseAdmin
      .from('team_members')
      .update({ member_user_id: user.id, status: 'active' })
      .eq('id', inviteId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, ownerId: invite.owner_user_id, role: invite.role });

  } catch (err: any) {
    console.error('Accept invite error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}