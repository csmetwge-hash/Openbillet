// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Copy, ExternalLink, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [portals, setPortals] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);
    fetchPortals(user.id);
  };

  const fetchPortals = async (userId: string) => {
    const { data } = await supabase
      .from('client_portals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPortals(data || []);
  };

  const createNewPortal = async () => {
    const clientName = prompt("Client's full name:");
    if (!clientName) return;

    const projectName = prompt("Project name:") || "Main Project";
    const magicToken = 'pf_' + Math.random().toString(36).substring(2, 22);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('client_portals').insert({
      user_id: user?.id,
      client_name: clientName,
      project_name: projectName,
      magic_token: magicToken,
    });

    fetchPortals(user!.id);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
    alert("✅ Portal link copied to clipboard");
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold">My Client Portals</h1>
          <p className="text-zinc-600">Welcome back, {user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={createNewPortal} className="bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Client Portal
          </button>
          <button onClick={() => supabase.auth.signOut()} className="border px-5 py-3 rounded-2xl flex items-center gap-2 hover:bg-zinc-50">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Portals Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portals.map((p) => (
          <div key={p.id} className="border rounded-3xl p-8 hover:border-black transition-all">
            <h3 className="font-semibold text-2xl">{p.client_name}</h3>
            <p className="text-zinc-500 mt-1">{p.project_name}</p>

            <div className="mt-8 flex gap-3">
              <button onClick={() => copyLink(p.magic_token)} className="flex-1 border py-3 rounded-2xl hover:bg-zinc-50 flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <a href={`/portal/${p.magic_token}`} target="_blank" className="flex-1 border py-3 rounded-2xl hover:bg-zinc-50 flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" /> Preview
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}