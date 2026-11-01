'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, SlidersHorizontal, Compass, HelpCircle, Volume2 } from 'lucide-react';

export function ReaderTopBar({
  title,
  subtitle,
  activeMode = 'read', // 'read' | 'tajwid' | 'memorize'
  onModeChange,
  onOpenSettings,
  onOpenJump,
  onOpenLegend,
  onToggleAudio,
  isAudioActive = false,
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-md border-b border-emerald-950/10 dark:border-white/10 px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs transition-colors">
      {/* Left: Back Arrow & Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink">
        <Link
          href="/quran"
          className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors shrink-0"
          aria-label="Kembali ke daftar surah"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="truncate min-w-0">
          <h1 className="font-bold text-xs sm:text-sm md:text-base text-brand-charcoal dark:text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center/Right: Mode Segmented Control (Baca, Tajwid, Hafalan) & Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div className="flex bg-black/5 dark:bg-white/10 p-0.5 rounded-xl text-[11px] sm:text-xs font-semibold shrink-0">
          <button
            onClick={() => onModeChange && onModeChange('read')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'read'
                ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Baca
          </button>
          <button
            onClick={() => onModeChange && onModeChange('tajwid')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'tajwid'
                ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Tajwid
          </button>
          <button
            onClick={() => onModeChange && onModeChange('memorize')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'memorize'
                ? 'bg-white dark:bg-brand-dark-surface shadow-xs text-brand-primary dark:text-brand-dark-primary'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Hafalan
          </button>
        </div>

        {/* Legend Button (Active in Tajwid Mode) */}
        {activeMode === 'tajwid' && onOpenLegend && (
          <button
            onClick={onOpenLegend}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
            aria-label="Buka panduan warna tajwid"
            title="Panduan Warna Tajwid"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Audio Murottal Button */}
        {onToggleAudio && (
          <button
            onClick={onToggleAudio}
            className={`p-1.5 rounded-lg transition-colors ${
              isAudioActive
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
            }`}
            aria-label="Putar murottal qari (1441H)"
            title="Dengarkan Murottal (1441H)"
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Jump Button */}
        {onOpenJump && (
          <button
            onClick={onOpenJump}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
            aria-label="Lompat ke halaman, surah, atau juz"
            title="Lompat"
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
          aria-label="Pengaturan tampilan pembaca"
          title="Pengaturan Tampilan"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
