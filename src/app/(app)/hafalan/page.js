'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Brain, CheckCircle2, AlertCircle, ArrowRight, BookOpen, Clock, Calendar } from 'lucide-react';
import { MemorizationAdapter } from '@/lib/memorization/engine';
import { getSurahList } from '@/lib/quran/loader';

export default function HafalanPage() {
  const [mounted, setMounted] = useState(false);
  const [dueItems, setDueItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [surahs, setSurahs] = useState([]);

  useEffect(() => {
    setMounted(true);
    try {
      const due = MemorizationAdapter.getDueToday();
      setDueItems(due);

      const all = MemorizationAdapter.getAll();
      setAllItems(all);
    } catch {
      // ignore
    }

    getSurahList()
      .then((data) => setSurahs(data || []))
      .catch(console.error);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-48 bg-gray-200 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  // Quick Juz 30 short surahs commonly memorized
  const juz30Surahs = surahs.filter((s) => s.id >= 78);

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-6">
      {/* Header */}
      <section className="bg-gradient-to-br from-purple-900 via-brand-dark-surface to-brand-primary/40 rounded-3xl p-6 text-white border border-purple-800/40 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 text-purple-300 backdrop-blur-xs">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Pusat Hafalan & Murajaah
            </h1>
            <p className="text-xs md:text-sm text-purple-200 mt-0.5">
              Menjaga hafalan Al-Qur&apos;an secara terstruktur dengan Spaced Repetition (SM-2)
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block">Total Hafalan</span>
            <span className="text-xl font-black">{allItems.length}</span>
            <span className="text-[10px] text-purple-300 ml-1">ayat</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block">Jatuh Tempo</span>
            <span className="text-xl font-black text-amber-300">{dueItems.length}</span>
            <span className="text-[10px] text-purple-300 ml-1">ayat</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block">Interval Maks</span>
            <span className="text-xl font-black text-emerald-300">
              {allItems.length > 0
                ? Math.max(...allItems.map((i) => i.interval || 0), 1)
                : 0}
            </span>
            <span className="text-[10px] text-purple-300 ml-1">hari</span>
          </div>
        </div>
      </section>

      {/* Due Today Queue Card */}
      <section className="bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="font-bold text-base text-brand-charcoal dark:text-white">
              Antrean Murajaah Hari Ini
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
            {dueItems.length} Ayat
          </span>
        </div>

        {dueItems.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/20 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              Alhamdulillah, tidak ada hafalan yang jatuh tempo hari ini!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Pilih surah di bawah untuk menambah hafalan baru atau memperkuat surah favorit Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/30">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-brand-charcoal dark:text-white">
                  {dueItems.length} ayat siap dimurajaah
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Uji hafalan dengan mode penutup kata dan nilai daya ingat Anda di akhir sesi.
                </p>
              </div>
              <Link
                href={`/quran/${dueItems[0].surah}?mode=memorize&verse=${dueItems[0].surah}:${dueItems[0].ayah}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
              >
                <span>Mulai Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {dueItems.slice(0, 8).map((item, idx) => (
                <Link
                  key={`${item.surah}:${item.ayah}-${idx}`}
                  href={`/quran/${item.surah}?mode=memorize&verse=${item.surah}:${item.ayah}`}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-purple-500 transition-colors flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-brand-charcoal dark:text-white">
                    QS {item.surah}:{item.ayah}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {item.interval || 1} hari
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Target Hafalan Juz 30 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />
            <h2 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
              Mulai Menghafal (Juz 30 & Surah Pilihan)
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {juz30Surahs.length} Surah
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {juz30Surahs.map((surah) => (
            <Link
              key={surah.id}
              href={`/quran/${surah.id}?mode=memorize`}
              className="p-4 rounded-2xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-md transition-all group flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center">
                    {surah.id}
                  </span>
                  <h3 className="font-bold text-sm text-brand-charcoal dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {surah.name_simple}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {surah.translated_name} &bull; {surah.verses_count} Ayat
                </p>
              </div>

              <div className="text-right">
                <span className="font-quran text-xl text-brand-charcoal dark:text-gray-100" dir="rtl">
                  {surah.name_arabic}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
