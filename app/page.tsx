'use client';

import Link from 'next/link';
import { ArrowRight, Users, FileText, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h1 className="text-6xl font-bold tracking-tight mb-6">
            Client portals that<br />actually feel professional
          </h1>
          <p className="text-2xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            Stop the email chaos. Give every client a beautiful, simple portal.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth">
              <button className="bg-black text-white px-8 py-4 rounded-xl font-medium flex items-center gap-2 hover:bg-zinc-800">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <a href="#features" className="border border-zinc-300 px-8 py-4 rounded-xl font-medium hover:bg-zinc-50">
              Watch demo
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Magic Links</h3>
            <p className="text-zinc-600">Clients access their portal with one click. No accounts needed.</p>
          </div>
          <div className="text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Files + Notes</h3>
            <p className="text-zinc-600">Share deliverables, get feedback, track everything in one place.</p>
          </div>
          <div className="text-center">
            <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Status Tracking</h3>
            <p className="text-zinc-600">Clear project status so you get fewer "where are we at?" emails.</p>
          </div>
        </div>
      </div>
    </div>
  );
}