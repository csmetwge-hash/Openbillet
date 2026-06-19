'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutGrid, Settings, CreditCard, LogOut, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Control Center', icon: LayoutGrid },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('sidenav-expanded');
    if (stored === 'true') setExpanded(true);
  }, []);

  const toggleExpanded = () => {
    setExpanded(prev => {
      sessionStorage.setItem('sidenav-expanded', String(!prev));
      return !prev;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-zinc-200 z-40 transition-all duration-200 ${
          expanded ? 'w-44' : 'w-14'
        }`}
      >
        <div className={`flex items-center gap-2 px-3 py-4 ${expanded ? '' : 'justify-center'}`}>
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          {expanded && <span className="text-xs font-black tracking-tight text-zinc-900">OpenBillet</span>}
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : label}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition ${
                  active
                    ? 'bg-zinc-100 border border-zinc-200'
                    : 'hover:bg-zinc-50 border border-transparent'
                } ${expanded ? '' : 'justify-center'}`}
              >
                <Icon className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-zinc-900' : 'text-zinc-400'}`} />
                {expanded && (
                  <span className={`text-xs ${active ? 'font-bold text-zinc-900' : 'font-medium text-zinc-500'}`}>
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="px-2 pb-3 flex flex-col gap-1">
          <button
            onClick={handleLogout}
            title={expanded ? undefined : 'Log out'}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-zinc-50 transition cursor-pointer ${expanded ? '' : 'justify-center'}`}
          >
            <LogOut className="w-[17px] h-[17px] text-zinc-400 shrink-0" />
            {expanded && <span className="text-xs font-medium text-zinc-500">Log out</span>}
          </button>

          <button
            onClick={toggleExpanded}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-zinc-50 transition cursor-pointer ${expanded ? '' : 'justify-center'}`}
          >
            {expanded ? (
              <>
                <ChevronLeft className="w-[17px] h-[17px] text-zinc-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-500">Collapse</span>
              </>
            ) : (
              <ChevronRight className="w-[17px] h-[17px] text-zinc-400 shrink-0" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-40 flex pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-zinc-900' : 'text-zinc-400'}`} />
              <span className={`text-[10px] ${active ? 'font-bold text-zinc-900' : 'font-medium text-zinc-400'}`}>
                {label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
        <button onClick={handleLogout} className="flex-1 flex flex-col items-center gap-1 py-2.5 cursor-pointer">
          <LogOut className="w-[18px] h-[18px] text-zinc-400" />
          <span className="text-[10px] font-medium text-zinc-400">Log out</span>
        </button>
      </nav>
    </>
  );
}