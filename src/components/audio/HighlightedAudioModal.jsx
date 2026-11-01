'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Play, Square, RotateCcw, X, Sparkles, Disc } from 'lucide-react';
import { speakArabic, stopArabicSpeech, isSpeechSynthesisSupported } from '@/lib/audio/speechSynthesizer';
import { getWordAudioUrl } from '@/lib/audio/murottal';

export function HighlightedAudioModal({
  isOpen,
  onClose,
  snippet,
  onPlayFullVerseMurottal,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(1); // 1, 3, or 'loop'
  const currentRepeatRef = useRef(1);
  const [audioMode, setAudioMode] = useState('tts'); // 'tts' | 'reciter'
  const audioRef = useRef(null);

  const selectedText = snippet?.text?.trim() || '';
  const verseKey = snippet?.verseKeys?.[0] || null;

  // Stop any active audio when modal closes or snippet changes
  const handleStopAll = useCallback(() => {
    stopArabicSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      handleStopAll();
    };
  }, [handleStopAll]);

  // Play routine with repeat handling
  const playSnippet = useCallback(() => {
    if (!selectedText) return;
    handleStopAll();
    setIsPlaying(true);

    const onFinish = () => {
      if (repeatCount === 'loop' || currentRepeatRef.current < repeatCount) {
        if (repeatCount !== 'loop') {
          currentRepeatRef.current += 1;
        }
        setTimeout(() => {
          playSnippet();
        }, 300);
      } else {
        setIsPlaying(false);
        currentRepeatRef.current = 1;
      }
    };

    speakArabic(selectedText, {
      rate: speed,
      onStart: () => setIsPlaying(true),
      onEnd: onFinish,
      onError: () => setIsPlaying(false),
    });
  }, [selectedText, speed, repeatCount, handleStopAll]);

  // Auto-play when opened
  useEffect(() => {
    if (isOpen && selectedText) {
      currentRepeatRef.current = 1;
      playSnippet();
    } else {
      handleStopAll();
    }
  }, [isOpen, selectedText, playSnippet, handleStopAll]);

  if (!isOpen || !selectedText) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-3xl shadow-2xl border border-amber-900/10 dark:border-white/10 p-5 space-y-4 animate-scale-up select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-charcoal dark:text-white">
                Audio Pelafalan Teks
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {verseKey ? `Terkait Ayat ${verseKey}` : 'Potongan Teks / Huruf'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Text Display in Khat Uthmani */}
        <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 text-center relative overflow-hidden">
          {isPlaying && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-400 animate-pulse" />
          )}

          <p
            className="font-qpc text-3xl sm:text-4xl text-brand-charcoal dark:text-amber-100 leading-relaxed py-2"
            dir="rtl"
          >
            {selectedText}
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {isPlaying ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                Membacakan pengucapan huruf & harakat...
              </span>
            ) : (
              <span>Siap diperdengarkan</span>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Speed Preset Buttons */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl text-xs font-semibold">
            {[
              { val: 0.5, label: '0.5x' },
              { val: 0.75, label: '0.75x' },
              { val: 1.0, label: '1x' },
            ].map((sp) => (
              <button
                key={sp.val}
                onClick={() => setSpeed(sp.val)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  speed === sp.val
                    ? 'bg-white dark:bg-brand-dark-bg text-brand-primary dark:text-brand-dark-primary shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
                title={`Kecepatan ${sp.label}`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Repeat Mode */}
          <button
            onClick={() => {
              const next = repeatCount === 1 ? 3 : repeatCount === 3 ? 'loop' : 1;
              setRepeatCount(next);
              currentRepeatRef.current = 1;
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              repeatCount !== 1
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Ulangi pelafalan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{repeatCount === 'loop' ? 'Ulang ∞' : `Ulang ${repeatCount}x`}</span>
          </button>

          {/* Play / Stop Main Button */}
          <button
            onClick={() => {
              if (isPlaying) {
                handleStopAll();
              } else {
                currentRepeatRef.current = 1;
                playSnippet();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold shadow-md hover:scale-105 active:scale-95 transition-all text-xs"
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Putar Lagi</span>
              </>
            )}
          </button>
        </div>

        {/* Action: Play Full Verse Murottal by Qari */}
        {verseKey && onPlayFullVerseMurottal && (
          <div className="pt-2 border-t border-gray-100 dark:border-white/5">
            <button
              onClick={() => {
                handleStopAll();
                onClose();
                onPlayFullVerseMurottal(verseKey);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 text-amber-900 dark:text-amber-300 font-semibold text-xs border border-amber-500/20 transition-all hover:shadow-xs"
            >
              <Disc className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Dengarkan Murottal Qari untuk Ayat {verseKey} Lengkap</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

