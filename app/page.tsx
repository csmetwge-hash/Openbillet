'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ArrowRight, CheckCircle2, Camera, Link2,
  MessageSquare, FileText, Shield, Zap, ChevronDown,
  Star, Users, Clock,
} from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const router = useRouter();

  const features = [
    {
      icon: <Link2 className="w-5 h-5 text-white" />,
      title: 'Instant Magic Link Access',
      description: 'Send your client a link. They tap it and they\'re inside their private workspace — no account creation, no password, no app download. Works in any browser on any device.',
      tag: 'Zero friction'
    },
    {
      icon: <Camera className="w-5 h-5 text-white" />,
      title: 'Before & After Photo Milestones',
      description: 'Upload before and after photos directly to each job milestone. Your client sees the proof of work side by side in their portal. Build trust and eliminate disputes.',
      tag: 'Industry first'
    },
    {
      icon: <FileText className="w-5 h-5 text-white" />,
      title: 'Proposals, Invoices & Receipts',
      description: 'Send professional proposals with line items and get a typed digital signature. Generate itemized invoices and PDF receipts per milestone or across the full project.',
      tag: 'Get paid faster'
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      title: 'Real-Time Client Messaging',
      description: 'Communicate with clients directly inside their portal. No more lost text threads or missed emails. Every message is attached to the project, forever.',
      tag: 'All in one place'
    },
    {
      icon: <Shield className="w-5 h-5 text-white" />,
      title: 'White-Label Every Portal',
      description: 'Every client workspace carries your brand — your logo, your company name. Your clients see a professional experience. They never see OpenBillet.',
      tag: 'Your brand'
    },
    {
      icon: <Zap className="w-5 h-5 text-white" />,
      title: 'Automated Client Notifications',
      description: 'Clients get notified the moment you upload a file, complete a milestone, or send a proposal. No more chasing for responses — the system follows up for you.',
      tag: 'Save hours weekly'
    },
  ];

  const faqs = [
    {
      q: 'Do my clients need to download an app or create an account?',
      a: 'No. Each client gets a unique magic link. They click it and they\'re inside their private workspace instantly — no signup, no app, no password. Works on any phone or computer.'
    },
    {
      q: 'How does the before and after photo feature work?',
      a: 'When you create a milestone for a job, you can upload a before photo when you start and an after photo when you finish. Your client sees both images side by side in their portal, with a clear record of the work completed.'
    },
    {
      q: 'Can I use my own payment processor?',
      a: 'Yes — and we never touch your payments. Paste any payment link (Stripe, Square, PayPal, Venmo, whatever you use) into a milestone and it renders as a Pay Now button inside the client portal. We take zero transaction fees.'
    },
    {
      q: 'Can my team members access the platform?',
      a: 'Yes. You can invite team members with full admin access or view-only access. Field techs, office staff, silent partners — each gets the right level of access.'
    },
    {
      q: 'Is there a contract or can I cancel anytime?',
      a: 'No contracts. Cancel anytime from your billing portal. Your data is yours — we don\'t hold it hostage.'
    },
    {
      q: 'What kinds of businesses is OpenBillet built for?',
      a: 'Any service business that completes jobs for clients — landscaping, pest control, HVAC, plumbing, cleaning, contracting, digital agencies, consultants. If you do project-based work and want your clients to feel informed and taken care of, OpenBillet is built for you.'
    },
  ];

  const testimonialPlaceholders = [
    {
      quote: 'Our clients love being able to see the before and after photos without us having to text them separately. It looks so professional.',
      name: 'Owner, Landscaping Company',
      location: 'Florida'
    },
    {
      quote: 'I set up a portal for a new client in under 5 minutes. They clicked the link and immediately saw their project roadmap. No confusion, no back and forth.',
      name: 'Owner, Pest Control Company',
      location: 'Texas'
    },
    {
      quote: 'Finally something built for people like us who are in the field all day. Everything is on my phone, it just works.',
      name: 'Owner, General Contracting',
      location: 'Georgia'
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-white selection:text-black">

      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_20%,#000_60%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black tracking-tight uppercase text-white">OpenBillet</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold text-zinc-400 hover:text-white transition hidden sm:block">Features</a>
            <a href="#pricing" className="text-xs font-semibold text-zinc-400 hover:text-white transition hidden sm:block">Pricing</a>
            <a href="#faq" className="text-xs font-semibold text-zinc-400 hover:text-white transition hidden sm:block">FAQ</a>
            <Link href="/auth"
              className="text-xs font-bold uppercase tracking-wider bg-white text-black px-4 py-2 rounded-xl hover:bg-zinc-200 transition">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center space-y-8 z-10">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase text-zinc-400">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Built for field service businesses
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-white max-w-4xl mx-auto">
          Your clients deserve to see the work you do.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
          OpenBillet gives every client their own private portal — with job milestones, before & after photos, file delivery, proposals, and real-time updates. They tap a link. No login required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button onClick={() => router.push('/auth?mode=signup')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black text-sm font-bold px-8 py-4 rounded-xl hover:bg-zinc-200 transition cursor-pointer">
            Start Free Trial
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <a href="#features"
            className="w-full sm:w-auto flex items-center justify-center border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 text-sm font-bold px-8 py-4 rounded-xl transition">
            See How It Works
          </a>
        </div>

        <p className="text-xs text-zinc-600 font-medium">No credit card required to start · Cancel anytime</p>

        {/* Social proof numbers */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
          {[
            { value: '< 5 min', label: 'To create first portal' },
            { value: '0', label: 'Client login required' },
            { value: '$0', label: 'Transaction fees' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM/SOLUTION ────────────────────────────────────── */}
      <section className="relative z-10 border-t border-zinc-900/60 bg-zinc-900/20">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Sound familiar?</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight max-w-2xl mx-auto">
            You do great work. Your clients just can't see it.
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            You're texting job photos from your personal phone. Sending invoices from Gmail. Answering "when will you be done?" three times a day. Chasing signatures on paper. There's a better way.
          </p>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Everything included</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            One tool. Every client. Every job.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition space-y-4 group">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-fit group-hover:border-zinc-700 transition">
                  {f.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-800 px-2 py-1 rounded-full">
                  {f.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{f.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Feature highlight — before/after */}
        <div className="mt-10 p-6 md:p-10 bg-zinc-900/40 border border-zinc-800 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-900 px-2 py-1 rounded-full">
              Unique to OpenBillet
            </span>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight">
              Show your clients the transformation — not just the invoice.
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Attach before and after photos to any job milestone. When your client opens their portal they see exactly what changed — documented, professional, and undeniable. No more "it doesn't look any different" disputes.
            </p>
            <ul className="space-y-2">
              {['Upload photos directly from your phone', 'Side-by-side comparison in the client portal', 'Permanently attached to the job record', 'Works for landscaping, pest control, HVAC, cleaning, and more'].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-zinc-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Visual mock of before/after */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Before</p>
              <div className="aspect-square bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center">
                <Camera className="w-8 h-8 text-zinc-600" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">After</p>
              <div className="aspect-square bg-zinc-800 border border-emerald-900 rounded-2xl flex items-center justify-center ring-1 ring-emerald-900">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-zinc-900/60 bg-zinc-900/10">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Simple by design</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Up and running in minutes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Create a portal', desc: 'Enter your client\'s name and project. Takes 30 seconds.' },
              { step: '02', title: 'Add milestones & photos', desc: 'Build out the job scope. Upload before photos when you start.' },
              { step: '03', title: 'Share the link', desc: 'Text or email the magic link. Your client is in instantly — no login.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-3">
                <span className="text-4xl font-black text-zinc-800">{step}</span>
                <h3 className="text-sm font-black text-white">{title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-3xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="text-center space-y-3 mb-12">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">One plan. Everything included.</h2>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">No tiers. No feature limits. No surprises.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl mt-2">
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
                <span className="text-5xl font-black text-white">$74</span>
                <span className="text-sm text-zinc-500 font-medium">/ month</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Unlimited everything · Cancel anytime</p>
            </div>
          ) : (
            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">$740</span>
                <span className="text-sm text-zinc-500 font-medium">/ year</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-emerald-400 font-bold">$62/month effective</span>
                <span className="text-xs text-zinc-600 line-through">$888/yr</span>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-full">Save $148</span>
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
      </section>

      {/* ── TESTIMONIALS (placeholder) ───────────────────────────── */}
      <section className="relative z-10 border-t border-zinc-900/60 bg-zinc-900/10">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center space-y-3 mb-12">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">From the field</p>
            <h2 className="text-2xl font-black text-white tracking-tight">Built for operators, tested in the field.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonialPlaceholders.map((t, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">"{t.quote}"</p>
                <div>
                  <p className="text-xs font-bold text-zinc-200">{t.name}</p>
                  <p className="text-[10px] text-zinc-500">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="relative z-10 max-w-3xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="text-center space-y-3 mb-12">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">FAQ</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Common questions.</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition">
              <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-zinc-200 hover:text-white transition focus:outline-none cursor-pointer">
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 ml-4 transition-transform duration-300 ${activeFaq === i ? 'rotate-180 text-white' : ''}`} />
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activeFaq === i ? 'max-h-48 border-t border-zinc-900' : 'max-h-0'}`}>
                <p className="p-5 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-zinc-900/60">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Your next client deserves a better experience.
          </h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Set up your first client portal in under 5 minutes. No training required. No complicated setup. Just a clean, professional workspace your clients will actually use.
          </p>
          <button onClick={() => router.push('/auth?mode=signup')}
            className="inline-flex items-center gap-2 bg-white text-black text-sm font-bold px-8 py-4 rounded-xl hover:bg-zinc-200 transition cursor-pointer">
            Get Started Free
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <p className="text-xs text-zinc-600">$74/month after trial · No contracts · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-black uppercase text-zinc-500">OpenBillet</span>
          </div>
          <p className="text-[10px] font-mono text-zinc-600">&copy; 2026 OpenBillet. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/pricing" className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition">Pricing</Link>
            <Link href="/auth" className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition">Sign In</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}