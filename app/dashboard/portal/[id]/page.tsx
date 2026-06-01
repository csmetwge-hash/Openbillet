'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, FileIcon, MessageSquare, Send, Upload, Layers } from 'lucide-react';

interface AdminPortalViewProps {
  params: Promise<{ id: string }>;
}

export default function AdminPortalWorkspace({ params }: AdminPortalViewProps) {
  const unwrappedParams = use(params);
  const portalId = unwrappedParams.id;

  const router = useRouter();
  const [portal, setPortal] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneResp, setNewMilestoneResp] = useState('provider');
  const [adminMessage, setAdminMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWorkspaceContext();

    const notesChannel = supabase
      .channel(`admin-notes-${portalId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portal_notes', filter: `portal_id=eq.${portalId}` }, 
        (payload) => setNotes(prev => [...prev, payload.new])
      ).subscribe();

    const filesChannel = supabase
      .channel(`admin-files-${portalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_files', filter: `portal_id=eq.${portalId}` }, 
        () => fetchFiles(portalId)
      ).subscribe();

    return () => {
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(filesChannel);
    };
  }, [portalId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const fetchWorkspaceContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: portalData, error } = await supabase
      .from('client_portals')
      .select('*')
      .eq('id', portalId)
      .eq('user_id', user.id)
      .single();

    if (error || !portalData) {
      router.push('/dashboard');
      return;
    }

    setPortal(portalData);
    await Promise.all([
      fetchMilestones(portalData.id), 
      fetchFiles(portalData.id), 
      fetchNotes(portalData.id)
    ]);
    setLoading(false);
  };

  const fetchMilestones = async (pId: string) => {
    const { data } = await supabase.from('portal_milestones').select('*').eq('portal_id', pId).order('created_at', { ascending: true });
    setMilestones(data || []);
  };

  const fetchFiles = async (pId: string) => {
    const { data } = await supabase.from('portal_files').select('*').eq('portal_id', pId).order('created_at', { ascending: false });
    setFiles(data || []);
  };

  const fetchNotes = async (pId: string) => {
    const { data } = await supabase.from('portal_notes').select('*').eq('portal_id', pId).order('created_at', { ascending: true });
    setNotes(data || []);
  };

  const uploadDeliverable = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !portal) return;

    setUploading(true);
    const storagePath = `${portal.magic_token}/${Date.now()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('portal-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('portal_files').insert({
        portal_id: portal.id,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        uploaded_by: user?.id,
        status: 'pending_review'
      });

      fetchFiles(portal.id);
    } catch (err: any) {
      alert(`Upload error logic hit: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !portal) return;

    await supabase.from('portal_milestones').insert({
      portal_id: portal.id,
      title: newMilestoneTitle,
      responsibility: newMilestoneResp,
      status: 'incomplete'
    });

    setNewMilestoneTitle('');
    fetchMilestones(portal.id);
  };

  const advanceMilestoneStatus = async (id: string, currentStatus: string) => {
    const nextLookup: Record<string, string> = { incomplete: 'in_progress', in_progress: 'completed', completed: 'incomplete' };
    await supabase.from('portal_milestones').update({ status: nextLookup[currentStatus] }).eq('id', id);
    fetchMilestones(portal.id);
  };

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessage.trim() || !portal) return;

    await supabase.from('portal_notes').insert({
      portal_id: portal.id,
      message: adminMessage,
      is_from_client: false
    });

    setAdminMessage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-4 md:p-12 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-100 transition cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-zinc-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">{portal.client_name}</h1>
              <p className="text-xs text-zinc-500 font-semibold mt-0.5">Project Frame: <span className="text-zinc-800">{portal.project_name}</span></p>
            </div>
          </div>
          <div className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-xl text-xs font-mono select-all shadow-xs border border-zinc-800">
            Magic Slug: <span className="text-zinc-400 font-bold">{portal.magic_token}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Operations Layout Columns */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* File Upload Framework */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-zinc-400" /> Deliverable Asset Inventory
              </h2>
              <label className={`border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 bg-zinc-50/20 transition ${uploading ? 'opacity-40 pointer-events-none' : ''}`}>
                <p className="text-xs font-bold text-zinc-700">{uploading ? 'Processing drop...' : 'Select or drop project deliverables'}</p>
                <input type="file" className="hidden" onChange={uploadDeliverable} disabled={uploading} />
              </label>

              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border border-zinc-100 bg-zinc-50/40 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                      <p className="text-xs font-semibold text-zinc-800 truncate pr-2">{file.file_name}</p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${file.status === 'approved_locked' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {file.status === 'approved_locked' ? 'Approved' : 'Pending Review'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones Construction Form Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-400" /> Project Milestones & Requirements
              </h2>

              <form onSubmit={addMilestone} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input
                  type="text"
                  required
                  placeholder="e.g., Finalize architecture schema specification"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="flex-1 border border-zinc-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-black bg-zinc-50/50 focus:bg-white transition"
                />
                <select
                  value={newMilestoneResp}
                  onChange={(e) => setNewMilestoneResp(e.target.value)}
                  className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-semibold text-zinc-700 focus:outline-none"
                >
                  <option value="provider">Your Assignment</option>
                  <option value="client">Client Action Item</option>
                </select>
                <button type="submit" className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer">
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3.5 border border-zinc-100 rounded-xl bg-zinc-50/20">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => advanceMilestoneStatus(m.id, m.status)}
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black transition cursor-pointer ${
                          m.status === 'completed' ? 'bg-zinc-950 border-zinc-950 text-white' : 'border-zinc-300 hover:border-zinc-400 text-transparent'
                        }`}
                      >
                        ✓
                      </button>
                      <div>
                        <p className={`text-xs font-semibold ${m.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                          {m.title}
                        </p>
                        <span className="text-[9px] font-bold text-zinc-400 capitalize mt-0.5 block">{m.responsibility === 'client' ? 'Client action' : 'Your action'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded border bg-white text-zinc-500">
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Secure Administrative Communications Channel (Chat Module) */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col h-[520px] overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/60 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Client Communication Stream</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/20">
                {notes.map((n, idx) => (
                  <div key={n.id || idx} className={`flex ${!n.is_from_client ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-3xs ${
                      !n.is_from_client ? 'bg-zinc-900 text-white rounded-tr-none font-medium' : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{n.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendAdminMessage} className="p-3 border-t border-zinc-100 flex gap-2 bg-white">
                <input
                  type="text"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Type updates to client..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-black focus:bg-white transition"
                />
                <button type="submit" disabled={!adminMessage.trim()} className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white px-3 rounded-xl transition flex items-center justify-center cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}