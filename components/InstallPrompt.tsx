'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Already running as an installed app — never show.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Dismissed earlier this session
    if (sessionStorage.getItem('installPromptDismissed')) return;

    setDismissed(false);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    if (isIOS) setShowIOSHint(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    handleDismiss();
  };

  const handleDismiss = () => {
    sessionStorage.setItem('installPromptDismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-lg p-4 z-50 flex items-start gap-3">
      <div className="p-2 bg-zinc-900 rounded-xl shrink-0">
        <Download className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900">Install OpenBillet</p>
        {deferredPrompt ? (
          <>
            <p className="text-xs text-zinc-500 mt-0.5 mb-2">Add to your home screen for quick, app-like access.</p>
            <button onClick={handleInstall}
              className="text-xs font-bold bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition cursor-pointer">
              Install
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1 flex-wrap">
            Tap <Share className="w-3 h-3 inline shrink-0" /> then &ldquo;Add to Home Screen&rdquo; for app-like access.
          </p>
        )}
      </div>
      <button onClick={handleDismiss} className="text-zinc-300 hover:text-zinc-600 cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}