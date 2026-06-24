'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      setSent(true);
    } catch (err: any) {
      setError('Something went wrong. Please email us directly at support@openbillet.com');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-black text-zinc-900">Message sent!</h1>
          <p className="text-sm text-zinc-500">We typically respond within 1 business day.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">
      <div className="max-w-xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">Contact Us</h1>
          <p className="text-sm text-zinc-500">Have a question, need help, or want to report an issue? We&apos;re here.</p>
          <p className="text-sm text-zinc-400 mt-1">
            Or email us directly at{' '}
            <a href="mailto:support@openbillet.com" className="text-zinc-700 underline font-semibold">support@openbillet.com</a>
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Name <span className="text-red-400">*</span></label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Email <span className="text-red-400">*</span></label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Subject <span className="text-red-400">*</span></label>
              <select required value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-white text-zinc-700 focus:outline-none focus:border-zinc-900 transition">
                <option value="">Select a topic</option>
                <option value="General Question">General Question</option>
                <option value="Billing & Subscription">Billing &amp; Subscription</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Privacy / Data Request">Privacy / Data Request</option>
                <option value="Report an Issue">Report an Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Message <span className="text-red-400">*</span></label>
              <textarea required value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                rows={5}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition resize-none" />
            </div>

            <button type="submit" disabled={sending || !name || !email || !subject || !message}
              className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
              {sending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Message</>}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200 flex gap-6">
          <Link href="/privacy" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Privacy Policy</Link>
          <Link href="/terms" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}