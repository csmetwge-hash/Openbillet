'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

function AuthContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/dashboard';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        router.push(redirect);
      } else {
        setMessage(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        setMessage('Check your email to confirm your account.');
        setEmail('');
        setPassword('');
      } else {
        setMessage(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs mb-4">
            <Sparkles className="w-5 h-5 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">OpenBillet</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">Client portal management</p>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs md:p-10">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-6">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

          {message && (
            <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  required
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
              className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2 group mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-all" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}