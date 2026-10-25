'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle, ArrowRight, Brain } from 'lucide-react';

/**
 * MurajaahDueCard displays items scheduled for spaced-repetition murajaah.
 *
 * @param {Object} props
 * @param {number} props.dueCount
 * @param {Array} [props.dueItems]
 */
export function MurajaahDueCard({ dueCount = 0, dueItems = [] }) {
  const hasDue = dueCount > 0;

  return (
    <div className="bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-brand-charcoal dark:text-white">
              Jadwal Murajaah
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Algoritma SM-2 Spaced Repetition
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            hasDue
              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
          }`}
        >
          {hasDue ? (
            <span>{dueCount} Ayat Jatuh Tempo</span>
          ) : (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Bersih
            </span>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-brand-charcoal dark:text-white">
            {hasDue
              ? `${dueCount} ayat perlu diulang hari ini agar hafalan melekat kuat.`
              : 'Semua hafalan telah dimurajaah! Tambah hafalan baru atau istirahat.'}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {hasDue
              ? 'Gunakan mode hafalan dengan penutup kata otomatis.'
              : 'Istiqamah menjaga hafalan lebih utama daripada menambah tanpa mengulang.'}
          </p>
        </div>

        <Link
          href="/hafalan"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
        >
          <span>{hasDue ? 'Murajaah' : 'Lihat Hafalan'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
