'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, BookOpen, Sparkles, ExternalLink, Loader2, GitCompare } from 'lucide-react';
import { findMutashabihat } from '@/lib/quran/mutashabihat';

export function MutashabihatModal({ isOpen, onClose, verseKey, onAskAI }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !verseKey) return;
    setLoading(true);
    findMutashabihat(verseKey)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Error finding mutashabihat:', err);
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, verseKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-brand-dark-surface rounded-3xl border border-amber-900/15 dark:border-amber-400/20 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col z-10 select-text">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-brand-charcoal dark:text-white leading-tight">
                  Mutasyabihat Al-Qur&apos;an
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                  QUL Engine
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pencari keserupaan lafal &amp; peneguh hafalan antar-ayat
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary dark:text-brand-dark-primary mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Memindai 6.236 ayat untuk mencari keserupaan frasa...
              </p>
            </div>
          ) : !data || !data.sourceVerse ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Data ayat tidak ditemukan.
            </div>
          ) : (
            <>
              {/* Target Verse Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-900/15 dark:border-amber-400/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                  <span>Ayat Rujukan: QS. {data.sourceVerse.surahName} [{data.sourceVerse.key}]</span>
                </div>
                <p className="font-qpc text-lg sm:text-xl text-brand-charcoal dark:text-white leading-relaxed text-right" dir="rtl">
                  {data.sourceVerse.text}
                </p>
                {data.sourceVerse.translation && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-1 border-t border-amber-900/10 dark:border-white/5">
                    &ldquo;{data.sourceVerse.translation}&rdquo;
                  </p>
                )}
              </div>

              {/* Matches List */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider px-1">
                  <span>Ditemukan {data.matches.length} Ayat Serupa</span>
                  <span className="text-[11px] font-normal text-gray-400">Diurutkan berdasarkan kemiripan frasa</span>
                </div>

                {data.matches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-medium">Tidak ada ayat dengan frasa serupa (minimal 3 kata berturut-turut).</p>
                    <p className="text-[11px] text-gray-400">Lafal pada ayat ini memiliki susunan yang khas.</p>
                  </div>
                ) : (
                  data.matches.map((m) => (
                    <div
                      key={m.key}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-brand-dark-bg border border-emerald-950/10 dark:border-white/10 hover:border-brand-primary dark:hover:border-brand-dark-primary transition-all space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-900/10 dark:bg-emerald-400/10 text-brand-primary dark:text-brand-dark-primary font-bold text-xs">
                            QS. {m.surahName}: {m.ayahNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            {m.matchedWordsCount} kata sama ({m.similarityPercent}%)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onAskAI?.(
                                [data.sourceVerse.key, m.key],
                                `${data.sourceVerse.text}\n---\n${m.text}`,
                                `Jelaskan perbedaan makna, konteks, dan faidah tadabbur antara QS. ${data.sourceVerse.surahName}:${data.sourceVerse.ayahNumber} dengan QS. ${m.surahName}:${m.ayahNumber}.`
                              );
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary dark:text-brand-dark-primary hover:underline px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/5 transition-colors"
                            title="Tanyakan perbedaan kepada AI"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Bandingkan AI</span>
                          </button>

                          <Link
                            href={`/quran/${m.surahId}#ayah-${m.ayahNumber}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title="Buka ayat ini"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka</span>
                          </Link>
                        </div>
                      </div>

                      <p className="font-qpc text-base sm:text-lg text-brand-charcoal dark:text-gray-100 text-right leading-relaxed" dir="rtl">
                        {m.text}
                      </p>

                      {m.translation && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          &ldquo;{m.translation}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

