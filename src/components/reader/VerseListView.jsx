'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { MutashabihatModal } from '@/components/quran/MutashabihatModal';
import { FloatingMicButton } from './FloatingMicButton';
import { useSettings } from '@/context/SettingsContext';
import { saveLastPosition } from '@/lib/quran/position';
import { parseVerseTajweed } from '@/lib/tajwid/parser';
import { tokenizeArabic } from '@/lib/arabic/normalize';
import { align, matchRecitationStep, verifyRecitationWord } from '@/lib/speech/matcher';
import { SpeechTracker, hasSpeechConsent, isSpeechSupported } from '@/lib/speech/tracker';
import { RecitationStatusBar } from '@/components/speech/RecitationStatusBar';
import { generateWordMasks } from '@/lib/memorization/engine';
import { recordVerseDwell, logActivity } from '@/lib/activity/logger';

export function VerseListView({ surahData, initialAyah = null }) {
  const { settings } = useSettings();
  const [activeMode, setActiveMode] = useState('read'); // 'read' | 'tajwid' | 'memorize'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [activeVerseKey, setActiveVerseKey] = useState(initialAyah ? `${surahData.surah.id}:${initialAyah}` : `${surahData.surah.id}:1`);
  const [mutashabihatVerseKey, setMutashabihatVerseKey] = useState(null);
  const isKfgqpcFont = (settings.mushaf_font || 'kfgqpc-v4') === 'kfgqpc-v4' || settings.mushaf_font === 'kfgqpc-v2';

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
  const [memConfig, setMemConfig] = useState({ level: 'all', startAyah: 1, endAyah: Math.min(surahData.surah.verses_count, 5) });
  const [maskedWordsMap, setMaskedWordsMap] = useState(new Map());
  const [revealedWords, setRevealedWords] = useState(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);

  const observerRef = useRef(null);

  // Check if Bismillah banner should be shown:
  const showBismillahBanner = surahData.surah.id !== 1 && surahData.surah.id !== 9;

  // Flat list of words for sequential speech alignment
  const flatWords = React.useMemo(() => {
    const list = [];
    for (const v of surahData.verses) {
      for (const w of v.words) {
        if (w.type !== 'end') {
          list.push({ ...w, verseKey: v.key });
        }
      }
    }
    return list;
  }, [surahData]);

  // Recalculate memorization masks when mode or config changes
  useEffect(() => {
    if (activeMode === 'memorize') {
      const map = new Map();
      for (const v of surahData.verses) {
        if (v.n >= memConfig.startAyah && v.n <= memConfig.endAyah) {
          const vMasks = generateWordMasks(v.words, memConfig.level, v.key);
          for (const [idx, cfg] of vMasks.entries()) {
            map.set(`${v.key}:${idx}`, cfg);
          }
        }
      }
      setMaskedWordsMap(map);
      setRevealedWords(new Set());
      setHintsUsed(0);
    } else {
      setMaskedWordsMap(new Map());
    }
  }, [activeMode, memConfig, surahData]);

  // Target words for recitation tracking (scoped to memorization range when active)
  const activeTargetWords = React.useMemo(() => {
    if (activeMode === 'memorize') {
      const list = [];
      for (const v of surahData.verses) {
        if (v.n >= memConfig.startAyah && v.n <= memConfig.endAyah) {
          for (const w of v.words) {
            if (w.type !== 'end') {
              list.push({ ...w, verseKey: v.key });
            }
          }
        }
      }
      return list;
    }
    return flatWords;
  }, [activeMode, memConfig, surahData, flatWords]);

  const activeTargetWordsRef = useRef(activeTargetWords);
  activeTargetWordsRef.current = activeTargetWords;

  const speechPointerRef = useRef(0);
  const phraseConsumedTokensRef = useRef(0);
  const [speechStatus, setSpeechStatus] = useState({
    state: 'idle',
    message: '',
    expectedWord: null,
  });

  // Reset tracking state when mode or target words change
  useEffect(() => {
    speechPointerRef.current = 0;
    setSpeechPointer(0);
    phraseConsumedTokensRef.current = 0;
    setMatchedWordKeys(new Set());
    setMissedWordKeys(new Set());
    if (isMicActive) {
      const curWord = activeTargetWords[0];
      setSpeechStatus({
        state: 'listening',
        message: 'Mendengarkan bacaan...',
        expectedWord: curWord?.text || null,
      });
    }
  }, [activeMode, memConfig, activeTargetWords, isMicActive]);

  const startSpeechTracking = () => {
    if (!isSpeechSupported()) {
      alert('Peramban Anda tidak mendukung pengenalan suara. Silakan gunakan Google Chrome di Android atau Desktop, atau gunakan mode manual (ketuk kata untuk maju).');
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

          const targetList = activeTargetWordsRef.current;
          let curPtr = speechPointerRef.current;

          if (curPtr >= targetList.length) {
            setSpeechStatus({
              state: 'finished',
              message: 'Maa syaa Allah! Seluruh bacaan telah selesai dilafalkan.',
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

          // 1. Correct words
          if (stepResult.matchedIndices.length > 0) {
            setMatchedWordKeys((prev) => {
              const next = new Set(prev);
              for (const idx of stepResult.matchedIndices) {
                const targetWord = targetList[idx];
                if (targetWord) {
                  const key = `${targetWord.verseKey}:${targetWord.idx}`;
                  next.add(key);
                  setRevealedWords((r) => new Set(r).add(key));
                }
              }
              return next;
            });

            // Clear any error from matched words
            setMissedWordKeys((prev) => {
              const next = new Set(prev);
              for (const idx of stepResult.matchedIndices) {
                const targetWord = targetList[idx];
                if (targetWord) {
                  next.delete(`${targetWord.verseKey}:${targetWord.idx}`);
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

              // Auto-scroll to center active word
              const el = document.querySelector(
                `[data-verse-key="${nextWord.verseKey}"][data-word-index="${nextWord.idx}"]`
              );
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              setSpeechStatus({
                state: 'finished',
                message: 'Maa syaa Allah! Seluruh bacaan telah berhasil dilafalkan.',
                expectedWord: null,
              });
            }
          }

          // 2. Incorrect recitation: stop and highlight error
          if (stepResult.hasError && stepResult.errorIndex !== null) {
            const errWord = targetList[stepResult.errorIndex];
            if (errWord) {
              const errKey = `${errWord.verseKey}:${errWord.idx}`;
              setMissedWordKeys((prev) => new Set(prev).add(errKey));

              setSpeechStatus({
                state: 'error',
                message: `Bacaan belum tepat pada kata "${errWord.text}". Silakan ulangi kata ini.`,
                expectedWord: errWord.text,
              });

              // Consume 1 token to avoid infinite loop on same wrong word token
              phraseConsumedTokensRef.current += 1;
            }
          }

          if (isFinal) {
            phraseConsumedTokensRef.current = 0;
          }
        },
        onError: (type, msg) => {
          console.warn('Speech tracker error:', type, msg);
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
            const cur = activeTargetWordsRef.current[speechPointerRef.current];
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
    const targetList = activeTargetWordsRef.current;
    const curWord = targetList[speechPointerRef.current];
    if (curWord) {
      const curKey = `${curWord.verseKey}:${curWord.idx}`;
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

      const targetList = activeTargetWordsRef.current;
      const curWord = targetList[speechPointerRef.current];
      if (curWord && curWord.verseKey === verseKey && curWord.idx === idx) {
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
  const tajweedTokensByVerse = React.useMemo(() => {
    const map = new Map();
    for (const v of surahData.verses) {
      if (v.tajweed) {
        map.set(v.key, parseVerseTajweed(v.tajweed, v.words));
      }
    }
    return map;
  }, [surahData]);

  // Save last position and track current visible verse using IntersectionObserver
  useEffect(() => {
    const handleIntersect = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const vk = entry.target.getAttribute('data-verse-key');
          const page = parseInt(entry.target.getAttribute('data-page'), 10) || null;
          if (vk) {
            setActiveVerseKey(vk);
            saveLastPosition(vk, page);
            const [sId, aId] = vk.split(':').map(Number);
            recordVerseDwell(sId, aId, settings.timezone);
          }
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0.1,
    });

    const elements = document.querySelectorAll('.verse-block');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [surahData, settings.timezone]);

  // Initial scroll to target verse if requested
  useEffect(() => {
    if (initialAyah) {
      const el = document.getElementById(`ayah-${initialAyah}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [initialAyah]);

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

  return (
    <div className="min-h-screen pb-24">
      {/* Top Bar */}
      <ReaderTopBar
        title={surahData.surah.name_simple}
        subtitle={`${surahData.surah.name_arabic} • ${surahData.surah.verses_count} Ayat`}
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
              Mode Hafalan (Ayat {memConfig.startAyah}-{memConfig.endAyah})
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

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Surah Header Card */}
        <div className="text-center py-6 px-4 rounded-3xl bg-gradient-to-b from-brand-primary/10 via-brand-primary/5 to-transparent border border-emerald-950/5 dark:border-white/5 space-y-2">
          <span className="text-xs uppercase tracking-widest text-brand-primary dark:text-brand-dark-primary font-bold">
            Surah Ke-{surahData.surah.id}
          </span>
          <h2 className={`${isKfgqpcFont ? 'font-qpc' : 'font-quran'} text-4xl text-brand-charcoal dark:text-white`} dir="rtl">
            {surahData.surah.name_arabic}
          </h2>
          <h3 className="text-base font-bold text-brand-charcoal dark:text-white">
            {surahData.surah.name_simple} ({surahData.surah.translated_name})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {surahData.surah.revelation_place} • {surahData.surah.verses_count} Ayat
          </p>

          {/* Bismillah Header Banner */}
          {showBismillahBanner && (
            <div className="pt-5 pb-2 text-center">
              <span className={`${isKfgqpcFont ? 'font-bismillah text-3xl' : 'font-quran text-2xl'} text-brand-primary dark:text-brand-dark-primary select-none`} dir="rtl">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
              </span>
            </div>
          )}
        </div>

        {/* Verses List with content-visibility: auto for smooth 60fps scrolling */}
        <div className="space-y-4">
          {surahData.verses.map((verse) => {
            const verseTajweedTokens = tajweedTokensByVerse.get(verse.key);

            return (
              <article
                key={verse.key}
                id={`ayah-${verse.n}`}
                data-verse-key={verse.key}
                data-page={verse.page}
                className="verse-block p-5 sm:p-6 bg-white dark:bg-brand-dark-surface rounded-2xl border border-emerald-950/10 dark:border-white/10 shadow-xs transition-shadow hover:shadow-md space-y-4"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}
              >
                {/* Verse Meta Bar */}
                <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary font-bold text-xs flex items-center justify-center">
                      {verse.n}
                    </span>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Ayat {verse.n}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Halaman {verse.page} • Juz {verse.juz}
                  </span>
                </div>

                {/* Arabic Verse Text with Shared WordSpan */}
                <div
                  className={`${isKfgqpcFont ? 'font-qpc text-2xl' : 'font-quran'} ${
                    (settings.text_align || 'center') === 'center' ? 'text-center' : 'text-right'
                  } select-text leading-quran py-2`}
                  dir="rtl"
                >
                  {verse.words.map((w, idx) => {
                    const wordTokens = verseTajweedTokens ? verseTajweedTokens[idx] : null;
                    const wordKey = `${verse.key}:${w.idx || idx + 1}`;
                    const maskCfg = maskedWordsMap.get(wordKey);
                    const isMasked = activeMode === 'memorize' && maskCfg?.isMasked && !revealedWords.has(wordKey);

                    let highlightState = null;
                    if (isMicActive) {
                      const currentWord = activeTargetWords[speechPointer];
                      if (currentWord && `${currentWord.verseKey}:${currentWord.idx}` === wordKey) {
                        highlightState = 'current';
                      } else if (matchedWordKeys.has(wordKey)) {
                        highlightState = 'matched';
                      } else if (missedWordKeys.has(wordKey)) {
                        highlightState = 'missed';
                      }
                    }

                    return (
                      <WordSpan
                        key={`${verse.key}-${w.idx || idx}`}
                        verseKey={verse.key}
                        wordIndex={w.idx || idx + 1}
                        page={w.page || verse.page}
                        line={w.line || 1}
                        text={w.text}
                        type={w.type || (idx === verse.words.length - 1 ? 'end' : 'word')}
                        tajweedTokens={wordTokens}
                        showTajwid={isTajwidActive}
                        highlightState={highlightState}
                        isMasked={isMasked}
                        maskHint={maskCfg?.hint}
                        onClick={() => handleWordManualClick(verse.key, w.idx || idx + 1)}
                      />
                    );
                  })}
                </div>

                {/* Translation */}
                {settings.show_translation && verse.translation && (
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {verse.translation}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
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
        totalWords={activeTargetWords.length}
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
        versesCount={surahData.surah.verses_count}
        currentAyah={parseInt(activeVerseKey.split(':')[1], 10) || 1}
        onStart={(config) => {
          setMemConfig(config);
        }}
      />

      {/* Memorization Assessment Modal (SM-2) */}
      <MemorizationAssessmentModal
        isOpen={isMemAssessmentOpen}
        onClose={() => setIsMemAssessmentOpen(false)}
        verses={surahData.verses
          .filter((v) => v.n >= memConfig.startAyah && v.n <= memConfig.endAyah)
          .map((v) => ({ surah: surahData.surah.id, n: v.n, key: v.key }))}
        onFinished={() => {
          logActivity({
            type: 'memorize',
            surah: surahData.surah.id,
            ayah_from: memConfig.startAyah,
            ayah_to: memConfig.endAyah,
            amount: 1,
            timezone: settings.timezone,
          });
          setActiveMode('read');
        }}
      />

      {/* Settings Sheet Modal */}
      <ReaderSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentVerseKey={activeVerseKey}
        currentPage={surahData.verses[0]?.page}
      />

      {/* Quick Jump Sheet Modal */}
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
