'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileIcon, MessageSquare, Send, Upload,
  Layers, Plus, Trash2, ExternalLink, ClipboardList,
  User, Phone, MapPin, Tag, FileText, Edit3,
  Copy, Check, X, Lock, Share2, Archive, RotateCcw,
  Activity, Camera, BookTemplate, ChevronDown, Image,
  Calendar, AlertTriangle,
} from 'lucide-react';
import { resolveWorkspaceAccess } from '@/lib/workspace';

type Tab = 'milestones' | 'files' | 'messages' | 'proposals' | 'activity' | 'crm';

interface MilestoneForm {
  title: string;
  description: string;
  amount: string;
  payment_link: string;
  responsibility: string;
  scheduled_at: string;
  assigned_worker_id: string;
}

const emptyForm: MilestoneForm = {
  title: '', description: '', amount: '', payment_link: '', responsibility: 'provider',
  scheduled_at: '', assigned_worker_id: '',
};

export default function AdminPortalWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id: portalId } = use(params);
  const router = useRouter();

  const [portal, setPortal] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('milestones');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'user' | 'worker' | null>(null);
  const [archiving, setArchiving] = useState(false);

  const pageTopRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Milestone form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(emptyForm);

  // Workers
  const [workers, setWorkers] = useState<{ id: string; member_email: string }[]>([]);

  // Reschedule
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [reschedulingSaving, setReschedulingSaving] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState<{ id: string; type: 'before' | 'after' } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoMilestone, setPendingPhotoMilestone] = useState<{ id: string; type: 'before' | 'after' } | null>(null);

  // Message
  const [adminMessage, setAdminMessage] = useState('');

  // File upload
  const [uploading, setUploading] = useState(false);

  // Proposal form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalBody, setProposalBody] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
  const [savingProposal, setSavingProposal] = useState(false);

  // Invoice
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSelected, setInvoiceSelected] = useState<Record<string, boolean>>({});

  // CRM
  const [editingCrm, setEditingCrm] = useState(false);
  const [crmFields, setCrmFields] = useState({ client_phone: '', client_company: '', client_address: '', notes: '' });
  const [savingCrm, setSavingCrm] = useState(false);

  const isReadOnly = userRole === 'user';

  useEffect(() => {
    fetchAll();
    const notesChannel = supabase
      .channel(`admin-notes-${portalId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portal_notes', filter: `portal_id=eq.${portalId}` },
        (payload) => setNotes(prev => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(notesChannel); };
  }, [portalId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes]);

  const fetchAll = async () => {
    const { ownerId, role } = await resolveWorkspaceAccess();
    if (role === 'worker') { router.push('/worker'); return; }
    if (!ownerId) { router.push('/auth'); return; }
    setUserRole(role);

    const { data: portalData, error } = await supabase
      .from('client_portals').select('*').eq('id', portalId).eq('user_id', ownerId).single();

    if (error || !portalData) { router.push('/admin'); return; }
    setPortal(portalData);
    setCrmFields({
      client_phone: portalData.client_phone || '',
      client_company: portalData.client_company || '',
      client_address: portalData.client_address || '',
      notes: portalData.notes || '',
    });

    const [ms, fs, ns, ps, ac, tmpl, wk] = await Promise.all([
      supabase.from('portal_milestones').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_files').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
      supabase.from('portal_notes').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_proposals').select('*, proposal_line_items(*)').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
      supabase.from('portal_activity').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
      supabase.from('milestone_templates').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
      supabase.from('team_members').select('id, member_email').eq('owner_user_id', ownerId).eq('role', 'worker').eq('status', 'active'),
    ]);

    setMilestones(ms.data || []);
    setFiles(fs.data || []);
    setNotes(ns.data || []);
    setProposals((ps.data || []).map((p: any) => ({ ...p, line_items: p.proposal_line_items || [] })));
    setActivity(ac.data || []);
    setTemplates(tmpl.data || []);
    setWorkers(wk.data || []);
    setLoading(false);
  };

  const logActivity = async (actionType: string, description: string, actor: 'admin' | 'client' = 'admin') => {
    await supabase.from('portal_activity').insert({
      portal_id: portalId, action_type: actionType, actor, description,
    });
    const { data } = await supabase.from('portal_activity').select('*').eq('portal_id', portalId).order('created_at', { ascending: false });
    setActivity(data || []);
  };

  const notifyClient = async (actionType: string, detail?: string) => {
    try {
      await fetch('/api/notify-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId, actionType, detail }),
      });
    } catch (err) { console.error('Client notify failed:', err); }
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${portal.magic_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePortalLink = async () => {
    const url = `${window.location.origin}/portal/${portal.magic_token}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${portal.client_name} — ${portal.project_name}`,
          text: 'Access your project portal here:',
          url,
        });
      } catch (err) {
        // User cancelled share or error — fall back to copy
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const archivePortal = async () => {
    const isArchived = portal.status === 'archived';
    const action = isArchived ? 'restore' : 'archive';
    if (!confirm(`${isArchived ? 'Restore' : 'Archive'} this portal?`)) return;
    setArchiving(true);
    const res = await fetch('/api/archive-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalId, action }),
    });
    if (res.ok) {
      if (action === 'archive') {
        router.push('/admin');
      } else {
        setPortal((prev: any) => ({ ...prev, status: 'active' }));
      }
    }
    setArchiving(false);
  };

  // ── Milestone form helpers ───────────────────────────────
  const updateForm = (field: keyof MilestoneForm, value: string) => {
    setMilestoneForm(prev => ({ ...prev, [field]: value }));
  };

  const openAddForm = () => {
    if (isReadOnly) return;
    setEditingMilestoneId(null);
    setMilestoneForm(emptyForm);
    setShowMilestoneForm(true);
  };

  const openEditForm = (m: any) => {
    if (isReadOnly) return;
    setEditingMilestoneId(m.id);
    setMilestoneForm({
      title: m.title || '', description: m.description || '',
      amount: m.amount || '', payment_link: m.payment_link || '',
      responsibility: m.responsibility || 'provider',
      scheduled_at: m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : '',
      assigned_worker_id: m.assigned_worker_id || '',
    });
    setShowMilestoneForm(true);
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneForm.title.trim() || isReadOnly) return;
    const payload = {
      title: milestoneForm.title, description: milestoneForm.description || null,
      amount: milestoneForm.amount || null, payment_link: milestoneForm.payment_link || null,
      responsibility: milestoneForm.responsibility,
      scheduled_at: milestoneForm.scheduled_at ? new Date(milestoneForm.scheduled_at).toISOString() : null,
      assigned_worker_id: milestoneForm.assigned_worker_id || null,
    };
    if (editingMilestoneId) {
      await supabase.from('portal_milestones').update(payload).eq('id', editingMilestoneId);
    } else {
      await supabase.from('portal_milestones').insert({ ...payload, portal_id: portalId, status: 'incomplete' });
      await logActivity('milestone_added', `Milestone added: ${milestoneForm.title}`);
      if (milestoneForm.responsibility === 'client') {
        await notifyClient('milestone_client_action', milestoneForm.title);
      }
    }
    setShowMilestoneForm(false); setEditingMilestoneId(null); setMilestoneForm(emptyForm);
    const { data } = await supabase.from('portal_milestones').select('*').eq('portal_id', portalId).order('created_at', { ascending: true });
    setMilestones(data || []);
  };

  const advanceMilestone = async (id: string, current: string, title: string) => {
    if (isReadOnly) return;
    const next: Record<string, string> = { incomplete: 'in_progress', in_progress: 'completed', completed: 'incomplete' };
    const newStatus = next[current];
    await supabase.from('portal_milestones').update({ status: newStatus }).eq('id', id);
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    if (newStatus === 'completed') {
      await logActivity('milestone_completed', `Milestone completed: ${title}`);
      await notifyClient('milestone_completed', title);
    }
  };

  const deleteMilestone = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm('Delete this milestone?')) return;
    await supabase.from('portal_milestones').delete().eq('id', id);
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleReschedule = async (milestone: any) => {
    if (!rescheduleDate || isReadOnly) return;
    setReschedulingSaving(true);
    const newScheduledAt = new Date(rescheduleDate).toISOString();

    await supabase.from('portal_milestones').update({
      scheduled_at: newScheduledAt,
      worker_status: null,
      worker_note: null,
    }).eq('id', milestone.id);

    setMilestones(prev => prev.map(m => m.id === milestone.id
      ? { ...m, scheduled_at: newScheduledAt, worker_status: null, worker_note: null }
      : m
    ));

    const worker = workers.find(w => w.id === milestone.assigned_worker_id);
    if (worker?.member_email) {
      try {
        await fetch('/api/notify-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerEmail: worker.member_email,
            jobTitle: milestone.title,
            scheduledAt: newScheduledAt,
            clientName: portal?.client_name,
            projectName: portal?.project_name,
          }),
        });
      } catch (err) { console.error('Worker notify failed:', err); }
    }

    await logActivity('milestone_rescheduled', `Rescheduled "${milestone.title}" to ${new Date(newScheduledAt).toLocaleString()}`);

    setReschedulingId(null);
    setRescheduleDate('');
    setReschedulingSaving(false);
  };

  // ── Photo upload ─────────────────────────────────────────
  const triggerPhotoUpload = (milestoneId: string, type: 'before' | 'after') => {
    setPendingPhotoMilestone({ id: milestoneId, type });
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPhotoMilestone) return;
    setUploadingPhoto(pendingPhotoMilestone);
    const { id, type } = pendingPhotoMilestone;
    const path = `${portalId}/${id}/${type}-${Date.now()}.${file.name.split('.').pop()}`;
    try {
      const { error } = await supabase.storage.from('milestone-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('milestone-photos').getPublicUrl(path);
      const field = type === 'before' ? 'photo_before_url' : 'photo_after_url';
      await supabase.from('portal_milestones').update({ [field]: urlData.publicUrl }).eq('id', id);
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: urlData.publicUrl } : m));
      await logActivity('photo_uploaded', `${type === 'before' ? 'Before' : 'After'} photo uploaded`);
    } catch (err: any) { alert('Photo upload failed: ' + err.message); }
    finally { setUploadingPhoto(null); setPendingPhotoMilestone(null); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  // ── Templates ────────────────────────────────────────────
  const saveAsTemplate = async () => {
    if (!templateName.trim() || milestones.length === 0) return;
    setSavingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();
    const templateMilestones = milestones.map(m => ({
      title: m.title, description: m.description, amount: m.amount,
      payment_link: m.payment_link, responsibility: m.responsibility,
    }));
    await supabase.from('milestone_templates').insert({
      user_id: user?.id, name: templateName, milestones: templateMilestones,
    });
    const { data } = await supabase.from('milestone_templates').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setTemplates(data || []);
    setTemplateName(''); setShowSaveTemplate(false); setSavingTemplate(false);
  };

  const loadTemplate = async (template: any) => {
    if (isReadOnly) return;
    setShowTemplateMenu(false);
    const inserts = template.milestones.map((m: any) => ({
      portal_id: portalId, title: m.title, description: m.description || null,
      amount: m.amount || null, payment_link: m.payment_link || null,
      responsibility: m.responsibility || 'provider', status: 'incomplete',
    }));
    await supabase.from('portal_milestones').insert(inserts);
    const { data } = await supabase.from('portal_milestones').select('*').eq('portal_id', portalId).order('created_at', { ascending: true });
    setMilestones(data || []);
    await logActivity('milestone_added', `Template loaded: ${template.name}`);
  };

  // ── Files ────────────────────────────────────────────────
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file || !portal) return;
    setUploading(true);
    const path = `${portal.magic_token}/${Date.now()}-${file.name}`;
    try {
      const { error } = await supabase.storage.from('portal-files').upload(path, file);
      if (error) throw error;
      await supabase.from('portal_files').insert({ portal_id: portalId, file_name: file.name, file_path: path, status: 'pending_review' });
      const { data } = await supabase.from('portal_files').select('*').eq('portal_id', portalId).order('created_at', { ascending: false });
      setFiles(data || []);
      await logActivity('file_uploaded', `File uploaded: ${file.name}`);
      await notifyClient('file_uploaded', file.name);
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); }
  };

  // ── Messages ─────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessage.trim() || isReadOnly) return;
    const msg = adminMessage.trim();
    await supabase.from('portal_notes').insert({ portal_id: portalId, message: msg, is_from_client: false });
    setAdminMessage('');
    await logActivity('message_sent', 'Admin sent a message');
    await notifyClient('message');
  };

  // ── Proposals ────────────────────────────────────────────
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const saveProposal = async (asDraft: boolean) => {
    if (!proposalTitle.trim() || isReadOnly) return;
    setSavingProposal(true);
    const { data: prop } = await supabase.from('portal_proposals').insert({
      portal_id: portalId, title: proposalTitle, body: proposalBody,
      status: asDraft ? 'draft' : 'sent',
      total_amount: totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : null,
    }).select().single();
    if (prop && lineItems.some(i => i.description)) {
      await supabase.from('proposal_line_items').insert(
        lineItems.filter(i => i.description).map(i => ({ proposal_id: prop.id, ...i }))
      );
    }
    if (!asDraft) {
      await logActivity('proposal_sent', `Proposal sent: ${proposalTitle}`);
      await notifyClient('proposal_sent', proposalTitle);
    }
    setProposalTitle(''); setProposalBody('');
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setShowProposalForm(false); setSavingProposal(false);
    const { data } = await supabase.from('portal_proposals').select('*, proposal_line_items(*)').eq('portal_id', portalId).order('created_at', { ascending: false });
    setProposals((data || []).map((p: any) => ({ ...p, line_items: p.proposal_line_items || [] })));
  };

  const sendProposal = async (id: string, title: string) => {
    if (isReadOnly) return;
    await supabase.from('portal_proposals').update({ status: 'sent' }).eq('id', id);
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent' } : p));
    await logActivity('proposal_sent', `Proposal sent: ${title}`);
    await notifyClient('proposal_sent', title);
  };

  // ── Invoice ──────────────────────────────────────────────
  const openInvoiceModal = () => {
    const preSelected: Record<string, boolean> = {};
    milestones.forEach(m => { preSelected[m.id] = m.status === 'completed'; });
    setInvoiceSelected(preSelected);
    setShowInvoiceModal(true);
  };

  const generateInvoice = () => {
    const selectedIds = Object.entries(invoiceSelected)
      .filter(([_, checked]) => checked)
      .map(([id]) => id)
      .join(',');
    if (!selectedIds) return;
    window.open(`/invoice/${portalId}?milestones=${selectedIds}`, '_blank');
    setShowInvoiceModal(false);
  };

  // ── CRM ──────────────────────────────────────────────────
  const saveCrm = async () => {
    if (isReadOnly) return;
    setSavingCrm(true);
    await supabase.from('client_portals').update(crmFields).eq('id', portalId);
    setPortal((prev: any) => ({ ...prev, ...crmFields }));
    setEditingCrm(false); setSavingCrm(false);
  };

  // ── Activity icon helper ─────────────────────────────────
  const activityIcon: Record<string, string> = {
    milestone_completed: '✅',
    milestone_added: '📌',
    file_uploaded: '📎',
    message_sent: '💬',
    proposal_sent: '📄',
    proposal_accepted: '✅',
    proposal_declined: '❌',
    portal_created: '🚀',
    photo_uploaded: '📸',
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
    </div>
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'milestones', label: 'Milestones', icon: <Layers className="w-4 h-4" /> },
    { key: 'files', label: 'Files', icon: <FileIcon className="w-4 h-4" /> },
    { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'proposals', label: 'Proposals', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { key: 'crm', label: 'Customer', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div ref={pageTopRef} className="min-h-screen bg-zinc-50 font-sans antialiased">
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-zinc-900">Generate Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">Select milestones to include in the invoice.</p>
            <div className="flex gap-3 text-xs font-bold">
              <button onClick={() => {
                const all: Record<string, boolean> = {};
                milestones.forEach(m => { all[m.id] = true; });
                setInvoiceSelected(all);
              }} className="text-zinc-600 hover:text-zinc-900 transition cursor-pointer underline">
                Select all
              </button>
              <button onClick={() => setInvoiceSelected({})}
                className="text-zinc-400 hover:text-zinc-600 transition cursor-pointer underline">
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {milestones.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No milestones yet.</p>
              ) : milestones.map(m => (
                <label key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!invoiceSelected[m.id]}
                    onChange={e => setInvoiceSelected(prev => ({ ...prev, [m.id]: e.target.checked }))}
                    className="mt-0.5 shrink-0 accent-zinc-900 w-4 h-4 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        m.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                        : m.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                        : 'bg-zinc-100 text-zinc-500'
                      }`}>{m.status.replace('_', ' ')}</span>
                      {m.amount && <span className="text-[10px] font-bold text-zinc-600">{m.amount}</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={generateInvoice}
                disabled={Object.values(invoiceSelected).every(v => !v)}
                className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40">
                Preview Invoice
              </button>
              <button onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/admin')} className="p-2 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition cursor-pointer shrink-0">
              <ArrowLeft className="w-4 h-4 text-zinc-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-zinc-950 truncate">{portal.client_name}</h1>
                {portal.status === 'archived' && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-zinc-200 text-zinc-500 rounded-full shrink-0">Archived</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-medium truncate">{portal.project_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Share button */}
            <button onClick={sharePortalLink}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer">
              <Share2 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline text-zinc-600">Share</span>
            </button>
            {/* Copy link */}
            <button onClick={copyPortalLink}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button onClick={() => window.open(`/portal/${portal.magic_token}`, '_blank')}
              className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer">
              <ExternalLink className="w-4 h-4 text-zinc-500" />
            </button>
            {/* Archive / Restore */}
            {!isReadOnly && (
              <button onClick={archivePortal} disabled={archiving}
                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer disabled:opacity-40"
                title={portal.status === 'archived' ? 'Restore portal' : 'Archive portal'}>
                {portal.status === 'archived' ? <RotateCcw className="w-4 h-4 text-zinc-500" /> : <Archive className="w-4 h-4 text-zinc-500" />}
              </button>
            )}
            {/* Generate Invoice */}
            {!isReadOnly && (
              <button onClick={openInvoiceModal}
                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer"
                title="Generate invoice">
                <FileText className="w-4 h-4 text-zinc-500" />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.key ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-4">

        {/* MILESTONES */}
        {activeTab === 'milestones' && (
          <>
            {!isReadOnly && (
              <div className="flex gap-2">
                <button onClick={openAddForm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition cursor-pointer">
                  <Plus className="w-4 h-4" /> Add Milestone
                </button>

                {/* Template menu */}
                <div className="relative">
                  <button onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 px-3 py-3 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition cursor-pointer">
                    <BookTemplate className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showTemplateMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                      {milestones.length > 0 && (
                        <button onClick={() => { setShowTemplateMenu(false); setShowSaveTemplate(true); }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition border-b border-zinc-100">
                          Save current as template
                        </button>
                      )}
                      {templates.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-zinc-400">No templates yet</p>
                      ) : (
                        templates.map(t => (
                          <button key={t.id} onClick={() => loadTemplate(t)}
                            className="w-full text-left px-4 py-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition">
                            {t.name} <span className="text-zinc-400">({t.milestones.length} milestones)</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save as template form */}
            {showSaveTemplate && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-black text-zinc-900">Save as Template</p>
                <input type="text" placeholder="Template name (e.g. Pest Control Standard)"
                  value={templateName} onChange={e => setTemplateName(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                <div className="flex gap-2">
                  <button onClick={saveAsTemplate} disabled={!templateName.trim() || savingTemplate}
                    className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-zinc-700 transition cursor-pointer">
                    {savingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                  <button onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                    className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showMilestoneForm && !isReadOnly && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-zinc-900">{editingMilestoneId ? 'Edit Milestone' : 'New Milestone'}</h3>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g. Initial site visit"
                    value={milestoneForm.title} onChange={e => updateForm('title', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Description <span className="text-zinc-300">optional</span></label>
                  <textarea placeholder="Additional details..."
                    value={milestoneForm.description} onChange={e => updateForm('description', e.target.value)}
                    rows={2} className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Amount <span className="text-zinc-300">optional</span></label>
                  <input type="text" placeholder="e.g. $1,500"
                    value={milestoneForm.amount} onChange={e => updateForm('amount', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Payment Link <span className="text-zinc-300 normal-case">paste a link, or leave blank if paying by cash/check on completion</span></label>
                  <input type="url" placeholder="https://buy.stripe.com/..."
                    value={milestoneForm.payment_link} onChange={e => updateForm('payment_link', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Responsibility</label>
                  <select value={milestoneForm.responsibility} onChange={e => updateForm('responsibility', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-white font-medium text-zinc-700 focus:outline-none">
                    <option value="provider">We'll handle this</option>
                    <option value="client">Client needs to take action</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Scheduled / Due Date <span className="text-zinc-300">optional</span></label>
                    <input type="datetime-local"
                      value={milestoneForm.scheduled_at} onChange={e => updateForm('scheduled_at', e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Assigned To</label>
                    <select value={milestoneForm.assigned_worker_id} onChange={e => updateForm('assigned_worker_id', e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-3 text-sm bg-white font-medium text-zinc-700 focus:outline-none">
                      <option value="">Myself / Unassigned</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.member_email}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveMilestone as any} disabled={!milestoneForm.title.trim()}
                    className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40">
                    {editingMilestoneId ? 'Save Changes' : 'Add Milestone'}
                  </button>
                  <button onClick={() => { setShowMilestoneForm(false); setEditingMilestoneId(null); setMilestoneForm(emptyForm); }}
                    className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {milestones.length === 0 && !showMilestoneForm && (
              <div className="text-center py-12 text-zinc-400">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No milestones yet</p>
              </div>
            )}

            {milestones.map(m => (
              <div key={m.id} className={`bg-white border rounded-2xl overflow-hidden transition ${m.status === 'completed' ? 'border-zinc-100 opacity-80' : 'border-zinc-200'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => advanceMilestone(m.id, m.status, m.title)}
                      disabled={isReadOnly}
                      className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${
                        m.status === 'completed' ? 'bg-zinc-900 border-zinc-900'
                        : m.status === 'in_progress' ? 'border-amber-400'
                        : 'border-zinc-300 hover:border-zinc-500'
                      }`}>
                      {m.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                      {m.status === 'in_progress' && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${m.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{m.title}</p>
                      {m.description && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{m.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                          : m.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                          : 'bg-zinc-100 text-zinc-500'
                        }`}>{m.status.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-400">{m.responsibility === 'client' ? 'Customer' : 'You'}</span>
                        {m.amount && <span className="text-[10px] font-bold text-zinc-600">{m.amount}</span>}
                        {m.scheduled_at && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(m.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        {m.assigned_worker_id && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {workers.find(w => w.id === m.assigned_worker_id)?.member_email || 'Assigned'}
                          </span>
                        )}
                      </div>
                      {(m.worker_status === 'no_show' || m.worker_status === 'issue_reported') && (
                        <div className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg space-y-2">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            {m.worker_status === 'no_show' ? 'Worker reported a no-show' : 'Worker requested a reschedule'}
                            {m.worker_note ? ` — ${m.worker_note}` : ''}
                          </div>
                          {!isReadOnly && (
                            reschedulingId === m.id ? (
                              <div className="flex items-center gap-2 pt-1">
                                <input type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                                  className="flex-1 border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none [color-scheme:light]" />
                                <button onClick={() => handleReschedule(m)} disabled={!rescheduleDate || reschedulingSaving}
                                  className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer">
                                  {reschedulingSaving ? 'Saving...' : 'Confirm'}
                                </button>
                                <button onClick={() => { setReschedulingId(null); setRescheduleDate(''); }}
                                  className="text-zinc-400 hover:text-zinc-600 px-1 cursor-pointer">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setReschedulingId(m.id)}
                                className="text-[10px] font-bold uppercase tracking-wider underline cursor-pointer">
                                Set new time
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditForm(m)}
                          className="p-1.5 text-zinc-300 hover:text-zinc-600 transition cursor-pointer rounded-lg hover:bg-zinc-100">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMilestone(m.id)}
                          className="p-1.5 text-zinc-300 hover:text-red-400 transition cursor-pointer rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Before/After photos */}
                  {!isReadOnly && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => triggerPhotoUpload(m.id, 'before')}
                        disabled={!!uploadingPhoto}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-700 transition cursor-pointer disabled:opacity-40">
                        <Camera className="w-3.5 h-3.5" />
                        {uploadingPhoto?.id === m.id && uploadingPhoto?.type === 'before' ? 'Uploading...' : m.photo_before_url ? 'Before ✓' : 'Before photo'}
                      </button>
                      <span className="text-zinc-200">·</span>
                      <button onClick={() => triggerPhotoUpload(m.id, 'after')}
                        disabled={!!uploadingPhoto}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-700 transition cursor-pointer disabled:opacity-40">
                        <Camera className="w-3.5 h-3.5" />
                        {uploadingPhoto?.id === m.id && uploadingPhoto?.type === 'after' ? 'Uploading...' : m.photo_after_url ? 'After ✓' : 'After photo'}
                      </button>
                    </div>
                  )}

                  {/* Show photos if both exist */}
                  {(m.photo_before_url || m.photo_after_url) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {m.photo_before_url && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Before</p>
                          <img src={m.photo_before_url} alt="Before" className="w-full h-24 object-cover rounded-xl border border-zinc-100" />
                        </div>
                      )}
                      {m.photo_after_url && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">After</p>
                          <img src={m.photo_after_url} alt="After" className="w-full h-24 object-cover rounded-xl border border-zinc-100" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* FILES */}
        {activeTab === 'files' && (
          <>
            {!isReadOnly && (
              <label className={`block w-full border-2 border-dashed border-zinc-300 rounded-2xl p-6 text-center cursor-pointer hover:border-zinc-400 transition ${uploading ? 'opacity-40 pointer-events-none' : ''}`}>
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-600">{uploading ? 'Uploading...' : 'Tap to upload file'}</p>
                <p className="text-xs text-zinc-400 mt-1">Any file type</p>
                <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            )}
            {files.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No files yet</p>
              </div>
            )}
            {files.map(file => (
              <div key={file.id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-xl shrink-0"><FileIcon className="w-4 h-4 text-zinc-500" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{file.file_name}</p>
                  <span className={`text-[10px] font-bold uppercase ${file.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {file.status === 'approved' ? 'Approved' : 'Pending Review'}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="flex-1 space-y-3 pb-4">
              {notes.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No messages yet</p>
                </div>
              )}
              {notes.map((n, i) => (
                <div key={n.id || i} className={`flex ${!n.is_from_client ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    !n.is_from_client ? 'bg-zinc-900 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{n.message}</p>
                    <p className="text-[10px] mt-1 text-zinc-400">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {!isReadOnly && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-3 z-50">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
                  <input type="text" value={adminMessage} onChange={e => setAdminMessage(e.target.value)}
                    placeholder="Message customer..."
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                  <button type="submit" disabled={!adminMessage.trim()}
                    className="bg-zinc-900 text-white px-4 rounded-2xl disabled:opacity-40 hover:bg-zinc-700 transition cursor-pointer">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* PROPOSALS */}
        {activeTab === 'proposals' && (
          <>
            {!isReadOnly && (
              <button onClick={() => setShowProposalForm(!showProposalForm)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition cursor-pointer">
                <Plus className="w-4 h-4" /> New Proposal
              </button>
            )}

            {showProposalForm && !isReadOnly && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-black text-zinc-900">New Proposal</h3>
                <input type="text" placeholder="Proposal title"
                  value={proposalTitle} onChange={e => setProposalTitle(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                <textarea placeholder="Scope of work, terms, notes..."
                  value={proposalBody} onChange={e => setProposalBody(e.target.value)}
                  rows={4} className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Line Items</p>
                  <div className="grid grid-cols-12 gap-2 px-1">
                    <span className="col-span-6 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</span>
                    <span className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Qty</span>
                    <span className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price ($)</span>
                    <span className="col-span-1" />
                  </div>
                  {lineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" placeholder="e.g. Lawn mowing" value={item.description}
                        onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it))}
                        className="col-span-6 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition" />
                      <input type="number" min={1} value={item.quantity}
                        onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Number(e.target.value) } : it))}
                        className="col-span-2 border border-zinc-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition text-center" />
                      <input type="number" min={0} placeholder="0" value={item.unit_price || ''}
                        onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, unit_price: Number(e.target.value) } : it))}
                        className="col-span-3 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition" />
                      <button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="col-span-1 flex items-center justify-center text-zinc-300 hover:text-red-400 transition cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition cursor-pointer flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add line item
                  </button>
                  {totalAmount > 0 && (
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                      <span className="text-lg font-black text-zinc-900">${totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => saveProposal(false)} disabled={!proposalTitle.trim() || savingProposal}
                    className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-zinc-700 transition cursor-pointer">
                    {savingProposal ? 'Saving...' : 'Send to Customer'}
                  </button>
                  <button onClick={() => saveProposal(true)} disabled={!proposalTitle.trim() || savingProposal}
                    className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                    Draft
                  </button>
                  <button onClick={() => setShowProposalForm(false)}
                    className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {proposals.length === 0 && !showProposalForm && (
              <div className="text-center py-12 text-zinc-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No proposals yet</p>
              </div>
            )}

            {proposals.map(p => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-900">{p.title}</p>
                    {p.total_amount && <p className="text-lg font-black text-zinc-900 mt-0.5">{p.total_amount}</p>}
                  </div>
                  <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    p.status === 'accepted' ? 'bg-emerald-50 text-emerald-600'
                    : p.status === 'draft' ? 'bg-zinc-100 text-zinc-500'
                    : p.status === 'declined' ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
                  }`}>{p.status}</span>
                </div>
                {p.status === 'accepted' && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-emerald-600 font-semibold">✓ Signed by {p.accepted_signature} · {new Date(p.accepted_at).toLocaleDateString()}</p>
                  </div>
                )}
                {p.status === 'declined' && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-red-500 font-semibold">Customer declined this proposal.</p>
                  </div>
                )}
                {p.status === 'draft' && !isReadOnly && (
                  <div className="px-4 pb-4">
                    <button onClick={() => sendProposal(p.id, p.title)}
                      className="text-xs font-bold text-zinc-900 underline cursor-pointer hover:text-zinc-600 transition">
                      Send to customer →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ACTIVITY FEED */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activity.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No activity yet</p>
              </div>
            ) : activity.map(a => (
              <div key={a.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-lg shrink-0">{activityIcon[a.action_type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{a.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      a.actor === 'client' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-500'
                    }`}>{a.actor === 'client' ? 'Customer' : 'You'}</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMER (CRM) */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-zinc-900">Customer Details</h3>
                {!isReadOnly && (
                  <button onClick={() => editingCrm ? saveCrm() : setEditingCrm(true)} disabled={savingCrm}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition cursor-pointer flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    {editingCrm ? (savingCrm ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                )}
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2 py-2 border-b border-zinc-50">
                  <User className="w-4 h-4 text-zinc-300 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-900">{portal.client_name}</span>
                </div>
                {portal.client_email && (
                  <div className="flex items-center gap-2 py-2 border-b border-zinc-50">
                    <FileText className="w-4 h-4 text-zinc-300 shrink-0" />
                    <span className="text-sm text-zinc-600">{portal.client_email}</span>
                  </div>
                )}
              </div>

              {editingCrm && !isReadOnly ? (
                <div className="space-y-3">
                  {[
                    { label: 'Company / Name', field: 'client_company', placeholder: 'e.g. ABC Landscaping or John Smith' },
                    { label: 'Phone', field: 'client_phone', placeholder: 'e.g. 555-000-0000' },
                    { label: 'Address', field: 'client_address', placeholder: 'e.g. 123 Main St, Orlando FL' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</label>
                      <input type="text" placeholder={placeholder}
                        value={(crmFields as any)[field]}
                        onChange={e => setCrmFields(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Internal Notes</label>
                    <textarea rows={3} placeholder="Private notes about this customer..."
                      value={crmFields.notes}
                      onChange={e => setCrmFields(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
                  </div>
                  <button onClick={() => setEditingCrm(false)} className="text-xs text-zinc-400 hover:text-zinc-600 transition cursor-pointer">Cancel</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { icon: <Tag className="w-4 h-4 text-zinc-300" />, value: portal.client_company },
                    { icon: <Phone className="w-4 h-4 text-zinc-300" />, value: portal.client_phone },
                    { icon: <MapPin className="w-4 h-4 text-zinc-300" />, value: portal.client_address },
                  ].map(({ icon, value }, i) => value ? (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-zinc-50">
                      {icon}<span className="text-sm text-zinc-600">{value}</span>
                    </div>
                  ) : null)}
                  {portal.notes && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Internal Notes</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{portal.notes}</p>
                    </div>
                  )}
                  {!portal.client_company && !portal.client_phone && !portal.client_address && !portal.notes && (
                    <p className="text-sm text-zinc-400 py-2">{isReadOnly ? 'No additional info.' : 'No additional info. Tap Edit to add.'}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <h3 className="text-sm font-black text-zinc-900 mb-3">Project Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Milestones', value: milestones.length },
                  { label: 'Completed', value: milestones.filter(m => m.status === 'completed').length },
                  { label: 'Files', value: files.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-zinc-900">{value}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}