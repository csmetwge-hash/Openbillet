'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2, Circle, Clock, Send, Download, ExternalLink,
  MessageSquare, Layers, FolderOpen, ClipboardList, Paperclip,
  X, FileText, ArrowLeft,
} from 'lucide-react';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  brand_name?: string;
  brand_logo_url?: string;
  magic_token: string;
  user_id: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount?: string;
  payment_link?: string;
  status: string;
  responsibility: string;
  photo_before_url?: string;
  photo_after_url?: string;
}

interface PortalFile {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
}

interface Note {
  id: string;
  message: string;
  is_from_client: boolean;
  created_at: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  total_amount?: string;
  body: string;
  accepted_at?: string;
  accepted_signature?: string;
  line_items?: LineItem[];
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

type Tab = 'overview' | 'files' | 'messages' | 'proposals';

export default function ClientPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [signingProposal, setSigningProposal] = useState<string | null>(null);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [decliningProposal, setDecliningProposal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchPortal(); }, [token]);

  useEffect(() => {
    // Only show a back button if there's somewhere to go back to within
    // the app (e.g. navigated here from /admin). A client opening a fresh
    // magic-link won't have prior history, so no back button for them.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  useEffect(() => {
    if (!portal) return;
    const channel = supabase
      .channel(`client-notes-${portal.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'portal_notes',
        filter: `portal_id=eq.${portal.id}`
      }, (payload) => setNotes(prev => [...prev, payload.new as Note]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [portal]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes]);

  const fetchPortal = async () => {
    const { data: portalData, error } = await supabase
      .from('client_portals').select('*').eq('magic_token', token).eq('status', 'active').maybeSingle();

    if (error || !portalData) { setNotFound(true); setLoading(false); return; }

    if (!portalData.brand_name?.trim() && !portalData.brand_logo_url?.trim()) {
      const { data: settings } = await supabase
        .from('account_settings').select('brand_name, brand_logo_url')
        .eq('user_id', portalData.user_id).maybeSingle();
      if (settings) { portalData.brand_name = settings.brand_name; portalData.brand_logo_url = settings.brand_logo_url; }
    }

    setPortal(portalData);

    const [ms, fs, ns, ps] = await Promise.all([
      supabase.from('portal_milestones').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_files').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
      supabase.from('portal_notes').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
      supabase.from('portal_proposals').select('*, proposal_line_items(*)').eq('portal_id', portalData.id).neq('status', 'draft').order('created_at', { ascending: false }),
    ]);

    setMilestones(ms.data || []);
    setFiles(fs.data || []);
    setNotes(ns.data || []);
    setProposals((ps.data || []).map((p: any) => ({ ...p, line_items: p.proposal_line_items || [] })));
    setLoading(false);
  };

  const notifyAdmin = async (actionType: string, detail?: string) => {
    if (!portal) return;
    try {
      await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId: portal.id, actionType, clientName: portal.client_name, projectName: portal.project_name, detail }),
      });
    } catch (err) { console.error('Failed to notify admin:', err); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !portal) return;
    const msg = message.trim();
    await supabase.from('portal_notes').insert({ portal_id: portal.id, message: msg, is_from_client: true });
    setMessage('');
    notifyAdmin('message', msg);
  };

  const toggleClientMilestone = async (m: Milestone) => {
    if (m.responsibility !== 'client') return;
    const newStatus = m.status === 'completed' ? 'incomplete' : 'completed';
    await supabase.from('portal_milestones').update({ status: newStatus }).eq('id', m.id);
    setMilestones(prev => prev.map(ms => ms.id === m.id ? { ...ms, status: newStatus } : ms));
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from('portal-files').getPublicUrl(path);
    return data.publicUrl;
  };

  const acceptProposal = async (proposalId: string, proposalTitle: string) => {
    if (!signature.trim()) return;
    setSigning(true);
    await supabase.from('portal_proposals').update({
      status: 'accepted', accepted_at: new Date().toISOString(), accepted_signature: signature.trim(),
    }).eq('id', proposalId);
    setProposals(prev => prev.map(p => p.id === proposalId
      ? { ...p, status: 'accepted', accepted_signature: signature.trim(), accepted_at: new Date().toISOString() } : p));
    notifyAdmin('proposal_accepted', `Proposal: "${proposalTitle}" — Signed by: ${signature.trim()}`);
    setSigningProposal(null); setSignature(''); setSigning(false);
  };

  const declineProposal = async (proposalId: string, proposalTitle: string) => {
    setDeclining(true);
    await supabase.from('portal_proposals').update({ status: 'declined' }).eq('id', proposalId);
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'declined' } : p));
    notifyAdmin('proposal_declined', `Proposal: "${proposalTitle}"${declineReason ? ` — Reason: ${declineReason}` : ''}`);
    setDecliningProposal(null); setDeclineReason(''); setDeclining(false);
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingProposals = proposals.filter(p => p.status === 'sent');

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-zinc-900">Portal not found</p>
        <p className="text-sm text-zinc-500">This link may have expired or been deactivated.</p>
      </div>
    </div>
  );

  const brandName = portal!.brand_name || 'Your Project';
  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { key: 'files', label: 'Files', icon: <FolderOpen className="w-4 h-4" />, badge: files.length || undefined },
    { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'proposals', label: 'Proposals', icon: <ClipboardList className="w-4 h-4" />, badge: pendingProposals.length || undefined },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {canGoBack && (
              <button onClick={() => router.back()}
                className="p-2 -ml-1 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition cursor-pointer shrink-0">
                <ArrowLeft className="w-4 h-4 text-zinc-600" />
              </button>
            )}
            {portal!.brand_logo_url ? (
              <img src={portal!.brand_logo_url} alt={brandName} className="h-8 w-8 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 bg-zinc-900 rounded-lg shrink-0 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">{brandName[0]}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">{brandName}</p>
              <p className="text-[11px] text-zinc-500 font-medium truncate">{portal!.project_name}</p>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-xs font-black text-zinc-900">{progressPct}%</p>
              <p className="text-[10px] text-zinc-400">{completedCount}/{totalCount} done</p>
            </div>
          )}
        </div>
        {totalCount > 0 && (
          <div className="h-0.5 bg-zinc-100">
            <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Tab Nav */}
      <div className="bg-white border-b border-zinc-100 sticky top-[69px] z-30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.key ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}>
                {tab.icon}{tab.label}
                {tab.badge ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white text-zinc-900' : 'bg-zinc-200 text-zinc-700'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {milestones.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No milestones yet</p>
              </div>
            ) : milestones.map(m => (
              <div key={m.id} className={`bg-white rounded-2xl border overflow-hidden transition ${m.status === 'completed' ? 'border-zinc-100 opacity-80' : 'border-zinc-200'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {m.responsibility === 'client' && m.status !== 'completed' ? (
                      <button onClick={() => toggleClientMilestone(m)}
                        className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-zinc-400 hover:border-zinc-700 hover:bg-zinc-100 transition cursor-pointer" />
                    ) : m.status === 'completed' ? (
                      m.responsibility === 'client' ? (
                        <button onClick={() => toggleClientMilestone(m)} className="shrink-0 mt-0.5 cursor-pointer">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </button>
                      ) : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : m.status === 'in_progress' ? (
                      <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${m.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{m.title}</p>
                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                          : m.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                          : 'bg-zinc-100 text-zinc-500'
                        }`}>{m.status.replace('_', ' ')}</span>
                      </div>
                      {m.description && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{m.description}</p>}
                      {m.responsibility === 'client' && m.status !== 'completed' && (
                        <p className="text-[11px] text-amber-600 font-semibold mt-1">Action required — tap to mark complete</p>
                      )}
                      {m.amount && m.payment_link && (
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold text-zinc-700">{m.amount}</span>
                          <a href={m.payment_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-700 transition">
                            Pay Now <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      {m.amount && !m.payment_link && <p className="text-sm font-bold text-zinc-700 mt-2">{m.amount}</p>}
                      {!m.amount && m.payment_link && (
                        <div className="mt-3">
                          <a href={m.payment_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition">
                            Pay Now <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      {m.status === 'completed' && (
                        <div className="mt-3">
                          <a href={`/receipt/${m.id}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-700 transition">
                            <FileText className="w-3.5 h-3.5" /> View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Before/After photos */}
                  {(m.photo_before_url || m.photo_after_url) && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {m.photo_before_url && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Before</p>
                          <img src={m.photo_before_url} alt="Before" className="w-full h-32 object-cover rounded-xl border border-zinc-100" />
                        </div>
                      )}
                      {m.photo_after_url && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">After</p>
                          <img src={m.photo_after_url} alt="After" className="w-full h-32 object-cover rounded-xl border border-zinc-100" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILES */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            {files.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No files yet</p>
              </div>
            ) : files.map(file => (
              <div key={file.id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-zinc-100 rounded-xl shrink-0"><Paperclip className="w-4 h-4 text-zinc-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{file.file_name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${file.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {file.status === 'approved' ? 'Approved' : 'Pending Review'}
                    </span>
                  </div>
                </div>
                <a href={getFileUrl(file.file_path)} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="flex-1 space-y-3 pb-4">
              {notes.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to your project team below.</p>
                </div>
              )}
              {notes.map((n, i) => (
                <div key={n.id || i} className={`flex ${n.is_from_client ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    n.is_from_client ? 'bg-zinc-900 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm'
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
              <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex gap-2">
                <input type="text" value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition" />
                <button type="submit" disabled={!message.trim()}
                  className="bg-zinc-900 text-white px-4 rounded-2xl disabled:opacity-40 transition hover:bg-zinc-700 cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PROPOSALS */}
        {activeTab === 'proposals' && (
          <div className="space-y-4">
            {proposals.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No proposals yet</p>
              </div>
            ) : proposals.map(proposal => (
              <div key={proposal.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-100 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-900">{proposal.title}</p>
                    {proposal.total_amount && <p className="text-lg font-black text-zinc-900 mt-1">{proposal.total_amount}</p>}
                  </div>
                  <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    proposal.status === 'accepted' ? 'bg-emerald-50 text-emerald-600'
                    : proposal.status === 'declined' ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
                  }`}>{proposal.status === 'sent' ? 'Awaiting Review' : proposal.status}</span>
                </div>

                {proposal.line_items && proposal.line_items.length > 0 && (
                  <div className="p-4 border-b border-zinc-100 space-y-2">
                    {proposal.line_items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-700">{item.description}</span>
                        <span className="font-semibold text-zinc-900 shrink-0 ml-4">${(item.quantity * item.unit_price).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total</span>
                      <span className="text-base font-black text-zinc-900">{proposal.total_amount}</span>
                    </div>
                  </div>
                )}

                {proposal.body && (
                  <div className="p-4 border-b border-zinc-100">
                    <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{proposal.body}</p>
                  </div>
                )}

                {proposal.status === 'sent' && (
                  <div className="p-4 space-y-3">
                    {signingProposal === proposal.id ? (
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-500 font-medium">Type your full name to sign and accept.</p>
                        <input type="text" value={signature} onChange={e => setSignature(e.target.value)}
                          placeholder="Your full name"
                          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition font-medium" />
                        <div className="flex gap-2">
                          <button onClick={() => acceptProposal(proposal.id, proposal.title)}
                            disabled={!signature.trim() || signing}
                            className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-zinc-700 transition cursor-pointer">
                            {signing ? 'Signing...' : 'Accept & Sign'}
                          </button>
                          <button onClick={() => { setSigningProposal(null); setSignature(''); }}
                            className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : decliningProposal === proposal.id ? (
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-500 font-medium">Let us know why (optional).</p>
                        <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                          placeholder="e.g. Budget concerns..." rows={3}
                          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => declineProposal(proposal.id, proposal.title)} disabled={declining}
                            className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition cursor-pointer">
                            {declining ? 'Submitting...' : 'Confirm Decline'}
                          </button>
                          <button onClick={() => { setDecliningProposal(null); setDeclineReason(''); }}
                            className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => setSigningProposal(proposal.id)}
                          className="w-full bg-zinc-900 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer">
                          Review & Accept
                        </button>
                        <button onClick={() => setDecliningProposal(proposal.id)}
                          className="w-full bg-white border border-zinc-200 text-zinc-600 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition cursor-pointer">
                          Decline
                        </button>
                        <p className="text-center text-xs text-zinc-400 pt-1">
                          Have questions?{' '}
                          <button onClick={() => setActiveTab('messages')} className="text-zinc-700 font-semibold underline cursor-pointer">
                            Send us a message
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {proposal.status === 'accepted' && (
                  <div className="p-4 bg-emerald-50 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 font-semibold">
                      Accepted by {proposal.accepted_signature} · {new Date(proposal.accepted_at!).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {proposal.status === 'declined' && (
                  <div className="p-4 bg-red-50 flex items-start gap-2">
                    <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-700 font-semibold">Proposal declined</p>
                      <p className="text-xs text-red-500 mt-0.5">
                        Have questions?{' '}
                        <button onClick={() => setActiveTab('messages')} className="underline font-semibold cursor-pointer">
                          Send us a message
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}