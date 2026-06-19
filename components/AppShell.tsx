'use client';

import SideNav from './SideNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <SideNav />
      <div className="md:pl-14 pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
}