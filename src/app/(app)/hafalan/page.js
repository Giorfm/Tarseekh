'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  RotateCcw, 
  Trash2, 
  Play, 
  Award,
  Filter
} from 'lucide-react';
import { MemorizationAdapter } from '@/lib/memorization/engine';
import { getSurahList } from '@/lib/quran/loader';
import { MurajaahSessionModal } from '@/components/memorization/MurajaahSessionModal';
import { AddToMurajaahModal } from '@/components/memorization/AddToMurajaahModal';

const POPULAR_SURAH_IDS = [1, 18, 32, 36, 55, 56, 67, 71, 76];

export default function HafalanPage() {
  const [mounted, setMounted] = useState(false);
  const [dueItems, setDueItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSurahFilter, setActiveSurahFilter] = useState('all'); // 'all' | 'memorized' | 'juz30' | 'popular'
  const [queueViewTab, setQueueViewTab] = useState('due'); // 'due' | 'all'

  // Modals state
  const [isMurajaahModalOpen, setIsMurajaahModalOpen] = useState(false);
  const [murajaahItems, setMurajaahItems] = useState([]);
  const [murajaahInitialIndex, setMurajaahInitialIndex] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSurahForAdd, setSelectedSurahForAdd] = useState(1);

  // Load memorization items and all 114 surahs
  const refreshMemorizationData = useCallback(() => {
    try {
      const due = MemorizationAdapter.getDueToday();
      setDueItems(due);

      const all = MemorizationAdapter.getAll();
      setAllItems(all);
    } catch (err) {
      console.warn('Gagal memuat data hafalan:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshMemorizationData();

    getSurahList()
      .then((data) => setSurahs(data || []))
      .catch(console.error);
  }, [refreshMemorizationData]);

  // Map of surahId -> count of memorized verses
  const surahMemorizedMap = useMemo(() => {
    const map = new Map();
    for (const item of allItems) {
      const s = item.surah;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return map;
  }, [allItems]);

  // Filter surahs based on tab and search query
  const filteredSurahs = useMemo(() => {
    let list = surahs;

    if (activeSurahFilter === 'memorized') {
      list = list.filter((s) => (surahMemorizedMap.get(s.id) || 0) > 0);
    } else if (activeSurahFilter === 'juz30') {
      list = list.filter((s) => s.id >= 78);
    } else if (activeSurahFilter === 'popular') {
      list = list.filter((s) => POPULAR_SURAH_IDS.includes(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name_simple.toLowerCase().includes(q) ||
          s.translated_name.toLowerCase().includes(q) ||
          String(s.id).includes(q)
      );
    }

    return list;
  }, [surahs, activeSurahFilter, searchQuery, surahMemorizedMap]);

  // Start Muraja'ah session
  const startMurajaah = (itemsToReview, startIndex = 0) => {
    if (!itemsToReview || itemsToReview.length === 0) return;
    setMurajaahItems(itemsToReview);
    setMurajaahInitialIndex(startIndex);
    setIsMurajaahModalOpen(true);
  };

  // Open add modal pre-filled with surah
  const openAddForSurah = (surahId) => {
    setSelectedSurahForAdd(surahId);
    setIsAddModalOpen(true);
  };

  // Remove single item from queue
  const handleRemoveItem = (id, e) => {
    e.stopPropagation();
    if (confirm('Hapus ayat ini dari antrean hafalan?')) {
      MemorizationAdapter.removeById(id);
      refreshMemorizationData();
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-48 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  // Calculate statistics
  const stats = MemorizationAdapter.getStats();

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 md:py-8 space-y-6 sm:space-y-8">
      {/* 1. Dashboard Header Banner */}
      <section className="bg-gradient-to-br from-purple-900 via-brand-dark-surface to-brand-primary/40 rounded-3xl p-5 sm:p-7 text-white border border-purple-800/40 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 text-purple-300 backdrop-blur-xs">
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Pusat Hafalan & Antrean Murajaah
              </h1>
              <p className="text-xs md:text-sm text-purple-200 mt-0.5">
                Kelola 114 surah dan kuatkan ingatan Al-Qur&apos;an dengan metode Spaced Repetition (SM-2)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedSurahForAdd(1);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm backdrop-blur-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Hafalan</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Total Ayat Dihafal</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black">{stats.total}</span>
              <span className="text-[10px] text-purple-300">ayat</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Jatuh Tempo Hari Ini</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-amber-300">{stats.due}</span>
              <span className="text-[10px] text-purple-300">ayat</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Hafalan Mutqin</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{stats.mutqin}</span>
              <span className="text-[10px] text-purple-300">ayat</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Interval Maksimum</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-blue-300">{stats.maxInterval}</span>
              <span className="text-[10px] text-purple-300">hari</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Murajaah Queue Section */}
      <section className="bg-white dark:bg-brand-dark-surface rounded-3xl p-5 sm:p-6 border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-4">
        {/* Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="font-bold text-base sm:text-lg text-brand-charcoal dark:text-white">
              Antrean Murajaah Adaptif
            </h2>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setQueueViewTab('due')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                queueViewTab === 'due'
                  ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Jatuh Tempo ({dueItems.length})
            </button>
            <button
              onClick={() => setQueueViewTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                queueViewTab === 'all'
                  ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Semua Terdaftar ({allItems.length})
            </button>
          </div>
        </div>

        {/* Content of Queue */}
        {queueViewTab === 'due' ? (
          dueItems.length === 0 ? (
            /* Empty State for Due Today */
            <div className="p-6 sm:p-8 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/20 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                  Alhamdulillah, semua hafalan sudah dimurajaah!
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 max-w-md mx-auto">
                  Tidak ada ayat yang jatuh tempo hari ini. Anda dapat menambah ayat baru atau melakukan murajaah bebas dari daftar surah di bawah.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  + Tambah Hafalan Baru
                </button>
                {allItems.length > 0 && (
                  <button
                    onClick={() => startMurajaah(allItems, 0)}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-50 text-gray-800 dark:text-gray-200 font-bold text-xs border border-black/10 dark:border-white/10 transition-colors"
                  >
                    Murajaah Bebas ({allItems.length} Ayat)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Items Due Today List & Action Bar */
            <div className="space-y-3">
              {/* Top Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40">
                <div className="space-y-0.5">
                  <span className="font-bold text-sm text-brand-charcoal dark:text-white flex items-center gap-1.5">
                    <span>{dueItems.length} Ayat Siap Dimurajaah Hari Ini</span>
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sistem SM-2 telah menyiapkan antrean hafalan Anda. Jalankan sesi interaktif untuk menjaga kelancaran.
                  </p>
                </div>

                <button
                  onClick={() => startMurajaah(dueItems, 0)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Sesi Murajaah</span>
                </button>
              </div>

              {/* Grid of Due Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {dueItems.map((item, idx) => (
                  <div
                    key={item.id || `${item.surah}:${item.ayah}-${idx}`}
                    className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-brand-charcoal dark:text-white truncate">
                          {item.surahName || `Surah ${item.surah}`} : {item.ayah}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>Interval: {item.interval || 0} hr</span>
                        <span>&bull;</span>
                        <span>Pengulangan: {item.reps || 0}x</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startMurajaah([item], 0)}
                        className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors"
                        title="Murajaah ayat ini sekarang"
                        aria-label="Murajaah ayat ini"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <Link
                        href={`/quran/${item.surah}?mode=memorize&verse=${item.surah}:${item.ayah}`}
                        className="p-2 rounded-xl bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 transition-colors"
                        title="Buka di pembaca Quran"
                        aria-label="Buka di pembaca Quran"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={(e) => handleRemoveItem(item.id, e)}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Hapus dari antrean"
                        aria-label="Hapus dari antrean"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* All Items Tab */
          <div className="space-y-3">
            {allItems.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 text-gray-500 text-xs">
                Belum ada ayat yang didaftarkan ke antrean hafalan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {allItems.map((item, idx) => {
                  const isMutqin = (item.reps >= 3 || item.interval >= 7) && item.lastGrade === 5;
                  const isDue = !item.dueDate || item.dueDate <= new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={item.id || `${item.surah}:${item.ayah}-${idx}`}
                      className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-purple-300 transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-brand-charcoal dark:text-white truncate">
                            {item.surahName || `Surah ${item.surah}`} : {item.ayah}
                          </span>
                          {isDue ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              Jatuh Tempo
                            </span>
                          ) : isMutqin ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Mutqin
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>Interval: {item.interval || 0} hr</span>
                          <span>&bull;</span>
                          <span>Ulang: {item.reps || 0}x</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startMurajaah([item], 0)}
                          className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors"
                          title="Murajaah sekarang"
                          aria-label="Murajaah sekarang"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveItem(item.id, e)}
                          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Hapus"
                          aria-label="Hapus dari antrean"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. All 114 Surahs Directory for Memorization */}
      <section className="space-y-4">
        {/* Title & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary dark:text-brand-dark-primary" />
            <h2 className="font-bold text-base sm:text-lg text-brand-charcoal dark:text-white">
              Daftar Semua Surah (114 Surah)
            </h2>
          </div>

          <span className="text-xs text-gray-400">
            Menampilkan {filteredSurahs.length} surah
          </span>
        </div>

        {/* Search Bar & Filter Chips */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari surah (misal: Al-Fatihah, Yasin, 67)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 text-xs sm:text-sm text-brand-charcoal dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveSurahFilter('all')}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                activeSurahFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-brand-dark-surface border border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-300'
              }`}
            >
              Semua (114)
            </button>
            <button
              onClick={() => setActiveSurahFilter('memorized')}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                activeSurahFilter === 'memorized'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-brand-dark-surface border border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-300'
              }`}
            >
              Sedang Dihafal ({surahMemorizedMap.size})
            </button>
            <button
              onClick={() => setActiveSurahFilter('juz30')}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                activeSurahFilter === 'juz30'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-brand-dark-surface border border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-300'
              }`}
            >
              Juz 30 (37 Surah)
            </button>
            <button
              onClick={() => setActiveSurahFilter('popular')}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                activeSurahFilter === 'popular'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-brand-dark-surface border border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-300'
              }`}
            >
              Surah Populer
            </button>
          </div>
        </div>

        {/* 114 Surah Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredSurahs.map((surah) => {
            const memorizedCount = surahMemorizedMap.get(surah.id) || 0;
            const hasMemorized = memorizedCount > 0;
            const progressPercent = Math.min(100, Math.round((memorizedCount / surah.verses_count) * 100));

            return (
              <div
                key={surah.id}
                className="p-4 rounded-2xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                {/* Surah Header & Names */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">
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

                  <span className="font-quran text-xl text-brand-charcoal dark:text-gray-100 select-none shrink-0" dir="rtl">
                    {surah.name_arabic}
                  </span>
                </div>

                {/* Memorization Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">
                      {hasMemorized ? `${memorizedCount} dari ${surah.verses_count} ayat dihafal` : 'Belum dihafal'}
                    </span>
                    {hasMemorized && (
                      <span className="font-bold text-purple-600 dark:text-purple-300">
                        {progressPercent}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progressPercent === 100
                          ? 'bg-emerald-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
                  <Link
                    href={`/quran/${surah.id}?mode=memorize`}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Hafalkan</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openAddForSurah(surah.id)}
                    className="py-1.5 px-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium text-xs transition-colors flex items-center gap-1"
                    title="Tambah ayat ke antrean murajaah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Antrean</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Murajaah Session Modal */}
      <MurajaahSessionModal
        isOpen={isMurajaahModalOpen}
        onClose={() => {
          setIsMurajaahModalOpen(false);
          refreshMemorizationData();
        }}
        items={murajaahItems}
        initialIndex={murajaahInitialIndex}
        onComplete={refreshMemorizationData}
      />

      {/* Add To Murajaah Modal */}
      <AddToMurajaahModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        surahs={surahs}
        initialSurahId={selectedSurahForAdd}
        onAdded={refreshMemorizationData}
      />
    </div>
  );
}
