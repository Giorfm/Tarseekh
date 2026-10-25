'use client';

import React, { useState } from 'react';
import { CheckCircle2, Award, X, Calendar } from 'lucide-react';
import { MemorizationAdapter } from '@/lib/memorization/engine';

export function MemorizationAssessmentModal({
  isOpen,
  onClose,
  verses = [], // array of { surah, n, key }
  onFinished,
}) {
  const [grades, setGrades] = useState({}); // { [verseKey]: 1 | 3 | 5 }
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleGrade = (verseKey, grade) => {
    setGrades((prev) => ({ ...prev, [verseKey]: grade }));
  };

  const handleSaveAll = () => {
    for (const v of verses) {
      const g = grades[v.key] || 3; // Default 3 (Ragu) if not selected
      MemorizationAdapter.recordReview({
        surah: v.surah,
        ayah: v.n,
        grade: g,
      });
    }
    setIsSaved(true);
    setTimeout(() => {
      onFinished?.();
      onClose();
    }, 1200);
  };

  const allAssessed = verses.every((v) => grades[v.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-charcoal dark:text-white">
                Evaluasi Mandiri Hafalan
              </h3>
              <p className="text-[11px] text-gray-400">Jadwal murajaah adaptif dihitung otomatis (SM-2)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Assessment Body */}
        {isSaved ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-brand-charcoal dark:text-white">
              Hafalan Berhasil Dicatat!
            </h4>
            <p className="text-xs text-gray-400">
              Jadwal murajaah telah diperbarui di dashboard Anda.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {verses.map((v) => {
                const selectedGrade = grades[v.key];
                return (
                  <div
                    key={v.key}
                    className="p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-brand-charcoal dark:text-white">
                        Ayat {v.n} ({v.key})
                      </span>
                      <span className="text-[10px] text-gray-400">Pilih penilaian:</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleGrade(v.key, 1)}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                          selectedGrade === 1
                            ? 'bg-red-500 text-white border-red-500 shadow-xs'
                            : 'border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                        }`}
                      >
                        Lupa (1)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGrade(v.key, 3)}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                          selectedGrade === 3
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                        }`}
                      >
                        Ragu (3)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGrade(v.key, 5)}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                          selectedGrade === 5
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        Hafal (5)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveAll}
              className="w-full py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
            >
              Simpan Hasil & Jadwalkan Murajaah
            </button>
          </>
        )}
      </div>
    </div>
  );
}
