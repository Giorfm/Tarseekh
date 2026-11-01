'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Sparkles, Settings, Sun, Moon, ScrollText } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const KISAH_SEEN_KEY = 'tarseekh_kisah_seen_v1';

const NAV_ITEMS = [
  { label: 'Beranda', href: '/', icon: Home },
  { label: 'Quran', href: '/quran', icon: BookOpen },
  { label: 'Kisah', href: '/kisah', icon: ScrollText, featured: true },
  { label: 'Hafalan', href: '/hafalan', icon: Sparkles },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const { settings, toggleTheme } = useSettings();
  const [showKisahBadge, setShowKisahBadge] = useState(false);

  // One-time "Baru" dot on the featured Kisah item until it is first visited
  useEffect(() => {
    try {
      if (pathname.startsWith('/kisah')) {
        localStorage.setItem(KISAH_SEEN_KEY, '1');
        setShowKisahBadge(false);
      } else {
        setShowKisahBadge(!localStorage.getItem(KISAH_SEEN_KEY));
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const isCurrent = (href) => {
    if (href === '/') return pathname === '/';
    if (href === '/hafalan') return pathname.startsWith('/hafalan');
    if (href.startsWith('/quran')) return pathname.startsWith('/quran');
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-bg dark:bg-brand-dark-bg text-brand-charcoal dark:text-gray-100">
      {/* Desktop Side Rail */}
      <aside className="hidden md:flex flex-col w-64 border-r border-emerald-950/10 dark:border-white/10 bg-white/70 dark:bg-brand-dark-surface/70 backdrop-blur-md sticky top-0 h-screen z-30">
        <div className="p-5 border-b border-emerald-950/10 dark:border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-brand-primary dark:bg-brand-dark-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ت
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block text-brand-primary dark:text-brand-dark-primary leading-none">
                Tarseekh
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-tight">
                Seek the Light, Unfold Insight
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5" aria-label="Navigasi Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);

            if (item.featured) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-sm border transition-all duration-200 ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary dark:bg-brand-dark-primary dark:text-brand-dark-bg dark:border-brand-dark-primary shadow-md'
                      : 'bg-brand-primary/5 dark:bg-brand-dark-primary/10 border-brand-primary/15 dark:border-brand-dark-primary/20 text-brand-primary dark:text-brand-dark-primary hover:bg-brand-primary/10 dark:hover:bg-brand-dark-primary/15 hover:shadow-sm'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      active
                        ? 'bg-white/15 dark:bg-brand-dark-bg/15 text-amber-300 dark:text-brand-dark-bg'
                        : 'bg-brand-primary dark:bg-brand-dark-primary text-amber-300 dark:text-brand-dark-bg'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {showKisahBadge && !active && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      Baru
                    </span>
                  )}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  active
                    ? 'bg-brand-primary text-white dark:bg-brand-dark-primary dark:text-brand-dark-bg shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-inherit' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Footer with Theme Toggle */}
        <div className="p-4 border-t border-emerald-950/10 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Mode Tampilan</span>
          <button
            onClick={toggleTheme}
            aria-label={`Ubah ke mode ${settings.theme === 'dark' ? 'terang' : 'gelap'}`}
            className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-brand-primary" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Slim Top Bar (Hidden via CSS on reader pages to prevent double header and hydration mismatch) */}
        <header className="app-shell-mobile-header md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-30 bg-white/80 dark:bg-brand-dark-surface/80 backdrop-blur-md border-b border-emerald-950/10 dark:border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary dark:bg-brand-dark-primary flex items-center justify-center text-white font-bold text-sm">
              ت
            </div>
            <span className="font-bold text-base text-brand-primary dark:text-brand-dark-primary">
              Tarseekh
            </span>
          </Link>

          <button
            onClick={toggleTheme}
            aria-label={`Ubah ke mode ${settings.theme === 'dark' ? 'terang' : 'gelap'}`}
            className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-brand-primary" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className="app-shell-main flex-1 pb-20 md:pb-6 focus:outline-none" tabIndex={-1}>
          {children}
        </main>

        {/* Mobile Bottom Navigation (Hidden via CSS on reader pages to give clean, full-screen reading) */}
        <nav
          className="app-shell-bottom-nav md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-lg border-t border-emerald-950/10 dark:border-white/10 z-30 flex items-center justify-around px-2"
          aria-label="Navigasi Bawah"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);

            if (item.featured) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="group relative flex flex-col items-center justify-center px-1"
                >
                  <span
                    className={`relative -translate-y-2 w-14 h-14 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-brand-dark-surface bg-brand-primary dark:bg-brand-dark-primary text-amber-300 dark:text-brand-dark-bg transition-all duration-200 ${
                      active ? 'scale-105 shadow-lg shadow-emerald-900/30' : 'shadow-md group-active:scale-95'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                    {showKisahBadge && !active && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-brand-primary dark:ring-brand-dark-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={`-mt-1.5 text-[11px] ${
                      active
                        ? 'text-brand-primary dark:text-brand-dark-primary font-semibold'
                        : 'text-brand-primary/80 dark:text-brand-dark-primary/80 font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                  active
                    ? 'text-brand-primary dark:text-brand-dark-primary font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className="text-[11px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
