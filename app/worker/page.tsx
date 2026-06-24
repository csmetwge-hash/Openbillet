'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { resolveWorkspaceAccess } from '@/lib/workspace';
import {
  LogOut, CheckCircle2, AlertTriangle, Clock, MapPin, DollarSign, Camera, Calendar, RotateCcw,
} from 'lucide-react';

interface PortalInfo {
  client_name: string;
  project_name: string;
  client_address: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  payment_request: string | null;
  amount: string | null;
  payment_link: string | null;
  scheduled_at: string | null;
  worker_status: string | null;
  worker_note: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
  portal_id: string;
  client_portals: PortalInfo | PortalInfo[] | null;
}

function getPortalInfo(ref: PortalInfo | PortalInfo[] | null): PortalInfo | null {
  if (!ref) return null;
  return Array.isArray(ref) ? ref[0] ?? null : ref;
}

export default function WorkerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string>('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [failedUploads, setFailedUploads] = useState<Record<string, { file: File; offline: boolean }>>({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { ownerId, currentUserId, role } = await resolveWorkspaceAccess();
    if (!currentUserId) { router.push('/auth'); return; }
    if (role !== 'worker') { router.push('/dashboard'); return; }

    const { data: worker } = await supabase
      .from('team_members')
      .select('id, member_email')
      .eq('member_user_id', currentUserId)
      .eq('owner_user_id', ownerId)
      .eq('role', 'worker')
      .eq('status', 'active')
      .maybeSingle();

    if (!worker) { router.push('/auth'); return; }

    setWorkerId(worker.id);
    setWorkerEmail(worker.member_email);
    await fetchJobs(worker.id);
    setLoading(false);
  };

  const fetchJobs = async (id: string) => {
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, description, payment_request, amount, payment_link, scheduled_at, worker_status, worker_note, photo_before_url, photo_after_url, portal_id, client_portals(client_name, project_name, client_address)')
      .eq('assigned_worker_id', id)
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    setJobs((data || []) as unknown as Job[]);
  };

  const refresh = async () => {
    if (workerId) await fetchJobs(workerId);
  };

  const handleAction = async (jobId: string, action: 'complete_paid' | 'complete_awaiting_payment' | 'no_show' | 'reschedule_needed' | 'undo') => {
    const note = noteDrafts[jobId]?.trim();

    if (action === 'no_show' || action === 'reschedule_needed') {
      const confirmMsg = action === 'no_show'
        ? 'Mark this job as a no-show? The manager will be notified immediately.'
        : 'Flag this job as needing a reschedule? The manager will be notified immediately.';
      if (!confirm(confirmMsg)) return;
    }

    if (action === 'undo') {
      if (!confirm('Undo this completion? The manager will be notified. Job will return to active.')) return;
    }

    setSubmittingId(jobId);
    try {
      const res = await fetch('/api/worker/update-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: jobId, action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refresh();
      setNoteDrafts(prev => ({ ...prev, [jobId]: '' }));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const uploadPhoto = async (jobId: string, type: 'before' | 'after', file: File) => {
    const key = `${jobId}-${type}`;
    setUploadingPhoto(key);
    try {
      const ext = file.name.split('.').pop();
      const path = `worker-uploads/${jobId}/${type}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('portal-files')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('portal-files').getPublicUrl(path);

      const body: any = { milestoneId: jobId, action: 'update_photos' };
      if (type === 'before') body.photoBeforeUrl = urlData.publicUrl;
      else body.photoAfterUrl = urlData.publicUrl;

      const res = await fetch('/api/worker/update-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refresh();
      setFailedUploads(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err: any) {
      setFailedUploads(prev => ({ ...prev, [key]: { file, offline: !navigator.onLine } }));
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(jobId, type, file);
  };

  const retryUpload = (jobId: string, type: 'before' | 'after') => {
    const key = `${jobId}-${type}`;
    const pending = failedUploads[key];
    if (!pending) return;
    uploadPhoto(jobId, type, pending.file);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const formatScheduled = (iso: string | null) => {
    if (!iso) return 'No date set';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  const upcoming = jobs.filter(j => !['completed', 'no_show'].includes(j.worker_status || ''));
  const history = jobs.filter(j => ['completed', 'no_show'].includes(j.worker_status || ''));

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-900 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-black tracking-tight text-zinc-900">
              {workerEmail ? `${workerEmail.split('@')[0]}'s Jobs` : 'My Jobs'}
            </h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-700 transition cursor-pointer px-3 py-2 rounded-xl hover:bg-zinc-100">
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Upcoming &amp; Active <span className="normal-case font-medium text-zinc-300">· sorted by scheduled date</span>
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-xs text-zinc-400 italic border border-dashed border-zinc-300 rounded-2xl p-8 text-center">
              No jobs assigned right now.
            </p>
          ) : upcoming.map(job => {
            const portal = getPortalInfo(job.client_portals);
            const hasPaymentLink = !!job.payment_link?.includes('http');
            const hasAmount = !!job.amount;
            const hasCashPayment = hasAmount && !hasPaymentLink;
            const flagged = job.worker_status === 'issue_reported';

            return (
              <div key={job.id} className={`p-4 rounded-2xl border space-y-3 ${flagged ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">{job.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{portal?.client_name} — {portal?.project_name}</p>
                    {portal?.client_address && (
                      <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {portal.client_address}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatScheduled(job.scheduled_at)}
                  </span>
                </div>

                {job.description && (
                  <p className="text-xs text-zinc-600 leading-relaxed">{job.description}</p>
                )}

                {/* Payment info */}
                {(hasAmount || hasPaymentLink) && (
                  <div className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 shrink-0" />
                    {hasPaymentLink
                      ? `Online payment link on file${hasAmount ? ` — ${job.amount}` : ''} (client pays via portal)`
                      : job.amount
                    }
                  </div>
                )}

                {flagged && job.worker_note && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Reschedule requested — manager notified: {job.worker_note}
                  </div>
                )}

                {/* Photo upload */}
                <div className="flex gap-2">
                  {(['before', 'after'] as const).map(type => {
                    const url = type === 'before' ? job.photo_before_url : job.photo_after_url;
                    const key = `${job.id}-${type}`;
                    const failed = failedUploads[key];

                    if (failed) {
                      return (
                        <button key={type} type="button" onClick={() => retryUpload(job.id, type)}
                          disabled={uploadingPhoto === key}
                          className="flex-1 border border-dashed border-amber-300 bg-amber-50 rounded-xl p-2 text-center transition disabled:opacity-50 cursor-pointer">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block">
                            {uploadingPhoto === key ? 'Retrying...' : failed.offline ? 'No connection — Tap to retry' : 'Upload failed — Tap to retry'}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <label key={type} className="flex-1 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-xl p-2 text-center cursor-pointer transition">
                        {url ? (
                          <img src={url} alt={`${type} photo`} className="h-16 w-full object-cover rounded-lg mb-1" />
                        ) : (
                          <Camera className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                          {uploadingPhoto === key ? 'Uploading...' : url ? `Replace ${type}` : `Add ${type} photo`}
                        </span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploadingPhoto === key}
                          onChange={(e) => handlePhotoUpload(e, job.id, type)} />
                      </label>
                    );
                  })}
                </div>

                {/* Actions */}
                {job.worker_status !== 'completed' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <textarea
                      value={noteDrafts[job.id] || ''}
                      onChange={(e) => setNoteDrafts(prev => ({ ...prev, [job.id]: e.target.value }))}
                      placeholder="Note for manager (only needed for no-show / reschedule)..."
                      rows={2}
                      className="w-full border border-zinc-200 rounded-xl text-xs px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition resize-none"
                    />

                    {/* Complete buttons — context aware */}
                    {hasPaymentLink ? (
                      // Online payment: show BOTH options since client may pay in person
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleAction(job.id, 'complete_paid')} disabled={submittingId === job.id}
                          className="flex flex-col items-center justify-center gap-0.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50">
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</span>
                          <span className="font-normal normal-case text-[9px] text-zinc-300">Payment collected</span>
                        </button>
                        <button onClick={() => handleAction(job.id, 'complete_awaiting_payment')} disabled={submittingId === job.id}
                          className="flex flex-col items-center justify-center gap-0.5 border border-zinc-300 text-zinc-700 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-zinc-50 transition cursor-pointer disabled:opacity-50">
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</span>
                          <span className="font-normal normal-case text-[9px] text-zinc-400">Awaiting payment</span>
                        </button>
                      </div>
                    ) : hasCashPayment ? (
                      // Cash/check: single complete with payment collected
                      <button onClick={() => handleAction(job.id, 'complete_paid')} disabled={submittingId === job.id}
                        className="w-full flex flex-col items-center justify-center gap-0.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</span>
                        <span className="font-normal normal-case text-[9px] text-zinc-300">Payment collected</span>
                      </button>
                    ) : (
                      // No payment: simple complete
                      <button onClick={() => handleAction(job.id, 'complete_paid')} disabled={submittingId === job.id}
                        className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleAction(job.id, 'no_show')} disabled={submittingId === job.id}
                        className="flex items-center justify-center gap-1.5 border border-rose-200 text-rose-600 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-rose-50 transition cursor-pointer disabled:opacity-50">
                        No Show
                      </button>
                      <button onClick={() => handleAction(job.id, 'reschedule_needed')} disabled={submittingId === job.id}
                        className="flex items-center justify-center gap-1.5 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-amber-50 transition cursor-pointer disabled:opacity-50">
                        Reschedule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {history.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">History</h2>
            {history.map(job => {
              const portal = getPortalInfo(job.client_portals);
              return (
                <div key={job.id} className="p-3 rounded-xl border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{job.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{portal?.client_name} — {portal?.project_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                        job.worker_status === 'completed'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {job.worker_status === 'completed' ? 'Completed' : 'No Show'}
                      </span>
                      <button
                        onClick={() => handleAction(job.id, 'undo')}
                        disabled={submittingId === job.id}
                        title="Undo — resets job to active"
                        className="p-1.5 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition cursor-pointer disabled:opacity-40">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}