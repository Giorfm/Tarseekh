'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Compass, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getLastPosition } from '@/lib/quran/position';
import { getSurahList } from '@/lib/quran/loader';
import { getLocalTodayString, getPast7DaysIndicators } from '@/lib/streak';
import { getLocalQuests, saveLocalQuests, claimQuestReward } from '@/lib/quests';
import { MemorizationAdapter } from '@/lib/memorization/engine';
import { StreakHeader } from '@/components/dashboard/StreakHeader';
import { ContinueReadingCard } from '@/components/dashboard/ContinueReadingCard';
import { DailyQuestsCard } from '@/components/dashboard/DailyQuestsCard';
import { MurajaahDueCard } from '@/components/dashboard/MurajaahDueCard';

const QUICK_SURAHS = [
  { id: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', desc: 'Pembukaan (7 Ayat)' },
  { id: 18, name: 'Al-Kahf', arabic: 'الكهف', desc: 'Gua (110 Ayat)' },
  { id: 36, name: 'Yasin', arabic: 'يس', desc: 'Jantung Al-Qur\'an (83 Ayat)' },
  { id: 67, name: 'Al-Mulk', arabic: 'الملك', desc: 'Kerajaan (30 Ayat)' },
];

export default function DashboardPage() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [lastPos, setLastPos] = useState({ verseKey: '1:1', surah: 1, ayah: 1, page: 1 });
  const [surahInfo, setSurahInfo] = useState({ name_simple: 'Al-Fatihah', name_arabic: 'الفاتحة' });
  const [streakData, setStreakData] = useState({ current_streak: 1, longest_streak: 1, last_active_date: null });
  const [quests, setQuests] = useState([]);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timezone = settings.timezone || 'Asia/Jakarta';
    const today = getLocalTodayString(new Date(), timezone);

    // 1. Last position
    const pos = getLastPosition();
    setLastPos(pos);

    getSurahList()
      .then((surahs) => {
        const found = surahs.find((s) => s.id === pos.surah);
        if (found) {
          setSurahInfo({
            name_simple: found.name_simple,
            name_arabic: found.name_arabic,
          });
        }
      })
      .catch(console.error);

    // 2. Streak data from localStorage or API
    try {
      const storedStreak = localStorage.getItem('tarseekh_streak') || localStorage.getItem('tadabbur_streak');
      if (storedStreak) {
        setStreakData(JSON.parse(storedStreak));
      } else {
        const initStreak = { current_streak: 1, longest_streak: 1, last_active_date: today };
        setStreakData(initStreak);
        localStorage.setItem('tarseekh_streak', JSON.stringify(initStreak));
      }
    } catch {
      // ignore
    }

    // 3. Quests for today
    const currentQuests = getLocalQuests(today, {
      daily_goal_ayah: settings.daily_goal_ayah,
      reading_view: settings.reading_view,
    });
    setQuests(currentQuests);

    // 4. Memorization due items
    try {
      const dueList = MemorizationAdapter.getDueToday();
      setDueCount(dueList.length);
    } catch {
      setDueCount(0);
    }
  }, [settings.daily_goal_ayah, settings.reading_view, settings.timezone]);

  const handleClaimQuest = (questId) => {
    const today = getLocalTodayString(new Date(), settings.timezone || 'Asia/Jakarta');
    const result = claimQuestReward(quests, questId);
    if (result.success) {
      setQuests(result.quests);
      saveLocalQuests(today, result.quests);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-44 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-36 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-60 bg-gray-200 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const days7 = getPast7DaysIndicators(streakData, settings.timezone || 'Asia/Jakarta');

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-6">
      {/* 1. Header Streak Tracker (PRD FR-6) */}
      <StreakHeader
        currentStreak={streakData.current_streak}
        longestStreak={streakData.longest_streak}
        days={days7}
      />

      {/* 2. Kartu Lanjutkan Membaca (PRD FR-1, FR-1b) */}
      <ContinueReadingCard
        position={lastPos}
        surahName={surahInfo.name_simple}
        surahArabic={surahInfo.name_arabic}
        readingView={settings.reading_view}
      />

      {/* 3. Quest Harian (PRD FR-7) */}
      <DailyQuestsCard quests={quests} onClaim={handleClaimQuest} />

      {/* 4. Jadwal Murajaah (PRD FR-5) */}
      <MurajaahDueCard dueCount={dueCount} />

      {/* 5. Akses Cepat Surah Pilihan */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />
            <h3 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
              Surah Pilihan
            </h3>
          </div>
          <Link
            href="/quran"
            className="text-xs font-semibold text-brand-primary dark:text-brand-dark-primary hover:underline"
          >
            Semua Surah (114) &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_SURAHS.map((s) => (
            <Link
              key={s.id}
              href={`/quran/${s.id}`}
              className="p-3.5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs hover:border-brand-primary dark:hover:border-brand-dark-primary hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-brand-primary transition-colors">
                  #{s.id}
                </span>
                <span className="font-quran text-lg text-brand-primary dark:text-brand-dark-primary font-normal" dir="rtl">
                  {s.arabic}
                </span>
              </div>
              <div className="mt-2">
                <h4 className="font-bold text-xs text-brand-charcoal dark:text-white group-hover:text-brand-primary transition-colors">
                  {s.name}
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {s.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
