'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, BookOpen, Check, Sparkles, AlertCircle } from 'lucide-react';
import { MemorizationAdapter } from '@/lib/memorization/engine';

export function AddToMurajaahModal({
  isOpen,
  onClose,
  surahs = [],
  initialSurahId = 1,
  onAdded,
}) {
  const [selectedSurahId, setSelectedSurahId] = useState(initialSurahId || 1);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Sync initialSurahId when modal opens
  useEffect(() => {
    if (isOpen && initialSurahId) {
      setSelectedSurahId(initialSurahId);
    }
  }, [isOpen, initialSurahId]);

  // Find active surah object
  const currentSurah = React.useMemo(() => {
    return (
      surahs.find((s) => s.id === selectedSurahId) ||
      surahs[0] || {
        id: 1,
        name_simple: 'Al-Fatihah',
        name_arabic: 'الفاتحة',
        verses_count: 7,
      }
    );
  }, [surahs, selectedSurahId]);

  // Adjust toAyah when surah changes
  useEffect(() => {
    if (currentSurah) {
      setFromAyah(1);
      setToAyah(Math.min(currentSurah.verses_count, 7));
    }
  }, [currentSurah]);

  if (!isOpen) return null;

  const handlePreset = (type) => {
    if (!currentSurah) return;
    const maxV = currentSurah.verses_count;
    if (type === 'all') {
      setFromAyah(1);
      setToAyah(maxV);
    } else if (type === '5') {
      setFromAyah(1);
      setToAyah(Math.min(5, maxV));
    } else if (type === '10') {
      setFromAyah(1);
      setToAyah(Math.min(10, maxV));
    }
  };

  const handleAddJuz30 = () => {
    let count = 0;
    const juz30 = surahs.filter((s) => s.id >= 78);
    for (const s of juz30) {
      const added = MemorizationAdapter.addRange({
        surah: s.id,
        fromAyah: 1,
        toAyah: s.verses_count,
        surahName: s.name_simple,
      });
      count += added.length;
    }
    setAddedCount(count);
    setIsSuccess(true);
    setTimeout(() => {
      onAdded?.();
      onClose();
      setIsSuccess(false);
    }, 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentSurah) return;

    const start = Math.max(1, Math.min(fromAyah, toAyah));
    const end = Math.min(currentSurah.verses_count, Math.max(fromAyah, toAyah));

    const added = MemorizationAdapter.addRange({
      surah: currentSurah.id,
      fromAyah: start,
      toAyah: end,
      surahName: currentSurah.name_simple,
    });

    setAddedCount(added.length);
    setIsSuccess(true);
    setTimeout(() => {
      onAdded?.();
      onClose();
      setIsSuccess(false);
    }, 1000);
  };

  const filteredSurahs = searchQuery.trim()
    ? surahs.filter(
        (s) =>
          s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(s.id).includes(searchQuery)
      )
    : surahs;

  const countToSchedule = Math.max(0, Math.min(toAyah, currentSurah?.verses_count || 1) - fromAyah + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-3xl p-5 sm:p-6 border border-emerald-950/10 dark:border-white/10 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-brand-charcoal dark:text-white">
                Tambah ke Antrean Murajaah
              </h3>
              <p className="text-[11px] text-gray-400">Pilih surah dan rentang ayat untuk dihafal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <Check className="w-6 h-6 animate-bounce" />
            </div>
            <h4 className="font-bold text-base text-brand-charcoal dark:text-white">
              Hafalan Berhasil Ditambahkan!
            </h4>
            <p className="text-xs text-gray-400">
              {addedCount} ayat baru kini tersedia di antrean murajaah hari ini.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
            {/* Surah Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>Pilih Surah (1 - 114):</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {currentSurah.verses_count} total ayat
                </span>
              </label>

              <select
                value={selectedSurahId}
                onChange={(e) => setSelectedSurahId(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs sm:text-sm font-medium text-brand-charcoal dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-900 dark:text-gray-100 dark:bg-gray-800">
                    {s.id}. {s.name_simple} ({s.name_arabic}) — {s.verses_count} Ayat
                  </option>
                ))}
              </select>
            </div>

            {/* Ayah Range */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 block">
                Rentang Ayat:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400">Dari Ayat:</span>
                  <input
                    type="number"
                    min={1}
                    max={toAyah}
                    value={fromAyah}
                    onChange={(e) => setFromAyah(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-brand-charcoal dark:text-white text-center focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400">Sampai Ayat:</span>
                  <input
                    type="number"
                    min={fromAyah}
                    max={currentSurah.verses_count}
                    value={toAyah}
                    onChange={(e) =>
                      setToAyah(
                        Math.min(
                          currentSurah.verses_count,
                          Math.max(fromAyah, parseInt(e.target.value, 10) || fromAyah)
                        )
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-brand-charcoal dark:text-white text-center focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                Preset Cepat Surah Ini:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                >
                  Semua Ayat (1-{currentSurah.verses_count})
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('5')}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                >
                  5 Ayat Pertama
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('10')}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                >
                  10 Ayat Pertama
                </button>
              </div>
            </div>

            {/* Batch Add Juz 30 Preset */}
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paket Hafalan Juz 30 (Juz &apos;Amma)</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Tambahkan sekaligus seluruh 37 surah pendek Juz 30 (Surah An-Naba&apos; s/d An-Nas) ke dalam antrean murajaah Anda.
              </p>
              <button
                type="button"
                onClick={handleAddJuz30}
                className="w-full mt-1 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors"
              >
                + Tambah Seluruh Juz &apos;Amma
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan {countToSchedule} Ayat ke Antrean Murajaah</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
