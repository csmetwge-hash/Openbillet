'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  Clock, 
  DollarSign, 
  Send,
  Download
} from 'lucide-react';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  status: string;
  brand_name?: string;
  brand_logo_url?: string;
}

interface Milestone {
  id: string;
  title: string;
  responsibility: 'provider' | 'client';
  status: 'incomplete' | 'completed';
  payment_request?: string;
  reminder_days?: number;
}

interface PortalFile {
  id: string;
  file_name: string;
  file_path: string;
  status: 'pending_review' | 'approved' | 'revision_requested';
}

interface Note {
  id: string;
  message: string;
  is_from_client: boolean;
  created_at: string;
}

export default function ClientPortalWorkspace({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'files' | 'chat'>('active');
  const [newNote, setNewNote] = useState('');

  const fetchPortalData = async () => {
    try {
      const { data: portalData, error: pErr } = await supabase
        .from('client_portals')
        .select('*')
        .eq('magic_token', token)
        .single();

      if (pErr || !portalData) return;
      setPortal(portalData);

      const [milestonesRes, filesRes, notesRes] = await Promise.all([
        supabase.from('portal_milestones').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true }),
        supabase.from('portal_files').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: false }),
        supabase.from('portal_notes').select('*').eq('portal_id', portalData.id).order('created_at', { ascending: true })
      ]);

      setMilestones(milestonesRes.data || []);
      setFiles(filesRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPortalData();
  }, [token]);

  const handleUpdateFileStatus = async (fileId: string, nextStatus: 'approved' | 'revision_requested') => {
    const { error } = await supabase
      .from('portal_files')
      .update({ status: nextStatus })
      .eq('id', fileId);

    if (!error) {
      // Inject a system log event message into the timeline automatically
      const label = nextStatus === 'approved' ? 'APPROVED asset deliverable' : 'REQUESTED CHANGES/REVISIONS on asset deliverable';
      await supabase.from('portal_notes').insert([
        { portal_id: portal?.id, message: `[System Update] Client has officially ${label}.`, is_from_client: true }
      ]);
      fetchPortalData();
    }
  };

  const handleSendClientNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !portal) return;

    const { error } = await supabase.from('portal_notes').insert([
      { portal_id: portal.id, message: newNote.trim(), is_from_client: true }
    ]);
    if (!error) {
      setNewNote('');
      fetchPortalData();
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 text-zinc-400 flex items-center justify-center text-xs uppercase tracking-widest">Hydrating Secure Link Route...</div>;
  if (!portal) return <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center text-xs uppercase">Secure Workspace Portal Link Expired or Invalid.</div>;

  return (
    <div className="min-h-screen bg-zinc-900 print:bg-white text-zinc-100 print:text-zinc-900 font-sans antialiased relative selection:bg-zinc-700 selection:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none print:hidden" />

      {/* Main Container Core Layout Grid */}
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10 print:p-0 print:bg-white">
        
        {/* ========================================== */}
        {/* PLACEMENT 1: WHITE-LABEL HEADER INTEGRATION */}
        {/* ========================================== */}
        <div className="flex items-center justify-between border-b border-zinc-800 print:border-zinc-200 pb-6 mb-8">
          <div>
            {portal.brand_logo_url ? (
              <img 
                src={portal.brand_logo_url} 
                alt={portal.brand_name || 'Agency Logo'} 
                className="h-8 w-auto object-contain max-w-[160px] mb-2 print:invert-0"
              />
            ) : (
              <span className="text-[10px] font-black tracking-widest uppercase text-white bg-zinc-800 print:bg-zinc-100 print:text-zinc-900 border border-zinc-700 print:border-zinc-300 px-2.5 py-1 rounded">
                {portal.brand_name || "OPERATIONS WORKSPACE"}
              </span>
            )}
            <h1 className="text-lg font-black tracking-tight text-white print:text-zinc-900 mt-3">{portal.client_name}</h1>
            <p className="text-xs text-zinc-400 print:text-zinc-500">{portal.project_name}</p>
          </div>
          
          <div className="text-right font-mono text-[10px] text-zinc-500">
            <span>Statement Generated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* ======================================================= */}
        {/* PLACEMENT 2: OFFLINE STATEMENT PDF PRINT BAR DOWNLOADER */}
        {/* ======================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-800/40 border border-zinc-800 rounded-xl mb-8 print:hidden">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Project Ledger Offline Storage</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Download a complete, certified PDF transcript of your project history, milestones, and settled payments.</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-zinc-200 text-zinc-900 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 font-sans cursor-pointer shrink-0 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF Statement
          </button>
        </div>

        {/* INTERACTIVE NAVIGATION TAB FILTERS - Strips automatically on print profiles */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-6 print:hidden">
          {(['active', 'completed', 'files', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer ${activeTab === tab ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50'}`}
            >
              {tab === 'active' ? '⚡ Active Objectives' : tab === 'completed' ? '✔ Settled / History' : tab === 'files' ? '📁 Shared Deliverables' : '💬 Team Chat'}
            </button>
          ))}
        </div>

        {/* TAB WORKSPACE PANELS ROUTER */}
        <div className="space-y-4">
          
          {/* Active / Completed Target List Render Pipeline */}
          {(activeTab === 'active' || activeTab === 'completed' || window.matchMedia('print').matches) && (
            <div className={`space-y-4 ${activeTab === 'completed' ? 'print:block' : 'print:hidden'}`}>
              {milestones.filter(m => window.matchMedia('print').matches || (activeTab === 'active' ? m.status === 'incomplete' : m.status === 'completed')).length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 italic text-center print:hidden">No objective items matching this roadmap index.</p>
              ) : (
                milestones
                  .filter(m => window.matchMedia('print').matches || (activeTab === 'active' ? m.status === 'incomplete' : m.status === 'completed'))
                  .map((m) => (
                    <div key={m.id} className="p-4 bg-zinc-800/20 border border-zinc-800 print:border-zinc-200 rounded-xl space-y-2 print:bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-zinc-900" /> : <Circle className="w-4 h-4 text-zinc-600 print:hidden" />}
                          <span className={`text-sm font-bold ${m.status === 'completed' ? 'text-zinc-400 line-through print:no-underline print:text-zinc-900' : 'text-zinc-100 print:text-zinc-900'}`}>{m.title}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase bg-zinc-800 print:bg-zinc-100 text-zinc-400 print:text-zinc-600 border border-zinc-700 print:border-zinc-300 px-2 py-0.5 rounded">Action: {m.responsibility}</span>
                      </div>

                      {/* ========================================================= */}
                      {/* PLACEMENT 3: CLICKABLE STRIPE / ACCREDITED INVOICE LINKS */}
                      {/* ========================================================= */}
                      {m.payment_request && (
                        <div className="mt-2 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl w-fit flex items-center gap-2 print:bg-transparent print:border-0 print:text-zinc-800 print:p-0">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400 print:text-zinc-900" />
                          
                          {m.payment_request.includes('http') ? (
                            <a 
                              href={m.payment_request.match(/https?:\/\/[^\s]+/)?.[0]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-white transition font-bold uppercase tracking-wider text-[10px] bg-amber-500 text-zinc-900 px-2.5 py-1 rounded-lg no-underline inline-flex items-center gap-1 shadow-sm print:hidden"
                            >
                              Authorize Secure Payment Link ↗
                            </a>
                          ) : (
                            <span>Request Status: {m.payment_request}</span>
                          )}
                          {/* Fallback display layout text specifically formatted for printed documents */}
                          <span className="hidden print:inline font-mono text-xs">Ledger Entry: {m.payment_request}</span>
                        </div>
                      )}

                      {m.reminder_days && m.status !== 'completed' && (
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 print:hidden">
                          <Clock className="w-3 h-3" /> Soft follow-up interval loops every {m.reminder_days} days until verified.
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Files Document Delivery Vault Deck */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
              {files.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 italic text-center col-span-2">No file modules deployed to this storage tree node yet.</p>
              ) : (
                files.map((f) => (
                  <div key={f.id} className="p-4 bg-zinc-800/20 border border-zinc-800 rounded-xl flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-xs font-bold text-white truncate">{f.file_name}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                        f.status === 'approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' :
                        f.status === 'revision_requested' ? 'bg-rose-950/40 text-rose-400 border-rose-800/60' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>{f.status.replace('_', ' ')}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-3">
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portal-files/${f.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-lg transition"
                      >
                        <Download className="w-3 h-3" /> View / Save
                      </a>

                      {f.status === 'pending_review' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateFileStatus(f.id, 'revision_requested')} className="bg-rose-950/40 hover:bg-rose-900/30 text-rose-400 border border-rose-900/50 text-[9px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg transition cursor-pointer">Revisions</button>
                          <button onClick={() => handleUpdateFileStatus(f.id, 'approved')} className="bg-white hover:bg-zinc-200 text-zinc-900 text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer">Sign-off</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat Timelines Message Stream Console */}
          {activeTab === 'chat' && (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4 print:hidden">
              <div className="h-[280px] overflow-y-auto space-y-3 pr-1 border border-zinc-800 p-4 bg-zinc-800/20 rounded-xl">
                {notes.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-8 text-center italic">Timeline message ledger is clear.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className={`flex gap-2 max-w-[85%] ${n.is_from_client ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`p-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 text-[9px] font-bold ${n.is_from_client ? 'bg-white text-zinc-900 border-white' : 'bg-zinc-700 text-zinc-200 border-zinc-600'}`}>
                        {n.is_from_client ? 'C' : 'M'}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                        n.message.startsWith('[System Update]') ? 'bg-zinc-900/50 text-zinc-400 font-mono text-[10px] border-zinc-800' :
                        n.is_from_client ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-800/40 border-zinc-700 text-zinc-300'
                      }`}>
                        <p>{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendClientNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Post secure update note to operators..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl text-xs px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
                <button type="submit" className="bg-white text-zinc-900 px-5 rounded-xl text-xs flex items-center justify-center font-bold hover:bg-zinc-200 transition"><Send className="w-3.5 h-3.5" /></button>
              </form>
            </div>
          )}

        </div>

        {/* Permanent Closing Legal Print Footnote */}
        <div className="hidden print:block text-center pt-12 border-t border-zinc-200 text-[10px] text-zinc-400 font-mono">
          This transcript represents a secure, white-labeled client operations overview ledger statement. Generated via native cryptographic token mapping parameters.
        </div>

      </div>
    </div>
  );
}