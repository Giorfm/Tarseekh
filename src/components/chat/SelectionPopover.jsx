'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookOpen, Bookmark, X, GitCompare, Volume2 } from 'lucide-react';

export function SelectionPopover({ onAskAI, onQuickTafsir, onBookmark, onMutashabihat, onPlayAudio }) {
  const [popover, setPopover] = useState(null); // { x, y, verseKeys, selectedText, isTooMany }
  const popoverRef = useRef(null);
  const selectionTimerRef = useRef(null);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      if (!text) return;

      // Extract all elements inside range with data-verse-key
      const fragment = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);

      const verseKeyElements = tempDiv.querySelectorAll('[data-verse-key]');
      let verseKeys = [...new Set(Array.from(verseKeyElements).map((el) => el.getAttribute('data-verse-key')))];

      // Check startContainer and endContainer closest [data-verse-key] (essential for letter-by-letter selection)
      const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const startVerseKey = startEl?.closest('[data-verse-key]')?.getAttribute('data-verse-key');
      if (startVerseKey && !verseKeys.includes(startVerseKey)) {
        verseKeys.push(startVerseKey);
      }

      const endEl = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
      const endVerseKey = endEl?.closest('[data-verse-key]')?.getAttribute('data-verse-key');
      if (endVerseKey && !verseKeys.includes(endVerseKey)) {
        verseKeys.push(endVerseKey);
      }

      // If empty in fragment, check container ancestry
      if (verseKeys.length === 0) {
        let parent = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        const ancestorKey = parent?.closest('[data-verse-key]')?.getAttribute('data-verse-key');
        if (ancestorKey) {
          verseKeys.push(ancestorKey);
        }
      }

      if (verseKeys.length === 0) return;

      let rect = range.getBoundingClientRect();
      if ((!rect || (rect.width === 0 && rect.height === 0)) && range.getClientRects().length > 0) {
        rect = range.getClientRects()[0];
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      const isMobile = window.innerWidth < 768;
      const popoverWidth = Math.min(window.innerWidth - 32, 280);
      let x = rect.left + rect.width / 2 - popoverWidth / 2;
      x = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, x));

      let y;
      if (isMobile) {
        // If selection is near bottom of viewport, position above to prevent going off-screen
        if (rect.bottom + 80 > window.innerHeight) {
          y = rect.top - 62;
        } else {
          y = rect.bottom + 14;
        }
      } else {
        y = rect.top - 54;
        if (y < 60) y = rect.bottom + 12;
      }

      setPopover({
        x,
        y: y + window.scrollY,
        verseKeys,
        selectedText: text,
        isTooMany: verseKeys.length > 7,
      });
    };

    const handlePointerDown = (e) => {
      isMouseDownRef.current = e.pointerType === 'mouse';
    };

    const handlePointerUp = () => {
      isMouseDownRef.current = false;
      setTimeout(handleSelection, 50);
    };

    // Mobile long-press selection ends with touchcancel/pointercancel (not touchend),
    // and dragging the selection handles fires no touch events on the page at all.
    // selectionchange is the only event that reliably reports the final selection there.
    const handleSelectionChange = () => {
      if (isMouseDownRef.current) return; // desktop drag: wait for pointerup
      clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(handleSelection, 300);
    };

    const handleDismiss = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Delay to allow action button click
        setTimeout(() => setPopover(null), 100);
      }
    };

    const handleScroll = () => {
      // Mobile browsers may scroll while the selection handles are dragged;
      // keep the popover as long as the selection is still there.
      const selection = window.getSelection();
      if (popover && (!selection || selection.isCollapsed)) {
        setPopover(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleDismiss);

    return () => {
      clearTimeout(selectionTimerRef.current);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleDismiss);
    };
  }, [popover]);

  if (!popover) return null;

  return (
    <div
      ref={popoverRef}
      // Keep the text selection alive on mobile and desktop while tapping a popover button
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        top: `${popover.y}px`,
        left: `${popover.x}px`,
      }}
      className="absolute z-50 animate-fade-in bg-brand-charcoal text-white dark:bg-white dark:text-brand-charcoal p-1.5 rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-1 text-xs select-none pointer-events-auto"
    >
      {popover.isTooMany ? (
        <div className="px-3 py-1.5 text-[11px] text-amber-300 dark:text-amber-700 font-medium">
          Maksimal 7 ayat sekaligus untuk tanya AI
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              onPlayAudio?.(popover.selectedText, popover.verseKeys);
              setPopover(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors text-emerald-300 dark:text-emerald-700"
            title="Dengarkan pelafalan audio teks / huruf ini"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Dengar</span>
          </button>

          <button
            onClick={() => {
              onAskAI?.(popover.verseKeys, popover.selectedText);
              setPopover(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold hover:opacity-95 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tanya AI</span>
          </button>

          <button
            onClick={() => {
              onQuickTafsir?.(popover.verseKeys, popover.selectedText);
              setPopover(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tafsir</span>
          </button>

          <button
            onClick={() => {
              onMutashabihat?.(popover.verseKeys[0]);
              setPopover(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors text-amber-300 dark:text-amber-700"
            title="Cari keserupaan ayat (Mutasyabihat)"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Mutasyabihat</span>
          </button>

          <button
            onClick={() => {
              onBookmark?.(popover.verseKeys);
              setPopover(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </>
      )}

      <button
        onClick={() => setPopover(null)}
        className="p-1 rounded-lg hover:bg-white/15 dark:hover:bg-black/10 text-gray-400"
        aria-label="Tutup"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
