'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const prices = {
    monthly: {
      id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_MONTHLY_PLACEHOLDER',
      amount: 74,
      label: '/ month',
      sub: 'Billed monthly · Cancel anytime',
    },
    annual: {
      id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL || 'price_ANNUAL_PLACEHOLDER',
      amount: 740,
      monthlyRate: 62,
      label: '/ year',
      sub: 'Billed annually · Save $148 — 2 months free',
    },
  };

  const current = prices[billing];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: current.id }),
      });

      if (res.status === 401) {
        router.push('/auth?redirect=/pricing');
        return;
      }

      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      alert('Checkout error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Unlimited client portals',
    'Magic link access — no client login required',
    'Before & after photo milestones',
    'Proposals with digital signature',
    'Itemized invoices & PDF receipts',
    'Real-time client messaging',
    'File delivery & document vault',
    'White-label with your brand & logo',
    'Automated client & admin notifications',
    'Team member access with roles',
    'Payment link integration — zero transaction fees',
    'Milestone templates',
    'Activity feed per project',
    'Archive & restore portals',
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="text-center space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Pricing</p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">One plan. Everything included.</h1>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">No tiers, no feature limits, no surprises.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-white border border-zinc-200 p-1 rounded-xl mt-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${
                billing === 'monthly' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${
                billing === 'annual' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              Annual <span className="text-emerald-500 font-mono text-[9px] normal-case ml-1">2 months free</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 md:p-10 shadow-sm">

          {/* Price display */}
          <div className="mb-2">
            {billing === 'monthly' ? (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-zinc-900">$74</span>
                <span className="text-sm text-zinc-400 font-medium">/ month</span>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-zinc-900">$740</span>
                  <span className="text-sm text-zinc-400 font-medium">/ year</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-emerald-600 font-bold">$62/month effective</span>
                  <span className="text-xs text-zinc-400 line-through">$888/yr</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Save $148</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400 mb-8">{current.sub}</p>

          <ul className="space-y-3 mb-8">
            {features.map(feat => (
              <li key={feat} className="flex items-start gap-2.5 text-sm font-medium text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Redirecting...' : `Get Started — ${billing === 'monthly' ? '$74/mo' : '$740/yr'}`}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
          <p className="text-center text-xs text-zinc-400 mt-3">
            Payments processed securely by Stripe · Cancel anytime
          </p>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth" className="text-zinc-600 hover:text-zinc-900 underline transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}