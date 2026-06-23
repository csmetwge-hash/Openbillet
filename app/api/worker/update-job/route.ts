import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    const { milestoneId, action, note, photoBeforeUrl, photoAfterUrl } = await req.json();

    if (!milestoneId || !action) {
      return NextResponse.json({ error: 'Missing milestoneId or action.' }, { status: 400 });
    }

    // Verify this user is an active worker
    const { data: worker, error: workerErr } = await supabaseAdmin
      .from('team_members')
      .select('id, owner_user_id')
      .eq('member_user_id', user.id)
      .eq('role', 'worker')
      .eq('status', 'active')
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json({ error: 'Not an active worker account.' }, { status: 403 });
    }

    // Verify this job is actually assigned to this worker
    const { data: milestone, error: msErr } = await supabaseAdmin
      .from('portal_milestones')
      .select('id, title, payment_request, payment_link, assigned_worker_id, portal_id, client_portals(client_name, project_name, user_id)')
      .eq('id', milestoneId)
      .maybeSingle();

    if (msErr || !milestone || milestone.assigned_worker_id !== worker.id) {
      return NextResponse.json({ error: 'Job not found or not assigned to you.' }, { status: 403 });
    }

    const portalInfo = milestone.client_portals as any;

    if (portalInfo?.user_id !== worker.owner_user_id) {
      return NextResponse.json({ error: 'Job ownership mismatch.' }, { status: 403 });
    }

    let update: Record<string, any> = {};
    let notifyType: string | null = null;

    if (action === 'complete_paid') {
      update = { worker_status: 'completed', worker_note: null, status: 'completed' };
      if (photoBeforeUrl) update.photo_before_url = photoBeforeUrl;
      if (photoAfterUrl) update.photo_after_url = photoAfterUrl;
      notifyType = 'job_completed_paid';

    } else if (action === 'complete_awaiting_payment') {
      update = { worker_status: 'completed', worker_note: null };
      if (photoBeforeUrl) update.photo_before_url = photoBeforeUrl;
      if (photoAfterUrl) update.photo_after_url = photoAfterUrl;
      notifyType = 'job_completed_awaiting_payment';

    } else if (action === 'no_show') {
      update = { worker_status: 'no_show', worker_note: note || null };
      notifyType = 'job_no_show';

    } else if (action === 'reschedule_needed') {
      update = { worker_status: 'issue_reported', worker_note: note || null };
      notifyType = 'job_reschedule_requested';

    } else if (action === 'update_photos') {
      if (photoBeforeUrl) update.photo_before_url = photoBeforeUrl;
      if (photoAfterUrl) update.photo_after_url = photoAfterUrl;
      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No photo URLs provided.' }, { status: 400 });
      }

    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('portal_milestones')
      .update(update)
      .eq('id', milestoneId);

    if (updateErr) throw updateErr;

    // Route notification to correct recipient
    if (notifyType) {
      try {
        const isClientNotify = notifyType === 'job_completed_paid' || notifyType === 'job_completed_awaiting_payment';
        const endpoint = isClientNotify ? '/api/notify-client' : '/api/notify-admin';
        const body = isClientNotify
          ? {
              portalId: milestone.portal_id,
              actionType: notifyType,
              detail: milestone.title,
            }
          : {
              portalId: milestone.portal_id,
              actionType: notifyType,
              clientName: portalInfo?.client_name,
              projectName: portalInfo?.project_name,
              detail: `${milestone.title}${note ? ` — Note: ${note}` : ''}`,
            };

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (notifyErr) {
        console.error('Failed to send notification:', notifyErr);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Worker update-job error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}