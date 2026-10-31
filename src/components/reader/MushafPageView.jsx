'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { settings } = useSettings();
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

  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const pageNum = pageData.page;
  const juzNum = pageData.juz;

  const isTajwidActive = activeMode === 'tajwid' || settings.show_tajwid;

  const handleAskAI = (keys, text) => {
    setChatVerseKeys(keys);
    setChatSelectedText(text);
    setChatInitialPrompt('');
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

  // Touch Swipe Handler (Swipe Left = Next Page in mushaf)
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Horizontal swipe threshold
    if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 60) {
      if (deltaX < 0) {
        goToPage(pageNum + 1);
      } else {
        goToPage(pageNum - 1);
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Render a single Mushaf Page
  const renderSinglePage = (page) => {
    return (
      <div className="relative flex-1 flex flex-col justify-between p-4 sm:p-6 bg-[#FCFAF5] dark:bg-[#161F1C] rounded-3xl border-2 border-amber-900/15 dark:border-amber-400/20 shadow-md transition-all select-text">
        {/* Mushaf Page Header */}
        <header className="flex justify-between items-center text-xs font-semibold text-amber-950/70 dark:text-amber-300/70 border-b border-amber-900/15 pb-2.5 mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-sans uppercase text-[10px] tracking-widest text-emerald-900 dark:text-emerald-400 font-bold">
              Juz {page.juz}
            </span>
          </div>
          <div className="font-quran text-base text-brand-primary dark:text-brand-dark-primary font-bold">
            {page.surahs.map((s) => s.name_arabic).join(' • ')}
          </div>
        </header>

        {/* 15 Lines of Content */}
        <div
          className={`flex-1 flex flex-col justify-around py-1 ${
            isFlowingFallback ? 'block space-y-2' : ''
          }`}
          dir="rtl"
        >
          {page.lines.map((line) => {
            // Case 1: Surah Header Banner
            if (line.type === 'surah_header') {
              return (
                <div
                  key={`header-${line.line}`}
                  className="my-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-700/10 via-brand-primary/10 to-amber-700/10 border border-amber-900/20 text-center select-none"
                >
                  <span className="font-quran text-lg font-bold text-brand-primary dark:text-brand-dark-primary block">
                    سُورَةُ {line.surah?.name_arabic}
                  </span>
                  <span className="text-[10px] text-amber-900/70 dark:text-amber-300/70 font-sans block">
                    {line.surah?.name_simple}
                  </span>
                </div>
              );
            }

            // Case 2: Bismillah Line
            if (line.type === 'bismillah') {
              return (
                <div
                  key={`bismillah-${line.line}`}
                  className="py-1 text-center select-none font-quran text-xl text-brand-primary dark:text-brand-dark-primary"
                >
                  {line.text}
                </div>
              );
            }

            // Case 3: Text Line (15 lines mushaf format, justified)
            return (
              <div
                key={`line-${line.line}`}
                className={`font-quran leading-loose text-brand-charcoal dark:text-gray-100 ${
                  isFlowingFallback
                    ? 'text-right'
                    : 'text-justify text-justify-inter-word block w-full'
                }`}
                style={{
                  textAlignLast: isFlowingFallback ? 'right' : 'justify',
                }}
              >
                {line.words?.map((w, wIdx) => {
                  const tokenKey = `${w.verse_key}:${w.idx}`;
                  const wordTokens = tajweedMap.get(tokenKey);
                  const maskCfg = maskedWordsMap.get(tokenKey);
                  const isMasked = activeMode === 'memorize' && maskCfg?.isMasked && !revealedWords.has(tokenKey);

                  let highlightState = null;
                  if (isMicActive) {
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

        {/* Mushaf Page Footer */}
        <footer className="text-center border-t border-amber-900/15 pt-2 mt-2 text-xs font-bold text-amber-950/70 dark:text-amber-300/70 select-none">
          — {page.page} —
        </footer>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between pb-24 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <ReaderTopBar
        title={`Halaman ${pageNum}`}
        subtitle={`Juz ${juzNum} • Mushaf 15 Baris`}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenJump={() => setIsJumpOpen(true)}
        onOpenLegend={() => setIsLegendOpen(true)}
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

      {/* Main Mushaf Viewing Area */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 flex flex-col justify-center">
        {/* Two facing pages on large screens, single page on standard */}
        <div className="flex gap-4 items-stretch justify-center">
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
