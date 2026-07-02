'use client';

import { useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { subscribeToPush } from '@/lib/push-client';

export default function NotificationButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'enabled' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    setStatus('loading');
    const result = await subscribeToPush();
    if (result.success) {
      setStatus('enabled');
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Something went wrong.');
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={status === 'loading' || status === 'enabled'}
        title={status === 'enabled' ? 'Notifications enabled' : status === 'error' ? errorMsg : 'Enable notifications'}
        className="p-2 rounded-xl hover:bg-zinc-100 transition cursor-pointer disabled:cursor-default"
      >
        {status === 'loading' ? (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        ) : status === 'enabled' ? (
          <BellRing className="w-4 h-4 text-zinc-700" />
        ) : (
          <Bell className={`w-4 h-4 ${status === 'error' ? 'text-red-400' : 'text-zinc-400'}`} />
        )}
      </button>
    );
  }

  if (status === 'enabled') {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <BellRing className="w-4 h-4" /> Notifications enabled
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="flex items-center gap-2 text-sm font-bold bg-zinc-900 text-white px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition disabled:opacity-50"
      >
        {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Enable Notifications
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-600 mt-1.5">{errorMsg}</p>
      )}
    </div>
  );
}