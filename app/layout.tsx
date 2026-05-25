import type { Metadata } from 'next';
import './globals.css';
import { SupabaseAuthProvider } from '@/components/SupabaseAuth';

export const metadata: Metadata = {
  title: 'PortalFlow - Client Portals for Solopreneurs',
  description: 'Beautiful client portals for one-person businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-50">
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      </body>
    </html>
  );
}