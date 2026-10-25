'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookOpen, Bookmark, X } from 'lucide-react';

export function SelectionPopover({ onAskAI, onQuickTafsir, onBookmark }) {
  const [popover, setPopover] = useState(null); // { x, y, verseKeys, selectedText, isTooMany }
  const popoverRef = useRef(null);

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

      // If empty in fragment, check container ancestry
      if (verseKeys.length === 0) {
        let parent = range.commonAncestorContainer;
        while (parent && parent !== document.body) {
          if (parent.nodeType === 1 && parent.hasAttribute('data-verse-key')) {
            verseKeys = [parent.getAttribute('data-verse-key')];
            break;
          }
          parent = parent.parentNode;
        }
      }

      if (verseKeys.length === 0) return;

      const rect = range.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;

      // Position: Above on desktop, below on mobile to avoid native browser copy menu
      const popoverWidth = 260;
      let x = rect.left + rect.width / 2 - popoverWidth / 2;
      x = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, x));

      let y;
      if (isMobile) {
        y = rect.bottom + 12; // below selection
      } else {
        y = rect.top - 54; // above selection
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

    const handlePointerUp = () => {
      setTimeout(handleSelection, 50);
    };

    const handleDismiss = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Delay to allow action button click
        setTimeout(() => setPopover(null), 100);
      }
    };

    const handleScroll = () => {
      if (popover) {
        setPopover(null);
      }
    };

    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleDismiss);

    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleDismiss);
    };
  }, [popover]);

  if (!popover) return null;

  return (
    <div
      ref={popoverRef}
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
