'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Check } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getLastPosition } from '@/lib/quran/position';
import { pageOfVerse, firstPageOfSurah } from '@/lib/quran/loader';

export function ReaderSettingsSheet({ isOpen, onClose, currentVerseKey = null, currentPage = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, updateSettings } = useSettings();

  if (!isOpen) return null;

  const handleViewToggle = async (targetView) => {
    if (targetView === settings.reading_view) return;
    updateSettings({ reading_view: targetView });

    // Determine target route based on current position
    const lastPos = getLastPosition();
    const effectiveVerse = currentVerseKey || lastPos.verseKey || '1:1';
    const effectivePage = currentPage || lastPos.page || 1;

    if (targetView === 'halaman') {
      let targetPage = effectivePage;
      if (effectiveVerse) {
        try {
          targetPage = await pageOfVerse(effectiveVerse);
        } catch {
          targetPage = 1;
        }
      }
      router.push(`/quran/halaman/${targetPage}`);
    } else {
      // Switch to 'ayat' view
      const surahId = parseInt(effectiveVerse.split(':')[0], 10) || 1;
      router.push(`/quran/${surahId}#ayah-${effectiveVerse.split(':')[1] || 1}`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-brand-dark-surface rounded-t-3xl sm:rounded-2xl border border-emerald-950/10 dark:border-white/10 p-5 space-y-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <h2 className="font-bold text-base text-brand-charcoal dark:text-white">
            Pengaturan Pembaca
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. View Toggle: Per Ayat vs Per Halaman */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Format Tampilan
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleViewToggle('ayat')}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.reading_view === 'ayat'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary font-semibold'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span>Per Ayat</span>
                {settings.reading_view === 'ayat' && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[11px] text-gray-400 block mt-0.5">Satu ayat per blok</span>
            </button>

            <button
              onClick={() => handleViewToggle('halaman')}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.reading_view === 'halaman'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary font-semibold'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span>Per Halaman</span>
                {settings.reading_view === 'halaman' && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[11px] text-gray-400 block mt-0.5">Mushaf 15 baris (604 hal)</span>
            </button>
          </div>
        </div>

        {/* 2. Font Size Slider & Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ukuran Huruf Arab
            </label>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
              {Math.round(settings.font_scale * 16)}px
            </span>
          </div>

          <input
            type="range"
            min="1.25"
            max="2.5"
            step="0.125"
            value={settings.font_scale}
            onChange={(e) => updateSettings({ font_scale: parseFloat(e.target.value) })}
            className="w-full accent-brand-primary cursor-pointer"
          />

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 text-center">
            <p className="font-quran" dir="rtl">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          </div>
        </div>

        {/* 3. Toggles: Terjemahan & Tajwid */}
        <div className="divide-y divide-gray-100 dark:divide-white/5 pt-1">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <span className="text-xs font-medium block">Tampilkan Terjemahan</span>
              <span className="text-[11px] text-gray-400">Terjemahan Kemenag RI di bawah ayat</span>
            </div>
            <button
              onClick={() => updateSettings({ show_translation: !settings.show_translation })}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.show_translation ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.show_translation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <span className="text-xs font-medium block">Pewarnaan Tajwid</span>
              <span className="text-[11px] text-gray-400">Warna pada hukum tajwid</span>
            </div>
            <button
              onClick={() => updateSettings({ show_tajwid: !settings.show_tajwid })}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.show_tajwid ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.show_tajwid ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
