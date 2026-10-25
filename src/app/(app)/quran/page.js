'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Layers, ChevronRight, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getSurahList, getIndex } from '@/lib/quran/loader';
import { getLastPosition } from '@/lib/quran/position';

const SUGGESTED_TOPICS = [
  'Sabar menghadapi cobaan',
  'Keutamaan shalat malam',
  'Berbakti kepada orang tua',
  'Rezeki yang berkah',
  'Ampunan dan taubat',
  'Penciptaan alam semesta',
];

export default function QuranIndexPage() {
  const [activeTab, setActiveTab] = useState('surah'); // 'surah' | 'juz' | 'tematik'
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState([]);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [surahs, setSurahs] = useState([]);
  const [index, setIndex] = useState(null);
  const [lastPos, setLastPos] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    Promise.all([getSurahList(), getIndex()])
      .then(([surahsData, indexData]) => {
        setSurahs(surahsData);
        setIndex(indexData);
        setLastPos(getLastPosition());
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Quran metadata', err);
        setIsLoading(false);
      });
  }, []);

  const handleSemanticSearch = async (term) => {
    const q = (term || semanticQuery).trim();
    if (!q) return;

    setSemanticQuery(q);
    setIsSearchingSemantic(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setSemanticResults(data.results || []);
    } catch (err) {
      console.warn('Gagal mencari semantik:', err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const filteredSurahs = surahs.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name_simple.toLowerCase().includes(q) ||
      s.translated_name.toLowerCase().includes(q) ||
      s.name_arabic.includes(q) ||
      String(s.id) === q
    );
  });

  const lastSurahInfo = surahs.find((s) => s.id === lastPos?.surah) || surahs[0];
  const lastTargetHref =
    settings.reading_view === 'halaman'
      ? `/quran/halaman/${lastPos?.page || 1}`
      : `/quran/${lastPos?.surah || 1}#ayah-${lastPos?.ayah || 1}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-6">
      {/* 1. Continue Reading Card */}
      {lastSurahInfo && (
        <section aria-labelledby="continue-heading">
          <div className="bg-gradient-to-r from-emerald-900 to-brand-primary text-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-amber-300">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold block">
                  Terakhir Dibaca
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="font-bold text-lg text-white">
                    {lastSurahInfo.name_simple}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 font-medium">
                    Ayat {lastPos?.ayah || 1}
                  </span>
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  {settings.reading_view === 'halaman'
                    ? `Halaman ${lastPos?.page || 1} • Format Mushaf`
                    : 'Format Per Ayat'}
                </p>
              </div>
            </div>

            <Link
              href={lastTargetHref}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-brand-charcoal font-bold text-xs shadow-sm transition-all"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex bg-black/5 dark:bg-white/10 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('surah')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'surah'
              ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Daftar Surah (114)
        </button>
        <button
          onClick={() => setActiveTab('juz')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'juz'
              ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Daftar Juz (30)
        </button>
        <button
          onClick={() => setActiveTab('tematik')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tematik'
              ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Tematik AI</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-gray-400">
          Memuat data mushaf Al-Qur&apos;an...
        </div>
      ) : activeTab === 'surah' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari surah (mis. Al-Baqarah, 2, البقرة)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="bg-white dark:bg-brand-dark-surface rounded-3xl border border-emerald-950/10 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 shadow-xs overflow-hidden">
            {filteredSurahs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Tidak ada surah yang cocok dengan &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredSurahs.map((s) => {
                const surahTarget =
                  settings.reading_view === 'halaman'
                    ? `/quran/halaman/${s.first_page}`
                    : `/quran/${s.id}`;

                return (
                  <Link
                    key={s.id}
                    href={surahTarget}
                    className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary font-bold text-xs flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors">
                        {s.id}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-brand-charcoal dark:text-white">
                            {s.name_simple}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {s.translated_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {s.revelation_place} • {s.verses_count} Ayat • Hal {s.first_page}
                        </p>
                      </div>
                    </div>
                    <div className="font-quran text-xl text-brand-primary dark:text-brand-dark-primary font-semibold">
                      {s.name_arabic}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : activeTab === 'juz' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
            const startPage = index?.juz_to_page[String(juzNum)] || 1;
            const targetHref = `/quran/halaman/${startPage}`;

            return (
              <Link
                key={juzNum}
                href={targetHref}
                className="bg-white dark:bg-brand-dark-surface p-4 rounded-2xl border border-emerald-950/10 dark:border-white/10 hover:border-brand-primary hover:shadow-sm transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-brand-charcoal dark:text-white">
                    Juz {juzNum}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Mulai Halaman {startPage}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center font-bold text-xs">
                  {juzNum}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Tematik AI Search Tab (PRD FR-10) */
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-brand-primary/10 via-brand-bg to-brand-accent/10 dark:from-brand-dark-surface dark:to-emerald-950/30 rounded-3xl p-5 border border-brand-primary/20 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-brand-charcoal dark:text-white">
                Pencarian Semantik & Tematik Tafsir
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Temukan ayat-ayat Al-Qur&apos;an berdasarkan makna, konsep tematik, atau pertanyaan refleksi menggunakan bantuan kecerdasan buatan.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSemanticSearch();
              }}
              className="flex gap-2 pt-1"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="Cari konsep (mis. sabar, orang tua, shalat malam)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-black/20 border border-emerald-950/15 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingSemantic}
                className="px-5 py-2.5 rounded-2xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold text-xs shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSearchingSemantic ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Cari</span>}
              </button>
            </form>

            {/* Suggested Topic Chips */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[11px] text-gray-400 font-medium self-center mr-1">Saran:</span>
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSemanticSearch(topic)}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:border-brand-primary transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          {isSearchingSemantic ? (
            <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
              <span>Mencari rujukan ayat dan tafsir semantik...</span>
            </div>
          ) : semanticResults.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                Hasil Pencarian ({semanticResults.length} Ayat)
              </h4>

              {semanticResults.map((res) => {
                const [sId, aId] = res.verse_key.split(':').map(Number);
                const targetHref = `/quran/${sId}?verse=${res.verse_key}`;

                return (
                  <Link
                    key={res.verse_key}
                    href={targetHref}
                    className="block p-4 rounded-3xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs hover:border-brand-primary hover:shadow-md transition-all group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary font-bold text-xs">
                          QS {res.verse_key}
                        </span>
                        {res.surah_name && (
                          <span className="font-bold text-xs text-brand-charcoal dark:text-white">
                            {res.surah_name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-brand-primary dark:text-brand-dark-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Buka Ayat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {res.arabic && (
                      <p className="font-quran text-lg text-brand-charcoal dark:text-gray-100 text-right leading-loose" dir="rtl">
                        {res.arabic}
                      </p>
                    )}

                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      &quot;{res.snippet}&quot;
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : semanticQuery ? (
            <div className="p-8 text-center text-xs text-gray-400 rounded-3xl bg-white dark:bg-brand-dark-surface border border-black/5">
              Tidak ditemukan hasil untuk &quot;{semanticQuery}&quot;. Coba gunakan kata kunci umum seperti &quot;sabar&quot;, &quot;shalat&quot;, atau &quot;rezeki&quot;.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
