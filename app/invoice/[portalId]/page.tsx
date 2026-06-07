'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface Portal {
  id: string;
  client_name: string;
  project_name: string;
  client_email?: string;
  client_address?: string;
  client_company?: string;
  brand_name?: string;
  brand_logo_url?: string;
  user_id: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount?: string;
  status: string;
}

function InvoiceContent({ portalId }: { portalId: string }) {
  const searchParams = useSearchParams();
  const selectedIds = searchParams?.get('milestones')?.split(',') || [];

  const [portal, setPortal] = useState<Portal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase
        .from('client_portals')
        .select('*')
        .eq('id', portalId)
        .single();

      if (!p) { setNotFound(true); setLoading(false); return; }

      // Brand fallback
      if (!p.brand_name?.trim() && !p.brand_logo_url?.trim()) {
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

      // Fetch only selected milestones in order
      if (selectedIds.length > 0) {
        const { data: ms } = await supabase
          .from('portal_milestones')
          .select('*')
          .in('id', selectedIds)
          .order('created_at', { ascending: true });
        setMilestones(ms || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [portalId]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !portal) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-zinc-900">Invoice not found</p>
        <p className="text-sm text-zinc-500">This portal may have been removed.</p>
      </div>
    </div>
  );

  const brandName = portal.brand_name || 'Operations Hub';
  const invoiceNumber = `INV-${portalId.substring(0, 6).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Parse amounts and compute total
  const parseAmount = (amount?: string): number => {
    if (!amount) return 0;
    const match = amount.match(/[\d,]+(\.\d{2})?/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/,/g, ''));
  };

  const grandTotal = milestones.reduce((sum, m) => sum + parseAmount(m.amount), 0);
  const hasAnyAmount = milestones.some(m => m.amount);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/dashboard/portal/${portalId}`}
            className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Portal
          </Link>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition cursor-pointer">
            <Printer className="w-3.5 h-3.5" />
            Save / Print PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="max-w-3xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden print:rounded-none print:border-0">

          {/* Header */}
          <div className="p-6 md:p-10 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              {portal.brand_logo_url ? (
                <img src={portal.brand_logo_url} alt={brandName} className="h-12 w-auto mb-5 object-contain" />
              ) : (
                <div className="inline-flex items-center gap-2 mb-5">
                  <div className="h-9 w-9 bg-zinc-900 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xs font-black">{brandName[0]}</span>
                  </div>
                  <span className="text-base font-black text-zinc-900">{brandName}</span>
                </div>
              )}
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Invoice</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">{invoiceNumber}</p>
            </div>
            <div className="sm:text-right space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Date</p>
              <p className="text-sm font-bold text-zinc-900">{today}</p>
            </div>
          </div>

          {/* Bill to / From */}
          <div className="p-6 md:p-10 border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Bill To</p>
              <p className="text-sm font-black text-zinc-900">{portal.client_name}</p>
              {portal.client_company && <p className="text-xs text-zinc-500 mt-0.5">{portal.client_company}</p>}
              {portal.client_email && <p className="text-xs text-zinc-500 mt-0.5">{portal.client_email}</p>}
              {portal.client_address && <p className="text-xs text-zinc-500 mt-0.5">{portal.client_address}</p>}
              <p className="text-xs text-zinc-400 italic mt-1">{portal.project_name}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">From</p>
              <p className="text-sm font-black text-zinc-900">{brandName}</p>
            </div>
          </div>

          {/* Line items table */}
          <div className="p-6 md:p-10 border-b border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-3 pr-4">Description</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-3 pr-4 w-24">Status</th>
                  {hasAnyAmount && (
                    <th className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-3 w-32">Amount</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {milestones.map(m => (
                  <tr key={m.id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-zinc-900">{m.title}</p>
                      {m.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{m.description}</p>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                        m.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                        : m.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                        : 'bg-zinc-100 text-zinc-500'
                      }`}>{m.status.replace('_', ' ')}</span>
                    </td>
                    {hasAnyAmount && (
                      <td className="py-4 text-right font-semibold text-zinc-900">
                        {m.amount || <span className="text-zinc-300">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {hasAnyAmount && (
                <tfoot>
                  <tr className="border-t-2 border-zinc-200">
                    <td colSpan={2} className="pt-5 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider pr-4">
                      Total
                    </td>
                    <td className="pt-5 text-right text-xl font-black text-zinc-900">
                      {grandTotal > 0 ? `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer */}
          <div className="p-6 md:p-10 bg-zinc-50 print:bg-white">
            <p className="text-xs text-zinc-400 leading-relaxed text-center max-w-md mx-auto">
              Thank you for your business. Please reach out with any questions regarding this invoice.
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

export default function InvoicePage({ params }: { params: Promise<{ portalId: string }> }) {
  const { portalId } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
      </div>
    }>
      <InvoiceContent portalId={portalId} />
    </Suspense>
  );
}