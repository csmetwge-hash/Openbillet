'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingToggle() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const router = useRouter();

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button onClick={() => setBilling('monthly')}
            className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${billing === 'monthly' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Monthly
          </button>
          <button onClick={() => setBilling('annual')}
            className={`text-[10px] font-bold uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer ${billing === 'annual' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Annual <span className="text-emerald-400 font-mono text-[9px] normal-case ml-1">2 months free</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-700 rounded-3xl p-8 md:p-10 shadow-2xl shadow-zinc-950/50 max-w-md mx-auto">
        {billing === 'monthly' ? (
          <div className="mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">$37</span>
              <span className="text-sm text-zinc-500 font-medium">/ month</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Unlimited everything · Cancel anytime</p>
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">$370</span>
              <span className="text-sm text-zinc-500 font-medium">/ year</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-emerald-400 font-bold">$30.83/month effective</span>
              <span className="text-xs text-zinc-600 line-through">$444/yr</span>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-full">Save $74</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Billed annually · Cancel anytime</p>
          </div>
        )}

        <ul className="space-y-3 mb-8 mt-6">
          {[
            'Unlimited client portals',
            'Magic link client access — no login required',
            'Before & after photo milestones',
            'Proposals with digital signature',
            'Itemized invoices & PDF receipts',
            'Real-time client messaging',
            'File delivery & document vault',
            'White-label with your brand & logo',
            'Automated client & admin notifications',
            'Team member access with roles',
            'Field worker job assignment & scheduling',
            'Payment link integration — zero transaction fees',
            'Milestone templates',
            'Activity feed per project',
          ].map(feat => (
            <li key={feat} className="flex items-start gap-2.5 text-sm font-medium text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {feat}
            </li>
          ))}
        </ul>

        <button onClick={() => router.push('/auth?mode=signup')}
          className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm hover:bg-zinc-200 transition cursor-pointer flex items-center justify-center gap-2">
          Start Free Trial
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-xs text-zinc-600 mt-3">14 days free · No credit card required</p>
      </div>
    </div>
  );
}