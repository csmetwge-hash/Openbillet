'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Zap,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  CreditCard,
  Brush,
} from 'lucide-react';

export default function MarketingLandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const router = useRouter();

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const pricingTiers = [
    {
      name: 'Standard',
      description: 'For operators managing a focused set of active client relationships.',
      price: billingPeriod === 'monthly' ? 45 : 38,
      annualTotal: 450,
      features: [
        '3 Active Client Portals',
        'Real-time Communication Timeline',
        'Deliverable Asset Vault',
        'Milestone Roadmap Tracking',
        'Magic Link Client Access',
        'Manual Invoice Requests',
      ],
      cta: 'Start Standard',
      popular: false,
    },
    {
      name: 'Pro',
      description: 'For scaling teams that need unlimited capacity and full automation.',
      price: billingPeriod === 'monthly' ? 119 : 99,
      annualTotal: 1190,
      features: [
        'Unlimited Active Client Portals',
        'Everything in Standard',
        'Automated Milestone Escalations',
        'White-labeled Email Dispatches',
        'Stripe Payment Link Integration',
        'Priority Support (under 2 hours)',
      ],
      cta: 'Start Pro',
      popular: true,
    },
  ];

  const featuresList = [
    {
      icon: <Layers className="w-5 h-5 text-white" />,
      title: 'Cryptographic Portals',
      description: 'Instantly spawn secure, token-encrypted client environments with zero login friction required for stakeholders.'
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      title: 'Real-Time Sync Feed',
      description: 'Asset changes and messages update instantly over Supabase WebSocket connections.'
    },
    {
      icon: <Zap className="w-5 h-5 text-white" />,
      title: 'Automated Dispatches',
      description: 'Resend-powered transactional emails keep clients updated automatically on roadmap changes.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      title: 'Approval Gateways',
      description: 'Let clients sign off, accept deliverables, or request revisions in one click.'
    },
    {
      icon: <CreditCard className="w-5 h-5 text-white" />,
      title: 'Payment Link Integration',
      description: 'Drop any payment link — Stripe, Square, PayPal, whatever you use — into a milestone and it renders as a live payment button inside the client portal. No invoice software needed.'
    },
    {
      icon: <Brush className="w-5 h-5 text-white" />,
      title: 'Full White-Label',
      description: 'Every client portal carries your brand — your logo, your name. Clients never see OpenBillet. Deploy under your agency identity on every workspace, on every plan.'
    },
  ];

  const faqs = [
    {
      q: 'Do my clients need to create an account to view their portal?',
      a: 'No. Each portal gets a unique, secure magic link token. Clients click it and land directly in their workspace — no signup required.'
    },
    {
      q: 'What happens when I hit the 3-portal limit on Standard?',
      a: 'You\'ll see an upgrade prompt when you try to create a fourth portal. Upgrading to Pro unlocks unlimited portals instantly.'
    },
    {
      q: 'Can I cancel or change plans anytime?',
      a: 'Yes. You can upgrade, downgrade, or cancel at any time through the billing portal inside your dashboard. No contracts.'
    },
    {
      q: 'Where are my deliverable files stored?',
      a: 'All files are stored in an isolated Supabase Storage bucket secured with Row Level Security policies.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-white selection:text-black antialiased relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black tracking-tight uppercase">OpenBillet</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold text-zinc-400 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-xs font-semibold text-zinc-400 hover:text-white transition">Pricing</a>
            <Link
              href="/auth"
              className="text-xs font-bold uppercase tracking-wider bg-white text-black px-4 py-2 rounded-xl hover:bg-zinc-200 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center space-y-8 z-10">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase text-zinc-400">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Client Portal Infrastructure — Live
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white max-w-4xl mx-auto">
          The delivery workspace for high-velocity service teams.
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
          Deploy secure client portals, stream deliverables, capture sign-offs, and automate project updates — all from one dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black text-xs font-bold uppercase tracking-wider px-6 py-4 rounded-xl hover:bg-zinc-200 transition cursor-pointer"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <Link
            href="/auth"
            className="w-full sm:w-auto flex items-center justify-center border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 text-xs font-bold uppercase tracking-wider px-6 py-4 rounded-xl transition"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900/60 relative z-10 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Platform</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Built to eliminate delivery friction.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((f, i) => (
            <div key={i} className="p-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl hover:border-zinc-800 transition space-y-4">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{f.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-20 border-t border-zinc-900/60 relative z-10 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Simple, transparent billing.</h2>
          <p className="text-xs text-zinc-500 font-medium">Annual plans billed at 10 months — 2 months free.</p>

          <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl mt-2">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition cursor-pointer ${billingPeriod === 'monthly' ? 'bg-zinc-800 text-white border border-zinc-700/60' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition cursor-pointer ${billingPeriod === 'annual' ? 'bg-zinc-800 text-white border border-zinc-700/60' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Annual <span className="text-emerald-400 font-mono text-[9px] lowercase ml-0.5">2 months free</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-6 md:p-8 bg-zinc-950 border rounded-3xl flex flex-col justify-between relative transition hover:border-zinc-700 ${tier.popular ? 'border-zinc-700 shadow-xl shadow-zinc-950/50' : 'border-zinc-900'}`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 bg-white text-black text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-white">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">{tier.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-medium leading-relaxed">{tier.description}</p>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-black text-white tracking-tight">${tier.price}</span>
                  <span className="text-xs font-medium text-zinc-500">/ mo</span>
                  {billingPeriod === 'annual' && (
                    <span className="text-[10px] text-zinc-600 ml-1">— ${tier.annualTotal}/yr</span>
                  )}
                </div>

                <div className="w-full h-px bg-zinc-900 my-2" />

                <ul className="space-y-3.5">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs font-medium text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => router.push('/pricing')}
                  className={`w-full text-center py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    tier.popular
                      ? 'bg-white text-black hover:bg-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20 border-t border-zinc-900/60 relative z-10">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">FAQ</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Common Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, fIdx) => (
            <div key={fIdx} className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden transition hover:border-zinc-800/80">
              <button
                onClick={() => toggleFaq(fIdx)}
                className="w-full flex items-center justify-between p-5 text-left text-xs font-bold text-zinc-200 hover:text-white transition focus:outline-none cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${activeFaq === fIdx ? 'rotate-180 text-white' : ''}`} />
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activeFaq === fIdx ? 'max-h-40 border-t border-zinc-900/80 bg-zinc-950/40' : 'max-h-0'}`}>
                <p className="p-5 text-xs text-zinc-400 leading-relaxed font-medium">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-[10px] font-mono text-zinc-600 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 OpenBillet. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-zinc-400 transition">Pricing</Link>
            <Link href="/auth" className="hover:text-zinc-400 transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}