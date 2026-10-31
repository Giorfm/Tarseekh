'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { logActivity } from '@/lib/activity/logger';

const STARTER_CHIPS = [
  'Jelaskan makna ayat ini',
  'Apa pelajaran (tadabbur) dari ayat ini?',
  'Jelaskan kosakata pentingnya',
  'Bagaimana konteks turunnya ayat ini?',
];

export function ChatPanel({
  isOpen,
  onClose,
  onClearInitialPrompt,
  verseKeys = [],
  selectedText = '',
  initialPrompt = '',
}) {
  const [messages, setMessages] = useState([]); // { role: 'user'|'model', content, sources }
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastSentInitialPromptRef = useRef(null);

  // Stable refs to prevent sendMessage from re-creating on every render
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const verseKeysRef = useRef(verseKeys);
  verseKeysRef.current = verseKeys;

  const inputRef = useRef(input);
  inputRef.current = input;

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleStop = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (err) {
        console.warn('Abort error:', err);
      }
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    isStreamingRef.current = false;
  };

  const handleClose = () => {
    handleStop();
    lastSentInitialPromptRef.current = null;
    onClose?.();
  };

  const handleCopy = (text, idx) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      }).catch((err) => {
        console.warn('Gagal menyalin teks:', err);
      });
    }
  };

  const sendMessage = useCallback(
    async (questionText) => {
      const q = (typeof questionText === 'string' ? questionText : inputRef.current).trim();
      if (!q || isStreamingRef.current) return;

      setInput('');
      setErrorMsg(null);
      setIsStreaming(true);
      isStreamingRef.current = true;

      const currentMessages = messagesRef.current;
      const userMessage = { role: 'user', content: q };
      const modelPlaceholder = { role: 'model', content: '', sources: [] };
      const updatedMessages = [...currentMessages, userMessage, modelPlaceholder];
      setMessages(updatedMessages);

      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verseKeys: verseKeysRef.current,
            question: q,
            history: currentMessages.slice(-4),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.error || `HTTP ${res.status}: Gagal memproses`);
        }

        // Record reflect activity for daily quest & streak
        logActivity({ type: 'reflect', amount: 1 });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let activeSources = [];
        let isDone = false;

        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'sources') {
                  activeSources = parsed.sources || [];
                  setSources(activeSources);
                  setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.role === 'model') {
                      copy[copy.length - 1] = { ...last, sources: activeSources };
                    }
                    return copy;
                  });
                } else if (parsed.type === 'token') {
                  accumulatedText += parsed.content;
                  setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.role === 'model') {
                      copy[copy.length - 1] = {
                        ...last,
                        content: accumulatedText,
                        sources: activeSources,
                      };
                    }
                    return copy;
                  });
                } else if (parsed.type === 'done') {
                  isDone = true;
                  break;
                } else if (parsed.type === 'error') {
                  setErrorMsg(parsed.message || 'Terjadi kesalahan pada AI');
                  isDone = true;
                  break;
                }
              } catch (err) {
                console.warn('Failed to parse SSE chunk', err);
              }
            }
          }
        }

        try {
          await reader.cancel();
        } catch {
          // Stream already closed or cancelled
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorMsg(err.message || 'Gagal memuat jawaban');
        }
      } finally {
        setIsStreaming(false);
        isStreamingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    []
  );

  // Reset chat state when verse selection changes
  const currentVerseKeyStr = verseKeys.join(',');
  const prevVerseKeyStrRef = useRef(currentVerseKeyStr);
  useEffect(() => {
    if (currentVerseKeyStr !== prevVerseKeyStrRef.current) {
      prevVerseKeyStrRef.current = currentVerseKeyStr;
      setMessages([]);
      setErrorMsg(null);
      setSources([]);
      lastSentInitialPromptRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  }, [currentVerseKeyStr]);

  // Handle initialPrompt only ONCE per unique prompt
  useEffect(() => {
    if (isOpen && initialPrompt && lastSentInitialPromptRef.current !== initialPrompt) {
      lastSentInitialPromptRef.current = initialPrompt;
      sendMessage(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [isOpen, initialPrompt, sendMessage, onClearInitialPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Chat Container: Bottom sheet on mobile, right panel on desktop */}
      <div className="relative w-full md:w-[480px] h-[85vh] md:h-full bg-white dark:bg-brand-dark-surface border-t md:border-l border-emerald-950/10 dark:border-white/10 shadow-2xl flex flex-col z-10 self-end md:self-stretch rounded-t-3xl md:rounded-none overflow-hidden">
        {/* Header */}
        <header className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/70 dark:bg-black/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg flex items-center justify-center font-bold text-sm shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-brand-charcoal dark:text-white truncate">
                Tarseekh AI
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                Rujukan: {verseKeys.join(', ')}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
            aria-label="Tutup panel tanya AI"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Selected Arabic Text Banner */}
        {selectedText && (
          <div className="px-4 py-2.5 bg-brand-primary/5 dark:bg-brand-dark-primary/10 border-b border-emerald-950/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
            <span className="font-quran text-right text-brand-charcoal dark:text-gray-100 truncate text-sm" dir="rtl">
              {selectedText.slice(0, 80)}...
            </span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {verseKeys.length} Ayat
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            /* Starter Prompts Container */
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-brand-charcoal dark:text-white">
                  Mulai Tadabbur Makna
                </h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Pilih pertanyaan pemantik di bawah atau ketik pertanyaan Anda sendiri.
                </p>
              </div>

              {/* Starter Chips */}
              <div className="flex flex-col gap-2 pt-2 text-left">
                {STARTER_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(chip)}
                    className="p-3 rounded-xl border border-emerald-950/10 dark:border-white/10 hover:border-brand-primary hover:bg-brand-primary/5 text-xs text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-between group"
                  >
                    <span>{chip}</span>
                    <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } space-y-1.5`}
              >
                {/* Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[88%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-medium rounded-br-xs shadow-xs'
                      : 'bg-gray-100 dark:bg-white/10 text-brand-charcoal dark:text-gray-100 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content || (isStreaming && idx === messages.length - 1 ? 'Menelaah tafsir...' : '')}</p>
                </div>

                {/* Source Chips & Actions for Model Responses */}
                {msg.role === 'model' && msg.content && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
                    {msg.sources?.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] font-semibold"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{s.source} ({s.verseKey})</span>
                      </span>
                    ))}

                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400"
                      title="Salin jawaban"
                    >
                      {copiedIdx === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Footnote */}
        <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-brand-dark-surface space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan makna atau hikmah ayat ini..."
              disabled={isStreaming}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
                title="Hentikan"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg disabled:opacity-40 shadow-xs transition-opacity"
                title="Kirim pertanyaan"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Sacred & Fiqh Disclaimer Footnote */}
          <p className="text-[10px] text-gray-400 text-center leading-tight">
            Jawaban AI berbasis tafsir rujukan, bukan fatwa hukum fikih. Rujuk guru untuk kepastian talaqqi.
          </p>
        </div>
      </div>
    </div>
  );
}
