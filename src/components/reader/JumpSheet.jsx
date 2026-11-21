'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, BookOpen, Layers, ArrowRight, Bookmark, Trash2, ExternalLink } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getSurahList, getIndex } from '@/lib/quran/loader';
import { getBookmarks, removeBookmark, BOOKMARKS_CHANGED_EVENT } from '@/lib/quran/bookmarks';

export function JumpSheet({ isOpen, onClose, initialTab = 'page' }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [tab, setTab] = useState(initialTab); // 'page' | 'surah' | 'juz' | 'bookmark'
  const [pageInput, setPageInput] = useState('');
  const [surahs, setSurahs] = useState([]);
  const [index, setIndex] = useState(null);
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    getSurahList().then(setSurahs).catch(console.error);
    getIndex().then(setIndex).catch(console.error);
    setBookmarks(getBookmarks());

    const handleBookmarksChanged = () => {
      setBookmarks(getBookmarks());
    };
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged);
    return () => window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged);
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

  const navigateToBookmark = (b) => {
    if (settings.reading_view === 'halaman') {
      const targetPage = b.page || index?.verse_to_page[b.verseKey] || 1;
      router.push(`/quran/halaman/${targetPage}?verse=${b.verseKey}`);
    } else {
      router.push(`/quran/${b.surah}?ayah=${b.ayah}`);
    }
    onClose();
  };

  const handleDeleteBookmark = (e, verseKey) => {
    e.stopPropagation();
    const updated = removeBookmark(verseKey);
    setBookmarks(updated);
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
            <button
              onClick={() => setTab('bookmark')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                tab === 'bookmark'
                  ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3 h-3 text-amber-500" />
              <span>Tersimpan {bookmarks.length > 0 && `(${bookmarks.length})`}</span>
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

        {/* Tab 4: Ayat Tersimpan (Bookmark) */}
        {tab === 'bookmark' && (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            {bookmarks.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-brand-charcoal dark:text-white">
                  Belum Ada Ayat Tersimpan
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Sorot teks ayat atau gunakan tombol Simpan pada daftar ayat untuk menyimpan penanda tilawah Anda.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 max-h-80 pr-1 space-y-1">
                {bookmarks.map((b) => (
                  <div
                    key={b.verseKey}
                    onClick={() => navigateToBookmark(b)}
                    className="py-3 px-3 flex items-start justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-colors group gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary text-[10px] font-bold">
                          QS {b.verseKey}
                        </span>
                        <span className="font-bold text-xs text-brand-charcoal dark:text-white truncate">
                          {b.surahName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {b.page ? `Hal ${b.page}` : ''} {b.juz ? `• Juz ${b.juz}` : ''}
                        </span>
                      </div>
                      {b.text && (
                        <p className="font-quran text-sm text-brand-primary dark:text-brand-dark-primary text-right truncate" dir="rtl">
                          {b.text}
                        </p>
                      )}
                      {b.translation && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                          &quot;{b.translation}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      <button
                        onClick={(e) => handleDeleteBookmark(e, b.verseKey)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Hapus dari tersimpan"
                        aria-label={`Hapus ayat ${b.verseKey} dari tersimpan`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="p-1.5 text-brand-primary dark:text-brand-dark-primary group-hover:translate-x-0.5 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
