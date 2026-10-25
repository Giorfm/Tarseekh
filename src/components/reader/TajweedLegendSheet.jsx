'use client';

import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import { TAJWEED_RULES } from '@/lib/tajwid/rules';

export function TajweedLegendSheet({ isOpen, onClose }) {
  if (!isOpen) return null;

  const rulesList = Object.values(TAJWEED_RULES).filter((r) => r.id !== 'end');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white dark:bg-brand-dark-surface rounded-t-3xl sm:rounded-2xl border border-emerald-950/10 dark:border-white/10 p-5 space-y-4 shadow-2xl z-10 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center font-bold text-sm">
              ت
            </div>
            <div>
              <h2 className="font-bold text-base text-brand-charcoal dark:text-white">
                Panduan Warna Tajwid
              </h2>
              <span className="text-[11px] text-gray-400">
                Pewarnaan berstandar untuk memudahkan tartil
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {rulesList.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-1"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                  style={{
                    backgroundColor: rule.colorLight,
                  }}
                />
                <h4 className="font-bold text-xs text-brand-charcoal dark:text-white">
                  {rule.labelId}
                </h4>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed pl-6.5">
                {rule.explanationId}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer Note */}
        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
          <p className="text-[10px] text-gray-400 leading-relaxed italic text-center">
            *Catatan: Penjelasan hukum tajwid dalam modul ini wajib ditinjau ulang oleh guru tahsin/tahfidz bersertifikasi untuk kepastian talaqqi.
          </p>
        </div>
      </div>
    </div>
  );
}
