'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookOpen, Bookmark, X } from 'lucide-react';

const POPOVER_WIDTH = 300;

/**
 * Page coordinates for the popover next to a selection rect (viewport coords).
 * Above on desktop, below on mobile to stay clear of the native browser copy menu.
 */
export function getPopoverPosition(rect) {
  const isMobile = window.innerWidth < 768;
  let x = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  x = Math.max(16, Math.min(window.innerWidth - POPOVER_WIDTH - 16, x));

  let y;
  if (isMobile) {
    y = rect.bottom + 12; // below selection
  } else {
    y = rect.top - 54; // above selection
    if (y < 60) y = rect.bottom + 12;
  }
  return { x, y: y + window.scrollY };
}

/**
 * Uncontrolled (default): reacts to native text selection on [data-verse-key] elements.
 * Controlled: pass `selection` ({ x, y, verseKeys, selectedText }) and `onDismiss`, e.g. for
 * long-press on mushaf page images where there is no selectable text.
 */
export function SelectionPopover({ onAskAI, onQuickTafsir, onBookmark, selection = null, onDismiss }) {
  const [popover, setPopover] = useState(null); // { x, y, verseKeys, selectedText, isTooMany }
  const popoverRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const selectionTimerRef = useRef(null);
  const isMouseDownRef = useRef(false);
  onDismissRef.current = onDismiss;

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

      const { x, y } = getPopoverPosition(range.getBoundingClientRect());

      setPopover({
        x,
        y,
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
        setTimeout(() => {
          setPopover(null);
          onDismissRef.current?.();
        }, 100);
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

  const active = selection ? { ...selection, isTooMany: selection.verseKeys.length > 7 } : popover;
  if (!active) return null;

  const close = () => {
    setPopover(null);
    onDismissRef.current?.();
  };

  return (
    <div
      ref={popoverRef}
      // Keep the text selection alive while tapping a popover button
      onMouseDown={(e) => e.preventDefault()}
      style={{
        top: `${active.y}px`,
        left: `${active.x}px`,
      }}
      className="absolute z-50 animate-fade-in bg-brand-charcoal text-white dark:bg-white dark:text-brand-charcoal p-1.5 rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-1 text-xs whitespace-nowrap select-none pointer-events-auto"
    >
      {active.isTooMany ? (
        <div className="px-3 py-1.5 text-[11px] text-amber-300 dark:text-amber-700 font-medium">
          Maksimal 7 ayat sekaligus untuk tanya AI
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              onAskAI?.(active.verseKeys, active.selectedText);
              close();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold hover:opacity-95 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tanya AI</span>
          </button>

          <button
            onClick={() => {
              onQuickTafsir?.(active.verseKeys, active.selectedText);
              close();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tafsir</span>
          </button>

          <button
            onClick={() => {
              onBookmark?.(active.verseKeys);
              close();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-black/10 font-medium transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </>
      )}

      <button
        onClick={close}
        className="p-1 rounded-lg hover:bg-white/15 dark:hover:bg-black/10 text-gray-400"
        aria-label="Tutup"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
