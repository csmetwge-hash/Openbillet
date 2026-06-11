'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/dashboard';
  const mode = searchParams?.get('mode'); // 'signup' forces signup view

  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setMessage('');
    setIsError(false);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        router.push(redirect);
      } else {
        setIsError(true);
        setMessage(error.message);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        if (data.session) {
          await fetch('/api/start-trial', { method: 'POST' });
          router.push('/dashboard');
        } else {
          setEmail('');
          setPassword('');
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        setIsError(true);
        setMessage(error.message);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) {
      setForgotSent(true);
    } else {
      setMessage(error.message);
      setIsError(true);
    }
    setForgotLoading(false);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs mb-4">
              <Sparkles className="w-5 h-5 text-zinc-900" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">OpenBillet</h1>
          </div>
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs">
            {forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">📬</div>
                <h2 className="text-lg font-black text-zinc-900">Check your email</h2>
                <p className="text-sm text-zinc-500">We sent a password reset link to <strong>{forgotEmail}</strong>.</p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 underline transition cursor-pointer">
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Reset your password</h2>
                <p className="text-sm text-zinc-500 mb-6">Enter your email and we'll send you a reset link.</p>
                {message && isError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">{message}</div>
                )}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                      <input type="email" required placeholder="name@company.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition" />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
                  <button onClick={() => setShowForgot(false)}
                    className="text-xs font-medium text-zinc-500 hover:text-black transition cursor-pointer">
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs mb-4">
            <Sparkles className="w-5 h-5 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">OpenBillet</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            {isLogin ? 'Welcome back' : '14-day free trial · No credit card required'}
          </p>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs md:p-10">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-6">
            {isLogin ? 'Sign in to your account' : 'Start your free trial'}
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-zinc-50 border border-zinc-200 text-zinc-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input type="email" required placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Password</label>
                {isLogin && (
                  <button type="button" onClick={() => { setShowForgot(true); setMessage(''); setIsError(false); }}
                    className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input type="password" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2 group mt-2 cursor-pointer disabled:opacity-50">
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Start Free Trial'}
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-all" />
            </button>
          </form>

          {!isLogin && (
            <p className="text-center text-xs text-zinc-400 mt-4">
              14 days free · No credit card · Cancel anytime
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setMessage(''); setIsError(false); }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition cursor-pointer">
              {isLogin ? "Don't have an account? Start free trial" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}