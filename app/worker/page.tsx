'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { resolveWorkspaceAccess } from '@/lib/workspace';
import {
  LogOut, CheckCircle2, AlertTriangle, Clock, MapPin, DollarSign, Camera, Calendar,
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
  scheduled_at: string | null;
  worker_status: string | null;
  worker_note: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
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
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { ownerId, currentUserId, role } = await resolveWorkspaceAccess();
    if (!currentUserId) { router.push('/auth'); return; }
    if (role !== 'worker') { router.push('/dashboard'); return; }

    const { data: worker } = await supabase
      .from('team_members')
      .select('id')
      .eq('member_user_id', currentUserId)
      .eq('owner_user_id', ownerId)
      .eq('role', 'worker')
      .eq('status', 'active')
      .maybeSingle();

    if (!worker) { router.push('/auth'); return; }

    setWorkerId(worker.id);
    await fetchJobs(worker.id);
    setLoading(false);
  };

  const fetchJobs = async (id: string) => {
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, description, payment_request, scheduled_at, worker_status, worker_note, photo_before_url, photo_after_url, client_portals(client_name, project_name, client_address)')
      .eq('assigned_worker_id', id)
      .order('scheduled_at', { ascending: true });

    setJobs((data || []) as unknown as Job[]);
  };

  const refresh = async () => {
    if (workerId) await fetchJobs(workerId);
  };

  const handleAction = async (jobId: string, action: 'complete' | 'no_show' | 'reschedule_needed') => {
    const note = noteDrafts[jobId]?.trim();

    if (action === 'no_show' || action === 'reschedule_needed') {
      const confirmMsg = action === 'no_show'
        ? 'Mark this job as a no-show? The manager will be notified immediately.'
        : 'Flag this job as needing a reschedule? The manager will be notified immediately.';
      if (!confirm(confirmMsg)) return;
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(null);
    }
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  const upcoming = jobs.filter(j => !['completed', 'no_show'].includes(j.worker_status || ''));
  const history = jobs.filter(j => ['completed', 'no_show'].includes(j.worker_status || ''));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <h1 className="text-sm font-black tracking-tight">My Jobs</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Upcoming &amp; Active</h2>
          {upcoming.length === 0 ? (
            <p className="text-xs text-zinc-500 italic border border-dashed border-zinc-800 rounded-xl p-6 text-center">
              No jobs assigned right now.
            </p>
          ) : upcoming.map(job => {
            const portal = getPortalInfo(job.client_portals);
            const hasOnlinePayment = !!job.payment_request?.includes('http');
            const flagged = job.worker_status === 'issue_reported';

            return (
              <div key={job.id} className={`p-4 rounded-2xl border space-y-3 ${flagged ? 'border-amber-700/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{job.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{portal?.client_name} — {portal?.project_name}</p>
                    {portal?.client_address && (
                      <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {portal.client_address}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatScheduled(job.scheduled_at)}
                  </span>
                </div>

                {job.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed">{job.description}</p>
                )}

                {job.payment_request && (
                  <div className="text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 w-fit">
                    <DollarSign className="w-3 h-3" />
                    {hasOnlinePayment ? 'Online payment link on file (client pays via portal)' : job.payment_request}
                  </div>
                )}

                {flagged && job.worker_note && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Reschedule requested — manager notified: {job.worker_note}
                  </div>
                )}

                {/* Photo upload */}
                <div className="flex gap-2">
                  {(['before', 'after'] as const).map(type => {
                    const url = type === 'before' ? job.photo_before_url : job.photo_after_url;
                    const key = `${job.id}-${type}`;
                    return (
                      <label key={type} className="flex-1 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-2 text-center cursor-pointer transition">
                        {url ? (
                          <img src={url} alt={`${type} photo`} className="h-16 w-full object-cover rounded-lg mb-1" />
                        ) : (
                          <Camera className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                          {uploadingPhoto === key ? 'Uploading...' : url ? `Replace ${type}` : `Add ${type} photo`}
                        </span>
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === key}
                          onChange={(e) => handlePhotoUpload(e, job.id, type)} />
                      </label>
                    );
                  })}
                </div>

                {/* Actions */}
                {job.worker_status !== 'completed' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <textarea
                      value={noteDrafts[job.id] || ''}
                      onChange={(e) => setNoteDrafts(prev => ({ ...prev, [job.id]: e.target.value }))}
                      placeholder="Note for manager (only needed for no-show / reschedule)..."
                      rows={2}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-xs px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition resize-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleAction(job.id, 'complete')}
                        disabled={submittingId === job.id}
                        className="flex items-center justify-center gap-1.5 bg-white text-zinc-900 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </button>
                      <button
                        onClick={() => handleAction(job.id, 'no_show')}
                        disabled={submittingId === job.id}
                        className="flex items-center justify-center gap-1.5 border border-rose-800 text-rose-300 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50">
                        No Show
                      </button>
                      <button
                        onClick={() => handleAction(job.id, 'reschedule_needed')}
                        disabled={submittingId === job.id}
                        className="flex items-center justify-center gap-1.5 border border-amber-800 text-amber-300 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-amber-950/40 transition cursor-pointer disabled:opacity-50">
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
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">History</h2>
            {history.map(job => {
              const portal = getPortalInfo(job.client_portals);
              return (
                <div key={job.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3 opacity-70">
                  <div>
                    <p className="text-xs font-bold text-white">{job.title}</p>
                    <p className="text-[10px] text-zinc-500">{portal?.client_name} — {portal?.project_name}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${
                    job.worker_status === 'completed'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/50'
                      : 'bg-rose-900/40 text-rose-300 border border-rose-800/50'
                  }`}>
                    {job.worker_status === 'completed' ? 'Completed' : 'No Show'}
                  </span>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}