'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        router.push('/dashboard');
      } else {
        alert(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        alert("Verification sequence sent. Check your email inbox to confirm.");
      } else {
        alert(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 px-4 relative overflow-hidden" suppressHydrationWarning>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10" suppressHydrationWarning>
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs mb-4">
            <Sparkles className="w-5 h-5 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">PortalFlow</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">Autonomous client delivery systems</p>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs md:p-10" suppressHydrationWarning>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-6">
            {isLogin ? "Welcome back" : "Create manager profile"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  suppressHydrationWarning // Prevents browser autofill extension crash
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  suppressHydrationWarning // Prevents browser autofill extension crash
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition shadow-xs flex items-center justify-center gap-2 group mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Register Profile"}
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              suppressHydrationWarning
              className="text-xs font-medium text-zinc-500 hover:text-black transition cursor-pointer"
            >
              {isLogin ? "New operator? Register an account" : "Existing profile? Log in here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}