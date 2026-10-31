'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ScrollText, ChevronRight, Lock, Map as MapIcon, Library, Info } from 'lucide-react';
import { getKisahList, getKisah } from '@/lib/kisah/loader';
import { getCompletedNodes, getNodeStates } from '@/lib/kisah/progress';
import { KisahPath } from '@/components/kisah/KisahPath';
import { KISAH_TAGS } from '@/components/kisah/kisahUi';

const FEATURED_SLUG = 'ashabul-kahfi';

export default function KisahPage() {
  const [mounted, setMounted] = useState(false);
  const [stories, setStories] = useState([]);
  const [kisah, setKisah] = useState(null);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    setMounted(true);
    setCompleted(getCompletedNodes(FEATURED_SLUG));

    Promise.all([getKisahList(), getKisah(FEATURED_SLUG)])
      .then(([list, data]) => {
        setStories(list);
        setKisah(data);
      })
      .catch((err) => console.error('Failed to load kisah data', err));
  }, []);

  if (!mounted || !kisah) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-44 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-96 bg-gray-200 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const states = getNodeStates(kisah.nodes, completed);
  const completedCount = kisah.nodes.filter((n) => states[n.id] === 'completed').length;
  const total = kisah.nodes.length;
  const progressPercent = Math.round((completedCount / total) * 100);
  const currentNode = kisah.nodes.find((n) => states[n.id] === 'current');
  const comingSoon = stories.filter((s) => s.status === 'coming_soon');

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8 space-y-6">
      {/* 1. Featured Story Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-900 to-brand-primary text-white rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="absolute -right-4 -bottom-8 text-8xl font-quran select-none opacity-10 pointer-events-none" dir="rtl">
          {kisah.title_arabic}
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-amber-300 shrink-0">
              <ScrollText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold block">
                Kisah Al-Qur&apos;an
              </span>
              <h1 className="font-bold text-lg sm:text-xl text-white leading-tight">
                {kisah.title} &mdash; {kisah.subtitle}
              </h1>
              <p className="text-xs text-emerald-200 mt-0.5">{kisah.reference}</p>
            </div>
          </div>

          <p className="text-xs text-emerald-100 leading-relaxed max-w-2xl">{kisah.intro}</p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-200">
                <span>
                  {completedCount} dari {total} bagian selesai
                </span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {currentNode ? (
              <Link
                href={`/kisah/${kisah.slug}/${currentNode.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-brand-charcoal font-bold text-xs shadow-sm transition-all"
              >
                <span>{completedCount === 0 ? 'Mulai Kisah' : 'Lanjutkan'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/15 text-white font-bold text-xs">
                Kisah Selesai &bull; Alhamdulillah
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. Story Journey Path */}
      <section className="bg-white dark:bg-brand-dark-surface rounded-3xl border border-emerald-950/10 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />
            <h2 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
              Perjalanan Kisah
            </h2>
          </div>
          <span className="text-xs text-gray-400">{total} bagian</span>
        </div>

        <div className="pt-10 pb-2 overflow-hidden">
          <KisahPath slug={kisah.slug} nodes={kisah.nodes} states={states} />
        </div>
      </section>

      {/* 3. Classification Legend */}
      <section className="p-4 rounded-3xl bg-brand-bg/50 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2.5">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Klasifikasi Sumber
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(KISAH_TAGS).map(([key, tag]) => (
            <span
              key={key}
              title={tag.description}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tag.className}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Setiap bagian membedakan teks Al-Qur&apos;an, hadis shahih, penafsiran ulama, riwayat sejarah, dan riwayat yang diperselisihkan.
        </p>
      </section>

      {/* 4. Coming Soon Stories */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />
          <h3 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
            Kisah Lainnya
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {comingSoon.map((s) => (
            <div
              key={s.slug}
              aria-disabled="true"
              className="p-3.5 rounded-2xl bg-white/60 dark:bg-brand-dark-surface/60 border border-emerald-950/10 dark:border-white/10 flex flex-col justify-between gap-2 cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <span className="font-quran text-lg text-gray-400 dark:text-gray-500 font-normal truncate" dir="rtl">
                  {s.title_arabic}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-gray-500 dark:text-gray-400">{s.title}</h4>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  Segera Hadir
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
