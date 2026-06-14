'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const [status, setStatus] = useState<string>('inactive');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data } = await supabase
        .from('manager_subscriptions')
        .select('subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setStatus(data.subscription_status);
      setLoading(false);
    };
    fetch();
  }, [router]);

  const handleSubscribe = async (priceId: string, interval: string) => {
    setCheckoutLoading(interval);
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

  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_MONTHLY_PLACEHOLDER';
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL || 'price_ANNUAL_PLACEHOLDER';

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-5 w-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  const isActive = status === 'active';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-12 px-6">
      <div className="max-w-md w-full mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          {isActive && (
            <button onClick={openBillingPortal} disabled={portalLoading}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition disabled:opacity-50 cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              {portalLoading ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Subscription</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your OpenBillet plan.</p>
        </div>

        {isActive ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Active — Unlimited everything.{' '}
              <button onClick={openBillingPortal} className="underline cursor-pointer hover:text-emerald-800">
                Manage billing
              </button>{' '}
              to update payment, switch billing period, or cancel.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No active subscription. Choose a plan below.</span>
            </div>

            {/* Monthly */}
            <div className="border border-zinc-200 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-black text-zinc-900">$74<span className="text-sm font-normal text-zinc-400">/mo</span></div>
                  <p className="text-xs text-zinc-400 mt-0.5">Billed monthly · Cancel anytime</p>
                </div>
              </div>
              <button
                onClick={() => handleSubscribe(monthlyPriceId, 'monthly')}
                disabled={checkoutLoading === 'monthly'}
                className="w-full bg-zinc-100 border border-zinc-200 text-zinc-900 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50">
                {checkoutLoading === 'monthly' ? 'Redirecting...' : 'Subscribe Monthly'}
              </button>
            </div>

            {/* Annual */}
            <div className="border border-zinc-300 rounded-2xl p-6 bg-white space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                Best Value
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900">$740<span className="text-sm font-normal text-zinc-400">/yr</span></div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-emerald-600 font-bold">$62/month</span>
                  <span className="text-xs text-zinc-400 line-through">$888/yr</span>
                  <span className="text-[10px] font-black text-emerald-600">Save $148</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Billed annually · 2 months free</p>
              </div>
              <button
                onClick={() => handleSubscribe(annualPriceId, 'annual')}
                disabled={checkoutLoading === 'annual'}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50">
                {checkoutLoading === 'annual' ? 'Redirecting...' : 'Subscribe Annually'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-zinc-400">
          Payments processed securely by Stripe.
          {isActive && ' Switch billing period or cancel anytime from the billing portal.'}
        </p>
      </div>
    </div>
  );
}