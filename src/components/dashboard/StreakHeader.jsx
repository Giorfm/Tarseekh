'use client';

import React from 'react';
import { Flame, Trophy, Calendar } from 'lucide-react';

/**
 * StreakHeader component displaying current streak, record, and 7-day indicators.
 *
 * @param {Object} props
 * @param {number} props.currentStreak
 * @param {number} props.longestStreak
 * @param {Array<{ date: string, dayLabel: string, isToday: boolean, isActive: boolean }>} props.days
 */
export function StreakHeader({ currentStreak = 0, longestStreak = 0, days = [] }) {
  return (
    <div className="bg-gradient-to-br from-brand-primary/10 via-brand-bg to-brand-accent/10 dark:from-brand-dark-surface dark:via-brand-dark-surface/90 dark:to-emerald-950/40 rounded-3xl p-5 border border-brand-primary/20 dark:border-white/10 shadow-sm space-y-4">
      {/* Top info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
              <Flame className="w-7 h-7 fill-amber-500 animate-pulse text-amber-500" />
            </div>
            {currentStreak > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-brand-charcoal dark:text-white tracking-tight">
                {currentStreak}
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hari Istiqamah
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentStreak === 0
                ? 'Mulai tilawah hari ini untuk menyalakan streak!'
                : `${currentStreak} hari berturut-turut membaca Al-Qur'an`}
            </p>
          </div>
        </div>

        {/* Longest streak pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-300">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Rekor: {longestStreak}h</span>
        </div>
      </div>

      {/* 7-Day Streak Tracker */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {days.map((day) => (
            <div
              key={day.date}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-150 ${
                day.isToday
                  ? 'bg-white dark:bg-white/10 ring-2 ring-brand-primary dark:ring-brand-dark-primary shadow-xs'
                  : 'bg-white/40 dark:bg-white/5'
              }`}
            >
              <span
                className={`text-[10px] font-semibold mb-1 ${
                  day.isToday
                    ? 'text-brand-primary dark:text-brand-dark-primary font-bold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {day.dayLabel}
              </span>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  day.isActive
                    ? 'bg-amber-500 text-white shadow-xs'
                    : day.isToday
                    ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600'
                }`}
              >
                {day.isActive ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
