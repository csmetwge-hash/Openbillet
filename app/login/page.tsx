'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, Lock, Mail, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registration successful! Please check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/admin');
      }
    } catch (err: any) {
      setMessage(`Authentication Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      
      <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl w-fit mx-auto text-white">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            {isSignUp ? 'Create Operator Account' : 'Sign In to HQ Operator Core'}
          </h1>
          <p className="text-xs text-zinc-300">
            {isSignUp ? 'Initialize your multi-client agency infrastructure.' : 'Access your active project pipelines and pipelines.'}
          </p>
        </div>

        {message && (
          <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-center text-xs font-medium text-zinc-200">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@agency.com"
                className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-800/80 border border-zinc-700 text-xs rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-900 text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : isSignUp ? 'Register Account' : 'Authenticate Console'}
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] text-zinc-400 hover:text-white transition underline"
          >
            {isSignUp ? 'Already have an operator account? Sign In' : "Don't have an account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}