'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Users, 
  FolderPlus, 
  Plus, 
  ClipboardCopy, 
  CheckSquare, 
  FileUp, 
  Settings,
  Eye,
  CheckCircle2,
  Circle,
  FileText,
  Send,
  Archive,
  RotateCcw,
  Clock,
  DollarSign,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  client_email?: string;
  magic_token: string;
  status: string;
}

interface Milestone {
  id: string;
  title: string;
  responsibility: 'provider' | 'client';
  status: 'incomplete' | 'completed';
  payment_request?: string;
  reminder_days?: number;
  scheduled_at?: string | null;
  assigned_worker_id?: string | null;
  worker_status?: string | null;
  worker_note?: string | null;
}

interface PortalFile {
  id: string;
  file_name: string;
  status: 'pending_review' | 'approved' | 'revision_requested';
  reminder_days?: number;
}

interface Note {
  id: string;
  message: string;
  is_from_client: boolean;
  created_at: string;
}

export default function AdminWorkspaceManager() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'active' | 'completed'>('active');
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  
  // Create Portal Form State
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Active Selected Client Dynamic Tracking Sub-States
  const [activePortalId, setActivePortalId] = useState<string | null>(null);
  const [activeMilestones, setActiveMilestones] = useState<Milestone[]>([]);
  const [activeFiles, setActiveFiles] = useState<PortalFile[]>([]);
  const [activeNotes, setActiveNotes] = useState<Note[]>([]);
  
  // Sub-forms states
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneOwner, setMilestoneOwner] = useState<'provider' | 'client'>('provider');
  const [milestonePaymentText, setMilestonePaymentText] = useState('');
  const [milestoneReminderDays, setMilestoneReminderDays] = useState<string>('');
  
  const [fileReminderDays, setFileReminderDays] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Scheduling / worker assignment
  const [milestoneScheduledAt, setMilestoneScheduledAt] = useState('');
  const [milestoneAssignedWorker, setMilestoneAssignedWorker] = useState('');
  const [workers, setWorkers] = useState<{ id: string; member_email: string }[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Manager Soft Deadline Dropdown Value Matrix
  const deadlineOptions = [1, 3, 5, 7, 10, 14, 21, 30, 45, 60];

  const fetchPortals = async () => {
    try {
      // 1. Fetch current authenticated session user explicitly
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        // If session is missing, bump back to login gateway door
        window.location.href = '/login';
        return;
      }

      // 2. FORCE MULTI-TENANT ISOLATION: Filter entirely by user_id
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setPortals(data);
        fetchScheduledJobs(data.map((p: Portal) => p.id));
      }

      fetchWorkers(user.id);
    } catch (err) {
      console.error('Operational matrix hydration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async (ownerId: string) => {
    const { data } = await supabase
      .from('team_members')
      .select('id, member_email')
      .eq('owner_user_id', ownerId)
      .eq('role', 'worker')
      .eq('status', 'active');
    setWorkers(data || []);
  };

  const fetchScheduledJobs = async (portalIds: string[]) => {
    if (portalIds.length === 0) { setScheduledJobs([]); return; }
    const { data } = await supabase
      .from('portal_milestones')
      .select('id, title, scheduled_at, worker_status, worker_note, portal_id, assigned_worker_id, client_portals(client_name, project_name), team_members(member_email)')
      .in('portal_id', portalIds)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true });
    setScheduledJobs(data || []);
  };

  const handleReschedule = async (milestoneId: string) => {
    if (!rescheduleDate) return;
    try {
      const { error } = await supabase
        .from('portal_milestones')
        .update({
          scheduled_at: new Date(rescheduleDate).toISOString(),
          worker_status: null,
          worker_note: null,
        })
        .eq('id', milestoneId);
      if (error) throw error;
      setReschedulingId(null);
      setRescheduleDate('');
      fetchScheduledJobs(portals.map(p => p.id));
      if (activePortalId) loadPortalSubData(activePortalId);
    } catch (err) {
      alert('Failed to reschedule job.');
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const loadPortalSubData = async (portalId: string) => {
    try {
      const [milestonesRes, filesRes, notesRes] = await Promise.all([
        supabase.from('portal_milestones').select('*').eq('portal_id', portalId).order('created_at', { ascending: true }),
        supabase.from('portal_files').select('*').eq('portal_id', portalId).order('created_at', { ascending: false }),
        supabase.from('portal_notes').select('*').eq('portal_id', portalId).order('created_at', { ascending: true })
      ]);
      setActiveMilestones(milestonesRes.data || []);
      setActiveFiles(filesRes.data || []);
      setActiveNotes(notesRes.data || []);
    } catch (err) {
      console.error('Error fetching inline project drawer history:', err);
    }
  };

  const handleManageClick = (portalId: string) => {
    if (activePortalId === portalId) {
      setActivePortalId(null);
    } else {
      setActivePortalId(portalId);
      loadPortalSubData(portalId);
    }
  };

  const handleCreatePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    const generatedToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    try {
      // Fetch authenticated session user explicitly
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        window.location.href = '/login';
        return;
      }

      // LIVE SUBSCRIPTION ENFORCEMENT CHECK BLOCK
      const { data: subRecord, error: subErr } = await supabase
        .from('manager_subscriptions')
        .select('tier_level, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subErr || !subRecord || subRecord.subscription_status !== 'active') {
        alert("Subscription status inactive. Please link a valid payment plan to initialize project pipelines.");
        window.location.href = '/billing';
        return;
      }

      // SECURE INSERTION (Tied cleanly to current manager user.id tenant)
      const { data, error } = await supabase
        .from('client_portals')
        .insert([{
          user_id: user.id,
          client_name: clientName.trim(),
          project_name: projectName.trim() || 'General Scope',
          client_email: clientEmail.trim() || null,
          magic_token: generatedToken,
          status: 'active',
          brand_name: brandName.trim() || null,
          brand_logo_url: brandLogoUrl.trim() || null
        }])
        .select()
        .single();

      if (!error && data) {
        setPortals((prev) => [data, ...prev]);
        setClientName('');
        setProjectName('');
        setClientEmail('');
        setBrandName('');
        setBrandLogoUrl('');
      } else if (error) {
        throw error;
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying subscription or initializing portal environment.');
    }
  };

  const toggleMilestoneStatus = async (milestoneId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'incomplete' : 'completed';
    try {
      const { error } = await supabase
        .from('portal_milestones')
        .update({ status: nextStatus })
        .eq('id', milestoneId);
      
      if (error) throw error;
      if (activePortalId) loadPortalSubData(activePortalId);
    } catch (err) {
      alert('Failed updating milestone status');
    }
  };

  const handleAddMilestone = async (e: React.FormEvent, portal: Portal) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;

    let escalationDate = null;
    if (milestoneReminderDays) {
      const target = new Date();
      target.setDate(target.getDate() + parseInt(milestoneReminderDays));
      escalationDate = target.toISOString();
    }

    try {
      const { error } = await supabase
        .from('portal_milestones')
        .insert([{
          portal_id: portal.id,
          title: milestoneTitle.trim(),
          responsibility: milestoneOwner,
          status: 'incomplete',
          payment_request: milestonePaymentText.trim() || null,
          reminder_days: milestoneReminderDays ? parseInt(milestoneReminderDays) : null,
          deadline_escalation_at: escalationDate,
          scheduled_at: milestoneScheduledAt ? new Date(milestoneScheduledAt).toISOString() : null,
          assigned_worker_id: milestoneAssignedWorker || null,
        }]);

      if (error) throw error;
      
      setMilestoneTitle('');
      setMilestonePaymentText('');
      setMilestoneReminderDays('');
      setMilestoneScheduledAt('');
      setMilestoneAssignedWorker('');
      loadPortalSubData(portal.id);
      fetchScheduledJobs(portals.map(p => p.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, portal: Portal) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let escalationDate = null;
    if (fileReminderDays) {
      const target = new Date();
      target.setDate(target.getDate() + parseInt(fileReminderDays));
      escalationDate = target.toISOString();
    }

    setUploadingFile(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
      const bucketPath = `${portal.id}/${uniqueFileName}`;

      const { error: storageError } = await supabase.storage
        .from('portal-files')
        .upload(bucketPath, file, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('portal_files')
        .insert([{
          portal_id: portal.id,
          file_name: file.name,
          file_path: bucketPath,
          file_size: file.size,
          uploaded_by: userData?.user?.id || null,
          status: 'pending_review',
          reminder_days: fileReminderDays ? parseInt(fileReminderDays) : null,
          deadline_escalation_at: escalationDate
        }]);

      setFileReminderDays('');
      loadPortalSubData(portal.id);
    } catch (err) {
      alert('Storage upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleToggleArchivePortal = async (portalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
    const message = nextStatus === 'completed' 
      ? "Archive this workspace? All files, invoices, and logs will be permanently frozen in historical files."
      : "Restore this project back into active pipelines?";
    
    if (!confirm(message)) return;

    try {
      const { error } = await supabase
        .from('client_portals')
        .update({ status: nextStatus })
        .eq('id', portalId);

      if (error) throw error;
      fetchPortals();
      setActivePortalId(null);
    } catch (err) {
      alert("Failed to adjust project archive state.");
    }
  };

  const handleSendAdminNote = async (e: React.FormEvent, portalId: string) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const { error } = await supabase.from('portal_notes').insert([
      { portal_id: portalId, message: newNote.trim(), is_from_client: false }
    ]);
    if (!error) {
      setNewNote('');
      loadPortalSubData(portalId);
    }
  };

  const copyMagicLink = (token: string, e: React.MouseEvent) => {
    e.preventDefault();
    const secureUrl = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(secureUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-300 flex items-center justify-center font-semibold text-xs tracking-wider uppercase">
        Syncing Master Multi-Tenant Matrix...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans antialiased relative selection:bg-zinc-700 selection:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />

      {/* Navigation Layer */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              <Users className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">HQ Operator Core</span>
              <h1 className="text-sm font-bold tracking-tight text-white mt-0.5">Agency Control Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/billing" className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Plans & Billing
            </Link>
            <span className="text-[11px] font-mono tracking-wider text-zinc-300 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-md">
              Pipelines Isolated
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Control Column: Deploy Portal Setup Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <FolderPlus className="w-4 h-4 text-zinc-300" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Deploy New Portal Pipeline</h2>
            </div>

            <form onSubmit={handleCreatePortal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Client Enterprise Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Capital Group"
                  className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Engagement Focus Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Custom Scaled Growth Roadmap"
                  className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Client Notification Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="contact@client.com"
                  className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Custom Brand Name (White Label)</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Nexus Operations Group"
                  className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Brand Logo Image URL</label>
                <input
                  type="url"
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://youragency.com/logo.png"
                  className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-white text-zinc-900 text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Initialize Environment
              </button>
            </form>
          </div>
        </div>

        {/* Right Columns: Pipelines Filter Toggles + Project Cards */}
        <div className="lg:col-span-2 space-y-4">

          {/* Scheduled Jobs Agenda */}
          {scheduledJobs.length > 0 && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-zinc-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Scheduled Jobs</h2>
              </div>
              <div className="space-y-2">
                {scheduledJobs.map((job: any) => {
                  const portalInfo = Array.isArray(job.client_portals) ? job.client_portals[0] : job.client_portals;
                  const workerInfo = Array.isArray(job.team_members) ? job.team_members[0] : job.team_members;
                  const flagged = job.worker_status === 'no_show' || job.worker_status === 'issue_reported';
                  return (
                    <div key={job.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs ${flagged ? 'border-amber-700/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-800/40'}`}>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-200 truncate">{job.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{portalInfo?.client_name} — {portalInfo?.project_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono text-zinc-300">
                          {new Date(job.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {workerInfo?.member_email && (
                          <p className="text-[9px] text-zinc-500">{workerInfo.member_email}</p>
                        )}
                        {flagged && (
                          <p className="text-[9px] font-bold uppercase text-amber-400 flex items-center gap-1 justify-end mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> {job.worker_status === 'no_show' ? 'No-show' : 'Reschedule'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 md:p-8">
            
            {/* ACTIVE vs COMPLETED FILTER TAB ROW */}
            <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                {viewFilter === 'active' ? '⚡ Active Portfolio Units' : '📁 Historical Project Archives'}
              </h2>
              <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                <button 
                  onClick={() => { setViewFilter('active'); setActivePortalId(null); }}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer ${viewFilter === 'active' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => { setViewFilter('completed'); setActivePortalId(null); }}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer ${viewFilter === 'completed' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Completed
                </button>
              </div>
            </div>
            
            {/* Dynamic Pipeline Output Stack */}
            <div className="space-y-4">
              {portals.filter(p => p.status === viewFilter).length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center italic border border-dashed border-zinc-800 rounded-xl">
                  No records matching this filter setting located inside your tenant account.
                </p>
              ) : (
                portals
                  .filter(p => p.status === viewFilter)
                  .map((p) => (
                  <div key={p.id} className="p-5 bg-zinc-800/40 border border-zinc-800 rounded-xl space-y-4 hover:border-zinc-700 transition">
                    
                    {/* Inline Summary Identity Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">{p.client_name}</h3>
                        <p className="text-xs text-zinc-300 mt-0.5">{p.project_name}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={(e) => copyMagicLink(p.magic_token, e)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-700 bg-zinc-800 hover:border-zinc-600 text-zinc-200 px-3 py-2 rounded-lg transition cursor-pointer"
                        >
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          {copiedToken === p.magic_token ? 'Copied!' : 'Link'}
                        </button>
                        
                        <button
                          onClick={() => handleManageClick(p.id)}
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-3 py-2 rounded-lg transition cursor-pointer ${activePortalId === p.id ? 'bg-white text-zinc-900 border-white' : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          {activePortalId === p.id ? 'Close' : 'Manage'}
                        </button>

                        <Link
                          href={`/portal/${p.magic_token}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-700 bg-zinc-800 hover:text-zinc-200 text-zinc-300 px-3 py-2 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View ↗
                        </Link>
                      </div>
                    </div>

                    {/* EXPANDED INLINE DRAWER COMPONENT PANEL */}
                    {activePortalId === p.id && (
                      <div className="pt-6 border-t border-zinc-800 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Left Component: Milestone Injector & Invoice Manager */}
                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase block">Milestone Delivery Nodes</span>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                              {activeMilestones.length === 0 ? (
                                <p className="text-[10px] text-zinc-500 italic">No tasks assigned.</p>
                              ) : (
                                activeMilestones.map((m) => (
                                  <div key={m.id} className="p-2 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => toggleMilestoneStatus(m.id, m.status)} className="text-zinc-400 hover:text-white transition cursor-pointer">
                                          {m.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Circle className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`font-medium ${m.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{m.title}</span>
                                      </div>
                                      <span className="text-[8px] font-mono text-zinc-400 uppercase bg-zinc-900 px-1 py-0.5 rounded">by {m.responsibility}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                                      {m.payment_request && (
                                        <div className="text-[9px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                                          <DollarSign className="w-2.5 h-2.5" /> Request: {m.payment_request}
                                        </div>
                                      )}
                                    {/* NEW: PDF RECEIPT ACTION TRIGGER LINK */}
                                    {m.status === 'completed' && m.payment_request && (
                                      <Link
                                        href={`/admin/receipt/${m.id}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 hover:text-white px-2 py-0.5 rounded transition font-mono ml-auto"
                                      >
                                        <FileText className="w-2.5 h-2.5 text-zinc-400" />
                                        Receipt PDF ↗
                                      </Link>
                                    )}
                                  </div>
                                    {m.reminder_days && m.status !== 'completed' && (
                                      <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" /> Reminder set: {m.reminder_days} days
                                      </div>
                                    )}
                                    {m.scheduled_at && (
                                      <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 flex-wrap">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {new Date(m.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        {m.assigned_worker_id && (
                                          <span className="flex items-center gap-1 ml-1">
                                            <User className="w-2.5 h-2.5" />
                                            {workers.find(w => w.id === m.assigned_worker_id)?.member_email || 'Assigned'}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {(m.worker_status === 'no_show' || m.worker_status === 'issue_reported') && (
                                      <div className="text-[9px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-1 rounded space-y-1">
                                        <div className="flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          {m.worker_status === 'no_show' ? 'Worker reported NO-SHOW' : 'Worker requested RESCHEDULE'}
                                          {m.worker_note ? `: ${m.worker_note}` : ''}
                                        </div>
                                        {reschedulingId === m.id ? (
                                          <div className="flex gap-1 pt-1">
                                            <input
                                              type="datetime-local"
                                              value={rescheduleDate}
                                              onChange={(e) => setRescheduleDate(e.target.value)}
                                              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[9px] text-white [color-scheme:dark]"
                                            />
                                            <button onClick={() => handleReschedule(m.id)} className="bg-white text-zinc-900 px-2 rounded text-[9px] font-bold uppercase">Set</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setReschedulingId(m.id)} className="text-[9px] font-bold uppercase underline">
                                            Set new time
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                            
                            {/* Inject New Task Node */}
                            <form onSubmit={(e) => handleAddMilestone(e, p)} className="space-y-2 pt-2 border-t border-zinc-800">
                              <input
                                type="text"
                                required
                                value={milestoneTitle}
                                onChange={(e) => setMilestoneTitle(e.target.value)}
                                placeholder="Milestone / task name..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] px-3 py-1.5 focus:outline-none focus:border-zinc-500 text-white"
                              />
                              <input
                                type="text"
                                value={milestonePaymentText}
                                onChange={(e) => setMilestonePaymentText(e.target.value)}
                                placeholder="Invoice notice (e.g., $1,500 due via retainer) - optional"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] px-3 py-1.5 focus:outline-none focus:border-zinc-500 text-white"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={milestoneOwner}
                                  onChange={(e) => setMilestoneOwner(e.target.value as any)}
                                  className="bg-zinc-800 border border-zinc-700 text-[10px] rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none"
                                >
                                  <option value="provider">Our Team</option>
                                  <option value="client">Client Action</option>
                                </select>
                                <select
                                  value={milestoneReminderDays}
                                  onChange={(e) => setMilestoneReminderDays(e.target.value)}
                                  className="bg-zinc-800 border border-zinc-700 text-[10px] rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none"
                                >
                                  <option value="">No Reminder Loop</option>
                                  {deadlineOptions.map(d => <option key={d} value={d}>{d} Day Reminder</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="datetime-local"
                                  value={milestoneScheduledAt}
                                  onChange={(e) => setMilestoneScheduledAt(e.target.value)}
                                  className="bg-zinc-800 border border-zinc-700 text-[10px] rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none [color-scheme:dark]"
                                />
                                <select
                                  value={milestoneAssignedWorker}
                                  onChange={(e) => setMilestoneAssignedWorker(e.target.value)}
                                  className="bg-zinc-800 border border-zinc-700 text-[10px] rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none"
                                >
                                  <option value="">Myself / Unassigned</option>
                                  {workers.map(w => <option key={w.id} value={w.id}>{w.member_email}</option>)}
                                </select>
                              </div>
                              <button type="submit" className="w-full bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition">
                                Add Milestone Node
                              </button>
                            </form>
                          </div>

                          {/* Right Component: Asset Upload Stream Deck with Review Windows */}
                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase block mb-2">Live Assets & Sign-off Indicators</span>
                              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                {activeFiles.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 italic">No assets uploaded.</p>
                                ) : (
                                  activeFiles.map((f) => (
                                    <div key={f.id} className="p-2 bg-zinc-800/60 border border-zinc-700 rounded-lg text-[11px] space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 truncate text-zinc-200 font-medium">
                                          <FileText className="w-3 h-3 text-zinc-400 shrink-0" />
                                          <span className="truncate">{f.file_name}</span>
                                        </div>
                                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                                          f.status === 'approved' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
                                          f.status === 'revision_requested' ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50' : 'bg-zinc-700 text-zinc-300'
                                        }`}>{f.status?.replace('_', ' ')}</span>
                                      </div>
                                      {f.reminder_days && f.status === 'pending_review' && (
                                        <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5" /> Escalates in: {f.reminder_days} days
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 border-t border-zinc-800 pt-3 mt-2">
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Set Work Order Deadline</label>
                                <select
                                  value={fileReminderDays}
                                  onChange={(e) => setFileReminderDays(e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 text-[10px] rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none"
                                >
                                  <option value="">No Automated Reminder</option>
                                  {deadlineOptions.map(d => <option key={d} value={d}>{d} Day Review Window</option>)}
                                </select>
                              </div>
                              <label className="border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-800/30 rounded-lg p-2.5 text-center cursor-pointer block transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                                  {uploadingFile ? 'Streaming Ingestion Bucket...' : 'Upload & Stream Deliverable File'}
                                </span>
                                <input type="file" disabled={uploadingFile} onChange={(e) => handleFileUpload(e, p)} className="hidden" />
                              </label>
                            </div>
                          </div>

                        </div>

                        {/* Shared Tenant Chat Stream Console */}
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
                          <span className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase block">Shared Operator Chat Stream</span>
                          <div className="h-[140px] overflow-y-auto space-y-2.5 pr-1 border border-zinc-800 p-3 bg-zinc-800/20 rounded-lg">
                            {activeNotes.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 italic py-4 text-center">Timeline conversation empty.</p>
                            ) : (
                              activeNotes.map((n) => (
                                <div key={n.id} className={`flex gap-2 max-w-[85%] ${!n.is_from_client ? 'ml-auto flex-row-reverse' : ''}`}>
                                  <div className={`p-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 text-[9px] font-bold ${n.is_from_client ? 'bg-white text-zinc-900 border-white' : 'bg-zinc-700 text-zinc-200 border-zinc-600'}`}>
                                    {n.is_from_client ? 'C' : 'M'}
                                  </div>
                                  <div className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
                                    n.message.startsWith('[System Update]') ? 'bg-zinc-900 text-zinc-400 font-mono text-[10px] border-zinc-800' :
                                    n.is_from_client ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-800/40 border-zinc-700 text-zinc-300'
                                  }`}>
                                    <p>{n.message}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <form onSubmit={(e) => handleSendAdminNote(e, p.id)} className="flex gap-2">
                            <input
                              type="text"
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Post dispatch log update to timeline..."
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl text-xs px-3.5 py-2 text-white focus:outline-none focus:border-zinc-500"
                            />
                            <button type="submit" className="bg-white text-zinc-900 px-4 rounded-xl text-xs flex items-center justify-center font-bold hover:bg-zinc-200 transition"><Send className="w-3 h-3" /></button>
                          </form>
                        </div>

                        {/* Complete & Archiving Verification Actions */}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleToggleArchivePortal(p.id, p.status)}
                            className={`flex items-center gap-1.5 border text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition cursor-pointer ${
                              p.status === 'active' 
                                ? 'bg-zinc-900 hover:bg-rose-900/20 text-zinc-400 hover:text-rose-300 border-zinc-800 hover:border-rose-900' 
                                : 'bg-zinc-900 hover:bg-emerald-900/20 text-zinc-400 hover:text-emerald-300 border-zinc-800 hover:border-emerald-900'
                            }`}
                          >
                            {p.status === 'active' ? (
                              <>
                                <Archive className="w-3.5 h-3.5" />
                                Complete & Archive Project Pipeline
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restore Back Into Active Operations
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}