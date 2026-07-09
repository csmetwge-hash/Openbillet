'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Clock, Circle, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount?: string;
  payment_link?: string;
  status: string;
  updated_at: string;
  portal_id: string;
}

interface Portal {
  client_name: string;
  project_name: string;
  client_email?: string;
  brand_name?: string;
  brand_logo_url?: string;
  user_id: string;
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: m } = await supabase
        .from('portal_milestones')
        .select('*')
        .eq('id', id)
        .single();

      if (!m) { setNotFound(true); setLoading(false); return; }
      setMilestone(m);

      const { data: p } = await supabase
        .from('client_portals')
        .select('client_name, project_name, client_email, brand_name, brand_logo_url, user_id')
        .eq('id', m.portal_id)
        .single();

      if (p) {
        // Fall back to account-level brand settings
        if (!p.brand_name && !p.brand_logo_url) {
          const { data: settings } = await supabase
            .from('account_settings')
            .select('brand_name, brand_logo_url')
            .eq('user_id', p.user_id)
            .maybeSingle();
          if (settings) {
            p.brand_name = settings.brand_name;
            p.brand_logo_url = settings.brand_logo_url;
          }
        }
        setPortal(p);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !milestone || !portal) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-zinc-900">Receipt not found</p>
        <p className="text-sm text-zinc-500">This receipt may have been removed.</p>
      </div>
    </div>
  );

  const brandName = portal.brand_name || 'Operations Hub';
  const refId = milestone.id.substring(0, 8).toUpperCase();
  const date = new Date(milestone.updated_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    in_progress: {
      label: 'In Progress',
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    incomplete: {
      label: 'Incomplete',
      icon: <Circle className="w-3.5 h-3.5" />,
      color: 'bg-zinc-50 text-zinc-600 border-zinc-100',
    },
  };

  const status = statusConfig[milestone.status] || statusConfig.incomplete;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer">
            <Printer className="w-3.5 h-3.5" />
            Save / Print PDF
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="max-w-2xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden print:rounded-none print:border-0">

          {/* Header */}
          <div className="p-6 md:p-8 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              {portal.brand_logo_url ? (
                <img src={portal.brand_logo_url} alt={brandName} className="h-10 w-auto mb-4 object-contain" />
              ) : (
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-black">{brandName[0]}</span>
                  </div>
                  <span className="text-sm font-black text-zinc-900">{brandName}</span>
                </div>
              )}
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">Milestone Receipt</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">Ref #{refId}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border ${status.color}`}>
                {status.icon} {status.label}
              </span>
              <p className="text-xs text-zinc-400 font-medium">{date}</p>
            </div>
          </div>

          {/* Client / Project info */}
          <div className="p-6 md:p-8 border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Billed To</p>
              <p className="text-sm font-bold text-zinc-900">{portal.client_name}</p>
              {portal.client_email && <p className="text-xs text-zinc-500 mt-0.5">{portal.client_email}</p>}
              <p className="text-xs text-zinc-500 italic mt-0.5">{portal.project_name}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Issued By</p>
              <p className="text-sm font-bold text-zinc-900">{brandName}</p>
            </div>
          </div>

          {/* Line item */}
          <div className="p-6 md:p-8 border-b border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-3">Description</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-zinc-900">{milestone.title}</p>
                    {milestone.description && (
                      <p className="text-xs text-zinc-400 mt-0.5">{milestone.description}</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5 capitalize">Status: {milestone.status.replace('_', ' ')}</p>
                  </td>
                  <td className="py-4 text-right font-black text-zinc-900">
                    {milestone.amount || '—'}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200">
                  <td className="pt-4 text-right pr-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Paid</span>
                    <span className="ml-2 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                      Paid in Full
                    </span>
                  </td>
                  <td className="pt-4 text-right text-lg font-black text-zinc-900">
                    {milestone.amount || '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="p-6 md:p-8 bg-zinc-50 print:bg-white">
            <p className="text-xs text-zinc-400 leading-relaxed text-center max-w-md mx-auto">
              This receipt confirms the milestone details listed above. Thank you for your business.
            </p>
            <p className="text-[10px] font-mono text-zinc-300 text-center mt-3">
              Generated by OpenBillet · openbillet.com
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}