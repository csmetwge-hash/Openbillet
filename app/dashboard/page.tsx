'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Copy, ExternalLink, LogOut, CheckCircle2,
  LayoutGrid, Users, CreditCard, X, Lock, MessageSquare,
  Settings, ArrowRight,
} from 'lucide-react';
import { resolveWorkspaceAccess } from '@/lib/workspace';

const STANDARD_PORTAL_LIMIT = 3;

interface PortalMeta {
  messageCount: number;
  lastMessage: string | null;
  hasProposalAction: boolean;
}

function UpgradeModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full space-y-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">Portal limit reached</h2>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
            Your Standard plan supports up to {STANDARD_PORTAL_LIMIT} active portals.
            Upgrade to Pro for unlimited client workspaces.
          </p>
        </div>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-1">
          <div className="text-xs font-black text-white">Pro — $119/month</div>
          <div className="text-xs text-zinc-400">Unlimited portals · Full automation · White-labeled emails</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold py-3 rounded-xl hover:bg-zinc-700 transition cursor-pointer">
            Maybe Later
          </button>
          <button onClick={onUpgrade}
            className="flex-1 bg-white text-zinc-900 text-xs font-bold py-3 rounded-xl hover:bg-zinc-200 transition cursor-pointer">
            Upgrade to Pro →
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePortalModal({
  ownerId,
  onClose,
  onCreated,
}: {
  ownerId: string;
  onClose: () => void;
  onCreated: (portal: any) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setCreating(true);
    setError('');

    const magicToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('client_portals')
      .insert({
        user_id: ownerId,
        client_name: clientName.trim(),
        project_name: projectName.trim() || 'General Engagement',
        client_email: clientEmail.trim() || null,
        magic_token: magicToken,
        status: 'active',
      })
      .select().single();

    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }

    onCreated(data);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-zinc-900">New Client Portal</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Smith or ABC Landscaping"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Project Name <span className="text-zinc-300">optional</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Spring Lawn Treatment"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Client Email <span className="text-zinc-300">optional</span>
            </label>
            <input
              type="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Used for automated notifications and receipts.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating || !clientName.trim()}
              className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {creating ? 'Creating...' : 'Create Portal'}
              {!creating && <ArrowRight className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [portals, setPortals] = useState<any[]>([]);
  const [portalMeta, setPortalMeta] = useState<Record<string, PortalMeta>>({});
  const [user, setUser] = useState<any>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'user' | null>(null);
  const [subscription, setSubscription] = useState<{ tier_level: string; subscription_status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUser(user);

    if (searchParams?.get('success') === 'true') {
      setShowSuccess(true);
      router.replace('/dashboard');
    }

    const { ownerId, role } = await resolveWorkspaceAccess();
    setOwnerId(ownerId);
    setUserRole(role);

    if (!ownerId) { router.push('/auth'); return; }

    await Promise.all([fetchPortals(ownerId), fetchSubscription(ownerId)]);
    setLoading(false);
  };

  const fetchPortals = async (ownerIdParam: string) => {
    const { data } = await supabase
      .from('client_portals')
      .select('*')
      .eq('user_id', ownerIdParam)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    const portals = data || [];
    setPortals(portals);

    if (portals.length > 0) {
      const meta: Record<string, PortalMeta> = {};
      await Promise.all(portals.map(async (p) => {
        const [notesRes, proposalsRes] = await Promise.all([
          supabase.from('portal_notes').select('message, created_at', { count: 'exact' })
            .eq('portal_id', p.id).eq('is_from_client', true)
            .order('created_at', { ascending: false }).limit(1),
          supabase.from('portal_proposals').select('id')
            .eq('portal_id', p.id).in('status', ['accepted', 'declined']),
        ]);
        meta[p.id] = {
          messageCount: notesRes.count || 0,
          lastMessage: notesRes.data?.[0]?.message || null,
          hasProposalAction: (proposalsRes.data?.length || 0) > 0,
        };
      }));
      setPortalMeta(meta);
    }
  };

  const fetchSubscription = async (ownerIdParam: string) => {
    const { data } = await supabase
      .from('manager_subscriptions')
      .select('tier_level, subscription_status')
      .eq('user_id', ownerIdParam)
      .maybeSingle();
    setSubscription(data);
  };

  const tier = subscription?.tier_level || 'none';
  const isSubscriptionActive = subscription?.subscription_status === 'active';
  const isPro = tier === 'pro_unlimited' && isSubscriptionActive;
  const isStandard = tier === 'standard' && isSubscriptionActive;
  const activeCount = portals.length;
  const atLimit = isStandard && activeCount >= STANDARD_PORTAL_LIMIT;
  const isReadOnly = userRole === 'user';
  const isOwner = userRole === 'owner';

  const handleNewPortal = () => {
    if (isReadOnly) return;
    if (!isSubscriptionActive) { router.push('/pricing'); return; }
    if (atLimit) { setShowUpgradeModal(true); return; }
    setShowCreateModal(true);
  };

  const handlePortalCreated = (newPortal: any) => {
    setPortals(prev => [newPortal, ...prev]);
    setPortalMeta(prev => ({ ...prev, [newPortal.id]: { messageCount: 0, lastMessage: null, hasProposalAction: false } }));
    setShowCreateModal(false);
    router.push(`/dashboard/portal/${newPortal.id}`);
  };

  const copyLink = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} onUpgrade={() => router.push('/billing')} />
      )}
      {showCreateModal && ownerId && (
        <CreatePortalModal
          ownerId={ownerId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePortalCreated}
        />
      )}

      <div className="min-h-screen bg-zinc-50/50 p-4 md:p-12 font-sans antialiased">
        <div className="max-w-7xl mx-auto space-y-8">

          {showSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm font-semibold">Subscription activated. Your workspace is ready.</div>
            </div>
          )}

          {isOwner && !isSubscriptionActive && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">No active plan. Subscribe to start creating client portals.</div>
              <button onClick={() => router.push('/pricing')}
                className="text-xs font-bold uppercase tracking-wider bg-amber-900 text-white px-4 py-2 rounded-xl hover:bg-amber-800 transition cursor-pointer whitespace-nowrap">
                View Plans
              </button>
            </div>
          )}

          {isOwner && isStandard && activeCount >= STANDARD_PORTAL_LIMIT && (
            <div className="bg-zinc-100 border border-zinc-200 text-zinc-700 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{activeCount}/{STANDARD_PORTAL_LIMIT} portals used. Upgrade to Pro for unlimited.</div>
              <button onClick={() => router.push('/billing')}
                className="text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-700 transition cursor-pointer whitespace-nowrap">
                Upgrade
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="bg-zinc-100 border border-zinc-200 text-zinc-600 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> You have view-only access to this workspace.
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">Workspace Console</h1>
              <p className="text-sm font-medium text-zinc-500 mt-0.5">
                {user?.email}
                {isSubscriptionActive && isOwner && (
                  <span className={`ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isPro ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                    {isPro ? 'Pro' : 'Standard'}
                  </span>
                )}
                {!isOwner && (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                    {userRole === 'admin' ? 'Admin' : 'Viewer'}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button onClick={handleNewPortal}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer">
                  <Plus className="w-4 h-4" />
                  New Portal
                  {isStandard && isOwner && (
                    <span className="text-zinc-400 font-normal text-xs">({activeCount}/{STANDARD_PORTAL_LIMIT})</span>
                  )}
                </button>
              )}
              {isOwner && (
                <button onClick={() => router.push('/billing')}
                  className="bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 p-2.5 rounded-xl transition cursor-pointer" title="Billing">
                  <CreditCard className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => router.push('/settings')}
                className="bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 p-2.5 rounded-xl transition cursor-pointer" title="Settings">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout}
                className="bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 p-2.5 rounded-xl transition cursor-pointer" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Portal grid */}
          {portals.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-300 bg-white rounded-3xl max-w-xl mx-auto">
              <div className="inline-flex p-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl mb-4">
                <Users className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-base font-bold text-zinc-900">No portals yet</p>
              <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto mt-1 mb-6">
                Create your first client workspace to get started.
              </p>
              {!isReadOnly && (
                isSubscriptionActive ? (
                  <button onClick={handleNewPortal}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer">
                    Create First Portal
                  </button>
                ) : isOwner ? (
                  <button onClick={() => router.push('/pricing')}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer">
                    View Pricing Plans
                  </button>
                ) : null
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portals.map(p => {
                const meta = portalMeta[p.id];
                const hasAction = meta?.hasProposalAction || meta?.messageCount > 0;
                return (
                  <div key={p.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-zinc-400 transition">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                          Active
                        </span>
                        <div className="flex items-center gap-2">
                          {hasAction && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-600 rounded">
                              Action needed
                            </span>
                          )}
                          <button onClick={() => router.push(`/dashboard/portal/${p.id}`)}
                            className="text-zinc-400 hover:text-black transition cursor-pointer" title="Open workspace">
                            <LayoutGrid className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-zinc-950 truncate">{p.client_name}</h3>
                      <p className="text-xs font-semibold text-zinc-500 mt-0.5 truncate">{p.project_name}</p>

                      {meta?.lastMessage && (
                        <button onClick={() => router.push(`/dashboard/portal/${p.id}`)}
                          className="mt-3 w-full text-left bg-zinc-50 border border-zinc-100 rounded-xl p-3 hover:bg-zinc-100 transition cursor-pointer">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="w-3 h-3 text-zinc-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Client message{meta.messageCount > 1 ? ` · ${meta.messageCount}` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 font-medium truncate">{meta.lastMessage}</p>
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
                      <button onClick={() => copyLink(p.magic_token, p.id)}
                        className="flex-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Copy className="w-3.5 h-3.5" />
                        {copiedId === p.id ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button onClick={() => window.open(`/portal/${p.magic_token}`, '_blank')}
                        className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 p-2.5 rounded-xl transition cursor-pointer" title="Preview portal">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
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
