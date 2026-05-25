'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, MessageSquare, FileIcon, Download } from 'lucide-react';

export default function ClientPortal({ params }: { params: { token: string } }) {
  const [portal, setPortal] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPortal();
    fetchFiles();
    fetchNotes();
  }, [params.token]);

  const fetchPortal = async () => {
    const { data } = await supabase
      .from('client_portals')
      .select('*')
      .eq('magic_token', params.token)
      .single();
    setPortal(data);
  };

  const fetchFiles = async () => {
    const { data } = await supabase
      .from('portal_files')
      .select('*')
      .eq('portal_id', (await supabase.from('client_portals').select('id').eq('magic_token', params.token).single()).data?.id);
    setFiles(data || []);
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('portal_notes')
      .select('*')
      .eq('portal_id', (await supabase.from('client_portals').select('id').eq('magic_token', params.token).single()).data?.id)
      .order('created_at', { ascending: true });
    setNotes(data || []);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filePath = `${params.token}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('portal-files')
      .upload(filePath, file);

    if (uploadError) {
      alert("Upload failed");
      setUploading(false);
      return;
    }

    const { data: portalData, error: portalError } = await supabase
      .from('client_portals')
      .select('id')
      .eq('magic_token', params.token)
      .single();

    if (portalError || !portalData) {
      alert("Portal not found");
      setUploading(false);
      return;
    }

    await supabase.from('portal_files').insert({
      portal_id: portalData.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });

    setUploading(false);
    fetchFiles();
  };

  const sendNote = async () => {
    if (!newMessage.trim()) return;

    const { data: portalData, error: portalError } = await supabase
      .from('client_portals')
      .select('id')
      .eq('magic_token', params.token)
      .single();

    if (portalError || !portalData) {
      alert("Portal not found");
      return;
    }

    await supabase.from('portal_notes').insert({
      portal_id: portalData.id,
      message: newMessage,
      is_from_client: true,
    });

    setNewMessage('');
    fetchNotes();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-12">
          <h1 className="text-5xl font-bold">Hello, {portal?.client_name}</h1>
          <p className="text-2xl text-zinc-600 mt-2">{portal?.project_name}</p>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-zinc-300 rounded-3xl p-16 text-center mb-12 bg-white">
          <Upload className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
          <p className="text-2xl font-medium mb-2">Share files with your provider</p>
          <label className="cursor-pointer inline-block bg-black text-white px-10 py-4 rounded-2xl text-lg">
            {uploading ? "Uploading..." : "Upload Files"}
            <input type="file" className="hidden" onChange={uploadFile} />
          </label>
        </div>

        {/* Files List */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <FileIcon /> Shared Files
          </h3>
          <div className="grid gap-4">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-white p-5 rounded-2xl border">
                <div className="flex items-center gap-4">
                  <FileIcon className="w-8 h-8 text-zinc-400" />
                  <div>
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-sm text-zinc-500">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <a
                  href={supabase.storage.from('portal-files').getPublicUrl(file.file_path).data.publicUrl}
                  target="_blank"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  Download <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border rounded-3xl p-8">
          <h3 className="text-2xl font-semibold mb-8">Messages</h3>
          
          <div className="space-y-6 mb-10 max-h-96 overflow-y-auto">
            {notes.map((note, i) => (
              <div key={i} className={`flex ${note.is_from_client ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-6 py-4 rounded-3xl ${note.is_from_client ? 'bg-black text-white' : 'bg-zinc-100'}`}>
                  {note.message}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendNote()}
              placeholder="Write a message..."
              className="flex-1 border rounded-2xl px-6 py-5 focus:outline-none focus:border-black"
            />
            <button
              onClick={sendNote}
              className="bg-black text-white px-10 rounded-2xl font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}