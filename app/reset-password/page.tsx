'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setIsError(true);
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setIsError(true);
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setMessage('');
    setIsError(false);

    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } else {
      setIsError(true);
      setMessage(error.message);
    }
    setLoading(false);
  };

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
          {done ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-black text-zinc-900">Password updated</h2>
              <p className="text-sm text-zinc-500">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Set new password</h2>
              <p className="text-sm text-zinc-500 mb-6">Choose a strong password for your account.</p>

              {message && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-zinc-50 border border-zinc-200 text-zinc-700'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                    <input type="password" required placeholder="••••••••" minLength={6}
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                    <input type="password" required placeholder="••••••••" minLength={6}
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-black focus:bg-white transition" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-zinc-950 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {loading ? 'Updating...' : 'Update Password'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}