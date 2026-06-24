import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — OpenBillet',
  description: 'Terms and conditions for using the OpenBillet platform.',
};

const LAST_UPDATED = 'June 24, 2026';
const CONTACT_EMAIL = 'support@openbillet.com';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm text-zinc-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using OpenBillet (&ldquo;the Service&rdquo;) at openbillet.com, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users including account owners, team members, field workers, and clients accessing portals via magic links.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">2. Description of Service</h2>
            <p>OpenBillet is a B2B software platform that enables service businesses to create white-label client portals with milestone tracking, file sharing, proposals, invoicing, messaging, and field worker management. We provide the platform; you provide the content and services to your clients.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">3. Account Registration</h2>
            <p className="mb-2">You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-900 underline">{CONTACT_EMAIL}</a> if you suspect unauthorized access.</p>
            <p>You must be at least 18 years old to create an account. By registering, you represent that you have the legal authority to enter into this agreement.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">4. Subscription and Payment</h2>
            <p className="mb-2">OpenBillet offers a 14-day free trial followed by paid subscription plans. Payments are processed by Stripe. By subscribing, you authorize recurring charges to your payment method at the selected billing interval (monthly or annual).</p>
            <p className="mb-2">You may cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period — no refunds are issued for partial periods.</p>
            <p>We reserve the right to change pricing with 30 days&apos; notice. Continued use after the notice period constitutes acceptance of new pricing.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to use OpenBillet to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
              <li>Violate any applicable law or regulation</li>
              <li>Transmit spam, malware, or malicious content</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest data from the platform without permission</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to harm, harass, or defraud others</li>
              <li>Resell or sublicense the Service without written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">6. Your Content</h2>
            <p className="mb-2">You retain ownership of all content you upload or create on the platform (client data, files, proposals, messages, etc.). By using the Service, you grant us a limited license to store, process, and transmit your content solely to provide the Service.</p>
            <p>You are solely responsible for the content you create and share through OpenBillet. You represent that you have the necessary rights to any content you upload.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">7. White-Label Usage</h2>
            <p>OpenBillet allows you to present the platform under your own brand name and logo to your clients. Your clients interact with a portal that reflects your brand. You are responsible for ensuring your white-label usage complies with applicable laws and does not mislead clients about the nature of the underlying service.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">8. Intellectual Property</h2>
            <p>The OpenBillet platform, including its code, design, trademarks, and content (excluding your content), is owned by OpenBillet and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">9. Availability and Modifications</h2>
            <p>We strive for high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice of material changes. We are not liable for any downtime or service interruptions.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">10. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">11. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENBILLET SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUE, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES. OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">12. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless OpenBillet and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Service, your content, or your violation of these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">13. Termination</h2>
            <p>Either party may terminate this agreement at any time. We may suspend or terminate your account immediately if you violate these terms. Upon termination, your right to access the Service ends. We will retain your data for 90 days post-termination before deletion, except where legally required to retain it longer.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">14. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Florida, without regard to its conflict of law provisions. Any disputes shall be resolved in the state or federal courts located in Florida, and you consent to personal jurisdiction in those courts.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">15. Changes to Terms</h2>
            <p>We may update these terms from time to time. We will notify you of material changes by email or platform notice at least 30 days before they take effect. Continued use after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">16. Contact</h2>
            <p>Questions about these terms? Contact us at:<br />
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-900 underline font-semibold">{CONTACT_EMAIL}</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 flex gap-6">
          <Link href="/privacy" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Privacy Policy</Link>
          <Link href="/contact" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}