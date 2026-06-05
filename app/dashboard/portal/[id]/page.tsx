'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileIcon, MessageSquare, Send, Upload,
  Layers, Plus, Trash2, ExternalLink, ClipboardList,
  User, Phone, MapPin, Tag, FileText, Edit3,
  Copy, Check, X, ChevronDown, ChevronUp,
} from 'lucide-react';

type Tab = 'milestones' | 'files' | 'messages' | 'proposals' | 'crm';

interface MilestoneForm {
  title: string;
  description: string;
  amount: string;
  payment_link: string;
  responsibility: string;
}

const emptyForm: MilestoneForm = {
  title: '',
  description: '',
  amount: '',
  payment_link: '',
  responsibility: 'provider',
};

export default function AdminPortalWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id: portalId } = use(params);
  const router = useRouter();

  const [portal, setPortal] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('milestones');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Milestone form (add + edit shared)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(emptyForm);

  // Message
  const [adminMessage, setAdminMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // File upload
  const [uploading, setUploading] = useState(false);

  // Proposal form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalBody, setProposalBody] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
  const [savingProposal, setSavingProposal] = useState(false);

  // CRM
  const [editingCrm, setEditingCrm] = useState(false);
  const [crmFields, setCrmFields] = useState({ client_phone: '', client_company: '', client_address: '', notes: '' });
  const [savingCrm, setSavingCrm] = useState(false);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: portalData, error } = await supabase
      .from('client_portals').select('*').eq('id', portalId).eq('user_id', user.id).single();

    if (error || !portalData) { router.push('/dashboard'); return; }
    setPortal(portalData);
    setCrmFields({
      client_phone: portalData.client_phone || '',
      client_company: portalData.client_company || '',
      client_address: portalData.client_address || '',
      notes: portalData.notes || '',
    });

    const [ms, fs, ns, ps] = await Promise.all([
      supabase.from('portal_milestones').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_files').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
      supabase.from('portal_notes').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_proposals').select('*, proposal_line_items(*)').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
    ]);

    setMilestones(ms.data || []);
    setFiles(fs.data || []);
    setNotes(ns.data || []);
    setProposals((ps.data || []).map((p: any) => ({ ...p, line_items: p.proposal_line_items || [] })));
    setLoading(false);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${portal.magic_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateForm = (field: keyof MilestoneForm, value: string) => {
    setMilestoneForm(prev => ({ ...prev, [field]: value }));
  };

  const openAddForm = () => {
    setEditingMilestoneId(null);
    setMilestoneForm(emptyForm);
    setShowMilestoneForm(true);
  };

  const openEditForm = (m: any) => {
    setEditingMilestoneId(m.id);
    setMilestoneForm({
      title: m.title || '',
      description: m.description || '',
      amount: m.amount || '',
      payment_link: m.payment_link || '',
      responsibility: m.responsibility || 'provider',
    });
    setShowMilestoneForm(true);
  };

  const saveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;

    const payload = {
      title: milestoneForm.title,
      description: milestoneForm.description || null,
      amount: milestoneForm.amount || null,
      payment_link: milestoneForm.payment_link || null,
      responsibility: milestoneForm.responsibility,
    };

    if (editingMilestoneId) {
      await supabase.from('portal_milestones').update(payload).eq('id', editingMilestoneId);
    } else {
      await supabase.from('portal_milestones').insert({ ...payload, portal_id: portal.id, status: 'incomplete' });
    }

    setShowMilestoneForm(false);
    setEditingMilestoneId(null);
    setMilestoneForm(emptyForm);

    const { data } = await supabase.from('portal_milestones').select('*').eq('portal_id', portal.id).order('created_at', { ascending: true });
    setMilestones(data || []);
  };

  const advanceMilestone = async (id: string, current: string) => {
    const next: Record<string, string> = { incomplete: 'in_progress', in_progress: 'completed', completed: 'incomplete' };
    await supabase.from('portal_milestones').update({ status: next[current] }).eq('id', id);
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: next[current] } : m));
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    await supabase.from('portal_milestones').delete().eq('id', id);
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  // ── Files ────────────────────────────────────────────────
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !portal) return;
    setUploading(true);
    const path = `${portal.magic_token}/${Date.now()}-${file.name}`;
    try {
      const { error } = await supabase.storage.from('portal-files').upload(path, file);
      if (error) throw error;
      await supabase.from('portal_files').insert({ portal_id: portal.id, file_name: file.name, file_path: path, status: 'pending_review' });
      const { data } = await supabase.from('portal_files').select('*').eq('portal_id', portal.id).order('created_at', { ascending: false });
      setFiles(data || []);
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); }
  };

  // ── Messages ─────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessage.trim()) return;
    await supabase.from('portal_notes').insert({ portal_id: portal.id, message: adminMessage, is_from_client: false });
    setAdminMessage('');
  };

  // ── Proposals ────────────────────────────────────────────
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const saveProposal = async (asDraft: boolean) => {
    if (!proposalTitle.trim()) return;
    setSavingProposal(true);
    const { data: prop } = await supabase.from('portal_proposals').insert({
      portal_id: portal.id, title: proposalTitle, body: proposalBody,
      status: asDraft ? 'draft' : 'sent',
      total_amount: totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : null,
    }).select().single();

    if (prop && lineItems.some(i => i.description)) {
      await supabase.from('proposal_line_items').insert(
        lineItems.filter(i => i.description).map(i => ({ proposal_id: prop.id, ...i }))
      );
    }

    setProposalTitle(''); setProposalBody('');
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setShowProposalForm(false); setSavingProposal(false);

    const { data } = await supabase.from('portal_proposals').select('*, proposal_line_items(*)').eq('portal_id', portal.id).order('created_at', { ascending: false });
    setProposals((data || []).map((p: any) => ({ ...p, line_items: p.proposal_line_items || [] })));
  };

  const sendProposal = async (id: string) => {
    await supabase.from('portal_proposals').update({ status: 'sent' }).eq('id', id);
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent' } : p));
  };

  // ── CRM ──────────────────────────────────────────────────
  const saveCrm = async () => {
    setSavingCrm(true);
    await supabase.from('client_portals').update(crmFields).eq('id', portal.id);
    setPortal((prev: any) => ({ ...prev, ...crmFields }));
    setEditingCrm(false); setSavingCrm(false);
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
    { key: 'crm', label: 'Customer', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/dashboard')} className="p-2 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition cursor-pointer shrink-0">
              <ArrowLeft className="w-4 h-4 text-zinc-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-zinc-950 truncate">{portal.client_name}</h1>
              <p className="text-[11px] text-zinc-500 font-medium truncate">{portal.project_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyPortalLink}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button onClick={() => window.open(`/portal/${portal.magic_token}`, '_blank')}
              className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer">
              <ExternalLink className="w-4 h-4 text-zinc-500" />
            </button>
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
            <button onClick={openAddForm}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition cursor-pointer">
              <Plus className="w-4 h-4" /> Add Milestone
            </button>

            {showMilestoneForm && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-zinc-900">
                  {editingMilestoneId ? 'Edit Milestone' : 'New Milestone'}
                </h3>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g. Initial site visit"
                    value={milestoneForm.title} onChange={e => updateForm('title', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Description <span className="text-zinc-300">optional</span></label>
                  <textarea placeholder="Additional details about this milestone..."
                    value={milestoneForm.description} onChange={e => updateForm('description', e.target.value)}
                    rows={2}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Amount <span className="text-zinc-300">optional</span></label>
                  <input type="text" placeholder="e.g. $1,500"
                    value={milestoneForm.amount} onChange={e => updateForm('amount', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Payment Link <span className="text-zinc-300">optional</span></label>
                  <input type="url" placeholder="https://buy.stripe.com/..."
                    value={milestoneForm.payment_link} onChange={e => updateForm('payment_link', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Responsibility</label>
                  <select value={milestoneForm.responsibility} onChange={e => updateForm('responsibility', e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-white font-medium text-zinc-700 focus:outline-none">
                    <option value="provider">Your responsibility</option>
                    <option value="client">Customer responsibility</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveMilestone as any}
                    disabled={!milestoneForm.title.trim()}
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
              <div key={m.id} className={`bg-white border rounded-2xl p-4 transition ${m.status === 'completed' ? 'border-zinc-100 opacity-70' : 'border-zinc-200'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => advanceMilestone(m.id, m.status)}
                    className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition cursor-pointer ${
                      m.status === 'completed' ? 'bg-zinc-900 border-zinc-900'
                      : m.status === 'in_progress' ? 'border-amber-400'
                      : 'border-zinc-300 hover:border-zinc-500'
                    }`}>
                    {m.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                    {m.status === 'in_progress' && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${m.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{m.title}</p>
                    {m.description && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{m.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        m.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                        : m.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                        : 'bg-zinc-100 text-zinc-500'
                      }`}>{m.status.replace('_', ' ')}</span>
                      <span className="text-[10px] text-zinc-400">{m.responsibility === 'client' ? 'Customer' : 'You'}</span>
                      {m.amount && <span className="text-[10px] font-bold text-zinc-600">{m.amount}</span>}
                    </div>
                    {m.payment_link && (
                      <p className="text-xs text-zinc-400 mt-1 truncate">{m.payment_link}</p>
                    )}
                  </div>
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
                </div>
              </div>
            ))}
          </>
        )}

        {/* FILES */}
        {activeTab === 'files' && (
          <>
            <label className={`block w-full border-2 border-dashed border-zinc-300 rounded-2xl p-6 text-center cursor-pointer hover:border-zinc-400 transition ${uploading ? 'opacity-40 pointer-events-none' : ''}`}>
              <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-600">{uploading ? 'Uploading...' : 'Tap to upload file'}</p>
              <p className="text-xs text-zinc-400 mt-1">Any file type</p>
              <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
            </label>
            {files.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No files yet</p>
              </div>
            )}
            {files.map(file => (
              <div key={file.id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-xl shrink-0">
                  <FileIcon className="w-4 h-4 text-zinc-500" />
                </div>
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
          </div>
        )}

        {/* PROPOSALS */}
        {activeTab === 'proposals' && (
          <>
            <button onClick={() => setShowProposalForm(!showProposalForm)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition cursor-pointer">
              <Plus className="w-4 h-4" /> New Proposal
            </button>

            {showProposalForm && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-black text-zinc-900">New Proposal</h3>
                <input type="text" placeholder="Proposal title"
                  value={proposalTitle} onChange={e => setProposalTitle(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
                <textarea placeholder="Scope of work, terms, notes..."
                  value={proposalBody} onChange={e => setProposalBody(e.target.value)}
                  rows={4}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />

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
                      <input type="text" placeholder="e.g. Lawn mowing"
                        value={item.description}
                        onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it))}
                        className="col-span-6 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition" />
                      <input type="number" min={1}
                        value={item.quantity}
                        onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Number(e.target.value) } : it))}
                        className="col-span-2 border border-zinc-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition text-center" />
                      <input type="number" min={0} placeholder="0"
                        value={item.unit_price || ''}
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
                  <button onClick={() => saveProposal(false)}
                    disabled={!proposalTitle.trim() || savingProposal}
                    className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-zinc-700 transition cursor-pointer">
                    {savingProposal ? 'Saving...' : 'Send to Customer'}
                  </button>
                  <button onClick={() => saveProposal(true)}
                    disabled={!proposalTitle.trim() || savingProposal}
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
                    <p className="text-xs text-emerald-600 font-semibold">
                      ✓ Signed by {p.accepted_signature} · {new Date(p.accepted_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {p.status === 'declined' && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-red-500 font-semibold">Customer declined this proposal.</p>
                  </div>
                )}
                {p.status === 'draft' && (
                  <div className="px-4 pb-4">
                    <button onClick={() => sendProposal(p.id)}
                      className="text-xs font-bold text-zinc-900 underline cursor-pointer hover:text-zinc-600 transition">
                      Send to customer →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* CUSTOMER (CRM) */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-zinc-900">Customer Details</h3>
                <button onClick={() => editingCrm ? saveCrm() : setEditingCrm(true)} disabled={savingCrm}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition cursor-pointer flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  {editingCrm ? (savingCrm ? 'Saving...' : 'Save') : 'Edit'}
                </button>
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

              {editingCrm ? (
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
                      {icon}
                      <span className="text-sm text-zinc-600">{value}</span>
                    </div>
                  ) : null)}
                  {portal.notes && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Internal Notes</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{portal.notes}</p>
                    </div>
                  )}
                  {!portal.client_company && !portal.client_phone && !portal.client_address && !portal.notes && (
                    <p className="text-sm text-zinc-400 py-2">No additional info. Tap Edit to add.</p>
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