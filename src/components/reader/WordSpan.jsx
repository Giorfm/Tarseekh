'use client';

import React, { useState } from 'react';
import { TAJWEED_RULES } from '@/lib/tajwid/rules';

/**
 * WordSpan: The Single Shared Word Model Component (PRD Key Architecture Rule).
 * Renders every word across both 'ayat' and 'halaman' views with:
 * - data-verse-key
 * - data-word-index
 * - data-page
 * - data-line
 * Supports Tajwid coloring, Speech tracking highlights, and Memorization masking.
 */
export function WordSpan({
  verseKey,
  wordIndex,
  page,
  line,
  text,
  type = 'word',
  tajweedTokens = null,
  showTajwid = false,
  highlightState = null, // 'matched' | 'current' | 'missed' (Phase 5)
  isMasked = false, // (Phase 5 memorization)
  maskHint = null,
  onClick,
}) {
  const [activeRulePopover, setActiveRulePopover] = useState(null);
  const isEndMarker = type === 'end';

  // 1. Ayah End Marker (Circle numeral)
  if (isEndMarker) {
    return (
      <span
        data-verse-key={verseKey}
        data-word-index={wordIndex}
        data-page={page}
        data-line={line}
        data-type="end"
        className="inline-flex items-center justify-center mx-1 text-emerald-800/80 dark:text-emerald-300/80 font-normal select-none"
        title={`Akhir ayat ${verseKey}`}
      >
        <span className="inline-block text-[0.85em] leading-none">
          {text}
        </span>
      </span>
    );
  }

  // 2. Memorization Mask
  if (isMasked) {
    return (
      <span
        data-verse-key={verseKey}
        data-word-index={wordIndex}
        data-page={page}
        data-line={line}
        onClick={onClick}
        className="inline-block mx-0.5 border-b-2 border-emerald-700/60 dark:border-emerald-400/60 text-transparent select-none cursor-pointer hover:border-emerald-500 transition-colors"
        style={{ minWidth: `${Math.max(1.8, text.length * 0.75)}ch` }}
      >
        {maskHint ? (
          <span className="text-gray-400 dark:text-gray-500 text-[0.85em] select-none">
            {maskHint}
          </span>
        ) : (
          text
        )}
      </span>
    );
  }

  // 3. Regular Word (Plain or Tajwid tokens)
  return (
    <span
      data-verse-key={verseKey}
      data-word-index={wordIndex}
      data-page={page}
      data-line={line}
      data-type="word"
      onClick={onClick}
      className={`relative inline-block mx-[1px] transition-colors duration-150 rounded px-0.5 selection:bg-emerald-200 dark:selection:bg-emerald-900 ${
        highlightState === 'current'
          ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400'
          : highlightState === 'matched'
          ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
          : highlightState === 'missed'
          ? 'text-red-500 line-through opacity-70'
          : 'hover:bg-black/5 dark:hover:bg-white/10'
      }`}
    >
      {showTajwid && Array.isArray(tajweedTokens) && tajweedTokens.length > 0 ? (
        tajweedTokens.map((token, tIdx) => {
          const rule = token.rule ? TAJWEED_RULES[token.rule] : null;

          if (!rule) {
            return <span key={tIdx}>{token.text}</span>;
          }

          return (
            <span
              key={tIdx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveRulePopover(rule);
              }}
              style={{
                color: 'var(--tajweed-color, inherit)',
              }}
              className="cursor-help transition-all duration-150 hover:brightness-125"
              data-tajweed-rule={token.rule}
            >
              {/* Inline style for light/dark CSS variable */}
              <style jsx>{`
                span {
                  --tajweed-color: ${rule.colorLight};
                }
                :global(.dark) span {
                  --tajweed-color: ${rule.colorDark};
                }
              `}</style>
              {token.text}
            </span>
          );
        })
      ) : (
        text
      )}

      {/* Tajwid Rule Popover on Tap */}
      {activeRulePopover && (
        <span
          className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 z-40 w-48 sm:w-56 p-2.5 rounded-xl bg-brand-charcoal text-white dark:bg-white dark:text-brand-charcoal text-xs shadow-xl pointer-events-auto text-left font-sans block animate-fade-in"
          dir="ltr"
          onClick={(e) => {
            e.stopPropagation();
            setActiveRulePopover(null);
          }}
        >
          <span className="flex items-center justify-between pb-1 border-b border-white/20 dark:border-black/10">
            <span className="font-bold text-[11px] text-amber-300 dark:text-brand-primary">
              {activeRulePopover.labelId}
            </span>
            <span className="text-[10px] opacity-70 cursor-pointer">✕</span>
          </span>
          <span className="text-[10px] leading-relaxed block mt-1 opacity-90">
            {activeRulePopover.explanationId}
          </span>
        </span>
      )}
    </span>
  );
}
