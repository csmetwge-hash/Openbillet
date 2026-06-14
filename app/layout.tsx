import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SupabaseAuthProvider } from '@/components/SupabaseAuth';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'OpenBillet — Premium Client Portals',
  description: 'Deploy secure client workspaces with milestone tracking, file delivery, proposals, and automated updates.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OpenBillet',
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#18181b',
  width: 'device-width',
  initialScale: 1,
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
      </body>
    </html>
  );
}