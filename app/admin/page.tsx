'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SmartDateTimePicker from '@/components/SmartDateTimePicker';
import {
  Plus, Share2, Settings, Eye, Archive, RotateCcw,
  MessageSquare, Calendar, AlertTriangle, User, ChevronRight,
  CheckCircle2, Clock, FolderPlus, ChevronDown, ChevronUp, Check,
  Pencil, X, Save,
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

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount?: string;
  payment_link?: string;
  status: string;
  worker_status?: string | null;
  client_action_needed?: string;
  scheduled_at?: string | null;
  assigned_worker_id?: string | null;
}

interface PortalMeta {
  messageCount: number;
  lastMessage: string | null;
  hasProposalAction: boolean;
  completedMilestones: number;
  totalMilestones: number;
  milestones: Milestone[];
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

const STATUS_OPTIONS = [
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function AdminPage() {
  const router = useRouter();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [portalMeta, setPortalMeta] = useState<Record<string, PortalMeta>>({});
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'active' | 'completed'>('active');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{ portalId: string; milestone: Milestone } | null>(null);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [editScheduleDate, setEditScheduleDate] = useState('');
  const [editScheduleTime, setEditScheduleTime] = useState('');
  const [workers, setWorkers] = useState<{ id: string; member_email: string }[]>([]);

  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalParam = params.get('portal');
    if (portalParam) setExpandedPortalId(portalParam);
  }, [portals]);

