import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SupabaseAuthProvider } from '@/components/SupabaseAuth';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'OpenBillet — Premium Client Portals',
  description: 'Deploy secure client workspaces with milestone tracking, file delivery, proposals, and automated updates.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="antialiased scroll-smooth selection:bg-black selection:text-white"
    >
      <body
        className="bg-zinc-50 text-zinc-950 font-sans tracking-tight min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}