'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

export default function Pricing() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to create checkout session');
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        alert("No checkout redirection URL received.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Checkout error: " + (err.message || "Please try again"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="max-w-2xl text-center mb-12 relative z-10 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-emerald-400" /> Simple, Transparent Access
        </div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">One plan. Infinite delivery tools.</h1>
        <p className="text-base text-zinc-500 font-medium max-w-md mx-auto">Get absolute access to all portal sharing environments, messaging structures, and document distribution tracking loops.</p>
      </div>

      <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs md:p-10 relative z-10 transition hover:border-zinc-300">
        <div className="text-xs uppercase tracking-widest text-zinc-400 font-black mb-1">THE PRO WORKSPACE</div>
        <div className="flex items-baseline font-black text-zinc-950 text-5xl">
          $19<span className="text-lg font-bold text-zinc-400 tracking-normal ml-1">/month</span>
        </div>
        
        <ul className="mt-8 space-y-3.5 text-xs font-semibold text-zinc-600 border-t border-zinc-100 pt-6">
          <li className="flex items-center gap-2.5 text-zinc-900">
            <Check className="w-4 h-4 text-zinc-950 shrink-0" strokeWidth={3} /> Unlimited functional client portal nodes
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={3} /> Document inventory tracking & validation
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={3} /> Active real-time multi-channel communication
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={3} /> Magic link tokens (zero client login Friction)
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={3} /> Full optimized screen design scaling
          </li>
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-8 w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer text-center block"
        >
          {loading ? "Configuring Session..." : "Activate Pro Plan Access"}
        </button>
      </div>
    </div>
  );
}