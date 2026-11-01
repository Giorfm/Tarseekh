'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, Loader2, Gauge } from 'lucide-react';

/**
 * Helper to format surah and ayah into 3-digit strings for audio CDN.
 * e.g. 1:1 -> 001001
 */
function getAudioUrl(verseKey) {
  if (!verseKey) return null;
  const [s, a] = verseKey.split(':');
  const sPad = String(s).padStart(3, '0');
  const aPad = String(a).padStart(3, '0');
  return `https://everyayah.com/data/Alafasy_128kbps/${sPad}${aPad}.mp3`;
}

export function MushafAudioPlayer({
  isOpen,
  onClose,
  pageData,
  onActiveVerseChange,
  onPageAdvance,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAyahIdx, setCurrentAyahIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef(null);

  // Extract distinct verse keys present on this page
  const verseKeys = React.useMemo(() => {
    if (!pageData || !pageData.lines) return [];
    const keys = [];
    for (const l of pageData.lines) {
      if (l.type === 'text' && Array.isArray(l.words)) {
        for (const w of l.words) {
          if (w.verse_key && !keys.includes(w.verse_key)) {
            keys.push(w.verse_key);
          }
        }
      }
    }
    return keys;
  }, [pageData]);

  const currentVerseKey = verseKeys[currentAyahIdx] || verseKeys[0];

  // Notify parent of active verse for highlighting in layout
  useEffect(() => {
    if (isPlaying && currentVerseKey) {
      onActiveVerseChange?.(currentVerseKey);
    } else if (!isPlaying) {
      onActiveVerseChange?.(null);
    }
  }, [currentVerseKey, isPlaying, onActiveVerseChange]);

  // Reset index when page changes
  useEffect(() => {
    setCurrentAyahIdx(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [pageData?.page]);

  const playVerseAtIndex = useCallback(
    (idx) => {
      if (idx < 0) return;
      if (idx >= verseKeys.length) {
        // End of page reached!
        setIsPlaying(false);
        onActiveVerseChange?.(null);
        if (onPageAdvance) {
          onPageAdvance();
        }
        return;
      }

      setCurrentAyahIdx(idx);
      const targetKey = verseKeys[idx];
      const url = getAudioUrl(targetKey);
      if (!url) return;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = url;
      audio.playbackRate = speed;
      setLoading(true);

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setLoading(false);
        })
        .catch((err) => {
          console.warn('Audio playback error:', err);
          setIsPlaying(false);
          setLoading(false);
        });
    },
    [verseKeys, speed, onPageAdvance, onActiveVerseChange]
  );

  // Handle audio end: advance to next verse
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playVerseAtIndex(currentAyahIdx + 1);
    };

    const handleError = () => {
      setLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentAyahIdx, playVerseAtIndex]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      onActiveVerseChange?.(null);
    } else {
      playVerseAtIndex(currentAyahIdx);
    }
  };

  const handleNext = () => {
    playVerseAtIndex(currentAyahIdx + 1);
  };

  const handlePrev = () => {
    playVerseAtIndex(Math.max(0, currentAyahIdx - 1));
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-md rounded-2xl border border-amber-900/15 dark:border-amber-400/20 shadow-xl p-3 flex items-center justify-between gap-3 animate-slide-up select-none">
      {/* Left Info: Playing Verse & Reciter */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-xs text-brand-charcoal dark:text-white truncate block">
            Ayat {currentVerseKey || '1:1'}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block">
            Mishari Rashid Alafasy • 1441H
          </span>
        </div>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentAyahIdx === 0}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30"
          aria-label="Ayat sebelumnya"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
          aria-label={isPlaying ? 'Jeda bacaan' : 'Putar bacaan'}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={currentAyahIdx >= verseKeys.length - 1}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30"
          aria-label="Ayat berikutnya"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed toggle */}
        <button
          onClick={toggleSpeed}
          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/10"
          title="Kecepatan putar"
        >
          {speed}x
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          onActiveVerseChange?.(null);
          onClose();
        }}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 shrink-0"
        aria-label="Tutup pemutar audio"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

