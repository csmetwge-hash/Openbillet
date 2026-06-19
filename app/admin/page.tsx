'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  Plus, Share2, Settings, Eye, Archive, RotateCcw,
  MessageSquare, Calendar, AlertTriangle, User, ChevronRight,
  CheckCircle2, Clock, FolderPlus, ChevronDown, ChevronUp, Check,
} from 'lucide-react';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  magic_token: string;
  status: string;
}

interface PortalMeta {
  messageCount: number;
  lastMessage: string | null;
  hasProposalAction: boolean;
  completedMilestones: number;
  totalMilestones: number;
  upcomingMilestones: { id: string; title: string; status: string }[];
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
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);

  // Create portal form
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) { router.push('/auth'); return; }

    // Workers should never land on /admin
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membership?.role === 'worker') { router.push('/worker'); return; }

    const portalsRes = await supabase
      .from('client_portals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const allPortals = portalsRes.data || [];
    setPortals(allPortals);

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
        supabase.from('portal_milestones').select('id, title, status').eq('portal_id', p.id).order('created_at', { ascending: true }),
      ]);
      const milestones = milestonesRes.data || [];
      meta[p.id] = {
        messageCount: notesRes.count || 0,
        lastMessage: notesRes.data?.[0]?.message || null,
        hasProposalAction: (proposalsRes.data?.length || 0) > 0,
        completedMilestones: milestones.filter(m => m.status === 'completed').length,
        totalMilestones: milestones.length,
        upcomingMilestones: milestones.filter(m => m.status !== 'completed').slice(0, 2),
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

    const trimmedEmail = clientEmail.trim();

    const { data, error } = await supabase
      .from('client_portals')
      .insert({
        user_id: user.id,
        client_name: clientName.trim(),
        project_name: projectName.trim() || 'General Engagement',
        client_email: trimmedEmail || null,
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null,
        magic_token: magicToken,
        status: 'active',
      })
      .select().single();

    if (!error && data) {
      setPortals(prev => [data, ...prev]);
      setClientName('');
      setProjectName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setShowForm(false);

      // Auto-send the magic link to the client if we have their email
      if (trimmedEmail) {
        try {
          await fetch('/api/notify-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              portalId: data.id,
              actionType: 'portal_created',
              detail: 'Your project workspace is ready.',
            }),
          });
        } catch (err) {
          console.error('Auto-send magic link failed:', err);
        }
      }
    }
    setCreating(false);
  };

  const handleToggleArchive = async (portalId: string, currentStatus: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const sharePortalLink = async (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/portal/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Your project portal', text: 'Access your project portal here:', url });
        return;
      } catch {
        // fall through to copy
      }
    }
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatScheduled = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
      </div>
    </AppShell>
  );

  const filtered = portals.filter(p => p.status === viewFilter);
  const upcomingJobs = scheduledJobs.filter(j => !['completed', 'no_show'].includes(j.worker_status || ''));
  const flaggedJobs = scheduledJobs.filter(j => j.worker_status === 'no_show' || j.worker_status === 'issue_reported');

  return (
    <AppShell>
      <div className="font-sans antialiased">

        {/* Header */}
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <h1 className="text-sm font-black tracking-tight text-zinc-900">Control Center</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

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
                      <Link key={job.id} href={`/dashboard/portal/${job.portal_id}`} className="block text-xs text-amber-700 hover:text-amber-900 transition">
                        <span className="font-semibold">{job.title}</span>
                        {' · '}{portal?.client_name}
                        {' · '}{job.worker_status === 'no_show' ? 'No-show' : 'Reschedule requested'}
                        {job.worker_note ? ` — ${job.worker_note}` : ''}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Jobs — horizontal scrolling strip */}
          {upcomingJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Scheduled jobs</h2>
              </div>
              <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth snap-x" style={{ scrollbarWidth: 'thin' }}>
                  {upcomingJobs.map((job) => {
                    const portal = Array.isArray(job.client_portals) ? job.client_portals[0] : job.client_portals;
                    const worker = Array.isArray(job.team_members) ? job.team_members[0] : job.team_members;
                    const flagged = job.worker_status === 'no_show' || job.worker_status === 'issue_reported';
                    return (
                      <Link key={job.id} href={`/dashboard/portal/${job.portal_id}`}
                        className={`shrink-0 w-56 snap-start p-3 rounded-xl border text-xs transition hover:border-zinc-300 ${flagged ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'}`}>
                        <p className="font-bold text-zinc-900 truncate">{job.title}</p>
                        <p className="text-zinc-500 truncate mt-0.5">{portal?.client_name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatScheduled(job.scheduled_at)}
                          </span>
                        </div>
                        {worker?.member_email && (
                          <span className="text-zinc-400 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />{worker.member_email}
                          </span>
                        )}
                        {flagged && (
                          <span className="text-amber-600 font-bold flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            {job.worker_status === 'no_show' ? 'No-show' : 'Reschedule'}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                {upcomingJobs.length > 3 && (
                  <div className="hidden sm:flex absolute right-0 top-0 bottom-2 items-center bg-gradient-to-l from-zinc-50 via-zinc-50/80 to-transparent pl-8 pr-1 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            </div>
          )}

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
              <form onSubmit={handleCreatePortal} className="px-5 pb-5 border-t border-zinc-100 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Email <span className="text-zinc-300 normal-case">optional</span></label>
                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                    <p className="text-[10px] text-zinc-400 mt-1">We'll auto-send the portal link here on creation.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Phone <span className="text-zinc-300 normal-case">optional</span></label>
                    <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Address <span className="text-zinc-300 normal-case">optional</span></label>
                    <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  </div>
                </div>
                <button type="submit" disabled={creating || !clientName.trim()}
                  className="w-full mt-3 bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating ? 'Creating...' : <><Plus className="w-3.5 h-3.5" /> Create Portal</>}
                </button>
              </form>
            )}
          </div>

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
                const isExpanded = expandedPortalId === p.id;

                return (
                  <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-zinc-300 transition">

                    <button
                      onClick={() => setExpandedPortalId(isExpanded ? null : p.id)}
                      className="w-full text-left p-5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-zinc-900">{p.client_name}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{p.project_name}</p>
                        </div>

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
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </div>
                      </div>

                      {progress !== null && (
                        <div className="mt-4">
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
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-zinc-100 pt-4 space-y-4">

                        {meta?.upcomingMilestones && meta.upcomingMilestones.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Up next</p>
                            {meta.upcomingMilestones.map(m => (
                              <div key={m.id} className="flex items-center gap-2 text-xs text-zinc-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                                {m.title}
                              </div>
                            ))}
                          </div>
                        )}

                        {meta?.lastMessage && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Latest message</p>
                            <p className="text-xs text-zinc-500 italic truncate">&ldquo;{meta.lastMessage}&rdquo;</p>
                          </div>
                        )}

                        {(p.client_email || p.client_phone || p.client_address) && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact</p>
                            <div className="text-xs text-zinc-500 space-y-0.5">
                              {p.client_email && <p>{p.client_email}</p>}
                              {p.client_phone && <p>{p.client_phone}</p>}
                              {p.client_address && <p>{p.client_address}</p>}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <Link href={`/dashboard/portal/${p.id}`}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-3 py-2 rounded-xl hover:bg-zinc-700 transition">
                            <Settings className="w-3.5 h-3.5" /> Open Full View
                          </Link>
                          <button onClick={(e) => sharePortalLink(p.magic_token, e)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 px-3 py-2 rounded-xl transition cursor-pointer">
                            {copiedToken === p.magic_token ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                            {copiedToken === p.magic_token ? 'Copied!' : 'Share'}
                          </button>
                          <Link href={`/portal/${p.magic_token}`}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 px-3 py-2 rounded-xl transition">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            onClick={(e) => handleToggleArchive(p.id, p.status, e)}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}