'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Zap, Sparkles, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BillingConsole() {
  const [currentTier, setCurrentTier] = useState<string>('none');
  const [status, setStatus] = useState<string>('inactive');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('manager_subscriptions')
          .select('tier_level, subscription_status')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setCurrentTier(data.tier_level);
          setStatus(data.subscription_status);
        }
      }
      setLoading(false);
    };
    fetchSubData();
  }, []);

  const handleCheckout = async (priceId: string) => {
    alert(`Redirecting to Stripe Checkout for Price ID: ${priceId}\nIn production, this initiates your Stripe API Session.`);
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 text-zinc-400 flex items-center justify-center text-xs uppercase tracking-wider">Syncing Ledger Tiers...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col justify-center py-12 px-6 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      
      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Console
          </Link>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-zinc-400 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-md">
              Current Status: <span className={status === 'active' ? 'text-emerald-400' : 'text-rose-400'}>{status.toUpperCase()}</span>
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">Select Your Console Workspace Allocation Plan</h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">Scale your agency delivery infrastructure with automated follow-ups and pristine client portal metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Starter Plan */}
          <div className={`border rounded-2xl p-6 space-y-6 flex flex-col justify-between ${currentTier === 'starter' ? 'bg-zinc-800/40 border-zinc-500' : 'bg-zinc-900/50 border-zinc-800'}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl w-fit text-zinc-300 mb-2"><Zap className="w-4 h-4" /></div>
                  <h3 className="text-base font-bold text-white">Starter Engine Tier</h3>
                </div>
                <span className="text-2xl font-black text-white">$49<span className="text-xs font-normal text-zinc-500">/mo</span></span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Perfect for boutiques or independent operators who need clean, premium portals for select active client structures.</p>
              <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-zinc-800/60">
                <li className="flex items-center gap-2">✔ Max 3 Active Portals Allocation</li>
                <li className="flex items-center gap-2">✔ Direct Pipeline Client Chat</li>
                <li className="flex items-center gap-2">✔ Manual Invoice Requests Layer</li>
              </ul>
            </div>
            <button 
              onClick={() => handleCheckout('price_starter_id')}
              className="w-full bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition cursor-pointer"
            >
              {currentTier === 'starter' && status === 'active' ? 'Current Active Tier' : 'Deploy Starter Package'}
            </button>
          </div>

          {/* Pro Unlimited Plan */}
          <div className={`border rounded-2xl p-6 space-y-6 flex flex-col justify-between relative overflow-hidden ${currentTier === 'pro' ? 'bg-zinc-800/40 border-zinc-500' : 'bg-zinc-900/50 border-zinc-800'}`}>
            <div className="absolute top-0 right-0 bg-white text-zinc-900 font-mono font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-zinc-800">Scaling Strategy</div>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl w-fit text-zinc-100 mb-2"><Sparkles className="w-4 h-4" /></div>
                  <h3 className="text-base font-bold text-white">Pro Unlimited Tier</h3>
                </div>
                <span className="text-2xl font-black text-white">$149<span className="text-xs font-normal text-zinc-500">/mo</span></span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Built for growing operations that require continuous data pipelines, absolute client counts, and zero workflow barriers.</p>
              <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-zinc-800/60">
                <li className="flex items-center gap-2">✔ Infinite Active & Archived Client Portals</li>
                <li className="flex items-center gap-2">✔ Complete Automated Milestone Escalations</li>
                <li className="flex items-center gap-2">✔ Native Deliverable Resend Email Dispatches</li>
              </ul>
            </div>
            <button 
              onClick={() => handleCheckout('price_pro_id')}
              className="w-full bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition cursor-pointer"
            >
              {currentTier === 'pro' && status === 'active' ? 'Current Active Tier' : 'Deploy Pro Unlimited'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}