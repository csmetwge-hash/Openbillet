'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface Milestone {
  id: string;
  title: string;
  payment_request?: string;
  updated_at: string;
  portal_id: string;
}

interface Portal {
  client_name: string;
  project_name: string;
  client_email?: string;
  brand_name?: string;
  brand_logo_url?: string;
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: m } = await supabase
        .from('portal_milestones')
        .select('*')
        .eq('id', id)
        .single();

      if (!m) { setNotFound(true); setLoading(false); return; }
      setMilestone(m);

      const { data: p } = await supabase
        .from('client_portals')
        .select('client_name, project_name, client_email, brand_name, brand_logo_url')
        .eq('id', m.portal_id)
        .single();

      if (p) setPortal(p);
      setLoading(false);
    };
    fetch();
  }, [id]);

  // Extract a dollar amount from payment_request string
  const extractAmount = (req?: string) => {
    if (!req) return null;
    const match = req.match(/\$[\d,]+(\.\d{2})?/);
    return match ? match[0] : null;
  };

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
  const amount = extractAmount(milestone.payment_request);
  const refId = milestone.id.substring(0, 8).toUpperCase();
  const date = new Date(milestone.updated_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Save / Print PDF
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="max-w-2xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden print:rounded-none print:border-0 print:shadow-none">

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
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">Payment Receipt</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">Ref #{refId}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> Payment Settled
              </span>
              <p className="text-xs text-zinc-400 font-medium mt-1">{date}</p>
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
                    <p className="text-xs text-zinc-400 mt-0.5">Milestone completed & approved</p>
                  </td>
                  <td className="py-4 text-right font-black text-zinc-900">
                    {amount || (milestone.payment_request && !milestone.payment_request.startsWith('http')
                      ? milestone.payment_request
                      : 'Included')}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200">
                  <td className="pt-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right pr-4">Total</td>
                  <td className="pt-4 text-right text-lg font-black text-zinc-900">
                    {amount || '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note */}
          <div className="p-6 md:p-8 bg-zinc-50 print:bg-white">
            <p className="text-xs text-zinc-400 leading-relaxed text-center max-w-md mx-auto">
              This receipt confirms completion and payment of the above milestone. No further payment is outstanding for this item. Thank you for your business.
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