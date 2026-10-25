'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, BookOpen, Layers, ArrowRight } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getSurahList, getIndex } from '@/lib/quran/loader';

export function JumpSheet({ isOpen, onClose }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [tab, setTab] = useState('page'); // 'page' | 'surah' | 'juz'
  const [pageInput, setPageInput] = useState('');
  const [surahs, setSurahs] = useState([]);
  const [index, setIndex] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    getSurahList().then(setSurahs).catch(console.error);
    getIndex().then(setIndex).catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  const navigateToPage = (pageNum) => {
    const p = Math.max(1, Math.min(604, parseInt(pageNum, 10) || 1));
    if (settings.reading_view === 'halaman') {
      router.push(`/quran/halaman/${p}`);
    } else {
      // Find which surah starts on this page or is on this page
      const surahEntry = surahs.find((s) => s.first_page === p) || surahs[0];
      router.push(`/quran/${surahEntry.id}`);
    }
    onClose();
  };

  const navigateToSurah = (surahId) => {
    if (settings.reading_view === 'halaman') {
      const p = index?.surah_to_page[String(surahId)] || 1;
      router.push(`/quran/halaman/${p}`);
    } else {
      router.push(`/quran/${surahId}`);
    }
    onClose();
  };

  const navigateToJuz = (juzNum) => {
    const p = index?.juz_to_page[String(juzNum)] || 1;
    if (settings.reading_view === 'halaman') {
      router.push(`/quran/halaman/${p}`);
    } else {
      const surahEntry = surahs.find((s) => s.first_page >= p) || surahs[0];
      router.push(`/quran/${surahEntry.id}`);
    }
    onClose();
  };

  const filteredSurahs = surahs.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name_simple.toLowerCase().includes(q) ||
      s.translated_name.toLowerCase().includes(q) ||
      s.name_arabic.includes(q) ||
      String(s.id) === q
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white dark:bg-brand-dark-surface rounded-t-3xl sm:rounded-2xl border border-emerald-950/10 dark:border-white/10 p-5 space-y-4 shadow-2xl z-10 max-h-[85vh] flex flex-col">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <div className="flex bg-black/5 dark:bg-white/10 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTab('page')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'page'
                  ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Halaman
            </button>
            <button
              onClick={() => setTab('surah')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'surah'
                  ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Surah
            </button>
            <button
              onClick={() => setTab('juz')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'juz'
                  ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Juz
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Halaman Input & Quick Grid */}
        {tab === 'page' && (
          <div className="space-y-4 py-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pageInput) navigateToPage(pageInput);
              }}
              className="flex gap-2"
            >
              <input
                type="number"
                min="1"
                max="604"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="Ketik halaman (1-604)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span>Buka</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div>
              <span className="text-xs text-gray-400 block mb-2 font-medium">Halaman Utama:</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {[1, 2, 50, 77, 106, 187, 255, 300, 400, 500, 582, 604].map((p) => (
                  <button
                    key={p}
                    onClick={() => navigateToPage(p)}
                    className="py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-brand-primary/10 hover:text-brand-primary text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    Hal {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Surah List */}
        {tab === 'surah' && (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari surah..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 max-h-80 pr-1">
              {filteredSurahs.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigateToSurah(s.id)}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary text-[10px] font-bold flex items-center justify-center">
                      {s.id}
                    </span>
                    <div>
                      <span className="font-semibold text-xs text-brand-charcoal dark:text-white block">
                        {s.name_simple}
                      </span>
                      <span className="text-[10px] text-gray-400">{s.translated_name}</span>
                    </div>
                  </div>
                  <span className="font-quran text-base text-brand-primary dark:text-brand-dark-primary">
                    {s.name_arabic}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Juz List */}
        {tab === 'juz' && (
          <div className="overflow-y-auto max-h-80 grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
              const startPage = index?.juz_to_page[String(juzNum)] || 1;
              return (
                <button
                  key={juzNum}
                  onClick={() => navigateToJuz(juzNum)}
                  className="p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-brand-primary hover:bg-brand-primary/5 text-left transition-colors flex flex-col justify-between"
                >
                  <span className="font-bold text-xs text-brand-charcoal dark:text-white">
                    Juz {juzNum}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    Mulai Halaman {startPage}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
