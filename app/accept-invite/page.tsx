'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams?.get('id');
  const email = searchParams?.get('email');

  const [status, setStatus] = useState<'loading' | 'needs_auth' | 'accepting' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [authEmail, setAuthEmail] = useState(email || '');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Already logged in — try to accept immediately
      await acceptInvite();
    } else {
      setStatus('needs_auth');
    }
  };

  const acceptInvite = async () => {
    setStatus('accepting');
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: authEmail, password });
      if (error) { setErrorMsg(error.message); setAuthLoading(false); return; }
      // After signup they need to confirm email, but let's try accepting anyway
      await acceptInvite();
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) { setErrorMsg(error.message); setAuthLoading(false); return; }
      await acceptInvite();
    }
    setAuthLoading(false);
  };

  if (status === 'loading' || status === 'accepting') return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-500 font-medium">
          {status === 'accepting' ? 'Accepting invite...' : 'Checking...'}
        </p>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-black text-zinc-900">Invite accepted!</h1>
        <p className="text-sm text-zinc-500">Redirecting to your workspace...</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h1 className="text-xl font-black text-zinc-900">Something went wrong</h1>
        <p className="text-sm text-zinc-500">{errorMsg}</p>
        <button onClick={() => router.push('/auth')}
          className="text-sm font-bold text-zinc-700 underline cursor-pointer">
          Go to sign in
        </button>
      </div>
    </div>
  );

  // needs_auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs mb-4">
            <Sparkles className="w-5 h-5 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">You've been invited</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Create a free account to accept your invite and access the workspace.
          </p>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition" />
            </div>
            <button type="submit" disabled={authLoading}
              className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {authLoading ? 'Processing...' : isSignUp ? 'Create Account & Accept' : 'Sign In & Accept'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition cursor-pointer">
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}