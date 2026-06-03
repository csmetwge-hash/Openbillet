'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Zap, Sparkles, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function BillingConsole() {
  const [currentTier, setCurrentTier] = useState<string>('none');
  const [status, setStatus] = useState<string>('inactive');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSubData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data } = await supabase
        .from('manager_subscriptions')
        .select('tier_level, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCurrentTier(data.tier_level);
        setStatus(data.subscription_status);
      }
      setLoading(false);
    };
    fetchSubData();
  }, [router]);

  const handleCheckout = async (priceId: string, tierKey: string) => {
    setCheckoutLoading(tierKey);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to open billing portal');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const standardMonthlyId = process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_STANDARD_MONTHLY_PLACEHOLDER';
  const proMonthlyId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_PRO_MONTHLY_PLACEHOLDER';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = status === 'active';

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 py-12 px-6 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          {isActive && (
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {portalLoading ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">Workspace Plan</h1>
          <p className="text-sm text-zinc-400">Manage your OpenBillet subscription.</p>
        </div>

        {/* Current status banner */}
        {isActive ? (
          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 p-4 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Active subscription — <span className="font-black capitalize">{currentTier === 'pro_unlimited' ? 'Pro' : 'Standard'}</span> plan.
              {' '}Use <button onClick={openBillingPortal} className="underline cursor-pointer hover:text-emerald-300">Manage Billing</button> to update payment method, upgrade, or cancel.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-800/50 text-amber-400 p-4 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No active subscription. Select a plan below to get started.</span>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard */}
          <div className={`border rounded-2xl p-6 space-y-5 flex flex-col justify-between transition ${
            currentTier === 'standard' && isActive ? 'border-zinc-500 bg-zinc-800/40' : 'border-zinc-800 bg-zinc-900/50'
          }`}>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl w-fit text-zinc-300 mb-2">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Standard</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">$45<span className="text-xs font-normal text-zinc-500">/mo</span></div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">or $450/yr</div>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Up to 3 active client portals. Everything you need to run a focused operation.</p>
              <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-zinc-800">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Max 3 Active Portals</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Real-time Client Chat</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Milestone Tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> File Delivery Vault</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout(standardMonthlyId, 'standard')}
              disabled={checkoutLoading === 'standard' || (currentTier === 'standard' && isActive)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {currentTier === 'standard' && isActive
                ? '✓ Current Plan'
                : checkoutLoading === 'standard'
                ? 'Redirecting...'
                : 'Select Standard'}
            </button>
          </div>

          {/* Pro */}
          <div className={`relative border rounded-2xl p-6 space-y-5 flex flex-col justify-between overflow-hidden transition ${
            currentTier === 'pro_unlimited' && isActive ? 'border-zinc-500 bg-zinc-800/40' : 'border-zinc-700 bg-zinc-900/50'
          }`}>
            <div className="absolute top-0 right-0 bg-white text-zinc-900 font-mono font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Recommended
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl w-fit text-zinc-100 mb-2">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Pro</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">$119<span className="text-xs font-normal text-zinc-500">/mo</span></div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">or $1,190/yr</div>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Unlimited portals, full automation, and white-labeled email dispatches.</p>
              <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-zinc-800">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Unlimited Active Portals</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Everything in Standard</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Automated Escalations</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> White-labeled Emails</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout(proMonthlyId, 'pro')}
              disabled={checkoutLoading === 'pro' || (currentTier === 'pro_unlimited' && isActive)}
              className="w-full bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {currentTier === 'pro_unlimited' && isActive
                ? '✓ Current Plan'
                : checkoutLoading === 'pro'
                ? 'Redirecting...'
                : 'Select Pro'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-600">
          Annual billing is available on the <Link href="/pricing" className="underline hover:text-zinc-400">pricing page</Link>. Upgrades and cancellations are handled via the Stripe billing portal.
        </p>
      </div>
    </div>
  );
}