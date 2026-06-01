'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Copy, ExternalLink, LogOut, CheckCircle2, LayoutGrid, Users, Link } from 'lucide-react';

function DashboardContent() {
  const [portals, setPortals] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkAuthAndSuccess();
  }, []);

  const checkAuthAndSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);

    if (searchParams?.get('success') === 'true') {
      setShowSuccess(true);
      router.replace('/dashboard');
    }

    await fetchPortals(user.id);
    setLoading(false);
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
    if (!user) return;
    const clientName = prompt("Enter client company name:");
    if (!clientName) return;
    const projectName = prompt("Enter project identifier (e.g., Q3 Web Deployment):") || "General Engagement";

    const magicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { data, error } = await supabase
      .from('client_portals')
      .insert({
        user_id: user.id,
        client_name: clientName,
        project_name: projectName,
        magic_token: magicToken,
        status: 'active'
      })
      .select()
      .single();

    if (!error && data) {
      setPortals([data, ...portals]);
    }
  };

  const copyLink = (token: string, id: string) => {
    const sharedUrl = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(sharedUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 p-6 md:p-12 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Stripe Success Banner Layout */}
        {showSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm font-semibold">Pro upgrade configuration complete. Workspace parameters unlocked.</div>
          </div>
        )}

        {/* Dynamic Nav Frame Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">Workspace Console</h1>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">Logged in as: <span className="text-zinc-800 font-bold">{user?.email}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={createNewPortal}
              className="bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Portal
            </button>
            <button 
              onClick={handleLogout}
              className="bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 p-2.5 rounded-xl transition cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Display State Grid rendering */}
        {portals.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-300 bg-white rounded-3xl max-w-xl mx-auto">
            <div className="inline-flex p-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl mb-4">
              <Users className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-base font-bold text-zinc-900">No client pipelines created yet</p>
            <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto mt-1 mb-6">Initialize clean sharing nodes with milestones and custom files instantly.</p>
            <button 
              onClick={createNewPortal} 
              className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer"
            >
              Configure First Portal Node
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {portals.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between hover:border-zinc-400 transition group relative">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                      {p.status || 'Active'}
                    </span>
                    <button 
                      onClick={() => router.push(`/dashboard/portal/${p.id}`)}
                      className="text-zinc-400 hover:text-black transition"
                      title="Open Operations Dashboard"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-950 truncate">{p.client_name}</h3>
                  <p className="text-xs font-semibold text-zinc-500 mt-0.5 truncate">{p.project_name}</p>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 flex gap-2">
                  <button 
                    onClick={() => copyLink(p.magic_token, p.id)} 
                    className="flex-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> 
                    {copiedId === p.id ? "Copied" : "Copy Access Link"}
                  </button>
                  <button 
                    onClick={() => window.open(`/portal/${p.magic_token}`, '_blank')}
                    className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 p-2.5 rounded-xl transition cursor-pointer"
                    title="View Public Client Environment"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}