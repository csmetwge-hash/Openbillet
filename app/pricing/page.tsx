'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 space-y-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="text-center space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Pricing</p>
          <h1 className="text-3xl font-black tracking-tight text-white">One plan. Everything included.</h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">No tiers, no feature limits, no surprises. Every OpenBillet feature from day one.</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-700 rounded-3xl p-8 md:p-10 shadow-2xl shadow-zinc-950/50">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-black text-white">$74</span>
            <span className="text-sm text-zinc-500 font-medium">/ month</span>
          </div>
          <p className="text-xs text-zinc-500 mb-8">Unlimited everything · Cancel anytime · No contracts</p>

          <ul className="space-y-3 mb-8">
            {features.map(feat => (
              <li key={feat} className="flex items-start gap-2.5 text-sm font-medium text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Redirecting...' : 'Get Started'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
          <p className="text-center text-xs text-zinc-600 mt-3">
            Payments processed securely by Stripe
          </p>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Already have an account?{' '}
          <Link href="/auth" className="text-zinc-400 hover:text-white underline transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}