  const init = async () => {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) { router.push('/auth'); return; }

    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membership?.role === 'worker') { router.push('/worker'); return; }

    const [portalsRes, workersRes] = await Promise.all([
      supabase.from('client_portals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('team_members').select('id, member_email').eq('owner_user_id', user.id).eq('role', 'worker').eq('status', 'active'),
    ]);
    setWorkers(workersRes.data || []);

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
        supabase.from('portal_milestones').select('id, title, description, amount, payment_link, status, client_action_needed, scheduled_at, assigned_worker_id').eq('portal_id', p.id).order('created_at', { ascending: true }),
      ]);
      const milestones = milestonesRes.data || [];
      meta[p.id] = {
        messageCount: notesRes.count || 0,
        lastMessage: notesRes.data?.[0]?.message || null,
        hasProposalAction: (proposalsRes.data?.length || 0) > 0,
        completedMilestones: milestones.filter(m => m.status === 'completed').length,
        totalMilestones: milestones.length,
        milestones,
      };
    }));
    setPortalMeta(meta);
  };

  const refreshPortalMilestones = async (portalId: string) => {
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, description, amount, payment_link, status, client_action_needed, scheduled_at, assigned_worker_id')
      .eq('portal_id', portalId)
      .order('created_at', { ascending: true });
    setPortalMeta(prev => ({
      ...prev,
      [portalId]: {
        ...prev[portalId],
        milestones: data || [],
        completedMilestones: (data || []).filter(m => m.status === 'completed').length,
        totalMilestones: (data || []).length,
      },
    }));
  };

  const fetchScheduledJobs = async (portalIds: string[]) => {
    if (portalIds.length === 0) return;
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, scheduled_at, worker_status, worker_note, portal_id, client_portals(client_name, project_name), team_members(member_email)')
      .in('portal_id', portalIds)
      .not('scheduled_at', 'is', null)
      .neq('status', 'completed')
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
      setPortalMeta(prev => ({
        ...prev,
        [data.id]: { messageCount: 0, lastMessage: null, hasProposalAction: false, completedMilestones: 0, totalMilestones: 0, milestones: [] },
      }));
      setClientName('');
      setProjectName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setShowForm(false);

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

  const handleStatusChange = async (portalId: string, milestoneId: string, newStatus: string, title: string) => {
    await supabase.from('portal_milestones').update({ status: newStatus }).eq('id', milestoneId);
    await refreshPortalMilestones(portalId);
    if (newStatus === 'completed') {
      await supabase.from('portal_activity').insert({
        portal_id: portalId, action_type: 'milestone_completed', actor: 'admin', description: `Milestone completed: ${title}`,
      });
      try {
        await fetch('/api/notify-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portalId, actionType: 'milestone_completed', detail: title }),
        });
      } catch (err) { console.error('Notify failed:', err); }
    }
  };

  const openEditMilestone = (portalId: string, milestone: Milestone, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMilestone({ portalId, milestone: { ...milestone } });
    if (milestone.scheduled_at) {
      const d = new Date(milestone.scheduled_at);
      const offset = d.getTimezoneOffset() * 60000;
      const local = new Date(d.getTime() - offset);
      setEditScheduleDate(local.toISOString().slice(0, 10));
      setEditScheduleTime(local.toISOString().slice(11, 16));
    } else {
      setEditScheduleDate('');
      setEditScheduleTime('');
    }
  };

  const deleteMilestoneFromCard = async (portalId: string, milestoneId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone. If a worker is assigned, they will be notified of the cancellation.`)) return;

    const milestone = portalMeta[portalId]?.milestones.find(m => m.id === milestoneId);
    const portal = portals.find(p => p.id === portalId);

    // Notify assigned worker before deleting
    if (milestone?.assigned_worker_id) {
      const assignedWorker = workers.find(w => w.id === milestone.assigned_worker_id);
      if (assignedWorker?.member_email) {
        try {
          await fetch('/api/notify-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workerEmail: assignedWorker.member_email,
              jobTitle: title,
              scheduledAt: null,
              clientName: portal?.client_name,
              projectName: portal?.project_name,
              type: 'cancellation',
            }),
          });
        } catch (err) { console.error('Worker cancel notify failed:', err); }
      }
    }

    // Notify client before deleting
    if (portal?.client_email) {
      try {
        await fetch('/api/notify-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portalId,
            actionType: 'milestone_canceled',
            detail: title,
          }),
        });
      } catch (err) { console.error('Client cancel notify failed:', err); }
    }

    await supabase.from('portal_milestones').delete().eq('id', milestoneId);
    await refreshPortalMilestones(portalId);
    fetchScheduledJobs(portals.map(p => p.id));
    setEditingMilestone(null);
  };

  const saveMilestoneEdit = async () => {
    if (!editingMilestone) return;
    setSavingMilestone(true);
    const { portalId, milestone } = editingMilestone;
    await supabase.from('portal_milestones').update({
      title: milestone.title,
      description: milestone.description || null,
      amount: milestone.amount || null,
      payment_link: milestone.payment_link || null,
      client_action_needed: milestone.client_action_needed || null,
      scheduled_at: editScheduleDate ? new Date(`${editScheduleDate}T${editScheduleTime || '00:00'}`).toISOString() : null,
      assigned_worker_id: milestone.assigned_worker_id || null,
    }).eq('id', milestone.id);
    await refreshPortalMilestones(portalId);
    fetchScheduledJobs(portals.map(p => p.id));

    // Notify worker if newly assigned OR if the schedule changed for an existing assignment
    const hadWorker = editingMilestone.milestone.assigned_worker_id;
    const newWorker = milestone.assigned_worker_id;
    const hadScheduledAt = editingMilestone.milestone.scheduled_at;
    const newScheduledAt = editScheduleDate ? new Date(`${editScheduleDate}T${editScheduleTime || '00:00'}`).toISOString() : null;
    const dateChanged = hadScheduledAt !== newScheduledAt;

    if (newWorker) {
      const isNewAssignment = newWorker !== hadWorker;
      const isReschedule = !isNewAssignment && dateChanged && newScheduledAt;

      if (isNewAssignment || isReschedule) {
        const assignedWorker = workers.find(w => w.id === newWorker);
        if (assignedWorker?.member_email) {
          try {
            await fetch('/api/notify-worker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerEmail: assignedWorker.member_email,
                jobTitle: milestone.title,
                scheduledAt: newScheduledAt,
                clientName: portals.find(p => p.id === portalId)?.client_name,
                projectName: portals.find(p => p.id === portalId)?.project_name,
                type: isNewAssignment ? 'assignment' : undefined,
              }),
            });
          } catch (err) { console.error('Worker notify failed:', err); }
        }
      }
    }

    // Notify client if a schedule date was set or changed
    const hadDate = !!editingMilestone.milestone.scheduled_at;
    const hasDate = !!editScheduleDate;
    if (hasDate) {
      try {
        await fetch('/api/notify-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portalId,
            actionType: hadDate ? 'schedule_updated' : 'schedule_set',
            detail: milestone.title,
          }),
        });
      } catch (err) { console.error('Schedule notify failed:', err); }
    }

    setSavingMilestone(false);
    setEditingMilestone(null);
    setEditScheduleDate('');
    setEditScheduleTime('');
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

        <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <h1 className="text-sm font-black tracking-tight text-zinc-900">Control Center</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {flaggedJobs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">{flaggedJobs.length} job{flaggedJobs.length > 1 ? 's' : ''} need attention</p>
                <div className="mt-1 space-y-1">
                  {flaggedJobs.map(job => {
                    const portal = Array.isArray(job.client_portals) ? job.client_portals[0] : job.client_portals;
                    return (
                      <button key={job.id} onClick={() => setExpandedPortalId(job.portal_id)} className="block text-xs text-amber-700 hover:text-amber-900 transition text-left cursor-pointer">
                        <span className="font-semibold">{job.title}</span>
                        {' · '}{portal?.client_name}
                        {' · '}{job.worker_status === 'no_show' ? 'No-show' : 'Reschedule requested'}
                        {job.worker_note ? ` — ${job.worker_note}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                    const overdue = !flagged && !job.worker_status && new Date(job.scheduled_at) < new Date(Date.now() - 2 * 60 * 60 * 1000);
                    return (
                      <button key={job.id} onClick={() => {
                        const hasPortalCard = filtered.some(p => p.id === job.portal_id);
                        if (hasPortalCard) {
                          setExpandedPortalId(job.portal_id);
                          setTimeout(() => {
                            document.getElementById(`portal-${job.portal_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        } else {
                          router.push(`/dashboard/portal/${job.portal_id}?milestone=${job.id}`);
                        }
                      }}
                        className={`shrink-0 w-56 snap-start p-3 rounded-xl border text-xs text-left transition hover:border-zinc-300 cursor-pointer ${flagged ? 'border-amber-200 bg-amber-50' : overdue ? 'border-orange-200 bg-orange-50' : 'border-zinc-200 bg-white'}`}>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Milestone</p>
                        <p className="font-bold text-zinc-900 truncate">{job.title}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-1.5">Portal</p>
                        <p className="text-zinc-500 truncate">{portal?.client_name} · {portal?.project_name}</p>
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
                        {overdue && (
                          <span className="text-orange-600 font-bold flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" /> Overdue — no update
                          </span>
                        )}
                      </button>
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
                const allIncompleteMilestones = meta?.milestones.filter(m => m.status !== 'completed') || [];
                const incompleteMilestones = allIncompleteMilestones.slice(0, 3);
                const hasMoreMilestones = allIncompleteMilestones.length > 3;
                const completedMilestonesList = meta?.milestones.filter(m => m.status === 'completed') || [];

                return (
                  <div key={p.id} id={`portal-${p.id}`} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-zinc-300 transition">

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

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Incomplete Milestones {incompleteMilestones.length > 0 && `(${incompleteMilestones.length})`}
                          </p>
                          {incompleteMilestones.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">No incomplete milestones.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {incompleteMilestones.map(m => (
                                <div key={m.id} className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-zinc-800 truncate">{m.title}</p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      {m.amount && <span className="text-[10px] text-zinc-500">{m.amount}</span>}
                                      {m.client_action_needed && (
                                        <span className="text-[10px] text-amber-600 font-medium">Client: {m.client_action_needed}</span>
                                      )}
                                      {m.scheduled_at && (
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                                          <Clock className="w-2.5 h-2.5" />{formatScheduled(m.scheduled_at)}
                                        </span>
                                      )}
                                    </div>
                                    {m.worker_status === 'completed' && m.status !== 'completed' && (
                                      <div className="mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Worker marked complete — awaiting your payment confirmation
                                      </div>
                                    )}
                                  </div>
                                  <select
                                    value={m.status}
                                    onChange={(e) => handleStatusChange(p.id, m.id, e.target.value, m.title)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-600 focus:outline-none cursor-pointer shrink-0"
                                  >
                                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                  </select>
                                  <button onClick={(e) => openEditMilestone(p.id, m, e)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition cursor-pointer shrink-0">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {hasMoreMilestones && (
                            <Link href={`/dashboard/portal/${p.id}`}
                              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-700 transition flex items-center gap-1 mt-1">
                              + {allIncompleteMilestones.length - 3} more — Open Full View
                            </Link>
                          )}
                          {completedMilestonesList.length > 0 && (
                            <details className="text-xs">
                              <summary className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-600">
                                {completedMilestonesList.length} completed
                              </summary>
                              <div className="space-y-1 mt-1.5">
                                {completedMilestonesList.map(m => (
                                  <div key={m.id} className="flex items-center gap-2 p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-[11px] text-zinc-500">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="truncate">{m.title}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>

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
                            <Eye className="w-3.5 h-3.5" /> Preview as Client
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

        {editingMilestone && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingMilestone(null)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">Edit Milestone</h3>
                <button onClick={() => setEditingMilestone(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title</label>
                <input type="text" value={editingMilestone.milestone.title}
                  onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, title: e.target.value } } : prev)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Description <span className="text-zinc-300 normal-case">optional</span></label>
                <textarea value={editingMilestone.milestone.description || ''} rows={2}
                  onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, description: e.target.value } } : prev)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Amount <span className="text-zinc-300 normal-case">optional</span></label>
                  <input type="text" value={editingMilestone.milestone.amount || ''} placeholder="$150"
                    onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, amount: e.target.value } } : prev)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Payment Link <span className="text-zinc-300 normal-case">optional</span></label>
                  <input type="text" value={editingMilestone.milestone.payment_link || ''} placeholder="https://..."
                    onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, payment_link: e.target.value } } : prev)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Needs To... <span className="text-zinc-300 normal-case">optional — leave blank if nothing's needed from them</span></label>
                <input type="text" value={editingMilestone.milestone.client_action_needed || ''} placeholder="e.g. Approve color selection, provide gate code"
                  onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, client_action_needed: e.target.value } } : prev)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Scheduled / Due Date <span className="text-zinc-300 normal-case font-medium">optional</span></label>
                  <SmartDateTimePicker
                    date={editScheduleDate}
                    time={editScheduleTime}
                    onDateChange={setEditScheduleDate}
                    onTimeChange={setEditScheduleTime}
                    onClear={() => { setEditScheduleDate(''); setEditScheduleTime(''); }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Assigned To</label>
                  <select
                    value={editingMilestone.milestone.assigned_worker_id || ''}
                    onChange={(e) => setEditingMilestone(prev => prev ? { ...prev, milestone: { ...prev.milestone, assigned_worker_id: e.target.value || null } } : prev)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-white text-zinc-700 focus:outline-none">
                    <option value="">Myself / Unassigned</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.member_email}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={saveMilestoneEdit} disabled={savingMilestone || !editingMilestone.milestone.title.trim()}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {savingMilestone ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => deleteMilestoneFromCard(editingMilestone.portalId, editingMilestone.milestone.id, editingMilestone.milestone.title)}
                className="w-full border border-rose-200 text-rose-500 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-50 transition cursor-pointer flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Delete Milestone
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}