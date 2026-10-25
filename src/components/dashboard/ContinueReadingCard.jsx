'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, ArrowRight, BookOpen, Layers } from 'lucide-react';

/**
 * ContinueReadingCard displays the last reading position with one-tap resumption.
 *
 * @param {Object} props
 * @param {Object} props.position
 * @param {string} props.position.verse_key e.g. "2:255"
 * @param {number} props.position.surah
 * @param {number} props.position.ayah
 * @param {number} [props.position.page]
 * @param {string} [props.surahName]
 * @param {string} [props.surahArabic]
 * @param {'ayat'|'halaman'} [props.readingView='ayat']
 */
export function ContinueReadingCard({
  position,
  surahName = 'Al-Fatihah',
  surahArabic = 'الفاتحة',
  readingView = 'ayat',
}) {
  const surahId = position?.surah || 1;
  const ayahNum = position?.ayah || 1;
  const pageNum = position?.page || 1;

  const targetHref =
    readingView === 'halaman'
      ? `/quran/halaman/${pageNum}?verse=${position?.verse_key || '1:1'}`
      : `/quran/${surahId}?verse=${position?.verse_key || '1:1'}`;

  return (
    <div className="relative overflow-hidden bg-brand-primary dark:bg-brand-dark-surface rounded-3xl p-6 text-white shadow-lg border border-emerald-800/40 dark:border-white/10 group">
      {/* Decorative Quranic Arabesque background watermark */}
      <div className="absolute -right-6 -bottom-8 text-8xl font-quran select-none opacity-10 pointer-events-none group-hover:scale-105 transition-transform duration-500">
        {surahArabic}
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-brand-accent dark:text-brand-dark-primary backdrop-blur-xs">
              <Bookmark className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Terakhir Dibaca
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white/90">
            {readingView === 'halaman' ? (
              <>
                <Layers className="w-3 h-3" />
                <span>Halaman {pageNum}</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3 h-3" />
                <span>Ayat {ayahNum}</span>
              </>
            )}
          </div>
        </div>

        {/* Content row */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xl font-bold tracking-tight text-white">
              {surahName}
            </h3>
            <span className="font-quran text-2xl text-brand-accent dark:text-brand-dark-primary font-normal" dir="rtl">
              {surahArabic}
            </span>
          </div>
          <p className="text-xs text-white/70">
            Surah ke-{surahId} &bull; {readingView === 'halaman' ? `Halaman ${pageNum}` : `Ayat ke-${ayahNum}`}
          </p>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Link
            href={targetHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-brand-primary dark:bg-brand-dark-primary dark:text-brand-dark-bg font-bold text-xs shadow-md hover:bg-brand-bg transition-all hover:gap-3"
          >
            <span>Lanjutkan Membaca</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
