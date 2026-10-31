'use client';

import React from 'react';
import { X } from 'lucide-react';
import { TAJWEED_RULES } from '@/lib/tajwid/rules';

/**
 * TajweedWordSheet: per-letter tajwid colouring and rule explanations for one word.
 * Used by the mushaf image view, where letters on the page image cannot be recoloured.
 *
 * @param {Object} props
 * @param {{ verseKey: string, idx: number, text: string, tokens: Array<{text: string, rule: string|null}> } | null} props.word
 * @param {() => void} props.onClose
 */
export function TajweedWordSheet({ word, onClose }) {
  if (!word) return null;

  const tokens = word.tokens?.length ? word.tokens : [{ text: word.text, rule: null }];
  const rules = [...new Set(tokens.map((t) => t.rule).filter(Boolean))].map((id) => TAJWEED_RULES[id]).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-brand-dark-surface rounded-t-3xl sm:rounded-2xl border border-emerald-950/10 dark:border-white/10 p-5 space-y-4 shadow-2xl z-10 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <div>
            <h2 className="font-bold text-base text-brand-charcoal dark:text-white">Tajwid Kata</h2>
            <span className="text-[11px] text-gray-400">
              QS {word.verseKey} &bull; kata ke-{word.idx}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word with per-letter tajwid colours */}
        <p className="font-quran text-4xl text-center text-brand-charcoal dark:text-gray-100 py-2" dir="rtl">
          {tokens.map((t, i) => {
            const rule = t.rule ? TAJWEED_RULES[t.rule] : null;
            if (!rule) return <span key={i}>{t.text}</span>;
            return (
              <span key={i}>
                <span className="dark:hidden" style={{ color: rule.colorLight }}>{t.text}</span>
                <span className="hidden dark:inline" style={{ color: rule.colorDark }}>{t.text}</span>
              </span>
            );
          })}
        </p>

        {/* Rules */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {rules.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Tidak ada hukum tajwid berwarna pada kata ini.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-1"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs dark:hidden" style={{ backgroundColor: rule.colorLight }} />
                  <span className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs hidden dark:block" style={{ backgroundColor: rule.colorDark }} />
                  <h4 className="font-bold text-xs text-brand-charcoal dark:text-white">{rule.labelId}</h4>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed pl-6.5">{rule.explanationId}</p>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
          <p className="text-[10px] text-gray-400 leading-relaxed italic text-center">
            *Catatan: Penjelasan hukum tajwid dalam modul ini wajib ditinjau ulang oleh guru tahsin/tahfidz bersertifikasi untuk kepastian talaqqi.
          </p>
        </div>
      </div>
    </div>
  );
}
