'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Faq {
  q: string;
  a: string;
}

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition">
          <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-zinc-200 hover:text-white transition focus:outline-none cursor-pointer">
            <span>{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 ml-4 transition-transform duration-300 ${activeFaq === i ? 'rotate-180 text-white' : ''}`} />
          </button>
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activeFaq === i ? 'max-h-48 border-t border-zinc-900' : 'max-h-0'}`}>
            <p className="p-5 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}