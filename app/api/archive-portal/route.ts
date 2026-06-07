import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    const { portalId, action } = await req.json(); // action: 'archive' | 'restore'

    if (!portalId || !action) {
      return NextResponse.json({ error: 'Missing portalId or action.' }, { status: 400 });
    }

    const newStatus = action === 'archive' ? 'archived' : 'active';

    // Verify the portal belongs to this user
    const { data: portal } = await supabaseAdmin
      .from('client_portals')
      .select('id, user_id')
      .eq('id', portalId)
      .single();

    if (!portal || portal.user_id !== user.id) {
      return NextResponse.json({ error: 'Portal not found.' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('client_portals')
      .update({ status: newStatus })
      .eq('id', portalId);

    if (error) throw error;

    return NextResponse.json({ success: true, status: newStatus });

  } catch (err: any) {
    console.error('Archive portal error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}