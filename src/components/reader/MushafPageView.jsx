'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { ReaderTopBar } from './ReaderTopBar';
import { WordSpan } from './WordSpan';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';
import { JumpSheet } from './JumpSheet';
import { TajweedLegendSheet } from './TajweedLegendSheet';
import { SelectionPopover } from '@/components/chat/SelectionPopover';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SpeechConsentModal } from '@/components/speech/SpeechConsentModal';
import { MemorizationSetupModal } from '@/components/memorization/MemorizationSetupModal';
import { MemorizationAssessmentModal } from '@/components/memorization/MemorizationAssessmentModal';
import { MushafAudioPlayer } from './MushafAudioPlayer';
import { MutashabihatModal } from '@/components/quran/MutashabihatModal';
import { FloatingMicButton } from './FloatingMicButton';
import { useSettings } from '@/context/SettingsContext';
import { prefetchAdjacentPages } from '@/lib/pages/loader';
import { saveLastPosition } from '@/lib/quran/position';
import { getPageTajweedMap } from '@/lib/tajwid/page-tajweed';
import { tokenizeArabic } from '@/lib/arabic/normalize';
import { align, matchRecitationStep, verifyRecitationWord } from '@/lib/speech/matcher';
import { SpeechTracker, hasSpeechConsent, isSpeechSupported } from '@/lib/speech/tracker';
import { RecitationStatusBar } from '@/components/speech/RecitationStatusBar';
import { generateWordMasks } from '@/lib/memorization/engine';
import { logActivity } from '@/lib/activity/logger';

