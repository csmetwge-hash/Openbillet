'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, ClipboardCopy, Settings, Eye, Archive, RotateCcw,
  MessageSquare, Calendar, AlertTriangle, User, LogOut,
  DollarSign, CheckCircle2, Clock, Users, FolderPlus,
} from 'lucide-react';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  client_email?: string;
  magic_token: string;
  status: string;
}

interface PortalMeta {
  messageCount: number;
  lastMessage: string | null;
  hasProposalAction: boolean;
  completedMilestones: number;
  totalMilestones: number;
}

interface ScheduledJob {
  id: string;
  title: string;
  scheduled_at: string;
  worker_status: string | null;
  worker_note: string | null;
  portal_id: string;
  client_portals: { client_name: string; project_name: string } | null;
  team_members: { member_email: string } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [portalMeta, setPortalMeta] = useState<Record<string, PortalMeta>>({});
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'active' | 'completed'>('active');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [workers, setWorkers] = useState<{ id: string; member_email: string }[]>([]);

  // Create portal form
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) { router.push('/auth'); return; }

    const [portalsRes, workersRes] = await Promise.all([
      supabase.from('client_portals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('team_members').select('id, member_email').eq('owner_user_id', user.id).eq('role', 'worker').eq('status', 'active'),
    ]);

    const allPortals = portalsRes.data || [];
    setPortals(allPortals);
    setWorkers(workersRes.data || []);

    if (allPortals.length > 0) {
      fetchPortalMeta(allPortals);
      fetchScheduledJobs(allPortals.map(p => p.id));
    }

    setLoading(false);
  };

  const fetchPortalMeta = async (allPortals: Portal[]) => {
    const meta: Record<string, PortalMeta> = {};
    await Promise.all(allPortals.map(async (p) => {
      const [notesRes, proposalsRes, milestonesRes] = await Promise.all([
        supabase.from('portal_notes').select('message, created_at', { count: 'exact' })
          .eq('portal_id', p.id).eq('is_from_client', true)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('portal_proposals').select('id').eq('portal_id', p.id).in('status', ['accepted', 'declined']),
        supabase.from('portal_milestones').select('status').eq('portal_id', p.id),
      ]);
      const milestones = milestonesRes.data || [];
      meta[p.id] = {
        messageCount: notesRes.count || 0,
        lastMessage: notesRes.data?.[0]?.message || null,
        hasProposalAction: (proposalsRes.data?.length || 0) > 0,
        completedMilestones: milestones.filter(m => m.status === 'completed').length,
        totalMilestones: milestones.length,
      };
    }));
    setPortalMeta(meta);
  };

  const fetchScheduledJobs = async (portalIds: string[]) => {
    if (portalIds.length === 0) return;
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, scheduled_at, worker_status, worker_note, portal_id, client_portals(client_name, project_name), team_members(member_email)')
      .in('portal_id', portalIds)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true });
    setScheduledJobs((data || []) as unknown as ScheduledJob[]);
  };

  const handleCreatePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const magicToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase
      .from('client_portals')
      .insert({
        user_id: user.id,
        client_name: clientName.trim(),
        project_name: projectName.trim() || 'General Engagement',
        client_email: clientEmail.trim() || null,
        magic_token: magicToken,
        status: 'active',
      })
      .select().single();

    if (!error && data) {
      setPortals(prev => [data, ...prev]);
      setClientName('');
      setProjectName('');
      setClientEmail('');
      setShowForm(false);
    }
    setCreating(false);
  };

  const handleToggleArchive = async (portalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
    const msg = nextStatus === 'completed'
      ? 'Archive this portal? All data will be preserved.'
      : 'Restore this portal to active?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('client_portals').update({ status: nextStatus }).eq('id', portalId);
    if (!error) {
      setPortals(prev => prev.map(p => p.id === portalId ? { ...p, status: nextStatus } : p));
    }
  };

  const copyMagicLink = (token: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const formatScheduled = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  const filtered = portals.filter(p => p.status === viewFilter);
  const upcomingJobs = scheduledJobs.filter(j => !['completed', 'no_show'].includes(j.worker_status || ''));
  const flaggedJobs = scheduledJobs.filter(j => j.worker_status === 'no_show' || j.worker_status === 'issue_reported');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-900 rounded-lg">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-black tracking-tight text-zinc-900">Control Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/billing"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition px-3 py-2 rounded-xl hover:bg-zinc-100">
              <DollarSign className="w-3.5 h-3.5" /> Billing
            </Link>
            <Link href="/settings"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition px-3 py-2 rounded-xl hover:bg-zinc-100">
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition px-3 py-2 rounded-xl hover:bg-zinc-100 cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Flagged jobs alert banner */}
        {flaggedJobs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{flaggedJobs.length} job{flaggedJobs.length > 1 ? 's' : ''} need attention</p>
              <div className="mt-1 space-y-1">
                {flaggedJobs.map(job => {
                  const portal = Array.isArray(job.client_portals) ? job.client_portals[0] : job.client_portals;
                  return (
                    <p key={job.id} className="text-xs text-amber-700">
                      <span className="font-semibold">{job.title}</span>
                      {' · '}{portal?.client_name}
                      {' · '}{job.worker_status === 'no_show' ? '🚫 No-show' : '🔄 Reschedule requested'}
                      {job.worker_note ? ` — ${job.worker_note}` : ''}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Create portal + scheduled jobs */}
          <div className="space-y-4">

            {/* Create portal */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowForm(!showForm)}
                className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-zinc-50 transition cursor-pointer">
                <div className="p-1.5 bg-zinc-900 rounded-lg shrink-0">
                  <FolderPlus className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-black text-zinc-900">New Client Portal</span>
                <Plus className={`w-4 h-4 text-zinc-400 ml-auto transition-transform ${showForm ? 'rotate-45' : ''}`} />
              </button>

              {showForm && (
                <form onSubmit={handleCreatePortal} className="px-5 pb-5 space-y-3 border-t border-zinc-100 pt-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Name <span className="text-red-400">*</span></label>
                    <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Project Name</label>
                    <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. Spring Lawn Treatment"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Email</label>
                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  </div>
                  <button type="submit" disabled={creating || !clientName.trim()}
                    className="w-full bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                    {creating ? 'Creating...' : <><Plus className="w-3.5 h-3.5" /> Create Portal</>}
                  </button>
                </form>
              )}
            </div>

            {/* Scheduled Jobs */}
            {upcomingJobs.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-black text-zinc-900">Scheduled Jobs</h2>
                </div>
                <div className="space-y-2">
                  {upcomingJobs.map((job) => {
                    const portal = Array.isArray(job.client_portals) ? job.client_portals[0] : job.client_portals;
                    const worker = Array.isArray(job.team_members) ? job.team_members[0] : job.team_members;
                    const flagged = job.worker_status === 'no_show' || job.worker_status === 'issue_reported';
                    return (
                      <Link key={job.id} href={`/dashboard/portal/${job.portal_id}`}
                        className={`block p-3 rounded-xl border text-xs transition hover:border-zinc-300 ${flagged ? 'border-amber-200 bg-amber-50' : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100'}`}>
                        <p className="font-bold text-zinc-900 truncate">{job.title}</p>
                        <p className="text-zinc-500 truncate mt-0.5">{portal?.client_name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatScheduled(job.scheduled_at)}
                          </span>
                          {worker?.member_email && (
                            <span className="text-zinc-400 flex items-center gap-1">
                              <User className="w-3 h-3" />{worker.member_email}
                            </span>
                          )}
                          {flagged && (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {job.worker_status === 'no_show' ? 'No-show' : 'Reschedule'}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Portal cards */}
          <div className="lg:col-span-2 space-y-4">

            {/* Filter tabs */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900">
                {viewFilter === 'active' ? 'Active Portals' : 'Archived Portals'}
              </h2>
              <div className="flex bg-white border border-zinc-200 p-1 rounded-xl">
                <button onClick={() => setViewFilter('active')}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer ${viewFilter === 'active' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'}`}>
                  Active
                </button>
                <button onClick={() => setViewFilter('completed')}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer ${viewFilter === 'completed' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'}`}>
                  Archived
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-12 text-center">
                <p className="text-sm text-zinc-400">
                  {viewFilter === 'active' ? 'No active portals yet. Create one to get started.' : 'No archived portals.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(p => {
                  const meta = portalMeta[p.id];
                  const progress = meta && meta.totalMilestones > 0
                    ? Math.round((meta.completedMilestones / meta.totalMilestones) * 100)
                    : null;

                  return (
                    <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition">

                      {/* Portal identity */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-zinc-900">{p.client_name}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{p.project_name}</p>
                          {p.client_email && (
                            <p className="text-[10px] text-zinc-400 mt-0.5">{p.client_email}</p>
                          )}
                        </div>

                        {/* Notification badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {meta?.messageCount ? (
                            <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg">
                              <MessageSquare className="w-3 h-3" /> {meta.messageCount}
                            </div>
                          ) : null}
                          {meta?.hasProposalAction && (
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-black px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> Proposal
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {progress !== null && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Progress</span>
                            <span className="text-[10px] font-black text-zinc-600">
                              {meta!.completedMilestones}/{meta!.totalMilestones} · {progress}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Last message preview */}
                      {meta?.lastMessage && (
                        <p className="text-xs text-zinc-500 italic mb-4 truncate">
                          💬 &ldquo;{meta.lastMessage}&rdquo;
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/portal/${p.id}`}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-3 py-2 rounded-xl hover:bg-zinc-700 transition">
                          <Settings className="w-3.5 h-3.5" /> Manage
                        </Link>
                        <button onClick={(e) => copyMagicLink(p.magic_token, e)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 px-3 py-2 rounded-xl transition cursor-pointer">
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          {copiedToken === p.magic_token ? 'Copied!' : 'Copy Link'}
                        </button>
                        <Link href={`/portal/${p.magic_token}`}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 px-3 py-2 rounded-xl transition">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <button
                          onClick={() => handleToggleArchive(p.id, p.status)}
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-3 py-2 rounded-xl transition cursor-pointer ml-auto ${
                            p.status === 'active'
                              ? 'border-zinc-200 text-zinc-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50'
                              : 'border-zinc-200 text-zinc-400 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}>
                          {p.status === 'active'
                            ? <><Archive className="w-3.5 h-3.5" /> Archive</>
                            : <><RotateCcw className="w-3.5 h-3.5" /> Restore</>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}