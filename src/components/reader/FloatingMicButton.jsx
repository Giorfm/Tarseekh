'use client';

import React from 'react';
import { Mic } from 'lucide-react';

export function FloatingMicButton({ onClick, isActive = false, title = 'Pelacak Bacaan Suara' }) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      title={title}
      className={`fixed right-5 bottom-6 md:bottom-8 z-30 w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
        isActive
          ? 'bg-red-500 text-white ring-4 ring-red-200 animate-pulse'
          : 'bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg hover:opacity-95'
      }`}
    >
      <Mic className="w-6 h-6" />
    </button>
  );
}
