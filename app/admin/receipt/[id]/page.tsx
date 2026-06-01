'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, CheckCircle2, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Milestone {
  id: string;
  title: string;
  payment_request?: string;
  updated_at: string;
}

interface Portal {
  client_name: string;
  project_name: string;
}

export default function ProfessionalReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        // Fetch the specific milestone details
        const { data: mData } = await supabase
          .from('portal_milestones')
          .select('*')
          .eq('id', id)
          .single();

        if (mData) {
          setMilestone(mData);
          
          // Fetch parent portal context for client branding metadata
          const { data: pData } = await supabase
            .from('client_portals')
            .select('client_name, project_name')
            .eq('id', mData.portal_id)
            .single();
            
          if (pData) setPortal(pData);
        }
      } catch (err) {
        console.error('Error compiling receipt layer:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReceiptData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-zinc-900 text-zinc-400 flex items-center justify-center text-xs uppercase tracking-widest">Generating Ledger PDF Statement...</div>;
  if (!milestone || !portal) return <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center text-xs uppercase">Statement Record Not Located.</div>;

  return (
    <div className="min-h-screen bg-zinc-900 print:bg-white text-zinc-100 print:text-zinc-900 p-6 md:p-12 font-sans selection:bg-zinc-700">
      
      {/* Interactive Top Tool Bar - Disappears completely on PDF Generation print layout */}
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-8 print:hidden bg-zinc-800/40 border border-zinc-800 p-4 rounded-xl">
        <Link href="/admin" className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Core Console
        </Link>
        <button 
          onClick={() => window.print()}
          className="bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" /> Save / Print PDF Receipt
        </button>
      </div>

      {/* Pristine Document Canvas Area */}
      <div className="max-w-3xl mx-auto border border-zinc-800 print:border-0 bg-zinc-900/30 print:bg-white p-8 md:p-12 rounded-2xl print:p-0 space-y-10">
        
        {/* Document Header Section */}
        <div className="flex justify-between items-start border-b border-zinc-800 print:border-zinc-200 pb-8">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-white bg-zinc-800 print:bg-zinc-100 print:text-zinc-900 border border-zinc-700 print:border-zinc-300 px-2.5 py-1 rounded">
              OPERATIONS HUB
            </span>
            <h1 className="text-xl font-black tracking-tight text-white print:text-zinc-900 mt-4">Transaction Execution Record</h1>
            <p className="text-xs text-zinc-400 print:text-zinc-500 mt-1">Receipt Ref: #{milestone.id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono tracking-wider uppercase bg-emerald-950/40 print:bg-emerald-50 text-emerald-400 print:text-emerald-700 border border-emerald-800/60 print:border-emerald-200 px-3 py-1 rounded-md font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Payment Settled
            </span>
            <p className="text-xs text-zinc-400 print:text-zinc-500 mt-3 font-mono">Date: {new Date(milestone.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Client Ledger Breakdown Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-500">Issued On Account To:</span>
            <p className="text-sm font-bold text-white print:text-zinc-900">{portal.client_name}</p>
            <p className="text-xs text-zinc-400 print:text-zinc-500 italic">{portal.project_name}</p>
          </div>
          <div className="space-y-1 md:text-right">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-500">Fulfillment Authority:</span>
            <p className="text-sm font-bold text-white print:text-zinc-900">Enterprise Core Solutions Platform</p>
            <p className="text-xs text-zinc-400 print:text-zinc-500">ops@yourplatform.com</p>
          </div>
        </div>

        {/* Line Item Statement Table */}
        <div className="border border-zinc-800 print:border-zinc-200 rounded-xl overflow-hidden bg-zinc-900/50 print:bg-transparent">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 print:bg-zinc-50 border-b border-zinc-800 print:border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-300 print:text-zinc-600">
                <th className="p-4">Fulfillment Objective / Milestone Deliverable</th>
                <th className="p-4 text-right">Settled Amount Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-zinc-200 text-xs">
              <tr className="text-white print:text-zinc-900">
                <td className="p-4 font-medium">
                  {milestone.title}
                  <span className="block text-[10px] text-zinc-400 print:text-zinc-500 mt-1 font-normal">Verification Condition: Complete and Client Certified Sign-off Enabled.</span>
                </td>
                <td className="p-4 text-right font-mono font-bold tracking-tight text-sm">
                  {milestone.payment_request ? milestone.payment_request : 'Included in Base Scope'}
                </td>
              </tr>
              {/* Calculations Total Baseline Frame */}
              <tr className="bg-zinc-800/20 print:bg-zinc-50/50 font-bold text-white print:text-zinc-900">
                <td className="p-4 text-right text-[10px] uppercase tracking-wider text-zinc-400 print:text-zinc-500">Total Charged & Closed Amount:</td>
                <td className="p-4 text-right font-mono text-base tracking-tight border-t border-zinc-700 print:border-zinc-300">
                  {milestone.payment_request ? milestone.payment_request.match(/\$[\d,]+/)?.[0] || milestone.payment_request : '$0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing Auditor Footnote block */}
        <div className="text-center pt-8 border-t border-zinc-800 print:border-zinc-200 space-y-2">
          <p className="text-[11px] text-zinc-400 print:text-zinc-500 leading-relaxed max-w-md mx-auto">
            This system-generated document serves as an immutable transaction receipt confirming completion of the stated objective. No further payment processing operations are outstanding for this specific ledger component entry.
          </p>
          <p className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">Thank you for your business</p>
        </div>

      </div>
    </div>
  );
}