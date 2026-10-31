'use client';

import React, { useRef, useState } from 'react';
import { TAJWEED_RULES } from '@/lib/tajwid/rules';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

/**
 * MushafImagePage: official KFGQPC Madinah page image with an interactive word layer.
 *
 * The image is display-only. Every word box carries the same data attributes as WordSpan
 * (data-verse-key, data-word-index, data-page, data-line) and its text comes from verified data.
 *
 * @param {Object} props
 * @param {number} props.page
 * @param {string} props.imageUrl
 * @param {Object} props.layout geometry from lib/mushaf/layout
 * @param {(key: string) => Object} props.getWordState
 *   returns { text, highlightState, isMasked, maskHint, tajweedRules, isSelected }
 * @param {(key: string) => void} props.onWordTap
 * @param {(key: string, rect: DOMRect) => void} props.onWordLongPress
 * @param {() => void} props.onImageError
 */
export function MushafImagePage({ page, imageUrl, layout, getWordState, onWordTap, onWordLongPress, onImageError }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const pressRef = useRef(null); // { key, x, y, timer, fired }
  const suppressClickRef = useRef(false);

  const W = layout.width;
  const H = layout.height;
  const pct = (v, total) => `${(v / total) * 100}%`;

  const clearPress = () => {
    if (pressRef.current?.timer) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };

  const handlePointerDown = (e, key) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearPress();
    suppressClickRef.current = false;
    const target = e.currentTarget;
    pressRef.current = {
      key,
      x: e.clientX,
      y: e.clientY,
      fired: false,
      timer: setTimeout(() => {
        if (pressRef.current?.key === key) {
          pressRef.current.fired = true;
          suppressClickRef.current = true;
          onWordLongPress(key, target.getBoundingClientRect());
        }
      }, LONG_PRESS_MS),
    };
  };

  const handlePointerMove = (e) => {
    const p = pressRef.current;
    if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE_PX) {
      clearPress();
    }
  };

  // Taps are handled on click (after pointerup) so a sheet opened by the tap does not
  // receive the browser's follow-up click; the click right after a long-press is ignored.
  const handleClick = (key) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onWordTap(key);
  };

  return (
    <div
      className="relative w-full select-none [-webkit-touch-callout:none]"
      style={{ aspectRatio: `${W} / ${H}` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isLoaded && <div className="absolute inset-0 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`Halaman ${page} Mushaf Madinah`}
        crossOrigin="anonymous"
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={onImageError}
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 dark:invert dark:hue-rotate-180 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {isLoaded &&
        layout.lines.map((line) =>
          line.words.map((w) => {
            const { verseKey, idx } = splitKey(w.k);
            const state = getWordState(w.k);
            const hitWidth = w.hx1 - w.hx0;
            const inkLeft = `${((w.x0 - w.hx0) / hitWidth) * 100}%`;
            const inkWidth = `${((w.x1 - w.x0) / hitWidth) * 100}%`;

            return (
              <div
                key={w.k}
                role="button"
                tabIndex={-1}
                aria-label={state.text}
                data-verse-key={verseKey}
                data-word-index={idx}
                data-page={page}
                data-line={line.line}
                data-type={w.end ? 'end' : 'word'}
                className="absolute cursor-pointer touch-pan-y"
                style={{
                  left: pct(w.hx0, W),
                  width: pct(hitWidth, W),
                  top: pct(line.y0, H),
                  height: pct(line.y1 - line.y0, H),
                }}
                onPointerDown={(e) => handlePointerDown(e, w.k)}
                onPointerMove={handlePointerMove}
                onPointerUp={clearPress}
                onClick={() => handleClick(w.k)}
                onPointerCancel={clearPress}
                onPointerLeave={clearPress}
              >
                {/* Hafalan cover spans the whole word box so no harakat peek through */}
                {state.isMasked && (
                  <span className="absolute inset-0 bg-white dark:bg-black flex items-center justify-center">
                    <span
                      className="absolute bottom-[6%] h-0.5 rounded-full bg-emerald-700/60 dark:bg-emerald-400/60"
                      style={{ left: inkLeft, width: inkWidth }}
                    />
                    {state.maskHint && (
                      <span className="font-quran text-gray-400 dark:text-gray-500 leading-none" style={{ fontSize: 'min(1.1rem, 3vw)' }}>
                        {state.maskHint}
                      </span>
                    )}
                  </span>
                )}

                <span
                  className={`absolute inset-y-[6%] rounded-md transition-colors duration-150 ${inkClass(state)}`}
                  style={{ left: inkLeft, width: inkWidth }}
                >
                  {!state.isMasked && state.tajweedRules?.length > 0 && (
                    <span className="absolute left-0 right-0 -bottom-0.5 flex gap-px h-[3px]">
                      {state.tajweedRules.map((ruleId) => (
                        <TajweedBar key={ruleId} rule={TAJWEED_RULES[ruleId]} />
                      ))}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
    </div>
  );
}

function splitKey(key) {
  const i = key.lastIndexOf(':');
  return { verseKey: key.slice(0, i), idx: parseInt(key.slice(i + 1), 10) };
}

function inkClass(state) {
  if (state.highlightState === 'current') return 'bg-amber-300/40 dark:bg-amber-400/30 ring-2 ring-amber-400';
  if (state.highlightState === 'missed') return 'bg-red-500/20 dark:bg-red-500/30 ring-2 ring-red-400/80';
  if (state.highlightState === 'matched') return 'bg-emerald-500/15 dark:bg-emerald-400/20';
  if (state.isSelected) return 'bg-emerald-500/20 dark:bg-emerald-400/25';
  return 'hover:bg-black/5 dark:hover:bg-white/10';
}

function TajweedBar({ rule }) {
  if (!rule) return null;
  return (
    <>
      <span className="flex-1 rounded-full dark:hidden" style={{ backgroundColor: rule.colorLight }} />
      <span className="flex-1 rounded-full hidden dark:block" style={{ backgroundColor: rule.colorDark }} />
    </>
  );
}
