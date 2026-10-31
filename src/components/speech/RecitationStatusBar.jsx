'use client';

import React from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, Sparkles, Volume2 } from 'lucide-react';

/**
 * Floating status bar for real-time recitation tracking (Tarteel AI style).
 * Displays:
 * - Live mic listening state
 * - Immediate feedback on correct vs wrong pronunciation
 * - Prompt to repeat the word when incorrect
 * - Word progress counter
 */
export function RecitationStatusBar({
  isActive,
  status = { state: 'idle', message: '', expectedWord: null },
  pointer = 0,
  totalWords = 0,
  onToggleMic,
  onNextHint,
  isMemorizeMode = false,
}) {
  if (!isActive) return null;

  const isError = status.state === 'error';
  const isCorrect = status.state === 'correct';
  const isFinished = status.state === 'finished';

  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[500px] z-40 animate-fade-in pointer-events-auto">
      <div
        className={`p-3 sm:p-3.5 rounded-3xl shadow-2xl border backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-3 ${
          isError
            ? 'bg-red-950/90 border-red-500/50 text-white shadow-red-900/30'
            : isCorrect
            ? 'bg-emerald-950/90 border-emerald-500/50 text-white shadow-emerald-900/30'
            : 'bg-brand-charcoal/90 dark:bg-black/90 border-white/15 text-white'
        }`}
      >
        {/* Status Icon & Message */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
              isError
                ? 'bg-red-500 text-white animate-bounce'
                : isCorrect
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-primary text-white animate-pulse'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : isCorrect ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isError
                    ? 'text-red-300'
                    : isCorrect
                    ? 'text-emerald-300'
                    : 'text-emerald-400'
                }`}
              >
                {isError
                  ? 'Bacaan Belum Tepat'
                  : isCorrect
                  ? 'Bacaan Benar'
                  : 'Pelacak Suara Aktif'}
              </span>
              {totalWords > 0 && (
                <span className="text-[10px] text-gray-400">
                  • {Math.min(pointer, totalWords)}/{totalWords} kata
                </span>
              )}
            </div>

            <p className="text-xs font-medium truncate mt-0.5 leading-snug">
              {status.message || (
                isError ? (
                  <span>
                    Ulangi kata: <strong className="font-quran text-sm">{status.expectedWord}</strong>
                  </span>
                ) : (
                  'Lafalkan ayat, sistem akan melacak otomatis...'
                )
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isMemorizeMode && isError && onNextHint && (
            <button
              onClick={onNextHint}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
              title="Buka petunjuk kata ini"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline">Bantuan</span>
            </button>
          )}

          <button
            onClick={onToggleMic}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Hentikan pelacak suara"
            aria-label="Hentikan pelacak suara"
          >
            <MicOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
