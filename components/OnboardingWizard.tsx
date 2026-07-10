'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Check, Copy, ArrowRight } from 'lucide-react';

interface Props {
  userId: string;
  onClose: () => void;
  onFinish: () => void;
}

export default function OnboardingWizard({ userId, onClose, onFinish }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [portalId, setPortalId] = useState('');
  const [magicToken, setMagicToken] = useState('');

  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState('');

  const [copied, setCopied] = useState(false);

  const createPortal = async () => {
    if (!clientName.trim()) return;
    setSaving(true);

    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase
      .from('client_portals')
      .insert({
        user_id: userId,
        client_name: clientName.trim(),
        project_name: projectName.trim() || 'General Engagement',
        client_email: clientEmail.trim() || null,
        magic_token: token,
        status: 'active',
      })
      .select().single();

    if (!error && data) {
      setPortalId(data.id);
      setMagicToken(token);
      setStep(2);
    }
    setSaving(false);
  };

  const createMilestone = async () => {
    if (!milestoneTitle.trim()) { setStep(3); return; }
    setSaving(true);

    await supabase.from('portal_milestones').insert({
      portal_id: portalId,
      title: milestoneTitle.trim(),
      amount: milestoneAmount.trim() || null,
      status: 'incomplete',
    });

    setSaving(false);
    setStep(3);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/portal/${magicToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden">

        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1.5 rounded-full transition-all ${
                n === step ? 'w-8 bg-zinc-900' : n < step ? 'w-4 bg-zinc-400' : 'w-4 bg-zinc-100'
              }`} />
            ))}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 pt-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-zinc-900">Create your first client portal</h2>
                <p className="text-xs text-zinc-500 mt-1">Just the basics — you can add more details later.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Name *</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Jane Smith" autoFocus
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Project Name</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Backyard Landscaping"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Client Email <span className="text-zinc-300 normal-case">optional</span></label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <button onClick={createPortal} disabled={!clientName.trim() || saving}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40">
                {saving ? 'Creating...' : 'Create Portal'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-zinc-900">Add your first milestone</h2>
                <p className="text-xs text-zinc-500 mt-1">A step in the project — like "Site visit" or "Install fixtures."</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Title</label>
                <input type="text" value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Initial site visit" autoFocus
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Amount <span className="text-zinc-300 normal-case">optional</span></label>
                <input type="text" value={milestoneAmount} onChange={e => setMilestoneAmount(e.target.value)}
                  placeholder="e.g. $250"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              </div>
              <button onClick={createMilestone} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40">
                {saving ? 'Saving...' : milestoneTitle.trim() ? 'Add Milestone' : 'Skip this step'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900">You're all set</h2>
                <p className="text-xs text-zinc-500 mt-1">Share this link with your client — no login required for them.</p>
              </div>
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                <p className="text-xs text-zinc-600 font-mono truncate flex-1">{`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${magicToken}`}</p>
                <button onClick={copyLink}
                  className="shrink-0 p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition cursor-pointer">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button onClick={onFinish}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer">
                Go to Control Center
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}