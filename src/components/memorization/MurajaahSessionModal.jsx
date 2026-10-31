'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Sparkles, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { MemorizationAdapter } from '@/lib/memorization/engine';
import { getSurah } from '@/lib/quran/loader';
import { logActivity } from '@/lib/activity/logger';

/**
 * Interactive Murajaah Session Modal (SuperMemo-2 Spaced Repetition Player)
 * - Walks through due items one by one
 * - Provides masked recall testing
 * - Allows self-grading (Lupa=1, Ragu=3, Mutqin=5)
 * - Persists interval schedules automatically
 */
export function MurajaahSessionModal({
  isOpen,
  onClose,
  items = [],
  initialIndex = 0,
  onComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [verseData, setVerseData] = useState(null);
  const [surahData, setSurahData] = useState(null);
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [isMasked, setIsMasked] = useState(true);
  const [sessionResults, setSessionResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // Reset session when modal opens with new items
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setCurrentIndex(Math.min(initialIndex, items.length - 1));
      setSessionResults([]);
      setIsFinished(false);
      setIsMasked(true);
    }
  }, [isOpen, items, initialIndex]);

  const currentItem = items[currentIndex];

  // Fetch verse text whenever currentItem changes
  useEffect(() => {
    if (!isOpen || !currentItem) return;

    let isMounted = true;
    setLoadingVerse(true);
    setIsMasked(true);

    getSurah(currentItem.surah)
      .then((data) => {
        if (!isMounted) return;
        setSurahData(data.surah);
        const verse = data.verses?.find((v) => v.n === currentItem.ayah);
        setVerseData(verse || null);
        setLoadingVerse(false);
      })
      .catch((err) => {
        console.warn('Gagal memuat ayat untuk murajaah:', err);
        if (isMounted) setLoadingVerse(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentItem]);

  const handleGrade = useCallback(
    (grade) => {
      if (!currentItem) return;

      const surahName = surahData?.name_simple || currentItem.surahName || `Surah ${currentItem.surah}`;

      // Save SM-2 review
      const updated = MemorizationAdapter.recordReview({
        surah: currentItem.surah,
        ayah: currentItem.ayah,
        grade,
        surahName,
      });

      const nextResults = [
        ...sessionResults,
        {
          surah: currentItem.surah,
          ayah: currentItem.ayah,
          surahName,
          grade,
          interval: updated?.interval || 1,
        },
      ];
      setSessionResults(nextResults);

      if (currentIndex + 1 < items.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsMasked(true);
      } else {
        // All items completed!
        setIsFinished(true);
        try {
          logActivity({
            type: 'memorize',
            surah: currentItem.surah,
            ayah_from: items[0]?.ayah,
            ayah_to: currentItem.ayah,
            amount: items.length,
          });
        } catch {
          // ignore
        }
        onComplete?.();
      }
    },
    [currentItem, surahData, sessionResults, currentIndex, items, onComplete]
  );

  // Keyboard shortcuts (1=Lupa, 2=Ragu, 3=Mutqin, Space=Toggle Mask)
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsMasked((prev) => !prev);
      } else if (e.key === '1') {
        e.preventDefault();
        handleGrade(1);
      } else if (e.key === '2' || e.key === '3') {
        // Accept 2 as Ragu, 3 as Mutqin
        e.preventDefault();
        handleGrade(e.key === '2' ? 3 : 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, handleGrade]);

  if (!isOpen) return null;

  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? ((currentIndex) / totalItems) * 100 : 0;

  const mutqinCount = sessionResults.filter((r) => r.grade === 5).length;
  const raguCount = sessionResults.filter((r) => r.grade === 3).length;
  const lupaCount = sessionResults.filter((r) => r.grade === 1).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-brand-dark-surface rounded-3xl p-5 sm:p-6 border border-emerald-950/10 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-brand-charcoal dark:text-white">
                Sesi Murajaah Adaptif (SM-2)
              </h3>
              <p className="text-[11px] text-gray-400">
                {isFinished
                  ? 'Sesi Selesai'
                  : `Ayat ${currentIndex + 1} dari ${totalItems} antrean`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Tutup Sesi Murajaah"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {!isFinished && (
          <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden my-3 shrink-0">
            <div
              className="bg-purple-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        {isFinished ? (
          /* Finished Celebration Screen */
          <div className="py-6 sm:py-8 text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-brand-charcoal dark:text-white">
                Maa Syaa Allah, Sesi Selesai!
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Anda telah menyelesaikan {sessionResults.length} ayat murajaah. Jadwal pengulangan berikutnya telah otomatis diperbarui.
              </p>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto pt-2">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">
                  Mutqin / Lancar
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {mutqinCount}
                </span>
                <span className="text-[10px] text-emerald-600/70 block">Interval memanjang</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 block">
                  Ragu / Sedang
                </span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                  {raguCount}
                </span>
                <span className="text-[10px] text-amber-600/70 block">Ulang 1-6 hari</span>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
                <span className="text-[11px] font-medium text-red-700 dark:text-red-300 block">
                  Lupa / Ulang
                </span>
                <span className="text-xl font-black text-red-700 dark:text-red-300">
                  {lupaCount}
                </span>
                <span className="text-[10px] text-red-600/70 block">Ulang besok (1 hr)</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold text-sm shadow-md hover:opacity-95 transition-opacity"
              >
                Kembali ke Antrean Hafalan
              </button>
            </div>
          </div>
        ) : (
          /* Active Verse Card */
          <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
            {/* Surah Title Badge */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                  Target Hafalan
                </span>
                <h4 className="text-base sm:text-lg font-bold text-brand-charcoal dark:text-white">
                  QS {surahData?.name_simple || currentItem?.surahName || currentItem?.surah} : Ayat {currentItem?.ayah}
                </h4>
              </div>

              {surahData?.name_arabic && (
                <span className="font-quran text-2xl text-brand-primary dark:text-brand-dark-primary select-none" dir="rtl">
                  {surahData.name_arabic}
                </span>
              )}
            </div>

            {/* Verse Display Box */}
            <div className="p-5 rounded-3xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-900/10 dark:border-amber-400/10 min-h-[160px] flex flex-col justify-center text-center relative overflow-hidden transition-all">
              {loadingVerse ? (
                <div className="py-8 space-y-2 animate-pulse">
                  <div className="h-8 bg-amber-200/50 dark:bg-amber-900/40 rounded-xl w-3/4 mx-auto" />
                  <div className="h-4 bg-amber-200/40 dark:bg-amber-900/30 rounded-lg w-1/2 mx-auto" />
                </div>
              ) : isMasked ? (
                /* Masked State */
                <div className="py-6 space-y-3">
                  <div className="text-gray-300 dark:text-gray-600 font-quran text-2xl sm:text-3xl select-none tracking-widest">
                    •••••••• •••••••• ••••••••
                  </div>
                  <p className="text-xs text-amber-900/70 dark:text-amber-200/70 font-medium">
                    Bacakan ayat ini dari hafalan Anda di luar kepala.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsMasked(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors mx-auto"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Buka Ayat untuk Memeriksa</span>
                  </button>
                </div>
              ) : (
                /* Revealed State */
                <div className="py-2 space-y-4 animate-fade-in text-right">
                  <p
                    className="font-quran text-2xl sm:text-3xl leading-loose text-brand-charcoal dark:text-gray-100 select-text"
                    dir="rtl"
                  >
                    {verseData?.text || 'Teks ayat tidak ditemukan.'}
                  </p>
                  {verseData?.translation && (
                    <p className="text-xs sm:text-sm text-left text-gray-600 dark:text-gray-300 leading-relaxed border-t border-amber-900/10 dark:border-amber-400/10 pt-3 italic">
                      &ldquo;{verseData.translation}&rdquo;
                    </p>
                  )}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsMasked(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Tutup kembali</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment Buttons */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block text-center">
                Bagaimana kelancaran hafalan Anda pada ayat ini?
              </span>

              <div className="grid grid-cols-3 gap-2">
                {/* 1: Lupa */}
                <button
                  type="button"
                  onClick={() => handleGrade(1)}
                  className="p-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 transition-all flex flex-col items-center gap-1 group text-center"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Lupa / Salah</span>
                  <span className="text-[10px] text-red-500/80">Ulang besok (1 hr)</span>
                </button>

                {/* 3: Ragu */}
                <button
                  type="button"
                  onClick={() => handleGrade(3)}
                  className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 transition-all flex flex-col items-center gap-1 group text-center"
                >
                  <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Ragu / Terbata</span>
                  <span className="text-[10px] text-amber-600/80">Ulang 1-6 hari</span>
                </button>

                {/* 5: Mutqin */}
                <button
                  type="button"
                  onClick={() => handleGrade(5)}
                  className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 transition-all flex flex-col items-center gap-1 group text-center"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Lancar / Mutqin</span>
                  <span className="text-[10px] text-emerald-600/80">Interval bertambah</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-gray-400 pt-1">
                Tip: Tekan <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded">Spasi</kbd> untuk buka ayat, angka <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded">1</kbd>, <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded">2</kbd>, <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded">3</kbd> untuk penilaian cepat.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
