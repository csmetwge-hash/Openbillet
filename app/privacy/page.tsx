import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — OpenBillet',
  description: 'How OpenBillet collects, uses, and protects your data.',
};

const LAST_UPDATED = 'July 8, 2026';
const CONTACT_EMAIL = 'support@openbillet.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm text-zinc-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">1. Introduction</h2>
            <p>OpenBillet (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the OpenBillet platform at openbillet.com. This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our services. By using OpenBillet, you agree to the practices described in this policy.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2"><strong>Account information:</strong> When you register, we collect your email address and password (stored as a secure hash). If you subscribe to a paid plan, Stripe collects your payment details — we never store credit card numbers.</p>
            <p className="mb-2"><strong>Business data you create:</strong> Client names, email addresses, phone numbers, addresses, project details, milestone content, uploaded files and photos, messages, and proposals you create within the platform.</p>
            <p className="mb-2"><strong>Team member information:</strong> If you invite team members or field workers, we collect their email address and, if provided, phone number.</p>
            <p className="mb-2"><strong>Push notifications:</strong> If you or your team enable push notifications, we store a browser-issued subscription identifier (not linked to your identity beyond your account) in order to deliver those notifications.</p>
            <p className="mb-2"><strong>Usage data:</strong> Pages visited, features used, timestamps, and browser/device information collected automatically via server logs.</p>
            <p><strong>Communications:</strong> If you contact us for support, we retain those communications.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
              <li>To provide, maintain, and improve the OpenBillet platform</li>
              <li>To process payments and manage your subscription</li>
              <li>To send transactional emails and push notifications (portal updates, job reminders, billing receipts)</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do not sell your personal information to third parties. We do not use your data to serve advertisements.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">4. Data Sharing</h2>
            <p className="mb-2">We share data only with service providers necessary to operate the platform:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
              <li><strong>Supabase</strong> — database and authentication hosting</li>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Vercel</strong> — application hosting</li>
              <li><strong>Sentry</strong> — error monitoring, to help us identify and fix technical issues</li>
              <li><strong>Apple, Google, and Mozilla push services</strong> — used solely to deliver push notifications to devices that have opted in; no personal data beyond the notification content is shared with them</li>
            </ul>
            <p className="mt-3">Each provider is bound by their own privacy policy and data processing agreements. We do not share your data with anyone else unless required by law.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">5. Data Retention &amp; Deletion</h2>
            <p className="mb-2">We retain your data for as long as your account is active. You can permanently delete your account and all associated data at any time from Settings — this deletion is immediate and irreversible, except where we are required to retain limited records for legal or financial compliance purposes (e.g., billing records required by tax law).</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">6. Security</h2>
            <p>We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security policies on our database. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">7. California Privacy Rights (CCPA)</h2>
            <p className="mb-2">If you are a California resident, you have the following rights under the California Consumer Privacy Act:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
              <li><strong>Right to know</strong> — what personal information we collect and how we use it</li>
              <li><strong>Right to delete</strong> — request deletion of your personal information</li>
              <li><strong>Right to opt out</strong> — we do not sell personal information, so no opt-out is needed</li>
              <li><strong>Right to non-discrimination</strong> — we will not discriminate against you for exercising your rights</li>
            </ul>
            <p className="mt-3">You can exercise your right to export or delete your data at any time using the &ldquo;Export My Data&rdquo; and &ldquo;Delete My Account&rdquo; options in Settings. For any other request, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-900 underline">{CONTACT_EMAIL}</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">8. GDPR Rights (EEA/UK Residents)</h2>
            <p className="mb-2">If you are located in the European Economic Area or United Kingdom, you have the following rights under GDPR:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600">
              <li><strong>Right of access</strong> — obtain a copy of your personal data</li>
              <li><strong>Right to rectification</strong> — correct inaccurate personal data</li>
              <li><strong>Right to erasure</strong> — request deletion of your personal data</li>
              <li><strong>Right to restriction</strong> — limit how we process your data</li>
              <li><strong>Right to data portability</strong> — receive your data in a portable format</li>
              <li><strong>Right to object</strong> — object to certain types of processing</li>
            </ul>
            <p className="mt-3">Our legal basis for processing is contract performance (to provide the service you signed up for) and legitimate interests. You can exercise your right to access, port, or erase your data at any time using the &ldquo;Export My Data&rdquo; and &ldquo;Delete My Account&rdquo; options in Settings. For any other request, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-900 underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">9. Cookies</h2>
            <p>We use essential cookies only — specifically, session cookies required for authentication. We do not use tracking, advertising, or analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">10. Children&apos;s Privacy</h2>
            <p>OpenBillet is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">11. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes by email or by posting a notice on the platform. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-zinc-900 mb-3">12. Contact</h2>
            <p>For privacy-related questions, requests, or complaints, contact us at:<br />
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-900 underline font-semibold">{CONTACT_EMAIL}</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 flex gap-6">
          <Link href="/terms" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Terms of Service</Link>
          <Link href="/contact" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}