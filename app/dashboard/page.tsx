'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
    </div>
  );
}