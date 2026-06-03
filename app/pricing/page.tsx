'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Zap, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PRICES = {
  standard: {
    monthly: { id: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_STANDARD_MONTHLY_PLACEHOLDER', amount: 45 },
    annual:  { id: process.env.NEXT_PUBLIC_STRIPE_STANDARD_ANNUAL_PRICE_ID  || 'price_STANDARD_ANNUAL_PLACEHOLDER',  amount: 450 },
  },
  pro: {
    monthly: { id: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_PRO_MONTHLY_PLACEHOLDER', amount: 119 },
    annual:  { id: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID  || 'price_PRO_ANNUAL_PLACEHOLDER',  amount: 1190 },
  },
};

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const router = useRouter();

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    setLoadingTier(tierKey);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        // Not logged in — send to auth first
        router.push('/auth?redirect=/pricing');
        return;
      }

      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      alert('Checkout error: ' + err.message);
    } finally {
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      key: 'standard',
      name: 'Standard',
      icon: <Zap className="w-4 h-4" />,
      description: 'For operators managing a focused set of active client relationships.',
      monthlyRate: PRICES.standard.monthly.amount,
      annualMonthlyRate: Math.round(PRICES.standard.annual.amount / 10),
      annualTotal: PRICES.standard.annual.amount,
      priceId: billing === 'monthly' ? PRICES.standard.monthly.id : PRICES.standard.annual.id,
      limit: '3 active portals',
      features: [
        '3 Active Client Portals',
        'Real-time Communication Timeline',
        'Deliverable Asset Vault',
        'Milestone Roadmap Tracking',
        'Magic Link Client Access',
        'Manual Invoice Requests',
      ],
      popular: false,
      cta: 'Start Standard',
    },
    {
      key: 'pro',
      name: 'Pro',
      icon: <Sparkles className="w-4 h-4" />,
      description: 'For scaling teams that need unlimited capacity and full automation.',
      monthlyRate: PRICES.pro.monthly.amount,
      annualMonthlyRate: Math.round(PRICES.pro.annual.amount / 10),
      annualTotal: PRICES.pro.annual.amount,
      priceId: billing === 'monthly' ? PRICES.pro.monthly.id : PRICES.pro.annual.id,
      limit: 'Unlimited portals',
      features: [
        'Unlimited Active Client Portals',
        'Everything in Standard',
        'Automated Milestone Escalations',
        'White-labeled Email Dispatches',
        'Stripe Payment Link Integration',
        'Priority Support (under 2 hours)',
      ],
      popular: true,
      cta: 'Start Pro',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 space-y-12">
        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {/* Header */}
        <div className="text-center space-y-4">
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Pricing</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Simple, transparent billing.
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto font-medium">
            No hidden fees. Cancel anytime. Annual plans are billed at 10 months — 2 months free.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl mt-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${
                billing === 'monthly' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${
                billing === 'annual' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Annual <span className="text-emerald-400 font-mono text-[9px] normal-case ml-1">2 months free</span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative flex flex-col rounded-3xl border p-8 transition ${
                tier.popular
                  ? 'border-zinc-600 bg-zinc-900/60 shadow-2xl shadow-zinc-950'
                  : 'border-zinc-800 bg-zinc-900/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-6">
                  <span className="bg-white text-black text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Tier header */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300">
                    {tier.icon}
                  </div>
                  <span className="text-sm font-black text-white tracking-tight">{tier.name}</span>
                </div>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {billing === 'monthly' ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${tier.monthlyRate}</span>
                    <span className="text-xs text-zinc-500 font-medium">/ month</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">${tier.annualMonthlyRate}</span>
                      <span className="text-xs text-zinc-500 font-medium">/ month</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Billed as <span className="text-emerald-400 font-bold">${tier.annualTotal}/year</span>
                      <span className="text-zinc-600 ml-1">(10 months pricing)</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-zinc-800 mb-6" />

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-8">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs font-medium text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(tier.priceId, tier.key)}
                disabled={loadingTier === tier.key}
                className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ${
                  tier.popular
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
                }`}
              >
                {loadingTier === tier.key ? 'Redirecting...' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-zinc-600 font-medium">
          Payments processed securely by Stripe. You can cancel or change plans anytime from your billing console.
        </p>
      </div>
    </div>
  );
}