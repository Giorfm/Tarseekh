'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Sparkles, Settings, Sun, Moon } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const NAV_ITEMS = [
  { label: 'Beranda', href: '/', icon: Home },
  { label: 'Quran', href: '/quran', icon: BookOpen },
  { label: 'Hafalan', href: '/hafalan', icon: Sparkles },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const { settings, toggleTheme } = useSettings();

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
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">
                Meneguhkan Al-Qur&apos;an
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5" aria-label="Navigasi Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);
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
        {/* Mobile Slim Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-30 bg-white/80 dark:bg-brand-dark-surface/80 backdrop-blur-md border-b border-emerald-950/10 dark:border-white/10">
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
        <main className="flex-1 pb-20 md:pb-6 focus:outline-none" tabIndex={-1}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-lg border-t border-emerald-950/10 dark:border-white/10 z-30 flex items-center justify-around px-2"
          aria-label="Navigasi Bawah"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);
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
