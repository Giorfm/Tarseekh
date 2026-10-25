'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download, X } from 'lucide-react';

export function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Tarseekh Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    }

    // 2. Online / Offline listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // 3. PWA install prompt handler
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Indicator Banner */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-md animate-fade-in"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Mode Offline:</strong> Anda sedang offline. Membaca surah dan hafalan tetap berjalan menggunakan data lokal.
          </span>
        </aside>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <aside
          role="region"
          aria-label="Pemasangan Aplikasi"
          className="fixed bottom-20 md:bottom-6 right-4 z-40 max-w-sm bg-white dark:bg-brand-dark-surface p-4 rounded-3xl border border-emerald-950/10 dark:border-white/10 shadow-xl flex items-center gap-3 animate-fade-in"
        >
          <div className="w-10 h-10 rounded-2xl bg-brand-primary dark:bg-brand-dark-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
            ت
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-brand-charcoal dark:text-white">
              Pasang Tarseekh
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Akses cepat tanpa koneksi internet
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold text-xs shadow-xs hover:opacity-90 flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3" />
            <span>Pasang</span>
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}
    </>
  );
}