export function MushafPageView({ pageData, facingPageData = null }) {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [activeMode, setActiveMode] = useState('read');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isFlowingFallback, setIsFlowingFallback] = useState(false);
  const [tajweedMap, setTajweedMap] = useState(new Map());

  // Chat Panel State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatVerseKeys, setChatVerseKeys] = useState([]);
  const [chatSelectedText, setChatSelectedText] = useState('');
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');

  // Speech Tracker State
  const [isMicActive, setIsMicActive] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [speechPointer, setSpeechPointer] = useState(0);
  const [matchedWordKeys, setMatchedWordKeys] = useState(new Set());
  const [missedWordKeys, setMissedWordKeys] = useState(new Set());
  const trackerRef = useRef(null);

  // Memorization Mode State
  const [isMemSetupOpen, setIsMemSetupOpen] = useState(false);
  const [isMemAssessmentOpen, setIsMemAssessmentOpen] = useState(false);
  const [memConfig, setMemConfig] = useState({ level: 'all' });
  const [maskedWordsMap, setMaskedWordsMap] = useState(new Map());
  const [revealedWords, setRevealedWords] = useState(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);

  // Audio Recitation Player State (QUL Murattal)
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [activeAudioVerseKey, setActiveAudioVerseKey] = useState(null);

  // Mutashabihat Modal State (QUL Matching Verses)
  const [mutashabihatVerseKey, setMutashabihatVerseKey] = useState(null);

  const pageNum = pageData.page;
  const juzNum = pageData.juz;

  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Zoom State & Scaling (Proportional 15-line Mushaf Scaling)
  const [zoomLevel, setZoomLevel] = useState(() => {
    return settings.font_scale ? Math.round((settings.font_scale / 1.75) * 100) / 100 : 1;
  });
  const [isPinching, setIsPinching] = useState(false);
  const initialPinchDistRef = useRef(null);
  const initialZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  // Synchronize zoom when user changes settings.font_scale in settings sheet
  useEffect(() => {
    if (settings.font_scale) {
      const scale = Math.round((settings.font_scale / 1.75) * 100) / 100;
      setZoomLevel(scale);
    }
  }, [settings.font_scale]);

  const handleZoomIn = () => {
    const next = Math.min(2.0, Math.round((zoomLevel + 0.15) * 100) / 100);
    setZoomLevel(next);
    updateSettings({ font_scale: Math.round(next * 1.75 * 1000) / 1000 });
  };

  const handleZoomOut = () => {
    const next = Math.max(0.7, Math.round((zoomLevel - 0.15) * 100) / 100);
    setZoomLevel(next);
    updateSettings({ font_scale: Math.round(next * 1.75 * 1000) / 1000 });
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    updateSettings({ font_scale: 1.75 });
  };

  // Dynamic KFGQPC V4 Font Loader (supports both Plain Uthmanic and Tajweed-Colored fonts)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const pagesToLoad = [pageNum];
    if (facingPageData?.page) pagesToLoad.push(facingPageData.page);

    pagesToLoad.forEach((p) => {
      const pageId = `qpc-v4-p${p}`;
      if (!document.getElementById(`font-${pageId}`)) {
        const style = document.createElement('style');
        style.id = `font-${pageId}`;
        style.textContent = `
          @font-face {
            font-family: 'qpc-v4-p${p}';
            src: url('https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v4/woff2/p${p}.woff2') format('woff2');
            font-display: swap;
          }
          @font-face {
            font-family: 'v4-tajweed-p${p}';
            src: url('https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v4-tajweed/woff2/p${p}.woff2') format('woff2');
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [pageNum, facingPageData]);

  const isTajwidActive = activeMode === 'tajwid' || settings.show_tajwid;

  const handleAskAI = (keys, text, prompt = '') => {
    setChatVerseKeys(keys);
    setChatSelectedText(text);
    setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  const handleQuickTafsir = (keys, text) => {
    setChatVerseKeys(keys);
    setChatSelectedText(text);
    setChatInitialPrompt('Jelaskan tafsir ringkas ayat ini.');
    setIsChatOpen(true);
  };

  const handleBookmark = (keys) => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('tarseekh_bookmarks_v1') ||
        localStorage.getItem('tadabbur_bookmarks_v1') ||
        '[]'
      );
      const newBookmarks = [...new Set([...stored, ...keys])];
      localStorage.setItem('tarseekh_bookmarks_v1', JSON.stringify(newBookmarks));
      alert(`Ayat ${keys.join(', ')} berhasil disimpan ke bookmark.`);
    } catch (e) {
      console.warn(e);
    }
  };

  // Extract content words of current page
  const pageWords = React.useMemo(() => {
    const list = [];
    for (const l of pageData.lines) {
      if (l.type === 'text' && Array.isArray(l.words)) {
        for (const w of l.words) {
          if (w.type !== 'end') {
            list.push(w);
          }
        }
      }
    }
    return list;
  }, [pageData]);

  const pageWordsRef = useRef(pageWords);
  pageWordsRef.current = pageWords;

  const speechPointerRef = useRef(0);
  const phraseConsumedTokensRef = useRef(0);
  const [speechStatus, setSpeechStatus] = useState({
    state: 'idle',
    message: '',
    expectedWord: null,
  });

  // Reset speech tracking on page change or mode change
  useEffect(() => {
    speechPointerRef.current = 0;
    setSpeechPointer(0);
    phraseConsumedTokensRef.current = 0;
    setMatchedWordKeys(new Set());
    setMissedWordKeys(new Set());
    if (isMicActive) {
      const firstWord = pageWords[0];
      setSpeechStatus({
        state: 'listening',
        message: 'Mendengarkan bacaan...',
        expectedWord: firstWord?.text || null,
      });
    }
  }, [pageNum, activeMode, isMicActive, pageWords]);

  // Recalculate memorization masks for page
  useEffect(() => {
    if (activeMode === 'memorize') {
      const map = new Map();
      const masks = generateWordMasks(pageWords, memConfig.level, `page-${pageNum}`);
      for (const [idx, cfg] of masks.entries()) {
        const w = pageWords.find((item) => item.idx === idx);
        if (w) {
          map.set(`${w.verse_key}:${w.idx}`, cfg);
        }
      }
      setMaskedWordsMap(map);
      setRevealedWords(new Set());
      setHintsUsed(0);
    } else {
      setMaskedWordsMap(new Map());
    }
  }, [activeMode, memConfig, pageWords, pageNum]);

  const startSpeechTracking = () => {
    if (!isSpeechSupported()) {
      alert('Peramban ini tidak mendukung pengenalan suara. Gunakan Google Chrome.');
      return;
    }

    if (!trackerRef.current) {
      trackerRef.current = new SpeechTracker({
        onResult: (transcript, isFinal) => {
          const spokenTokens = tokenizeArabic(transcript);
          if (spokenTokens.length === 0) return;

          // If transcript shrank, reset phrase token counter
          if (spokenTokens.length < phraseConsumedTokensRef.current) {
            phraseConsumedTokensRef.current = 0;
          }

          const newTokens = spokenTokens.slice(phraseConsumedTokensRef.current);
          if (newTokens.length === 0) {
            if (isFinal) phraseConsumedTokensRef.current = 0;
            return;
          }

          const targetList = pageWordsRef.current;
          let curPtr = speechPointerRef.current;

          if (curPtr >= targetList.length) {
            setSpeechStatus({
              state: 'finished',
              message: 'Maa syaa Allah! Halaman ini telah selesai dilafalkan.',
              expectedWord: null,
            });
            if (isFinal) phraseConsumedTokensRef.current = 0;
            return;
          }

          // Evaluate recitation step (Tarteel-AI model: advance when correct, stop when wrong)
          const stepResult = matchRecitationStep({
            spokenTokens: newTokens,
            words: targetList,
            pointer: curPtr,
          });

          // 1. Correct recitation
          if (stepResult.matchedIndices.length > 0) {
            setMatchedWordKeys((prev) => {
              const next = new Set(prev);
              for (const idx of stepResult.matchedIndices) {
                const targetWord = targetList[idx];
                if (targetWord) {
                  const key = `${targetWord.verse_key}:${targetWord.idx}`;
                  next.add(key);
                  setRevealedWords((r) => new Set(r).add(key));
                }
              }
              return next;
            });

            // Clear errors on correctly matched words
            setMissedWordKeys((prev) => {
              const next = new Set(prev);
              for (const idx of stepResult.matchedIndices) {
                const targetWord = targetList[idx];
                if (targetWord) {
                  next.delete(`${targetWord.verse_key}:${targetWord.idx}`);
                }
              }
              return next;
            });

            phraseConsumedTokensRef.current += stepResult.matchedIndices.length;
            speechPointerRef.current = stepResult.pointer;
            setSpeechPointer(stepResult.pointer);

            const nextWord = targetList[stepResult.pointer];
            if (nextWord) {
              setSpeechStatus({
                state: 'correct',
                message: 'Benar! Lanjutkan bacaan...',
                expectedWord: nextWord.text,
              });

              // Auto-scroll / focus to active word
              const el = document.querySelector(
                `[data-verse-key="${nextWord.verse_key}"][data-word-index="${nextWord.idx}"]`
              );
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              setSpeechStatus({
                state: 'finished',
                message: 'Maa syaa Allah! Halaman selesai dilafalkan.',
                expectedWord: null,
              });
            }

            // Auto page turn when pointer passes last word of the page
            if (stepResult.pointer >= targetList.length && pageNum < 604) {
              setTimeout(() => {
                goToPage(pageNum + 1);
              }, 600);
            }
          }

          // 2. Incorrect recitation: stop and highlight error
          if (stepResult.hasError && stepResult.errorIndex !== null) {
            const errWord = targetList[stepResult.errorIndex];
            if (errWord) {
              const errKey = `${errWord.verse_key}:${errWord.idx}`;
              setMissedWordKeys((prev) => new Set(prev).add(errKey));

              setSpeechStatus({
                state: 'error',
                message: `Bacaan belum tepat pada kata "${errWord.text}". Silakan ulangi kata ini.`,
                expectedWord: errWord.text,
              });

              // Consume 1 token to prevent repeating on same wrong word token
              phraseConsumedTokensRef.current += 1;
            }
          }

          if (isFinal) {
            phraseConsumedTokensRef.current = 0;
          }
        },
        onError: (type, msg) => {
          console.warn('Speech error:', type, msg);
          if (type === 'not-allowed') alert(msg);
          setSpeechStatus({
            state: 'idle',
            message: msg || 'Mikrofon terhenti.',
            expectedWord: null,
          });
        },
        onStatusChange: (status) => {
          setIsMicActive(status);
          if (status) {
            const cur = pageWordsRef.current[speechPointerRef.current];
            setSpeechStatus({
              state: 'listening',
              message: 'Mendengarkan bacaan...',
              expectedWord: cur?.text || null,
            });
          } else {
            setSpeechStatus({
              state: 'idle',
              message: '',
              expectedWord: null,
            });
          }
        },
      });
    }

    trackerRef.current.start();
  };

  const toggleMic = () => {
    if (isMicActive) {
      trackerRef.current?.stop();
      setIsMicActive(false);
      setSpeechStatus({ state: 'idle', message: '', expectedWord: null });
    } else {
      if (!hasSpeechConsent()) {
        setIsConsentOpen(true);
      } else {
        startSpeechTracking();
      }
    }
  };

  const handleNextHint = () => {
    // Check current speech pointer word first
    const targetList = pageWordsRef.current;
    const curWord = targetList[speechPointerRef.current];
    if (curWord) {
      const curKey = `${curWord.verse_key}:${curWord.idx}`;
      if (!revealedWords.has(curKey)) {
        setRevealedWords((prev) => new Set(prev).add(curKey));
        setMissedWordKeys((prev) => {
          const next = new Set(prev);
          next.delete(curKey);
          return next;
        });
        setHintsUsed((h) => h + 1);
        speechPointerRef.current += 1;
        setSpeechPointer(speechPointerRef.current);
        return;
      }
    }

    // Fallback: find first unrevealed masked word
    for (const [key, cfg] of maskedWordsMap.entries()) {
      if (cfg.isMasked && !revealedWords.has(key)) {
        setRevealedWords((prev) => new Set(prev).add(key));
        setHintsUsed((h) => h + 1);
        break;
      }
    }
  };

  const handleWordManualClick = (verseKey, idx) => {
    const key = `${verseKey}:${idx}`;
    if (activeMode === 'memorize' && maskedWordsMap.get(key)?.isMasked) {
      setRevealedWords((prev) => new Set(prev).add(key));
      setMissedWordKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      const targetList = pageWordsRef.current;
      const curWord = targetList[speechPointerRef.current];
      if (curWord && curWord.verse_key === verseKey && curWord.idx === idx) {
        speechPointerRef.current += 1;
        setSpeechPointer(speechPointerRef.current);
      }
    } else if (isMicActive) {
      setMatchedWordKeys((prev) => new Set(prev).add(key));
      setMissedWordKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      speechPointerRef.current += 1;
      setSpeechPointer(speechPointerRef.current);
    }
  };

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    if (mode === 'memorize') {
      setIsMemSetupOpen(true);
    }
  };
  useEffect(() => {
    if (isTajwidActive) {
      getPageTajweedMap(pageData).then(setTajweedMap).catch(console.error);
    }
  }, [pageData, isTajwidActive]);

  const goToPage = useCallback(
    (target) => {
      const p = Math.max(1, Math.min(604, target));
      if (p !== pageNum) {
        router.push(`/quran/halaman/${p}`);
      }
    },
    [pageNum, router]
  );

  // Prefetch next and previous pages
  useEffect(() => {
    prefetchAdjacentPages(pageNum);
  }, [pageNum]);

  // Save last position
  useEffect(() => {
    const firstWord = pageData.lines
      .flatMap((l) => (l.type === 'text' ? l.words : []))
      .find(Boolean);

    if (firstWord?.verse_key) {
      saveLastPosition(firstWord.verse_key, pageNum);
      logActivity({ type: 'read', amount: 1, timezone: settings.timezone });
    }
  }, [pageData, pageNum, settings.timezone]);

  // Keyboard navigation (ArrowLeft = next page in RTL mushaf, ArrowRight = prev page)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        goToPage(pageNum + 1);
      } else if (e.key === 'ArrowRight') {
        goToPage(pageNum - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNum, goToPage]);

  // Touch Swipe & Pinch-to-Zoom Handler
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoomLevel;
      return;
    }

    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;
      const newZoom = Math.min(2.2, Math.max(0.7, Math.round(initialZoomRef.current * factor * 100) / 100));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = (e) => {
    if (isPinching) {
      if (e.touches.length < 2) {
        setIsPinching(false);
        initialPinchDistRef.current = null;
        updateSettings({ font_scale: Math.round(zoomLevel * 1.75 * 1000) / 1000 });
      }
      return;
    }

    // Double-tap zoom toggle
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (zoomLevel > 1.05) {
        handleZoomReset();
      } else {
        const newZoom = 1.35;
        setZoomLevel(newZoom);
        updateSettings({ font_scale: Math.round(newZoom * 1.75 * 1000) / 1000 });
      }
      lastTapTimeRef.current = 0;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    lastTapTimeRef.current = now;

    // Horizontal swipe threshold (only when not zoomed in deeply to allow smooth pan)
    if (zoomLevel <= 1.15 && touchStartXRef.current !== null && touchStartYRef.current !== null && e.changedTouches?.length > 0) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 60) {
        if (deltaX < 0) {
          goToPage(pageNum + 1);
        } else {
          goToPage(pageNum - 1);
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Convert Western digits to Eastern Arabic numerals for authentic Madinah cartouches
  const toArabicNumerals = (num) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (d) => arabicDigits[d]);
  };

  const isKfgqpcFont = (settings.mushaf_font || 'kfgqpc-v4') === 'kfgqpc-v4' || settings.mushaf_font === 'kfgqpc-v2';

  // Render a single Mushaf Page with authentic KFGQPC V4 (1441H Print) Layout from QUL
  const renderSinglePage = (page) => {
    const isSpecialOpeningPage = page.page === 1 || page.page === 2;
    const isOddPage = page.page % 2 !== 0; // Odd = Right-hand page, Even = Left-hand page

    const dynamicFontFamily = isKfgqpcFont
      ? (isTajwidActive
          ? `'v4-tajweed-p${page.page}', 'v4-tajweed', 'qpc-v4-p${page.page}', 'qpc-v4', 'qpc-hafs', var(--font-amiri-quran), serif`
          : `'qpc-v4-p${page.page}', 'qpc-v4', 'qpc-hafs', var(--font-amiri-quran), serif`)
      : undefined;

    return (
      <div
        style={{ fontFamily: dynamicFontFamily }}
        className={`relative flex-1 flex flex-col justify-between transition-all select-text ${
          isKfgqpcFont ? (isTajwidActive ? 'font-qpc-tajweed' : 'font-qpc') : 'font-quran'
        } ${
          isSpecialOpeningPage
            ? 'p-3 sm:p-5 md:p-6 bg-[#FAF6EE] dark:bg-[#131B18] rounded-[2.5rem] border-[3px] border-amber-600/50 dark:border-amber-400/40 shadow-xl ring-8 ring-amber-700/10 dark:ring-amber-400/10'
            : 'p-2.5 sm:p-4 md:p-5 bg-[#FAF7F0] dark:bg-[#121916] rounded-3xl border-2 border-amber-800/35 dark:border-amber-400/30 shadow-lg'
        }`}
      >
        {/* Inner Hairline Frame for Standard 15-Line Pages (KFGQPC double-border) */}
        {!isSpecialOpeningPage && (
          <div className="absolute inset-2 sm:inset-3 pointer-events-none rounded-2xl border border-amber-800/20 dark:border-amber-400/20" />
        )}

        {/* Mushaf Page Header Bar (KFGQPC 1441H header with page parity) */}
        <header className="relative flex justify-between items-center text-xs font-semibold text-amber-950/80 dark:text-amber-300/80 border-b border-amber-800/20 dark:border-amber-400/20 pb-2 mb-2 select-none px-1">
          {isOddPage ? (
            // Right-hand Page: Surah on Left, Juz on Right
            <>
              <div className="flex items-center gap-1.5 font-sans">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">
                  {page.surahs.map((s) => s.name_simple).join(' • ')}
                </span>
              </div>
              <div className="text-[11px] font-serif text-amber-800/60 dark:text-amber-400/50 select-none">
                ❖
              </div>
              <div className="font-qpc text-sm font-bold text-brand-primary dark:text-brand-dark-primary">
                الجزء {toArabicNumerals(page.juz)}
              </div>
            </>
          ) : (
            // Left-hand Page: Juz on Left, Surah on Right
            <>
              <div className="font-qpc text-sm font-bold text-brand-primary dark:text-brand-dark-primary">
                الجزء {toArabicNumerals(page.juz)}
              </div>
              <div className="text-[11px] font-serif text-amber-800/60 dark:text-amber-400/50 select-none">
                ❖
              </div>
              <div className="font-qpc text-sm font-bold text-brand-primary dark:text-brand-dark-primary">
                {page.surahs.map((s) => `سُورَةُ ${s.name_arabic}`).join(' • ')}
              </div>
            </>
          )}
        </header>

        {/* 15 Lines of Content (or 8 centered lines on Page 1 & 2) */}
        <div
          className={`mushaf-layout-v4 flex-1 flex flex-col ${
            isSpecialOpeningPage
              ? 'justify-center space-y-2 py-2 max-w-lg mx-auto w-full'
              : 'justify-around py-0.5'
          }`}
          dir="rtl"
        >
          {page.lines.map((line, lIdx) => {
            // Case 1: Surah Header Banner (KFGQPC 1441H Calligraphic Cartouche)
            if (line.type === 'surah_header') {
              return (
                <div
                  key={`header-${line.line}`}
                  className="my-1 py-2 px-4 rounded-2xl bg-gradient-to-r from-amber-600/15 via-emerald-800/10 to-amber-600/15 dark:from-amber-400/10 dark:via-emerald-400/10 dark:to-amber-400/10 border-2 border-amber-700/30 dark:border-amber-400/30 text-center select-none shadow-xs relative overflow-hidden"
                >
                  <div className="absolute inset-0.5 border border-dashed border-amber-600/25 pointer-events-none rounded-xl" />
                  <div className="relative flex items-center justify-between px-2 text-[10px] text-amber-900/70 dark:text-amber-300/70 font-sans font-medium">
                    <span className="hidden sm:inline-block">
                      {line.surah?.name_simple}
                    </span>
                    <span className="font-qpc text-lg sm:text-xl font-bold text-brand-primary dark:text-brand-dark-primary tracking-wide">
                      سُورَةُ {line.surah?.name_arabic}
                    </span>
                    <span className="hidden sm:inline-block">
                      {line.surah?.revelation_place === 'madinah' ? 'Madaniyyah' : 'Makkiyyah'}
                    </span>
                  </div>
                </div>
              );
            }

            // Case 2: Bismillah Line (KFGQPC 1441H Centered Calligraphy)
            if (line.type === 'bismillah') {
              return (
                <div
                  key={`bismillah-${line.line}`}
                  className="py-1 text-center select-none font-qpc text-xl sm:text-2xl text-brand-primary dark:text-brand-dark-primary line--center line--bismillah tracking-wide flex items-center justify-center gap-3"
                >
                  <span className="text-amber-800/40 dark:text-amber-400/40 text-xs select-none">✦ ──</span>
                  <span className="font-bismillah">{line.text}</span>
                  <span className="text-amber-800/40 dark:text-amber-400/40 text-xs select-none">── ✦</span>
                </div>
              );
            }

            // Case 3: Text Line (KFGQPC 15 Lines Format)
            // In KFGQPC V4: opening pages, bismillah, or short concluding lines are centered
            const isLastLineOfPage = lIdx === page.lines.length - 1;
            const nextLine = page.lines[lIdx + 1];
            const isBeforeHeader = nextLine?.type === 'surah_header';
            const hasFewWords = line.words && line.words.length <= 4;
            const isCentered = (settings.text_align || 'center') === 'center' || isSpecialOpeningPage || (hasFewWords && (isLastLineOfPage || isBeforeHeader));

            return (
              <div
                key={`line-${line.line}`}
                data-line={line.line}
                className={`leading-[2.1] text-brand-charcoal dark:text-gray-100 ${
                  isCentered
                    ? 'line--center text-center justify-center'
                    : isFlowingFallback
                    ? 'text-right'
                    : 'line--justified text-justify text-justify-inter-word block w-full'
                }`}
                style={{
                  textAlign: isCentered ? 'center' : isFlowingFallback ? 'right' : 'justify',
                  textAlignLast: isCentered ? 'center' : isFlowingFallback ? 'right' : 'justify',
                }}
              >
                {line.words?.map((w, wIdx) => {
                  const tokenKey = `${w.verse_key}:${w.idx}`;
                  const wordTokens = tajweedMap.get(tokenKey);
                  const maskCfg = maskedWordsMap.get(tokenKey);
                  const isMasked = activeMode === 'memorize' && maskCfg?.isMasked && !revealedWords.has(tokenKey);

                  let highlightState = null;
                  if (activeAudioVerseKey && w.verse_key === activeAudioVerseKey) {
                    highlightState = 'audio_playing';
                  } else if (isMicActive) {
                    const currentWord = pageWords[speechPointer];
                    if (currentWord && `${currentWord.verse_key}:${currentWord.idx}` === tokenKey) {
                      highlightState = 'current';
                    } else if (matchedWordKeys.has(tokenKey)) {
                      highlightState = 'matched';
                    } else if (missedWordKeys.has(tokenKey)) {
                      highlightState = 'missed';
                    }
                  }

                  return (
                    <WordSpan
                      key={`${w.verse_key}-${w.idx || wIdx}`}
                      verseKey={w.verse_key}
                      wordIndex={w.idx || wIdx + 1}
                      page={page.page}
                      line={line.line}
                      text={w.text}
                      type={w.type}
                      tajweedTokens={wordTokens}
                      showTajwid={isTajwidActive}
                      highlightState={highlightState}
                      isMasked={isMasked}
                      maskHint={maskCfg?.hint}
                      onClick={() => handleWordManualClick(w.verse_key, w.idx || wIdx + 1)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Mushaf Page Footer (KFGQPC 1441H page cartouche) */}
        <footer className="relative flex justify-center items-center text-center border-t border-amber-800/20 dark:border-amber-400/20 pt-2 mt-1 select-none">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-xs font-bold text-amber-950 dark:text-amber-300">
            <span>—</span>
            <span className="font-qpc text-sm">{toArabicNumerals(page.page)}</span>
            <span className="text-[11px] font-sans text-gray-500 dark:text-gray-400 font-medium">({page.page})</span>
            <span>—</span>
          </div>
        </footer>
      </div>
    );
  };



  return (
    <div
      data-reader-view="true"
      className="min-h-screen flex flex-col justify-between pb-24 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <ReaderTopBar
        title={`Halaman ${pageNum}`}
        subtitle={`Juz ${juzNum} • Mushaf KFGQPC V4 1441H`}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenJump={() => setIsJumpOpen(true)}
        onOpenLegend={() => setIsLegendOpen(true)}
        onToggleAudio={() => setIsAudioOpen((prev) => !prev)}
        isAudioActive={isAudioOpen}
      />

      {/* Memorization Mode Control Banner */}
      {activeMode === 'memorize' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 flex items-center justify-between text-xs sticky top-14 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-800 dark:text-amber-300">
              Mode Hafalan Halaman {pageNum}
            </span>
            <span className="text-gray-400">• Petunjuk: {hintsUsed}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNextHint}
              className="px-3 py-1 rounded-lg bg-amber-200 dark:bg-amber-900/70 hover:bg-amber-300 text-amber-900 dark:text-amber-200 font-semibold"
            >
              Buka 1 Kata (Petunjuk)
            </button>
            <button
              onClick={() => setIsMemAssessmentOpen(true)}
              className="px-3 py-1 rounded-lg bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold shadow-xs"
            >
              Selesai & Evaluasi
            </button>
          </div>
        </div>
      )}

      {/* Main Mushaf Viewing Area with Scalable Zoom */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-2 sm:px-6 py-4 flex flex-col justify-center overflow-x-auto">
        {/* Two facing pages on large screens, single page on standard */}
        <div
          className="flex gap-4 items-stretch justify-center transition-all duration-150 origin-top"
          style={{
            zoom: zoomLevel,
            WebkitZoom: zoomLevel,
          }}
        >
          {facingPageData && (
            <div className="hidden lg:flex flex-1">
              {renderSinglePage(facingPageData)}
            </div>
          )}
          <div className="flex-1 max-w-2xl mx-auto w-full">
            {renderSinglePage(pageData)}
          </div>
        </div>

        {/* Navigation Bar & Progress */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 max-w-2xl mx-auto w-full px-2">
          {/* Previous Page */}
          <button
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Progress Bar & Label */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-xs px-4">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              Halaman {pageNum} dari 604
            </span>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-brand-primary dark:bg-brand-dark-primary h-full transition-all duration-300"
                style={{ width: `${(pageNum / 604) * 100}%` }}
              />
            </div>
          </div>

          {/* Next Page */}
          <button
            onClick={() => goToPage(pageNum + 1)}
            disabled={pageNum >= 604}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Zoom Control Pill */}
      <div className="fixed left-4 sm:left-5 bottom-6 md:bottom-8 z-30 flex items-center gap-1 bg-white/95 dark:bg-brand-dark-surface/95 backdrop-blur-md px-2 py-1.5 rounded-full border border-amber-900/15 dark:border-amber-400/20 shadow-lg text-xs font-semibold text-gray-700 dark:text-gray-200 select-none">
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.75}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Perkecil Halaman (Zoom Out)"
          aria-label="Perkecil Halaman"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomReset}
          className="px-2 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[11px] font-bold text-brand-primary dark:text-brand-dark-primary transition-colors min-w-[42px] text-center"
          title="Klik untuk reset zoom ke 100%"
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= 2.0}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Perbesar Halaman (Zoom In)"
          aria-label="Perbesar Halaman"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Mic Button */}
      <FloatingMicButton
        onClick={toggleMic}
        isActive={isMicActive}
        title={isMicActive ? 'Mendengarkan bacaan... (Klik untuk berhenti)' : 'Mulai Pelacak Suara'}
      />

      {/* Real-Time Recitation Tracker Status Bar (Tarteel-AI style) */}
      <RecitationStatusBar
        isActive={isMicActive}
        status={speechStatus}
        pointer={speechPointer}
        totalWords={pageWords.length}
        onToggleMic={toggleMic}
        onNextHint={handleNextHint}
        isMemorizeMode={activeMode === 'memorize'}
      />

      {/* Speech Privacy Consent Modal */}
      <SpeechConsentModal
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        onAccept={() => {
          setIsConsentOpen(false);
          startSpeechTracking();
        }}
      />

      {/* Memorization Setup Modal */}
      <MemorizationSetupModal
        isOpen={isMemSetupOpen}
        onClose={() => setIsMemSetupOpen(false)}
        versesCount={pageData.surahs[0]?.verses_count || 10}
        currentAyah={1}
        onStart={(config) => {
          setMemConfig(config);
        }}
      />

      {/* Memorization Assessment Modal (SM-2) */}
      <MemorizationAssessmentModal
        isOpen={isMemAssessmentOpen}
        onClose={() => setIsMemAssessmentOpen(false)}
        verses={[...new Set(pageWords.map((w) => w.verse_key))].map((vk) => {
          const parts = vk.split(':');
          return { surah: parseInt(parts[0], 10), n: parseInt(parts[1], 10), key: vk };
        })}
        onFinished={() => {
          setActiveMode('read');
        }}
      />

      {/* Settings Modal */}
      <ReaderSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentPage={pageNum}
      />

      {/* Jump Sheet Modal */}
      <JumpSheet
        isOpen={isJumpOpen}
        onClose={() => setIsJumpOpen(false)}
      />

      {/* Tajweed Legend Sheet */}
      <TajweedLegendSheet
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />

      {/* Text Selection Floating Popover */}
      <SelectionPopover
        onAskAI={handleAskAI}
        onQuickTafsir={handleQuickTafsir}
        onBookmark={handleBookmark}
        onMutashabihat={(key) => setMutashabihatVerseKey(key)}
      />

      {/* Mutashabihat ul-Quran Modal (QUL Engine) */}
      <MutashabihatModal
        isOpen={Boolean(mutashabihatVerseKey)}
        onClose={() => setMutashabihatVerseKey(null)}
        verseKey={mutashabihatVerseKey}
        onAskAI={handleAskAI}
      />

      {/* Audio Recitation Player (QUL Murattal) */}
      <MushafAudioPlayer
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
        pageData={pageData}
        targetVerseKey={activeAudioVerseKey}
        onActiveVerseChange={setActiveAudioVerseKey}
        onPageAdvance={() => goToPage(pageNum + 1)}
      />

      {/* Grounded AI Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatInitialPrompt('');
        }}
        onClearInitialPrompt={() => setChatInitialPrompt('')}
        verseKeys={chatVerseKeys}
        selectedText={chatSelectedText}
        initialPrompt={chatInitialPrompt}
      />
    </div>
  );
}
