'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, Loader2, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { RECITERS, getVerseAudioUrl } from '@/lib/audio/murottal';

const STORAGE_RECITER_KEY = 'tarseekh_preferred_reciter_v1';

export function MushafAudioPlayer({
  isOpen,
  onClose,
  pageData = null,
  surahData = null,
  targetVerseKey = null,
  onActiveVerseChange,
  onPageAdvance,
}) {
  const [selectedReciterId, setSelectedReciterId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_RECITER_KEY) || 'Alafasy_128kbps';
    }
    return 'Alafasy_128kbps';
  });

  const [isReciterMenuOpen, setIsReciterMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAyahIdx, setCurrentAyahIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState(1); // 1, 3, or 'loop'
  const currentRepeatCountRef = useRef(1);
  const audioRef = useRef(null);

  // Extract distinct verse keys present in current page or surah
  const verseKeys = React.useMemo(() => {
    if (pageData && pageData.lines) {
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
    }

    if (surahData && Array.isArray(surahData.verses)) {
      return surahData.verses.map((v) => v.key);
    }

    return [];
  }, [pageData, surahData]);

  const currentVerseKey = verseKeys[currentAyahIdx] || verseKeys[0];
  const activeReciter = RECITERS.find((r) => r.id === selectedReciterId) || RECITERS[0];

  // Persist reciter preference
  const handleSelectReciter = (reciterId) => {
    setSelectedReciterId(reciterId);
    setIsReciterMenuOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_RECITER_KEY, reciterId);
    }
    // If currently playing, restart with new reciter
    if (isPlaying) {
      playVerseAtIndex(currentAyahIdx, reciterId);
    }
  };

  // Notify parent of active verse for highlighting in layout
  useEffect(() => {
    if (isPlaying && currentVerseKey) {
      onActiveVerseChange?.(currentVerseKey);
    } else if (!isPlaying) {
      onActiveVerseChange?.(null);
    }
  }, [currentVerseKey, isPlaying, onActiveVerseChange]);

  const playVerseAtIndex = useCallback(
    (idx, reciterId = selectedReciterId) => {
      if (idx < 0) return;
      if (idx >= verseKeys.length) {
        // End reached!
        setIsPlaying(false);
        onActiveVerseChange?.(null);
        if (onPageAdvance) {
          onPageAdvance();
        }
        return;
      }

      setCurrentAyahIdx(idx);
      const targetKey = verseKeys[idx];
      lastHandledTargetKeyRef.current = targetKey;
      const url = getVerseAudioUrl(targetKey, reciterId);
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
    [verseKeys, selectedReciterId, speed, onPageAdvance, onActiveVerseChange]
  );

  const lastHandledTargetKeyRef = useRef(null);

  // Jump to target verse if requested by parent (e.g. user clicked Play on verse card)
  useEffect(() => {
    if (
      targetVerseKey &&
      verseKeys.includes(targetVerseKey) &&
      lastHandledTargetKeyRef.current !== targetVerseKey
    ) {
      lastHandledTargetKeyRef.current = targetVerseKey;
      const targetIdx = verseKeys.indexOf(targetVerseKey);
      setCurrentAyahIdx(targetIdx);
      currentRepeatCountRef.current = 1;
      playVerseAtIndex(targetIdx, selectedReciterId);
    }
  }, [targetVerseKey, verseKeys, playVerseAtIndex, selectedReciterId]);

  // Reset index when page or surah changes
  useEffect(() => {
    setCurrentAyahIdx(0);
    currentRepeatCountRef.current = 1;
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [pageData?.page, surahData?.surah?.id]);

  // Handle audio end: repeat handling and advance
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === 'loop' || currentRepeatCountRef.current < repeatMode) {
        if (repeatMode !== 'loop') {
          currentRepeatCountRef.current += 1;
        }
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        currentRepeatCountRef.current = 1;
        playVerseAtIndex(currentAyahIdx + 1);
      }
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
  }, [currentAyahIdx, repeatMode, playVerseAtIndex]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      onActiveVerseChange?.(null);
    } else {
      currentRepeatCountRef.current = 1;
      playVerseAtIndex(currentAyahIdx);
    }
  };

  const handleNext = () => {
    currentRepeatCountRef.current = 1;
    playVerseAtIndex(currentAyahIdx + 1);
  };

  const handlePrev = () => {
    currentRepeatCountRef.current = 1;
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

  const toggleRepeat = () => {
    const modes = [1, 3, 'loop'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
    currentRepeatCountRef.current = 1;
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
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-md rounded-2xl border border-amber-900/15 dark:border-amber-400/20 shadow-2xl p-3 select-none animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        {/* Left Info: Playing Verse & Reciter Dropdown Trigger */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-brand-charcoal dark:text-white truncate">
                Ayat {currentVerseKey || '1:1'}
              </span>
              <span className="text-[10px] text-gray-400 font-sans">
                ({currentAyahIdx + 1}/{verseKeys.length})
              </span>
            </div>

            <button
              onClick={() => setIsReciterMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium hover:underline text-left"
              title="Ganti Qari / Pembaca Murottal"
            >
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeReciter.name}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentAyahIdx === 0}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors"
            aria-label="Ayat sebelumnya"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
            aria-label={isPlaying ? 'Jeda murottal' : 'Putar murottal'}
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
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors"
            aria-label="Ayat berikutnya"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Repeat mode */}
          <button
            onClick={toggleRepeat}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              repeatMode !== 1
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                : 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/10'
            }`}
            title="Pengulangan Ayat (Bagus untuk Hafalan)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{repeatMode === 'loop' ? '∞' : `${repeatMode}x`}</span>
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
          aria-label="Tutup pemutar murottal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Reciter Selection Dropdown / Drawer */}
      {isReciterMenuOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-1 animate-fade-in max-h-48 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 px-1">
            Pilih Qari Murottal (1441H)
          </p>
          {RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectReciter(r.id)}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                selectedReciterId === r.id
                  ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div>
                <span className="block font-medium">{r.name}</span>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400">{r.desc}</span>
              </div>
              {selectedReciterId === r.id && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
